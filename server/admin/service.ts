/**
 * Panelin iş mantığı: GitHub'daki içeriği okur; kaydetme ve silmeyi TEK commit olarak yazar.
 *
 * Bir commit şunları birlikte içerir (hesaplama shared/blog-build.ts ve shared/blog-publish.ts ile yapılır, yani build'le aynı mantık):
 *   content/blog/<ad>.json + shared/blog-content.generated.ts + client/public/sitemap.xml + client/public/llms.txt
 *   (+ silmede yönlendirme seçildiyse content/redirects.json)
 * Böylece `pnpm content --check` ve testler panelin commit'inden sonra da yeşil kalır.
 *
 * Güvenlik duruşu: içerik dosyalarından herhangi biri şemaya uymuyorsa panel hiçbir şey yazmaz. Aksi hâlde üretilen dosyalar
 * o yazıyı sessizce siteden düşürürdü. (Build de aynı durumda zaten durur; Vercel eski sürümü yayında tutar.)
 */
import { createHash } from "node:crypto";
import { CONTENT_DIR, GENERATED_PATH, LLMS_PATH, SITEMAP_PATH, renderGeneratedFiles } from "../../shared/blog-build.js";
import { BLOG_SLUGS_LINKED_FROM_CODE } from "../../shared/blog-protected.js";
import { prepareSave, serializePost, todayInIstanbul, type SaveRequest } from "../../shared/blog-publish.js";
import { REDIRECTS_PATH, parseRedirects, removeRedirectFrom, renderRedirectsFile, upsertRedirect, type BlogRedirect } from "../../shared/blog-redirects.js";
import { BLOG_SLUG_PATTERN, blogFileName, validateBlogCollection, validateBlogPost, type BlogPostInput } from "../../shared/blog-schema.js";
import { GithubError, mapLimit, type BuildStatus, type CommitChange, type GithubClient, type HistoryEntry } from "./github.js";

/** Commit mesajına konan işaret: `vercel.json` → `ignoreCommand` bu işareti görünce derlemeyi atlar (yalnızca siteyi değiştirmeyen taslak commit'leri). */
export const SKIP_BUILD_MARKER = "[panel-taslak]";

export class AdminError extends Error {
  constructor(public status: number, public code: string, message: string, public errors?: string[]) {
    super(message);
    this.name = "AdminError";
  }
}

export type PostItem = { post: BlogPostInput; hash: string };
export type ContentProblem = { file: string; errors: string[] };
type Snapshot = { head: string; items: PostItem[]; posts: BlogPostInput[]; redirects: BlogRedirect[]; problems: ContentProblem[] };

export type SaveBody = SaveRequest & { baseHash?: string };
export type SaveOutcome = { noChange: true } | { noChange: false; commit: string; slug: string; status: "draft" | "published"; warnings: string[]; siteAffecting: boolean };
export type DeleteOutcome = { commit: string; slug: string; redirectedTo?: string; wasPublished: boolean };
export type BuildRow = BuildStatus & { skipped: boolean };

const oneLine = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, 120);
const postPath = (slug: string) => `${CONTENT_DIR}/${blogFileName(slug)}`;
export const hashPost = (post: BlogPostInput) => createHash("sha1").update(serializePost(post)).digest("hex").slice(0, 16);

export function createAdminService(deps: { github: GithubClient; now?: () => Date }) {
  const { github } = deps;
  const today = () => todayInIstanbul(deps.now?.() ?? new Date());
  let cache: Snapshot | undefined;

  /** Tüm yazıları (taslaklar dahil) okur ve şemayla doğrular. Dal ilerlemediyse önbellekten döner. */
  async function snapshot(head: string): Promise<Snapshot> {
    if (cache?.head === head) return cache;
    const names = (await github.listFiles(CONTENT_DIR, head)).filter(name => name.endsWith(".json")).sort();
    const loaded = await mapLimit(names, 8, async name => ({ name, text: await github.readFile(`${CONTENT_DIR}/${name}`, head) }));
    const items: PostItem[] = [];
    const problems: ContentProblem[] = [];
    for (const { name, text } of loaded) {
      if (text === null) continue;
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        problems.push({ file: name, errors: ["Geçerli JSON değil"] });
        continue;
      }
      const result = validateBlogPost(data);
      if (!result.ok) problems.push({ file: name, errors: result.errors });
      else if (blogFileName(result.post.slug) !== name) problems.push({ file: name, errors: [`Dosya adı adresle uyuşmuyor, "${blogFileName(result.post.slug)}" olmalı`] });
      else items.push({ post: result.post, hash: hashPost(result.post) });
    }
    const posts = items.map(item => item.post);
    const collection = validateBlogCollection(posts);
    if (collection.length) problems.push({ file: "(yazılar arası)", errors: collection });

    const redirectsText = await github.readFile(REDIRECTS_PATH, head);
    let redirects: BlogRedirect[] = [];
    if (redirectsText !== null) {
      try {
        const parsed = parseRedirects(JSON.parse(redirectsText));
        redirects = parsed.redirects;
        if (parsed.errors.length) problems.push({ file: REDIRECTS_PATH, errors: parsed.errors });
      } catch {
        problems.push({ file: REDIRECTS_PATH, errors: ["Geçerli JSON değil"] });
      }
    }
    cache = { head, items, posts, redirects, problems };
    return cache;
  }

  const assertWritable = (snap: Snapshot) => {
    if (snap.problems.length) {
      throw new AdminError(422, "content_invalid", "İçerik dosyalarında hata var; düzeltilmeden panel yazamaz", snap.problems.flatMap(problem => problem.errors.map(error => `${problem.file}: ${error}`)));
    }
  };

  /** Yazı değişikliğinden sonra üretilen dosyaların yeni içeriğini hesaplar ve yalnızca değişenleri döndürür. */
  async function generatedChanges(head: string, all: BlogPostInput[]): Promise<{ upserts: CommitChange["upserts"]; changed: boolean }> {
    const [generated, sitemap, llms] = await Promise.all([github.readFile(GENERATED_PATH, head), github.readFile(SITEMAP_PATH, head), github.readFile(LLMS_PATH, head)]);
    if (sitemap === null || llms === null) throw new AdminError(422, "content_invalid", "sitemap.xml ya da llms.txt bulunamadı; üretilen dosyalar eşitlenemedi");
    const current: Record<string, string | null> = { [GENERATED_PATH]: generated, [SITEMAP_PATH]: sitemap, [LLMS_PATH]: llms };
    let files;
    try {
      files = renderGeneratedFiles(all, { sitemap, llms }).files;
    } catch (error) {
      throw new AdminError(422, "content_invalid", error instanceof Error ? error.message : "Üretilen dosyalar hesaplanamadı");
    }
    const upserts = files.filter(file => current[file.path] !== file.content);
    return { upserts, changed: upserts.length > 0 };
  }

  const withRetry = async <T>(task: () => Promise<T>): Promise<T> => {
    try {
      return await task();
    } catch (error) {
      if (error instanceof GithubError && error.kind === "conflict") {
        cache = undefined;
        try {
          return await task();
        } catch (second) {
          if (second instanceof GithubError && second.kind === "conflict") throw new AdminError(409, "head_moved", "Depo bu sırada başka bir değişiklik aldı; sayfayı yenileyip tekrar deneyin");
          throw second;
        }
      }
      throw error;
    }
  };

  return {
    /** Tüm yazılar + içerik sorunları + dal bilgisi. */
    async listPosts() {
      const head = await github.headSha();
      const snap = await snapshot(head);
      return { head, branch: github.config.branch, repo: `${github.config.owner}/${github.config.repo}`, items: snap.items, problems: snap.problems, redirects: snap.redirects };
    },

    async save(body: SaveBody): Promise<SaveOutcome> {
      if (body.previousSlug !== undefined && typeof body.baseHash !== "string") throw new AdminError(400, "bad_request", "Düzenleme isteğinde baseHash zorunlu");
      return withRetry(async () => {
        const head = await github.headSha();
        const snap = await snapshot(head);
        assertWritable(snap);

        if (body.previousSlug !== undefined) {
          const loaded = snap.items.find(item => item.post.slug === body.previousSlug);
          if (loaded && loaded.hash !== body.baseHash) throw new AdminError(409, "stale", "Bu yazı başka bir yerde değiştirilmiş; sayfayı yenileyip tekrar deneyin");
        }

        const prepared = prepareSave(body, snap.posts, today());
        if (!prepared.ok) throw new AdminError(prepared.status, prepared.status === 409 ? "conflict" : "validation_failed", prepared.errors[0], prepared.errors);
        if (prepared.noChange) return { noChange: true as const };

        const oldSlug = prepared.previous?.slug ?? prepared.post.slug;
        const all = [...snap.posts.filter(post => post.slug !== oldSlug), prepared.post];
        const published = prepared.post.status !== "draft";

        const upserts: CommitChange["upserts"] = [{ path: postPath(prepared.post.slug), content: serializePost(prepared.post) }];
        const deletes = prepared.renamedFrom ? [postPath(prepared.renamedFrom)] : [];

        const generated = await generatedChanges(head, all);
        upserts.push(...generated.upserts);

        // Yönlendirilen bir adresle yazı yayınlanıyorsa yönlendirme kalkar (aksi hâlde build "adres hâlâ yayında" der).
        let redirectsChanged = false;
        if (published && snap.redirects.some(item => item.from === prepared.post.slug)) {
          upserts.push({ path: REDIRECTS_PATH, content: renderRedirectsFile(removeRedirectFrom(snap.redirects, prepared.post.slug)) });
          redirectsChanged = true;
        }

        const siteAffecting = generated.changed || redirectsChanged;
        const verb = published ? (prepared.becamePublished ? "yazı yayınlandı" : "yazı güncellendi") : prepared.isNew ? "taslak eklendi" : "taslak güncellendi";
        const message = `content: ${verb} — ${oneLine(prepared.post.title)}${siteAffecting ? "" : ` ${SKIP_BUILD_MARKER}`}\n\nAdres: ${prepared.post.slug}\nKaynak: yönetim paneli`;
        const commit = await github.commit({ upserts, deletes }, message, head);
        cache = undefined;
        return { noChange: false as const, commit, slug: prepared.post.slug, status: published ? ("published" as const) : ("draft" as const), warnings: prepared.warnings, siteAffecting };
      });
    },

    async remove(input: { slug: string; confirm?: boolean; redirectTo?: string }): Promise<DeleteOutcome> {
      if (typeof input.slug !== "string" || !BLOG_SLUG_PATTERN.test(input.slug)) throw new AdminError(400, "bad_request", "Adres geçersiz");
      return withRetry(async () => {
        const head = await github.headSha();
        const snap = await snapshot(head);
        assertWritable(snap);

        const post = snap.posts.find(item => item.slug === input.slug);
        if (!post) throw new AdminError(404, "not_found", "Yazı bulunamadı; zaten silinmiş olabilir");
        const published = post.status !== "draft";
        if (BLOG_SLUGS_LINKED_FROM_CODE.includes(post.slug)) {
          throw new AdminError(422, "protected", "Bu yazıya ana sayfadan sabit bağlantı veriliyor; silinirse ölü bağlantı kalır. Önce ana sayfadaki bağlantı kaldırılmalı");
        }
        if (published && input.confirm !== true) throw new AdminError(400, "confirm_required", "Yayındaki yazıyı silmek için onay gerekli");

        let redirect: BlogRedirect | undefined;
        if (published && input.redirectTo) {
          const allowed = [post.servicePath, post.brandPath, "/blog/"].filter((value): value is string => Boolean(value));
          if (!allowed.includes(input.redirectTo)) throw new AdminError(422, "bad_redirect", `Yönlendirme hedefi şunlardan biri olmalı: ${allowed.join(", ")}`);
          redirect = { from: post.slug, to: input.redirectTo, date: today() };
        }

        const remaining = snap.posts.filter(item => item.slug !== post.slug);
        const upserts: CommitChange["upserts"] = [];
        const generated = await generatedChanges(head, remaining);
        upserts.push(...generated.upserts);
        if (redirect) upserts.push({ path: REDIRECTS_PATH, content: renderRedirectsFile(upsertRedirect(snap.redirects, redirect)) });

        const siteAffecting = generated.changed || Boolean(redirect);
        const message = `content: ${published ? "yazı silindi" : "taslak silindi"} — ${oneLine(post.title)}${siteAffecting ? "" : ` ${SKIP_BUILD_MARKER}`}\n\nAdres: ${post.slug}${redirect ? `\nYönlendirme: ${redirect.to}` : "\nYönlendirme: yok (adres 404 verir)"}\nKaynak: yönetim paneli`;
        const commit = await github.commit({ upserts, deletes: [postPath(post.slug)] }, message, head);
        cache = undefined;
        return { commit, slug: post.slug, wasPublished: published, ...(redirect ? { redirectedTo: redirect.to } : {}) };
      });
    },

    /** Yazının dosya geçmişi (silinmiş yazılar için de çalışır). */
    async history(slug: string): Promise<HistoryEntry[]> {
      if (typeof slug !== "string" || !BLOG_SLUG_PATTERN.test(slug)) throw new AdminError(400, "bad_request", "Adres geçersiz");
      return github.history(postPath(slug), 20);
    },

    /** Geçmişteki bir sürümü okur ve şemayla doğrular; editöre yüklenip normal akışla kaydedilir. */
    async version(slug: string, sha: string): Promise<BlogPostInput> {
      if (typeof slug !== "string" || !BLOG_SLUG_PATTERN.test(slug)) throw new AdminError(400, "bad_request", "Adres geçersiz");
      if (typeof sha !== "string" || !/^[0-9a-f]{7,40}$/.test(sha)) throw new AdminError(400, "bad_request", "Sürüm kimliği geçersiz");
      const text = await github.readFile(postPath(slug), sha);
      if (text === null) throw new AdminError(404, "not_found", "Bu sürümde yazı yok");
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throw new AdminError(422, "version_invalid", "Bu sürüm geçerli JSON değil");
      }
      const result = validateBlogPost(data);
      if (!result.ok) throw new AdminError(422, "version_invalid", "Bu sürüm bugünkü kurallara uymuyor; yüklenemez", result.errors);
      return result.post;
    },

    /** Son commit'ler ve Vercel derleme durumları. Taslak commit'leri "atlandı" olarak işaretlenir. */
    async builds(): Promise<BuildRow[]> {
      const rows = await github.builds(6);
      return rows.map(row => ({ ...row, skipped: row.message.includes(SKIP_BUILD_MARKER) }));
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;

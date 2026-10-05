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
import { BLOG_IMAGE_HOST, postImageIds } from "../../shared/blog-images.js";
import { prepareSave, serializePost, todayInIstanbul, type SaveRequest } from "../../shared/blog-publish.js";
import { REDIRECTS_PATH, parseRedirects, removeRedirectFrom, renderRedirectsFile, upsertRedirect, type BlogRedirect } from "../../shared/blog-redirects.js";
import { BLOG_SLUG_PATTERN, blogFileName, validateBlogCollection, validateBlogPost, type BlogPostInput } from "../../shared/blog-schema.js";
import { GithubError, mapLimit, type BuildStatus, type CommitChange, type GithubClient, type HistoryEntry } from "./github.js";
import { DEFAULT_SETTINGS, SETTINGS_PATH, SOCIAL_SKIP_MARKER, emptySocialRecord, parseSocialFile, serializeSettings, serializeSocial, socialPath, validateSettings, validateSocialRecord, GOOGLE_POST_NAME, type PanelSettings, type SocialChannel, type SocialRecord } from "../../shared/blog-social.js";
import { ImageStoreError, type ImageStore } from "./imageStore.js";

/** Commit mesajına konan işaret: `vercel.json` → `ignoreCommand` bu işareti görünce derlemeyi atlar (yalnızca siteyi değiştirmeyen taslak commit'leri). */
export const SKIP_BUILD_MARKER = "[panel-taslak]";

/**
 * Fotoğraf SİLME yalnızca canlı (main) dalındaki panelde yapılır. Önizleme (Preview) ortamı canlıyla AYNI Blob store'u kullanır;
 * önizleme dalı eski olabilir, oradan yapılan silme ya da "kullanılmayanları temizle" canlı sitenin fotoğrafını silerdi.
 */
export const PRODUCTION_BRANCH = "main";

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
/** `imagesNote`: fotoğraflar silinmediyse nedeni (silinen yazı fotoğraf taşımıyorsa alan hiç yoktur). */
export type DeleteOutcome = { commit: string; slug: string; redirectedTo?: string; wasPublished: boolean; imagesDeleted?: number; imagesNote?: "kept_preview" | "not_configured" | "failed"; /** Silinen yazının paylaşım paketi (varsa); işleyici Google düğmesini buna göre çevirir, istemciye gönderilmez. */ removedSocial?: SocialRecord };
export type SocialView = { record: SocialRecord | null; /** Dosya var ama okunamadı/kurallara uymuyor: panel boş paket gösterir, kaydedince dosya yeniden yazılır. */ problem?: string; published: boolean };
export type SettingsView = { settings: PanelSettings; problem?: string };
export type ShareContext = { post: BlogPostInput; record: SocialRecord; settings: PanelSettings };
export type BuildRow = BuildStatus & { skipped: boolean };

/** Commit mesajına giren başlık: tek satır; köşeli ayraçlar yuvarlağa çevrilir ki başlıktaki "[panel-taslak]", "[skip ci]" gibi ifadeler derlemeyi atlatmasın. */
const oneLine = (value: string) => value.replace(/\s+/g, " ").replace(/\[/g, "(").replace(/\]/g, ")").trim().slice(0, 120);
const postPath = (slug: string) => `${CONTENT_DIR}/${blogFileName(slug)}`;
export const hashPost = (post: BlogPostInput) => createHash("sha1").update(serializePost(post)).digest("hex").slice(0, 16);

export function createAdminService(deps: { github: GithubClient; now?: () => Date; images?: ImageStore; /** Fotoğraf adreslerinin geçebileceği alan; yoksa shared/blog-images.ts → BLOG_IMAGE_HOST. Testlerde verilir. */ imageHost?: string }) {
  const { github } = deps;
  const imageHost = deps.imageHost ?? BLOG_IMAGE_HOST;
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
      const result = validateBlogPost(data, imageHost);
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

  const requireSlug = (slug: unknown): string => {
    if (typeof slug !== "string" || !BLOG_SLUG_PATTERN.test(slug)) throw new AdminError(400, "bad_request", "Adres geçersiz");
    return slug;
  };
  const findPost = (snap: Snapshot, slug: string): BlogPostInput => {
    const post = snap.posts.find(item => item.slug === slug);
    if (!post) throw new AdminError(404, "not_found", "Yazı bulunamadı; silinmiş olabilir");
    return post;
  };
  const socialMessage = (verb: string, title: string, slug: string) => `content: ${verb} — ${oneLine(title)} ${SOCIAL_SKIP_MARKER}\n\nAdres: ${slug}\nKaynak: yönetim paneli`;

  /** Paylaşım paketi dosyası: yoksa `record: null`; var ama okunamıyorsa `problem` (panel boş paket gösterir, kaydedince dosya yeniden yazılır). */
  async function readSocial(slug: string, ref: string): Promise<{ record: SocialRecord | null; problem?: string }> {
    const text = await github.readFile(socialPath(slug), ref);
    if (text === null) return { record: null };
    const parsed = parseSocialFile(text, slug);
    return parsed.ok ? { record: parsed.record } : { record: null, problem: parsed.errors.join("; ") };
  }

  /** Ayar dosyası: yoksa ya da bozuksa güvenli varsayılan ("API yok"); bozuksa nedeni `problem` olarak bildirilir. */
  async function readSettings(ref: string): Promise<SettingsView> {
    const text = await github.readFile(SETTINGS_PATH, ref);
    if (text === null) return { settings: DEFAULT_SETTINGS };
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return { settings: DEFAULT_SETTINGS, problem: `${SETTINGS_PATH}: geçerli JSON değil` };
    }
    const checked = validateSettings(data);
    return checked.ok ? { settings: checked.settings } : { settings: DEFAULT_SETTINGS, problem: checked.errors.join("; ") };
  }

  /** Taslak yeniden adlandırılırsa paylaşım paketi yeni adrese taşınır (aynı commit'te). Okunamayan paket olduğu yerde bırakılır. */
  async function movedSocial(head: string, from: string, to: string): Promise<{ upsert: { path: string; content: string }; remove: string } | undefined> {
    const text = await github.readFile(socialPath(from), head);
    if (text === null) return undefined;
    const parsed = parseSocialFile(text, from);
    if (!parsed.ok) return undefined;
    return { upsert: { path: socialPath(to), content: serializeSocial({ ...parsed.record, slug: to }) }, remove: socialPath(from) };
  }

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

        const prepared = prepareSave(body, snap.posts, today(), imageHost);
        if (!prepared.ok) throw new AdminError(prepared.status, prepared.status === 409 ? "conflict" : "validation_failed", prepared.errors[0], prepared.errors);
        if (prepared.noChange) return { noChange: true as const };

        const oldSlug = prepared.previous?.slug ?? prepared.post.slug;
        const all = [...snap.posts.filter(post => post.slug !== oldSlug), prepared.post];
        const published = prepared.post.status !== "draft";

        const upserts: CommitChange["upserts"] = [{ path: postPath(prepared.post.slug), content: serializePost(prepared.post) }];
        const deletes = prepared.renamedFrom ? [postPath(prepared.renamedFrom)] : [];
        if (prepared.renamedFrom) {
          const moved = await movedSocial(head, prepared.renamedFrom, prepared.post.slug);
          if (moved) {
            upserts.push(moved.upsert);
            deletes.push(moved.remove);
          }
        }

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

        // Yazının paylaşım paketi (varsa) aynı commit'te silinir; Google'daki düğmeyi çevirmek için kaydı işleyiciye döndürürüz.
        const socialText = await github.readFile(socialPath(post.slug), head);
        const socialParsed = socialText === null ? undefined : parseSocialFile(socialText, post.slug);
        const removedSocial = socialParsed?.ok ? socialParsed.record : undefined;
        const deletes = [postPath(post.slug), ...(socialText !== null ? [socialPath(post.slug)] : [])];

        const siteAffecting = generated.changed || Boolean(redirect);
        const message = `content: ${published ? "yazı silindi" : "taslak silindi"} — ${oneLine(post.title)}${siteAffecting ? "" : ` ${SKIP_BUILD_MARKER}`}\n\nAdres: ${post.slug}${redirect ? `\nYönlendirme: ${redirect.to}` : "\nYönlendirme: yok (adres 404 verir)"}\nKaynak: yönetim paneli`;
        const commit = await github.commit({ upserts, deletes }, message, head);
        cache = undefined;

        // Fotoğraflar commit BAŞARILI olduktan sonra silinir (commit düşerse fotoğraflar yerinde kalır). Silinemezse yazı yine de silinmiştir;
        // kalanlar "Kullanımı göster → kullanılmayanları temizle" ile alınır.
        const keep = new Set(remaining.flatMap(item => [...postImageIds(item)]));
        const ids = [...postImageIds(post)].filter(id => !keep.has(id));
        let images: Pick<DeleteOutcome, "imagesDeleted" | "imagesNote"> = {};
        if (ids.length) {
          if (github.config.branch !== PRODUCTION_BRANCH) images = { imagesNote: "kept_preview" };
          else if (!deps.images) images = { imagesNote: "not_configured" };
          else {
            try {
              images = { imagesDeleted: await deps.images.removeImages(ids) };
            } catch {
              images = { imagesNote: "failed" };
            }
          }
        }
        return { commit, slug: post.slug, wasPublished: published, ...(redirect ? { redirectedTo: redirect.to } : {}), ...images, ...(removedSocial ? { removedSocial } : {}) };
      });
    },

    /**
     * Fotoğraf depolama kullanımı. `list()` her çağrıda gelişmiş işlem harcar; yalnızca düğmeyle çağrılır.
     * Yazı dosyalarından biri okunamıyorsa (`contentProblems`) onun fotoğrafları "kullanılmıyor" görünebilir; temizlik bu durumda reddedilir.
     */
    async imageUsage() {
      if (!deps.images) throw new AdminError(503, "blob_not_configured", "Fotoğraf deposu (Vercel Blob) tanımlı değil.");
      const head = await github.headSha();
      const snap = await snapshot(head);
      const referenced = new Set(snap.posts.flatMap(post => [...postImageIds(post)]));
      return { ...(await deps.images.usage(referenced)), contentProblems: snap.problems.length, canCleanup: github.config.branch === PRODUCTION_BRANCH };
    },

    /** Hiçbir yazının kullanmadığı (ve son 24 saatte yüklenmemiş) fotoğrafları siler. Yalnızca canlı (main) dalda ve içerik hatasız iken. */
    async imageCleanup(input: { confirm?: boolean }) {
      if (!deps.images) throw new AdminError(503, "blob_not_configured", "Fotoğraf deposu (Vercel Blob) tanımlı değil.");
      if (input.confirm !== true) throw new AdminError(400, "confirm_required", "Temizlik için onay gerekli");
      if (github.config.branch !== PRODUCTION_BRANCH) throw new AdminError(422, "cleanup_production_only", "Fotoğraf temizliği yalnızca canlı (main) panelde yapılır; önizleme ortamı canlıyla aynı depoyu kullanır ve canlı fotoğrafı silebilirdi.");
      const head = await github.headSha();
      const snap = await snapshot(head);
      assertWritable(snap);
      const referenced = new Set(snap.posts.flatMap(post => [...postImageIds(post)]));
      try {
        return await deps.images.cleanup(referenced);
      } catch (error) {
        if (error instanceof ImageStoreError) throw new AdminError(error.status, error.code, error.message);
        throw error;
      }
    },

    /** Panel ayarları (yoksa "API yok"). */
    async settings(): Promise<SettingsView> {
      return readSettings(await github.headSha());
    },

    /** Ayarları `content/settings.json` dosyasına yazar. Sır içermez (Google anahtarları ortam değişkenindedir); site dosyalarına dokunmaz. */
    async saveSettings(input: unknown): Promise<{ noChange: boolean; settings: PanelSettings }> {
      const checked = validateSettings(input);
      if (!checked.ok) throw new AdminError(422, "validation_failed", checked.errors[0], checked.errors);
      return withRetry(async () => {
        const head = await github.headSha();
        const current = await readSettings(head);
        const content = serializeSettings(checked.settings);
        if (!current.problem && serializeSettings(current.settings) === content) return { noChange: true, settings: current.settings };
        await github.commit({ upserts: [{ path: SETTINGS_PATH, content }], deletes: [] }, `content: panel ayarları güncellendi ${SOCIAL_SKIP_MARKER}\n\nKaynak: yönetim paneli`, head);
        return { noChange: false, settings: checked.settings };
      });
    },

    /** Bir yazının paylaşım paketi (taslak için de çalışır: yapay zeka metinleri taslakken kaydedilir). */
    async social(slugInput: unknown): Promise<SocialView> {
      const slug = requireSlug(slugInput);
      const head = await github.headSha();
      const post = findPost(await snapshot(head), slug);
      return { ...(await readSocial(slug, head)), published: post.status !== "draft" };
    },

    /** Sosyal metinleri ve düğme türünü kaydeder; "paylaşıldı" durumu korunur. Yazı dosyasına ve üretilen dosyalara dokunmaz. */
    async saveSocial(input: { slug: unknown; googleBusiness: unknown; instagram: unknown; button: unknown }): Promise<{ noChange: boolean; record: SocialRecord }> {
      const slug = requireSlug(input.slug);
      return withRetry(async () => {
        const head = await github.headSha();
        const post = findPost(await snapshot(head), slug);
        const existing = (await readSocial(slug, head)).record;
        const checked = validateSocialRecord({ slug, googleBusiness: input.googleBusiness, instagram: input.instagram, button: input.button, shared: existing?.shared ?? {}, updated: existing?.updated ?? today() });
        if (!checked.ok) throw new AdminError(422, "validation_failed", checked.errors[0], checked.errors);
        if (existing && serializeSocial(checked.record) === serializeSocial(existing)) return { noChange: true, record: existing };
        const record: SocialRecord = { ...checked.record, updated: today() };
        await github.commit({ upserts: [{ path: socialPath(slug), content: serializeSocial(record) }], deletes: [] }, socialMessage("paylaşım metni güncellendi", post.title, slug), head);
        return { noChange: false, record };
      });
    },

    /** "Paylaşıldı" kutusu (elle). Yalnızca yayındaki yazı işaretlenir; API ile yapılmış Google paylaşımının işareti elle kaldırılamaz (gönderi adı kaybolurdu). */
    async markShared(input: { slug: unknown; channel: unknown; shared: unknown }): Promise<{ noChange: boolean; record: SocialRecord }> {
      const slug = requireSlug(input.slug);
      if (input.channel !== "google" && input.channel !== "instagram") throw new AdminError(400, "bad_request", "Kanal google ya da instagram olmalı");
      if (typeof input.shared !== "boolean") throw new AdminError(400, "bad_request", "shared true ya da false olmalı");
      const channel: SocialChannel = input.channel;
      return withRetry(async () => {
        const head = await github.headSha();
        const post = findPost(await snapshot(head), slug);
        if (post.status === "draft") throw new AdminError(422, "not_published", "Yazı henüz yayında değil; paylaşıldı olarak işaretlenemez.");
        const existing = (await readSocial(slug, head)).record ?? emptySocialRecord(slug, today());
        const shared = { ...existing.shared };
        if (input.shared) {
          if (shared[channel]) return { noChange: true, record: existing };
          if (channel === "google") shared.google = { at: today(), via: "manual" };
          else shared.instagram = { at: today() };
        } else {
          if (!shared[channel]) return { noChange: true, record: existing };
          if (channel === "google" && shared.google?.via === "api") throw new AdminError(422, "api_shared", "Bu paylaşım API ile yapıldı; işaret elle kaldırılamaz.");
          delete shared[channel];
        }
        const record: SocialRecord = { ...existing, shared, updated: today() };
        await github.commit({ upserts: [{ path: socialPath(slug), content: serializeSocial(record) }], deletes: [] }, socialMessage(`${channel === "google" ? "Google" : "Instagram"} paylaşım durumu güncellendi`, post.title, slug), head);
        return { noChange: false, record };
      });
    },

    /** Google'a paylaşmadan önce: yazı yayında, Google metni kayıtlı ve daha önce paylaşılmamış olmalı. Hiçbir şey yazmaz. */
    async shareContext(slugInput: unknown): Promise<ShareContext> {
      const slug = requireSlug(slugInput);
      const head = await github.headSha();
      const post = findPost(await snapshot(head), slug);
      if (post.status === "draft") throw new AdminError(422, "not_published", "Yazı henüz yayında değil; Google'a paylaşılamaz.");
      const { record } = await readSocial(slug, head);
      if (!record || !record.googleBusiness) throw new AdminError(422, "no_text", "Önce Google İşletme metnini kaydedin.");
      if (record.shared.google) throw new AdminError(409, "already_shared", "Bu yazı Google'da zaten paylaşıldı olarak işaretli.");
      return { post, record, settings: (await readSettings(head)).settings };
    },

    /** API ile yapılan Google paylaşımını kaydeder (gönderi adıyla; yazı silinince düğmeyi çevirmek için gerekir). */
    async recordGoogleShare(input: { slug: string; postName: string }): Promise<SocialRecord> {
      const slug = requireSlug(input.slug);
      if (!GOOGLE_POST_NAME.test(input.postName)) throw new AdminError(400, "bad_request", "Google gönderi adı geçersiz");
      return withRetry(async () => {
        const head = await github.headSha();
        const post = findPost(await snapshot(head), slug);
        const existing = (await readSocial(slug, head)).record;
        if (!existing) throw new AdminError(422, "no_text", "Paylaşım paketi bulunamadı.");
        const record: SocialRecord = { ...existing, shared: { ...existing.shared, google: { at: today(), via: "api", postName: input.postName } }, updated: today() };
        await github.commit({ upserts: [{ path: socialPath(slug), content: serializeSocial(record) }], deletes: [] }, socialMessage("Google paylaşımı kaydedildi", post.title, slug), head);
        return record;
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
      const result = validateBlogPost(data, imageHost);
      if (!result.ok) throw new AdminError(422, "version_invalid", "Bu sürüm bugünkü kurallara uymuyor; yüklenemez", result.errors);
      return result.post;
    },

    /** Son commit'ler ve Vercel derleme durumları. Taslak commit'leri "atlandı" olarak işaretlenir. */
    async builds(): Promise<BuildRow[]> {
      const rows = await github.builds(6);
      return rows.map(row => ({ ...row, skipped: row.message.includes(SKIP_BUILD_MARKER) || row.message.includes(SOCIAL_SKIP_MARKER) }));
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;

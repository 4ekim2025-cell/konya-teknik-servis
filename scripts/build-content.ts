/**
 * İçerik derleyici — build'in ilk adımı (`pnpm build` içinde otomatik; elle: `pnpm content`).
 *
 * `content/blog/*.json` dosyalarını okur ve ortak şemayla (shared/blog-schema.ts) doğrular; kurala aykırı bir yazı
 * varsa hataları listeler ve build'i durdurur (Vercel eski sürümü yayında tutar). Geçerliyse, taslak olmayan yazıları
 * `order` sırasına dizer ve şunları üretir:
 *   - shared/blog-content.generated.ts  → React ve scripts/prerender.ts'in okuduğu yazı listesi
 *   - client/public/sitemap.xml         → yalnızca blog girişleri (yazılar ve /blog/) eşitlenir
 *   - client/public/llms.txt            → yalnızca blog bölümü yeniden yazılır
 * Blog dışındaki sitemap ve llms.txt satırlarına dokunulmaz.
 *
 * Hesaplama mantığı `shared/blog-build.ts` içindedir (panel API'si de aynısını kullanır); bu dosya yalnızca diskle konuşur.
 * `content/redirects.json` (silinen yazıların yönlendirmeleri) da burada doğrulanır; sayfaları `scripts/prerender.ts` üretir.
 *
 * `--check`: dosya yazmaz; üretilecek içerik diskteki dosyalardan farklıysa 1 koduyla çıkar.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { BlogPost } from "../shared/blog-meta";
import { blogFileName, validateBlogCollection, validateBlogPost, type BlogPostInput } from "../shared/blog-schema";
import { parseRedirects, REDIRECTS_PATH, validateRedirectsAgainstPosts, type BlogRedirect } from "../shared/blog-redirects";
import { CONTENT_DIR, GENERATED_PATH, LLMS_PATH, SITE_URL, SITEMAP_PATH, renderGeneratedFiles } from "../shared/blog-build";

export { CONTENT_DIR, GENERATED_PATH, LLMS_PATH, SITE_URL, SITEMAP_PATH } from "../shared/blog-build";
export { llmsBlogLines, renderGeneratedModule, sitemapPostLine, syncLlmsTxt, syncSitemap, toSitePosts } from "../shared/blog-build";

export type LoadResult = { posts: BlogPostInput[]; errors: string[] };

/** Klasördeki tüm yazıları okur ve doğrular. Hata varsa `errors` doludur; yine de geçerli yazılar `posts` içinde gelir. */
export function loadContent(root = process.cwd()): LoadResult {
  const dir = path.join(root, CONTENT_DIR);
  const posts: BlogPostInput[] = [];
  const errors: string[] = [];
  if (!fs.existsSync(dir)) return { posts, errors: [`${CONTENT_DIR} klasörü bulunamadı`] };

  const files = fs.readdirSync(dir).filter(name => name.endsWith(".json")).sort();
  for (const file of files) {
    let data: unknown;
    try {
      data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    } catch (error) {
      errors.push(`${file}: geçerli JSON değil (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }
    const result = validateBlogPost(data);
    if (!result.ok) {
      errors.push(...result.errors.map(message => `${file}: ${message}`));
      continue;
    }
    if (blogFileName(result.post.slug) !== file) errors.push(`${file}: dosya adı adresle uyuşmuyor, "${blogFileName(result.post.slug)}" olmalı`);
    posts.push(result.post);
  }
  errors.push(...validateBlogCollection(posts));
  return { posts, errors };
}

/** content/redirects.json dosyasını okur ve doğrular. Dosya yoksa boş liste döner. */
export function loadRedirects(root = process.cwd(), publishedSlugs: string[] = []): { redirects: BlogRedirect[]; errors: string[] } {
  const file = path.join(root, REDIRECTS_PATH);
  if (!fs.existsSync(file)) return { redirects: [], errors: [] };
  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return { redirects: [], errors: [`${REDIRECTS_PATH}: geçerli JSON değil (${error instanceof Error ? error.message : String(error)})`] };
  }
  const parsed = parseRedirects(data);
  return { redirects: parsed.redirects, errors: [...parsed.errors, ...validateRedirectsAgainstPosts(parsed.redirects, publishedSlugs)] };
}

export type BuildResult = { posts: BlogPost[]; files: { path: string; content: string; changed: boolean }[] };

/** Girdileri doğrular ve üretilecek dosyaların içeriğini hesaplar (yazmaz). Doğrulama hatasında Error fırlatır. */
export function planBuild(root = process.cwd()): BuildResult {
  const { posts: all, errors } = loadContent(root);
  const published = all.filter(post => post.status !== "draft").map(post => post.slug);
  errors.push(...loadRedirects(root, published).errors);
  if (errors.length) throw new Error(`İçerik doğrulanamadı (${errors.length} hata):\n${errors.map(error => `  - ${error}`).join("\n")}`);
  const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
  const existing = (file: string) => (fs.existsSync(path.join(root, file)) ? read(file) : "");
  const { posts, files } = renderGeneratedFiles(all, { sitemap: read(SITEMAP_PATH), llms: read(LLMS_PATH) });
  return { posts, files: files.map(file => ({ ...file, changed: existing(file.path) !== file.content })) };
}

async function main() {
  const check = process.argv.includes("--check");
  const root = process.cwd();
  try {
    const { posts, files } = planBuild(root);
    const changed = files.filter(file => file.changed);
    if (check) {
      if (changed.length) {
        console.error(`İçerik güncel değil, "pnpm content" çalıştırın: ${changed.map(file => file.path).join(", ")}`);
        process.exit(1);
      }
      console.log(`İçerik güncel: ${posts.length} yazı.`);
      return;
    }
    for (const file of changed) fs.writeFileSync(path.join(root, file.path), file.content, "utf8");
    console.log(`İçerik derlendi: ${posts.length} yazı${changed.length ? `; güncellenen: ${changed.map(file => file.path).join(", ")}` : "; dosyalar zaten güncel"}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

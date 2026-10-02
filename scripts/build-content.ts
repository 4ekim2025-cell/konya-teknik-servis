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
 * `--check`: dosya yazmaz; üretilecek içerik diskteki dosyalardan farklıysa 1 koduyla çıkar.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BLOG_AUTHOR, type BlogPost } from "../shared/blog-meta";
import { blogFileName, validateBlogCollection, validateBlogPost, type BlogPostInput } from "../shared/blog-schema";

export const SITE_URL = "https://esliteknik.com";
export const CONTENT_DIR = "content/blog";
export const GENERATED_PATH = "shared/blog-content.generated.ts";
export const SITEMAP_PATH = "client/public/sitemap.xml";
export const LLMS_PATH = "client/public/llms.txt";

/** Rehber yazıları (bakım/karar) sitemap'te 0.7, diğerleri 0.6 öncelik alır. */
const GUIDE_CATEGORIES = new Set<string>(["Bakım Rehberi", "Karar Rehberi"]);

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

/** Siteye giden liste: taslaklar çıkar, `order` sırasına göre dizilir, siteye gitmeyen alanlar (order, status) atılır. */
export function toSitePosts(posts: BlogPostInput[]): BlogPost[] {
  return posts
    .filter(post => post.status !== "draft")
    .sort((a, b) => a.order - b.order)
    .map(({ order: _order, status: _status, ...post }) => post);
}

export function renderGeneratedModule(posts: BlogPost[]): string {
  return `// BU DOSYA OTOMATİK ÜRETİLİR — elle düzenlemeyin.
// Kaynak: content/blog/*.json · Üreten: scripts/build-content.ts (pnpm content)
import type { BlogPost } from "./blog-meta";

export const blogPostsData: BlogPost[] = ${JSON.stringify(posts, null, 2)};
`;
}

const sitemapLine = (loc: string, lastmod: string, changefreq: string, priority: string) =>
  `  <url><loc>${SITE_URL}${loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
const SITEMAP_BLOG_LINE = /^\s*<url><loc>https:\/\/esliteknik\.com(\/blog\/[^<]*)<\/loc>/;
const SITEMAP_LASTMOD = /<lastmod>([^<]*)<\/lastmod>/;

export function sitemapPostLine(post: BlogPost): string {
  return sitemapLine(post.slug, post.updated, "monthly", GUIDE_CATEGORIES.has(post.category) ? "0.7" : "0.6");
}

/**
 * sitemap.xml'deki blog satırlarını yazılarla eşitler. Mevcut satırlar yerinde güncellenir (sıra korunur),
 * listede olmayan (silinmiş ya da taslak) yazıların satırı kalkar, yeni yazılar /blog/ satırından hemen önce eklenir.
 * /blog/ satırının tarihi en yeni güncelleme tarihidir.
 */
export function syncSitemap(xml: string, posts: BlogPost[]): string {
  const bySlug = new Map(posts.map(post => [post.slug, post]));
  const placed = new Set<string>();
  const out: string[] = [];
  let indexSeen = false;

  for (const line of xml.split("\n")) {
    const match = SITEMAP_BLOG_LINE.exec(line);
    if (!match) {
      out.push(line);
      continue;
    }
    const slug = match[1];
    if (slug === "/blog/") {
      for (const post of posts) {
        if (!placed.has(post.slug)) {
          out.push(sitemapPostLine(post));
          placed.add(post.slug);
        }
      }
      const newest = posts.map(post => post.updated).sort().at(-1) ?? SITEMAP_LASTMOD.exec(line)?.[1] ?? "";
      out.push(sitemapLine("/blog/", newest, "weekly", "0.8"));
      indexSeen = true;
    } else if (bySlug.has(slug) && !placed.has(slug)) {
      out.push(sitemapPostLine(bySlug.get(slug)!));
      placed.add(slug);
    }
  }
  if (!indexSeen) throw new Error(`${SITEMAP_PATH}: /blog/ satırı bulunamadı, blog girişleri eşitlenemedi`);
  return out.join("\n");
}

const LLMS_BLOG_HEAD = `- [Blog: sahadan arıza hikâyeleri ve bakım rehberleri](${SITE_URL}/blog/)`;

export function llmsBlogLines(posts: BlogPost[]): string[] {
  return [`${LLMS_BLOG_HEAD} — Yazar: ${BLOG_AUTHOR.name}`, ...posts.map(post => `  - [${post.title}](${SITE_URL}${post.slug}) (${post.category})`)];
}

/** llms.txt'deki blog bölümünü (Blog satırı ve altındaki girintili yazı satırları) yeniden yazar; gerisine dokunmaz. */
export function syncLlmsTxt(text: string, posts: BlogPost[]): string {
  const lines = text.split("\n");
  const start = lines.findIndex(line => line.startsWith(LLMS_BLOG_HEAD));
  if (start < 0) throw new Error(`${LLMS_PATH}: blog bölümü bulunamadı, eşitlenemedi`);
  let end = start + 1;
  while (end < lines.length && lines[end].startsWith("  - [")) end++;
  lines.splice(start, end - start, ...llmsBlogLines(posts));
  return lines.join("\n");
}

export type BuildResult = { posts: BlogPost[]; files: { path: string; content: string; changed: boolean }[] };

/** Girdileri doğrular ve üretilecek dosyaların içeriğini hesaplar (yazmaz). Doğrulama hatasında Error fırlatır. */
export function planBuild(root = process.cwd()): BuildResult {
  const { posts: all, errors } = loadContent(root);
  if (errors.length) throw new Error(`İçerik doğrulanamadı (${errors.length} hata):\n${errors.map(error => `  - ${error}`).join("\n")}`);
  const posts = toSitePosts(all);
  const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
  const existing = (file: string) => (fs.existsSync(path.join(root, file)) ? read(file) : "");
  const outputs: [string, string][] = [
    [GENERATED_PATH, renderGeneratedModule(posts)],
    [SITEMAP_PATH, syncSitemap(read(SITEMAP_PATH), posts)],
    [LLMS_PATH, syncLlmsTxt(read(LLMS_PATH), posts)],
  ];
  return { posts, files: outputs.map(([file, content]) => ({ path: file, content, changed: existing(file) !== content })) };
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

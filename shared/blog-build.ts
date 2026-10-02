/**
 * İçerik derleyicinin saf (dosya sistemi kullanmayan) kısmı.
 * `scripts/build-content.ts` (build) ve panel API'si (`server/admin`) aynı fonksiyonlarla üretilen dosyaları hesaplar;
 * böylece panelin yaptığı commit, `pnpm content --check` ve testlerle birebir uyumlu kalır.
 *
 * Üretilen dosyalar:
 *   - shared/blog-content.generated.ts  → React ve scripts/prerender.ts'in okuduğu yazı listesi
 *   - client/public/sitemap.xml         → yalnızca blog girişleri (yazılar ve /blog/) eşitlenir
 *   - client/public/llms.txt            → yalnızca blog bölümü yeniden yazılır
 * Blog dışındaki sitemap ve llms.txt satırlarına dokunulmaz.
 */
import { BLOG_AUTHOR, type BlogPost } from "./blog-meta.js";
import type { BlogPostInput } from "./blog-schema.js";

export const SITE_URL = "https://esliteknik.com";
export const CONTENT_DIR = "content/blog";
export const GENERATED_PATH = "shared/blog-content.generated.ts";
export const SITEMAP_PATH = "client/public/sitemap.xml";
export const LLMS_PATH = "client/public/llms.txt";

/** Rehber yazıları (bakım/karar) sitemap'te 0.7, diğerleri 0.6 öncelik alır. */
const GUIDE_CATEGORIES = new Set<string>(["Bakım Rehberi", "Karar Rehberi"]);

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

export type GeneratedFile = { path: string; content: string };

/**
 * Doğrulanmış tüm yazılardan (taslaklar dahil) üretilecek üç dosyanın içeriğini hesaplar.
 * Girdi olarak diskteki ya da GitHub'daki güncel sitemap.xml ve llms.txt metni verilir.
 */
export function renderGeneratedFiles(all: BlogPostInput[], sources: { sitemap: string; llms: string }): { posts: BlogPost[]; files: GeneratedFile[] } {
  const posts = toSitePosts(all);
  return {
    posts,
    files: [
      { path: GENERATED_PATH, content: renderGeneratedModule(posts) },
      { path: SITEMAP_PATH, content: syncSitemap(sources.sitemap, posts) },
      { path: LLMS_PATH, content: syncLlmsTxt(sources.llms, posts) },
    ],
  };
}

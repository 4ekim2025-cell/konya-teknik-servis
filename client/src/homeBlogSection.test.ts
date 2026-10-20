import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { blogPosts, latestBlogPosts } from "@shared/blog-posts";

const root = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("ana sayfa: Blogdan son yazılar", () => {
  const home = read("client/src/pages/Home.tsx");

  it("bölüm online takip ile arıza rehberleri arasında durur", () => {
    const tracking = home.indexOf('<section className="tracking-section" id="takip">');
    const blog = home.indexOf("<HomeBlogSection/>");
    const guides = home.indexOf("<HomeRepairGuides/>");
    expect(tracking).toBeGreaterThan(-1);
    expect(blog).toBeGreaterThan(tracking);
    expect(guides).toBeGreaterThan(blog);
    expect(read("client/src/index.css")).toContain(".home-primary-flow>.tracking-section{order:2}.home-primary-flow>.home-blog{order:3}.home-primary-flow>.home-repair-guides{order:4}");
  });

  it("blog verisi ana sayfa paketine girmez, ayrı parça olarak yüklenir", () => {
    expect(home).toContain('import("@shared/blog-posts")');
    expect(home).not.toMatch(/from "@shared\/blog-posts"/);
  });

  it("kapaklı yazı fotoğrafla, boyutları ve geç yüklemeyle gösterilir", () => {
    expect(home).toContain('<img src={blogImageSmallUrl(cover.src)} width={thumb.width} height={thumb.height} alt={cover.alt} loading="lazy" decoding="async"/>');
  });

  it("en yeni yazılar blog listesiyle aynı sırada gelir", () => {
    const latest = latestBlogPosts(blogPosts, 6);
    expect(latest.length).toBe(Math.min(6, blogPosts.length));
    for (let i = 1; i < latest.length; i++) expect(latest[i - 1].published >= latest[i].published).toBe(true);
    expect(latest[0].published).toBe([...blogPosts].map(post => post.published).sort().at(-1));
  });

  it("aynı yazılar prerender HTML'inde statik olarak yer alır", () => {
    const prerender = read("scripts/prerender.ts");
    expect(prerender).toContain("latestBlogPosts(blogPosts, HOME_BLOG_LIMIT)");
    expect(prerender).toContain('<a href="/vestel-servisi-konya/">Vestel Servisi</a></p></nav>${homeBlogHtml()}');
    expect(prerender).toContain("post.cover ? blogCardImageHtml(post.cover)");
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { blogPosts, latestBlogPosts } from "@shared/blog-posts";

const root = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("ana sayfa: Blogdan son yazılar", () => {
  const home = read("client/src/pages/Home.tsx");

  it("bölüm güvence ile arıza rehberleri arasında durur", () => {
    const guarantee = home.indexOf("<GuaranteeSection/>");
    const blog = home.indexOf("<HomeBlogSection/>");
    const guides = home.indexOf("<HomeRepairGuides/>");
    expect(guarantee).toBeGreaterThan(-1);
    expect(blog).toBeGreaterThan(guarantee);
    expect(guides).toBeGreaterThan(blog);
    expect(read("client/src/index.css")).toContain(".home-primary-flow~.guarantee-section{order:4}.home-primary-flow~.home-blog{order:5}.home-primary-flow~.home-repair-guides{order:6}");
  });

  it("ana sayfa sırası: yorumlar, hizmetler, online takip, servis talebi; blog ve rehberler sonra gelir", () => {
    const order = [
      "<GoogleReviewsSection/>",
      '<section id="hizmetler" className="services-section">',
      '<section className="tracking-section" id="takip">',
      '<div id="on-bilgi-formu" className="preform-wrap">',
      '<section className="proof-section">',
      "<GuaranteeSection/>",
      "<HomeBlogSection/>",
      "<HomeRepairGuides/>",
      '<section id="hizmet-rehberi" className="service-guide"',
      '<section className="faq-section">',
      "<InstagramFeed/>",
    ].map(marker => home.indexOf(marker));
    expect(order.every(index => index > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(read("client/src/index.css")).toContain(".home-primary-flow>.services-section{order:2}.home-primary-flow>.tracking-section{order:3}.home-primary-flow~.preform-wrap{order:2}");
  });

  it("kenar payı diğer ana sayfa bölümleriyle aynıdır, bilgisayarda satırda 4 yazı", () => {
    const css = read("client/src/index.css");
    expect(css).toContain(".home-blog{position:relative;overflow:hidden;padding:96px var(--site-gutter,30px);");
    expect(css).toContain(".home-blog-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));");
    expect(home).toContain("const HOME_BLOG_LIMIT=8;");
  });

  it("blog verisi ana sayfa paketine girmez, ayrı parça olarak yüklenir", () => {
    expect(home).toContain('import("@shared/blog-posts")');
    expect(home).not.toMatch(/from "@shared\/blog-posts"/);
  });

  it("kapaklı yazı fotoğrafla, boyutları ve geç yüklemeyle gösterilir", () => {
    expect(home).toContain('<img src={blogImageSmallUrl(cover.src)} width={thumb.width} height={thumb.height} alt={cover.alt} loading="lazy" decoding="async"/>');
  });

  it("en yeni yazılar blog listesiyle aynı sırada gelir", () => {
    const latest = latestBlogPosts(blogPosts, 8);
    expect(latest.length).toBe(Math.min(8, blogPosts.length));
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

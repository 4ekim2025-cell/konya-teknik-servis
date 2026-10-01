import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_AUTHOR, blogCategories, blogPosts, blogShareLinks } from "../../shared/blog-posts";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");
const sitemap = read("client/public/sitemap.xml");
const page = read("client/src/pages/ContentPage.tsx");
const prerender = read("scripts/prerender.ts");

describe("blog yazıları", () => {
  it("her yazının adresi, açıklaması ve kategorisi tutarlıdır", () => {
    const slugs = blogPosts.map(post => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    blogPosts.forEach(post => {
      expect(post.slug).toMatch(/^\/blog\/[a-z0-9-]+\/$/);
      expect(post.description.length).toBeLessThanOrEqual(160);
      expect(blogCategories).toContain(post.category);
      expect(post.updated >= post.published).toBe(true);
      expect(sitemap).toContain(`<loc>https://esliteknik.com${post.slug}</loc>`);
    });
    expect(new Set(blogPosts.map(post => post.description)).size).toBe(blogPosts.length);
  });

  it("eski yazıların adreslerini korur", () => {
    ["/blog/bulasik-makinesi-suyu-bosaltmiyor/", "/blog/buzdolabi-sogutmuyor-konya/", "/blog/camasir-makinesi-su-almiyor-konya/", "/blog/firin-isitmiyor-konya/", "/blog/kurutma-makinesi-kurutmuyor/"]
      .forEach(slug => expect(blogPosts.map(post => post.slug)).toContain(slug));
  });

  it("usta vakaları servis kaydı bilgisiyle ve hizmet bölgelerinde anlatılır", () => {
    const cases = blogPosts.filter(post => post.category === "Ustanın Defterinden");
    expect(cases.length).toBeGreaterThanOrEqual(5);
    cases.forEach(post => {
      expect(post.caseFile).toBeDefined();
      expect(post.caseFile?.district).toMatch(/^(Karatay|Meram|Selçuklu)/);
      expect(post.brandPath).toMatch(/^\/[a-z-]+-servisi-konya\/$/);
      expect(sitemap).toContain(`<loc>https://esliteknik.com${post.brandPath}</loc>`);
    });
    expect(cases.filter(post => post.caseFile?.district.startsWith("Meram")).length).toBeGreaterThanOrEqual(4);
    expect(cases.filter(post => post.caseFile?.brand === "Philips").length).toBeGreaterThanOrEqual(5);
    expect(cases.some(post => post.caseFile?.device === "Su sebili" && post.servicePath === "/su-sebili-tamiri-konya/")).toBe(true);
    expect(page).toContain('className="blog-case-brand" href={post.brandPath}');
    expect(page).toContain("{isBrand&&<BrandCases name={d.name}/>}");
    expect(prerender).toContain("post.caseFile?.brand === brandName");
    expect(prerender).toContain('<a href="${post.brandPath}">Konya ${esc(post.caseFile.brand)} servisi</a>');
  });

  it("yalnızca Türkçe kaynaklara bağlantı verir", () => {
    blogPosts.flatMap(post => post.sources ?? []).forEach(source => {
      expect(source.url).not.toMatch(/\.gov\/|fda\.|cdc\.|usda\./i);
      expect(source.label).toMatch(/[çğıöşüÇĞİÖŞÜ]/);
    });
  });

  it("hukuki konu, fiyat ve yetkili servis iddiası içermez", () => {
    const text = JSON.stringify(blogPosts);
    expect(text).not.toMatch(/MEDAŞ|tazminat|hakem heyeti|mahkeme|₺|\bTL\b/i);
    expect(text).not.toMatch(/yetkili servisiyiz|yetkili servisi olarak/i);
  });

  it("yazar ve paylaşım bağlantılarını hem sayfada hem prerender HTML'inde gösterir", () => {
    expect(BLOG_AUTHOR.name).toBe("Esad Eşli");
    const links = blogShareLinks("https://esliteknik.com/blog/ornek/", "Örnek");
    expect(links.whatsapp.startsWith("https://wa.me/?text=")).toBe(true);
    expect(links.facebook).toContain("facebook.com/sharer");
    expect(links.x).toContain("x.com/intent/post");
    expect(page).toContain("<BlogShare url={url} title={post.title}/>");
    expect(page).toContain("<BlogAuthor/>");
    expect(prerender).toContain("blogPostHtml(blogPost)");
    expect(prerender).toContain('"@type": "BlogPosting"');
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BLOG_AUTHOR, blogCategories, blogPosts, blogShareLinks } from "../../shared/blog-posts";
import { SITE_DISCLAIMER } from "../../shared/site-disclaimer";
import { validateBlogPost } from "../../shared/blog-schema";

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

  it("üretilen yazı listesindeki her yazı ortak şemadan geçer", () => {
    blogPosts.forEach(post => {
      const result = validateBlogPost({ ...post, order: 1 });
      expect(result.ok ? [] : result.errors, post.slug).toEqual([]);
    });
  });

  it("eski yazıların adreslerini korur", () => {
    ["/blog/bulasik-makinesi-suyu-bosaltmiyor/", "/blog/buzdolabi-sogutmuyor-konya/", "/blog/camasir-makinesi-su-almiyor-konya/", "/blog/firin-isitmiyor-konya/", "/blog/kurutma-makinesi-kurutmuyor/"]
      .forEach(slug => expect(blogPosts.map(post => post.slug)).toContain(slug));
  });

  it("usta vakaları servis kaydı bilgisiyle ve hizmet bölgelerinde anlatılır", () => {
    const cases = blogPosts.filter(post => post.category === "Ustanın Defterinden");
    cases.forEach(post => {
      expect(post.caseFile).toBeDefined();
      expect(post.caseFile?.district).toMatch(/^(Karatay|Meram|Selçuklu)/);
      expect(post.brandPath).toMatch(/^\/[a-z-]+-servisi-konya\/$/);
      expect(sitemap).toContain(`<loc>https://esliteknik.com${post.brandPath}</loc>`);
    });
    cases.filter(post => post.caseFile?.device === "Su sebili").forEach(post => expect(post.servicePath).toBe("/su-sebili-tamiri-konya/"));
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

  it("prerender kaynak adresini kaçışlı basar ve değiştirme metinlerini işlev olarak verir ($ kalıpları yorumlanmaz)", () => {
    expect(prerender).toContain('<a href="${esc(source.url)}" rel="nofollow">');
    expect(prerender).not.toContain('href="${source.url}"');
    const replaceLines = prerender.split("\n").filter(line => line.includes("html = html.replace("));
    expect(replaceLines.length).toBeGreaterThan(10);
    replaceLines.forEach(line => expect(line, line.trim().slice(0, 80)).toMatch(/, \(\) => /));
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

  it("site geneli bilgilendirme notu tüm sayfaların alt bilgisindedir; sayfa içeriğinde ayrıca tekrar etmez", () => {
    for (const phrase of ["Bu site genelinde bulunan tüm bilgiler genel geçer bilgilerdir", "Tavsiye niteliği taşımaz", "cihaza müdahale etmeyin", "yetkili servisten veya yetkin bir özel servisten uzman desteği alın"]) expect(SITE_DISCLAIMER.text).toContain(phrase);
    expect(SITE_DISCLAIMER.text).not.toMatch(/yetkili servisiyiz|yetkili servisi olarak|Eşli Teknik yetkili/i);
    // React: not alt bilgide (Footer), bağlantılarla telif satırı arasında; tüm sayfalar aynı Footer'ı kullanır.
    const chrome = readFileSync(resolve(import.meta.dirname, "components/SiteChrome.tsx"), "utf8");
    expect(chrome).toContain('<p className="footer-disclaimer" role="note"><strong>{SITE_DISCLAIMER.title}:</strong> {SITE_DISCLAIMER.text}</p><div className="footer-bottom">');
    expect(chrome.match(/SITE_DISCLAIMER\.text/g)).toHaveLength(1);
    // Sayfa içeriğinde (blog listesi, yazı sayfası) ayrıca yer almaz: aynı bilgi bir sayfada iki kez geçmez.
    expect(page).not.toContain("DISCLAIMER");
    expect(page).not.toContain("blog-disclaimer");
    // Prerender: her rotanın statik içeriğinin en sonunda bir kez; blog listesi ve yazı HTML'ine ayrıca yazılmaz.
    expect(prerender).toContain("${sections}${staticContact}${staticDisclaimer}</main>`;");
    expect(prerender.match(/SITE_DISCLAIMER\.text/g)).toHaveLength(1);
    expect(prerender.slice(prerender.indexOf("function blogIndexHtml()"), prerender.indexOf("function deviceBlogLinksHtml("))).not.toContain("DISCLAIMER");
    const css = readFileSync(resolve(import.meta.dirname, "index.css"), "utf8");
    expect(css).toContain(".footer-disclaimer{max-width:980px;margin:0;padding:0 0 20px;color:#a3a9a5;font-size:12px;line-height:1.65}");
    expect(css).not.toContain(".blog-disclaimer");
  });
});

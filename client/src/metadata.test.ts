import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const html = readFileSync(resolve(projectRoot, "client", "index.html"), "utf8");
const app = readFileSync(resolve(projectRoot, "client", "src", "App.tsx"), "utf8");
const robots = readFileSync(resolve(projectRoot, "client", "public", "robots.txt"), "utf8");
const sitemap = readFileSync(resolve(projectRoot, "client", "public", "sitemap.xml"), "utf8");
const expectedTitle = "EŞLİ TEKNİK | Konya Beyaz Eşya Teknik Servisi";
const expectedDescription =
  "Konya’da beyaz eşya ve küçük ev aletleri teknik servisi. Aynı gün servis, orijinal parça ve online servis takibi için Eşli Teknik’e ulaşın.";
const productionOrigin = "https://esliteknik.com";

describe("ana sayfa başlığı ve sosyal paylaşım metadatası", () => {
  it("tarayıcı başlığı ile statik paylaşım başlığını eşit tutar", () => {
    expect(html).toContain(`<title>${expectedTitle}</title>`);
    expect(html).toContain(`<meta property="og:title" content="${expectedTitle}" />`);
    expect(app).toContain(`Konya Beyaz Eşya Teknik Servisi`);
  });

  it("WhatsApp ve sosyal paylaşım açıklamasını statik Open Graph etiketinde sunar", () => {
    expect(html).toContain(`<meta name="description" content="${expectedDescription}" />`);
    expect(html).toContain(`<meta property="og:description" content="${expectedDescription}" />`);
    expect(html).toContain(`<meta name="twitter:description" content="${expectedDescription}" />`);
    expect(app).toContain(expectedDescription);
  });

  it("robots ve sitemap dosyalarında nihai üretim alan adını kullanır", () => {
    expect(robots).toContain(`Sitemap: ${productionOrigin}/sitemap.xml`);
    expect(sitemap).toContain(`<loc>${productionOrigin}/</loc>`);
    expect(sitemap).not.toContain("konya-teknik-servis.manus.space");
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { brandGuides } from "../../shared/brand-guides";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");
const priority = ["Samsung", "Franke", "Vestel", "Hoover", "Arçelik", "Regal", "Altus", "Grundig", "Beko", "Sinbo"];
const brands = Object.keys(brandGuides);

describe("marka sayfalarının özgün içeriği", () => {
  it("22 markayı kapsar, öncelikli markalarda daha derin içerik verir", () => {
    expect(brands).toHaveLength(22);
    brands.forEach(brand => {
      const guide = brandGuides[brand];
      const isPriority = priority.includes(brand);
      expect(guide.notes).toHaveLength(isPriority ? 4 : 2);
      expect(guide.faqs).toHaveLength(isPriority ? 3 : 2);
      expect(guide.description.length).toBeLessThanOrEqual(160);
      expect(guide.description).toContain(brand);
      guide.faqs.forEach(([, answer]) => expect(answer.length).toBeGreaterThanOrEqual(180));
    });
    expect(new Set(brands.map(brand => brandGuides[brand].description)).size).toBe(brands.length);
  });

  it("markalar arasında kalıp cevap ve yetkili servis iddiası içermez", () => {
    const text = JSON.stringify(brandGuides);
    expect(text).not.toMatch(/Üretici kapsamındaysa|Net bir tutar önceden verilmez|Kodlar modele göre değişir|Neden yerinde incelemeyle belirlenir|garanti|₺|\bTL\b/);
    expect(text).not.toMatch(/yetkili servis/i);
    brands.forEach(brand => expect(brandGuides[brand].faqs.map(([q]) => q).join(" ")).not.toMatch(/ücret|hata kod|servisi (kim|nerede|var mı)/i));
  });

  it("Grundig, Regal ve Sinbo sayfalarını tüm kaynaklarda tanımlar", () => {
    const app = read("client/src/App.tsx"), page = read("client/src/pages/ContentPage.tsx"), prerender = read("scripts/prerender.ts"), sitemap = read("client/public/sitemap.xml");
    ["grundig", "regal", "sinbo"].forEach(slug => {
      expect(app).toContain(`"/${slug}-servisi-konya/"`);
      expect(sitemap).toContain(`<loc>https://esliteknik.com/${slug}-servisi-konya/</loc>`);
      expect(prerender).toContain(`["${slug}", `);
    });
    expect(page).toContain('"Grundig":"/grundig-servisi-konya/"');
    expect(page).toContain('"Sinbo":"/sinbo-servisi-konya/"');
    const siteChrome = read("client/src/components/SiteChrome.tsx");
    ["grundig", "sinbo", "regal"].forEach(slug => expect(siteChrome).toContain(`href: "/${slug}-servisi-konya/"`));
  });

  it("bağımsız servis açıklamasını marka metinlerinde değil, sayfada tek bir ortak satırda gösterir", () => {
    const page = read("client/src/pages/ContentPage.tsx");
    expect(page).toContain('{brandGuide?<BrandNotes name={d.name}/>:');
    expect(page.match(/üreticilerin resmî yetkili servisi değildir/g)).toHaveLength(1);
  });
});

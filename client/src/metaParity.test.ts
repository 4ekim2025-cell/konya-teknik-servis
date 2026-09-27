import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { brandSeo } from "./brandSeo";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");
const prerender = read("scripts/prerender.ts");
const page = read("client/src/pages/ContentPage.tsx");

describe("ilk HTML ile sayfanın koyduğu başlık ve açıklama aynıdır", () => {
  it("marka sayfalarında HTML başlığı brandSeo başlığıdır", () => {
    expect(prerender).toContain('import { brandSeo } from "../client/src/brandSeo";');
    expect(prerender).toContain("brandSeo[name]?.title");
    expect(prerender).toContain("<title>${esc(documentTitle)}</title>");
    Object.values(brandSeo).forEach(({ title }) => expect(title.length).toBeLessThanOrEqual(65));
  });

  it("sabit sayfaların başlık ve açıklamaları iki tarafta aynıdır", () => {
    const simplePages = ["Konya Online Servis Takibi | Eşli Teknik", "Konya Teknik Servis SSS | Eşli Teknik", "Konya Teknik Servis İletişim | Eşli Teknik", "KVKK Aydınlatma Metni | Eşli Teknik", "Gizlilik Politikası | Eşli Teknik Konya", "Çerez Politikası | Eşli Teknik Konya", "Hakkımızda | Eşli Teknik Konya", "Konya Beyaz Eşya Servis Markaları | Eşli Teknik"];
    simplePages.forEach(title => {
      expect(prerender).toContain(`"${title}"`);
      expect(page).toContain(`title:"${title}"`);
    });
    expect(page).not.toMatch(/\b19 (beyaz eşya|markanın)/);
  });
});

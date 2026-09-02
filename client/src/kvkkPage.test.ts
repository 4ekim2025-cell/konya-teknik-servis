import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const contentPage = readFileSync(
  resolve(projectRoot, "client", "src", "pages", "ContentPage.tsx"),
  "utf8",
);
const styles = readFileSync(resolve(projectRoot, "client", "src", "index.css"), "utf8");

describe("KVKK alt sayfa standardı", () => {
  it("KVKK için standartlaştırılmış belge ve yardımcı eylem alanlarını sunar", () => {
    expect(contentPage).toContain('className="kvkk-page"');
    expect(contentPage).toContain('className="legal legal-layout"');
    expect(contentPage).toContain('className="legal-document"');
    expect(contentPage).toContain('className="legal-aside"');
  });

  it("ekli aydınlatma metninin sekiz bölümünü ve temel iletişim bilgilerini içerir", () => {
    for (const heading of ["Veri Sorumlusu", "İşlenen Kişisel Veriler", "Kişisel Verilerin İşlenme Amaçları", "Kişisel Verilerin Toplanma Yöntemi ve Hukuki Sebebi", "Kişisel Verilerin Aktarılması", "Kişisel Verilerin Saklanması", "İlgili Kişinin Hakları", "Başvuru"]) {
      expect(contentPage).toContain(`title: "${heading}"`);
    }
    expect(contentPage).toContain("Mevlüt Esad EŞLİ");
    expect(contentPage).toContain("0 551 185 87 73");
    expect(contentPage).toContain("KVKK'nın 11. maddesi");
  });

  it("masaüstü ve mobilde kartlı belge düzenini koruyan kurallara sahiptir", () => {
    expect(styles).toContain(".kvkk-page .legal-layout");
    expect(styles).toContain(".kvkk-page .legal-document");
    expect(styles).toContain("@media(max-width:860px){.kvkk-page .simple-hero");
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const header = readFileSync(resolve(root, "client/src/components/SiteChrome.tsx"), "utf8");
const styles = readFileSync(resolve(root, "client/src/index.css"), "utf8");

describe("geniş header navigasyon rayları", () => {
  it("masaüstü ve mobil menüde KVKK erişimi sunar", () => {
    expect(header).toContain('href="/kvkk/"');
    expect(header).toContain('>KVKK</span>');
  });

  it("menü öğelerinde kısa yardımcı açıklamalar ve eşit esnek raylar kullanır", () => {
    expect(header).toContain('hint: "Cihaz ve tamir"');
    expect(header).toContain("<small>19 servis rehberi</small>");
    expect(styles).toContain(".header-row>.desktop-nav{width:100%!important;max-width:none;align-items:stretch;gap:0;padding:8px 9px}");
    expect(styles).toContain(".header-row>.desktop-nav a,.header-row>.desktop-nav .desktop-brands-trigger{display:flex;flex:1 1 0");
  });

  it("SSS sayfasını korurken SSS bağlantısını ana menü öğelerinden çıkarır", () => {
    expect(header).not.toContain('hint: "Hızlı yanıtlar"');
    expect(header).toContain('href="/sss/"');
  });

  it("marka mega menüsü kartlarını her kolonun sol başlangıcına yaslar", () => {
    expect(styles).toContain(".brands-mega-grid{padding:12px 0}");
    expect(styles).toContain(".brands-mega-grid a{padding:8px 0 8px 0;justify-content:flex-start}");
  });
});

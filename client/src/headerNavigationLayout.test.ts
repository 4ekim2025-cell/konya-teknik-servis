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
    expect(header).toContain("const brandColumns = [");
    expect(header).toContain('className="brands-mega-column"');
    expect(styles).toContain(".brands-mega-grid{padding:12px 0}");
    expect(styles).toContain(".header-row>.desktop-nav .brands-mega-column a{display:grid;flex:0 0 auto;width:80%;padding:8px 10px;justify-content:stretch;justify-items:stretch;text-align:left}");
    expect(styles).toContain(".header-row>.desktop-nav .brands-mega-column a>strong{min-width:0;justify-self:start;text-align:left}");
  });
});


describe("ana sayfa bölüm bağlantıları", () => {
  it("alt sayfalardan hizmetler bölümüne doğrudan yönlendirir", () => {
    expect(header).toContain('label: "Hizmetlerimiz"');
    expect(header).toContain('href: "/#hizmetler"');
  });
});

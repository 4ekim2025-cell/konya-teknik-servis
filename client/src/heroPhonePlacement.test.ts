import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");
const siteChrome = readFileSync(resolve(projectRoot, "client/src/components/SiteChrome.tsx"), "utf8");
const home = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");
const styles = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");

describe("header ve hero iletişim yerleşimi", () => {
  it("header araçlarını kaldırır, logoyu iki masaüstü menü grubu arasına yerleştirir", () => {
    expect(siteChrome).not.toContain('className="desktop-tools"');
    expect(siteChrome).not.toContain("header-phone");
    expect(siteChrome).not.toContain("header-support");
    expect(siteChrome).toContain('className="desktop-nav desktop-nav-left"');
    expect(siteChrome).toContain('className="desktop-nav desktop-nav-right"');
    expect(siteChrome.indexOf('className="desktop-nav desktop-nav-left"')).toBeLessThan(siteChrome.indexOf('className="brand"'));
    expect(siteChrome.indexOf('className="brand"')).toBeLessThan(siteChrome.indexOf('className="desktop-nav desktop-nav-right"'));
  });

  it("merkezi telefon yapılandırmasını hero bölge etiketlerinin üstünde kullanır", () => {
    expect(home).toContain('className="hero-phone"');
    expect(home).toContain("SITE_PHONE_DISPLAY");
    expect(home.indexOf('className="hero-phone"')).toBeLessThan(home.indexOf('className="hero-regions"'));
  });

  it("masaüstünde ilçeleri dikey grupta, logoyu bu grubun yanında konumlandırır", () => {
    expect(home).toContain('className="hero-region-stack"');
    expect(home).toContain('className="hero-logo-stack"');
    expect(home.indexOf('className="hero-region-stack"')).toBeLessThan(home.indexOf('className="hero-logo-stack"'));
    expect(styles).toContain(".hero-regions{flex-direction:column;align-items:stretch;gap:8px;margin:0}");
    expect(styles).toContain(".hero-logo-stack{display:flex;flex-direction:column;align-items:center;gap:12px}");
  });

  it("kısaltılmış hero içinde büyük iletişim etiketleri ve sağa hizalı logo kullanır", () => {
    expect(styles).toContain(".hero,.hero-inner{min-height:clamp(570px,calc(100vh - 190px),660px)!important}");
    expect(styles).toContain(".hero-brand-lockup{width:min(520px,45%);margin-left:auto!important;justify-content:flex-end!important}");
    expect(styles).toContain(".hero-region-stack .hero-phone{min-height:44px;padding:10px 17px;font-size:15px}");
    expect(styles).toContain(".hero-regions span{padding:13px 17px;font-size:15px}");
    expect(styles).toContain(".hero-logo-stack{flex:0 0 300px;align-items:flex-end}");
  });

  it("geniş ekranlarda logo/Keşfet grubunu sağ içerik sınırına sabitler", () => {
    expect(styles).toContain(".hero-brand-lockup{position:absolute;right:0;top:50%;width:auto;transform:translateY(-50%)}");
    expect(styles).toContain(".hero-region-stack{position:absolute;right:calc(100% + clamp(28px,4vw,76px));top:50%;width:182px;transform:translateY(-50%)}");
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");
const siteChrome = readFileSync(resolve(projectRoot, "client/src/components/SiteChrome.tsx"), "utf8");
const home = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");

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
});

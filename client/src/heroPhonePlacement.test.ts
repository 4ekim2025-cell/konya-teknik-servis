import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");
const siteChrome = readFileSync(resolve(projectRoot, "client/src/components/SiteChrome.tsx"), "utf8");
const home = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");

describe("hero telefon yerleşimi", () => {
  it("header araçlarında yalnızca WhatsApp eylemini tutar", () => {
    const desktopTools = siteChrome.match(/<div className="desktop-tools">([\s\S]*?)<\/div>/)?.[1] ?? "";
    expect(desktopTools).not.toContain("header-phone");
    expect(desktopTools).toContain("header-support");
  });

  it("merkezi telefon yapılandırmasını hero bölge etiketlerinin üstünde kullanır", () => {
    expect(home).toContain('className="hero-phone"');
    expect(home).toContain("SITE_PHONE_DISPLAY");
    expect(home.indexOf('className="hero-phone"')).toBeLessThan(home.indexOf('className="hero-regions"'));
  });
});

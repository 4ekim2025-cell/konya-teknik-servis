import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const styles = readFileSync(resolve(projectRoot, "client", "src", "index.css"), "utf8");

describe("geniş viewport yerleşimi", () => {
  it("header, alt navigasyon ve hero için ortak 1530 px merkez rayını kullanır", () => {
    expect(styles).toContain(".header-row,.header-subrow{width:min(1530px,calc(100% - 56px));max-width:none;margin-left:auto!important;margin-right:auto!important");
    expect(styles).toContain(".hero-inner{width:min(1530px,calc(100% - 56px));max-width:none;margin-left:auto!important;margin-right:auto!important}");
  });

  it("header ve hero iç konteynerlerinde tüm ekranlarda 0 px aktif margin uygular", () => {
    expect(styles).toContain(".header-row,.header-subrow,.hero-inner{margin:0!important}");
  });

  it("zoom out karşılığı geniş CSS viewportlarda hedef konteynerlerin margin değerini sıfırlar", () => {
    expect(styles).toContain("@media(min-width:2600px)");
    expect(styles).toContain(".header-row{width:min(1530px,calc(100% - 60px));max-width:none;margin:0;");
    expect(styles).toContain(".header-subrow{width:min(1530px,calc(100% - 60px));max-width:none;margin:0;");
    expect(styles).toContain(".hero-inner{width:min(1530px,calc(100% - 60px));max-width:none;margin:0;");
  });
});

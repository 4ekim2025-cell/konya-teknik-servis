import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const styles = readFileSync(resolve(projectRoot, "client", "src", "index.css"), "utf8");

describe("geniş viewport yerleşimi", () => {
  it("header ve alt navigasyon için ortak 1530 px merkez rayını kullanır", () => {
    expect(styles).toContain(".header-row,.header-subrow{width:min(1530px,calc(100% - 56px));max-width:none;margin-left:auto!important;margin-right:auto!important");
  });

  it("header ve hero iç konteynerlerinde ilk temel margin değerini 0 px tutar", () => {
    expect(styles).toContain(".header-row,.header-subrow,.hero-inner{margin:0!important}");
  });

  it("zoom out karşılığı geniş CSS viewportlarda hedef konteynerlerin margin değerini sıfırlar", () => {
    expect(styles).toContain("@media(min-width:2600px)");
    expect(styles).toContain(".header-row{width:min(1530px,calc(100% - 60px));max-width:none;margin:0;");
    expect(styles).toContain(".header-subrow{width:min(1530px,calc(100% - 60px));max-width:none;margin:0;");
    expect(styles).toContain(".hero-inner{width:min(1530px,calc(100% - 60px));max-width:none;margin:0;");
  });

  it("hero iç rayını 1530 px kullanılabilir genişlikte merkezler", () => {
    expect(styles).toContain(".hero-inner{width:min(1530px,calc(100% - 56px));max-width:none;margin-left:auto!important;margin-right:auto!important}");
    expect(styles).toContain(".hero-inner{max-width:1530px;min-height:clamp(620px,calc(100vh - 138px),760px);padding:clamp(60px,0vw,100px) max(30px,calc((100vw - 1530px)/2)) 75px;align-items:center;");
    expect(styles).toContain(".hero-brand-lockup{display:flex;flex:0 0 auto;flex-direction:row;");
    expect(styles).toContain("margin-left:0!important;margin-top:0}");
    expect(styles).toContain(".site-header .brand{border-right:0!important}");
  });
});

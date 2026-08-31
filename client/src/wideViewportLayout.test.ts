import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const styles = readFileSync(resolve(projectRoot, "client", "src", "index.css"), "utf8");

describe("geniş viewport yerleşimi", () => {
  it("header ve alt navigasyonu sabit piksel rayı yerine akışkan iç boşlukla kurar", () => {
    expect(styles).toContain(":root{--site-gutter:clamp(32px,7vw,148px)}");
    expect(styles).toContain(".header-row,.header-subrow{width:100%!important;max-width:none!important;margin:0!important;padding-right:var(--site-gutter)!important;padding-left:var(--site-gutter)!important}");
  });

  it("header ve hero iç konteynerlerinde ilk temel margin değerini 0 px tutar", () => {
    expect(styles).toContain(".header-row,.header-subrow,.hero-inner{margin:0!important}");
  });

  it("ana sayfa ve alt sayfa içeriklerinde aynı akışkan genişlik dilini uygular", () => {
    expect(styles).toContain(".hero-inner{width:100%!important;max-width:none!important;margin:0!important;padding-right:var(--site-gutter)!important;padding-left:var(--site-gutter)!important}");
    expect(styles).toContain(".inner-content,.simple-hero>div,.timeline,.detail-layout,.brands,.contact,.blog,.all-faq,.about,.legal,.tracking-standard-layout{width:100%!important;max-width:none!important}");
  });

  it("hero logo grubunu akışkan sağ içerik boşluğuna bağlar", () => {
    expect(styles).toContain(".hero-brand-lockup{right:var(--site-gutter)!important}");
    expect(styles).toContain(".hero-inner{max-width:1530px;min-height:clamp(620px,calc(100vh - 138px),760px);padding:clamp(60px,0vw,100px) max(30px,calc((100vw - 1530px)/2)) 75px;align-items:center;");
    expect(styles).toContain(".hero-brand-lockup{display:flex;flex:0 0 auto;flex-direction:row;");
    expect(styles).toContain("margin-left:0!important;margin-top:0}");
    expect(styles).toContain(".site-header .brand{border-right:0!important}");
  });
});

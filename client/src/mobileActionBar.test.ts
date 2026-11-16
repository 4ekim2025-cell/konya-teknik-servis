import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const styles = readFileSync(resolve(projectRoot, "client", "src", "index.css"), "utf8");
const chrome = readFileSync(resolve(projectRoot, "client", "src", "components", "SiteChrome.tsx"), "utf8");
const home = readFileSync(resolve(projectRoot, "client", "src", "pages", "Home.tsx"), "utf8");

describe("mobil sabit eylem çubuğu", () => {
  it("puan satırını tam genişlikte, okunur boyda ve yorumlar bölümüne bağlı gösterir", () => {
    expect(chrome).toContain('<a className="mobile-google-rating" href="/#musteri-yorumlari"');
    expect(chrome).toContain("<small>{PUBLIC_REVIEW_BADGE.label}</small>");
    expect(home).toContain('<section id="musteri-yorumlari" className="google-reviews-section"');
    expect(home).toContain('window.location.hash==="#musteri-yorumlari"');
    expect(styles).toContain(".mobile-action-bar .mobile-google-rating{display:flex;align-items:center;justify-content:center;gap:7px;height:32px");
    expect(styles).toContain("font:900 13px/1 Manrope,sans-serif");
  });

  it("çağrı ve servis talebi düğmelerini ayrı, taşmasız ve okunur kontrastta tutar", () => {
    expect(chrome).toContain('aria-label="Hızlı servis talebi oluştur" aria-haspopup="dialog"');
    expect(chrome).toContain("</span>Servis talebi</button>");
    expect(styles).toContain(".mobile-action-buttons{display:grid;grid-template-columns:1fr 1.25fr;gap:8px");
    expect(styles).toContain("height:52px;padding:0 10px;border-radius:14px;font-size:17px");
    // Beyaz yazı açık WhatsApp yeşilinde (#25d366) yaklaşık 2:1 kontrast verir; koyu ton 4:1 üzerindedir (2026-11-16 kararı).
    expect(styles).toContain(".mobile-action-bar .mobile-action-buttons .mobile-preform-action{background:#12874a!important}");
    expect(styles).toContain("@media(max-width:359px)");
  });

  it("çubuğun yüksekliğini korur ve telefonun alt güvenli alanını hesaba katar", () => {
    expect(styles).toContain("body{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px))}");
    expect(styles).toContain("padding:0 10px calc(11px + env(safe-area-inset-bottom,0px))");
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");
const home = readFileSync(resolve(projectRoot, "client/src/pages/Home.tsx"), "utf8");
const chrome = readFileSync(resolve(projectRoot, "client/src/components/SiteChrome.tsx"), "utf8");
const client = readFileSync(resolve(projectRoot, "client/src/googleReviews.ts"), "utf8");
const styles = readFileSync(resolve(projectRoot, "client/src/index.css"), "utf8");

describe("anasayfa Google yorumları", () => {
  it("yorum bölümünü hero alanının hemen arkasına yerleştirir", () => {
    expect(home).toMatch(/<\/section>\r?\n  <GoogleReviewsSection\/>/);
    expect(home).toContain("Selçuklu, Meram ve Karatay'da");
    expect(home).toContain("güvenle tercih edilen teknik servis");
    expect(home).toContain("Müşterilerimizin Google üzerinden paylaştığı deneyimler");
  });

  it("yalnız izinli manuel yorum kaynağını kullanır ve yorum sayısını istemciye taşımaz", () => {
    expect(home).toContain("PUBLIC_MANUAL_REVIEWS");
    expect(home).not.toContain("totalReviewCount");
    expect(client).not.toContain("totalReviewCount");
    expect(home).not.toContain("Google’da görüntüle");
  });

  it("erişilebilir ve hareket tercihine saygılı kaydırıcı davranışlarını içerir", () => {
    expect(home).toContain('aria-roledescription="carousel"');
    expect(home).toContain('event.key==="ArrowRight"');
    expect(home).toContain("onMouseEnter={()=>setPaused(true)}");
    expect(home).toContain("onFocusCapture={()=>setPaused(true)}");
    expect(home).toContain("prefers-reduced-motion: reduce");
    expect(home).toContain("4500");
    expect(home).toContain("onPointerDown={onPointerDown}");
    expect(styles).toContain("--review-visible");
    expect(styles).toContain("@media(max-width:1100px)");
    expect(styles).toContain("@media(max-width:680px)");
  });
});

describe("yüzen Google puanı", () => {
  it("WhatsApp eyleminin üstünde yalnız puan ve tarih gösterir", () => {
    expect(chrome.indexOf('className="floating-google-rating"')).toBeLessThan(chrome.indexOf('className="floating-whatsapp"'));
    expect(chrome).toContain("Google’da {formatGoogleRating(rating.averageRating)}");
    expect(chrome).toContain("formatGoogleRatingDate(rating.refreshedAt)");
    expect(chrome).not.toContain("totalReviewCount");
    expect(styles).toContain(".floating-actions-stack .floating-whatsapp{position:static;justify-content:center;width:100%");
    expect(styles).toContain(".floating-actions-stack{display:none}");
  });
});

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

  it("erişilebilir, kendiliğinden kaymayan ve hareket tercihine saygılı sayfalı düzeni içerir", () => {
    expect(home).toContain('aria-roledescription="carousel"');
    expect(home).toContain('event.key==="ArrowRight"');
    expect(home).toContain("prefers-reduced-motion: reduce");
    expect(home).toContain("reviewsLayout");
    expect(home).toContain('aria-label="Sonraki yorumları göster"');
    // Yorumlar kendiliğinden kaymaz: zamanlayıcı ve duraklatma durumu yoktur (2026-11-16 kararı).
    expect(home).not.toContain("setPaused");
    expect(home).not.toContain("manualRevision");
    expect(styles).toContain("scroll-snap-type:x mandatory");
    expect(styles).toContain("--review-cols");
    expect(styles).toContain("@media(max-width:1100px)");
    expect(styles).toContain("@media(max-width:680px)");
  });

  it("kısa yoruma göre boyutlanan kartlarda uzun yorumu keser ve tüm metni sayfada tutar", () => {
    expect(styles).toContain("-webkit-line-clamp:3");
    expect(home).toContain('className="google-review-more"');
    expect(home).toContain("<p ref={ref}>{text}</p>");
    expect(styles).not.toContain("google-review-approval");
    expect(home).not.toContain("review-thumbs-up");
  });

  it("özet puanı yönetilebilir rozetten, tüm yorumlar bağlantısını işletme profilinden alır", () => {
    expect(home).toContain("PUBLIC_REVIEW_BADGE.score");
    expect(home).toContain("PUBLIC_REVIEW_BADGE.label");
    expect(home).toContain("href={GOOGLE_BUSINESS_URL}");
    expect(home).toContain("Tüm yorumları Google’da gör");
  });
});

describe("yüzen Google puanı", () => {
  it("WhatsApp eyleminin üstünde yönetilebilir Google rozetini gösterir", () => {
    expect(chrome.indexOf('className="floating-google-rating"')).toBeLessThan(chrome.indexOf('className="floating-whatsapp"'));
    expect(chrome).toContain("PUBLIC_REVIEW_BADGE.label");
    expect(chrome).toContain("PUBLIC_REVIEW_BADGE.score");
    expect(chrome).toContain('/google-g-logo.png');
    expect(chrome).not.toContain("totalReviewCount");
    expect(styles).toContain(".floating-actions-stack .floating-whatsapp{position:static;justify-content:center;width:100%");
    expect(styles).toContain(".floating-actions-stack{display:none}");
  });
});

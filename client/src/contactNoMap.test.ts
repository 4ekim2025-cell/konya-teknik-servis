import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(import.meta.dirname, file), "utf8");

describe("haritasız iletişim ve ertelenen Google entegrasyonu", () => {
  it("harita yerine WhatsApp iletişim panelini sunar", () => {
    const page = source("pages/ContentPage.tsx");
    expect(page).toContain('className="contact-support-panel"');
    expect(page).toContain("Doğrudan ulaşın,");
    expect(page).not.toMatch(/<iframe|maps\/embed/);
  });

  it("sayfalar yorum bileşenlerini veya veri sağlayıcısını yüklemez", () => {
    for (const file of ["pages/Home.tsx", "pages/ContentPage.tsx", "components/SiteChrome.tsx"]) {
      expect(source(file)).not.toMatch(/GoogleRatingBadge|GoogleReviewsSection|GoogleBusinessProvider|GoogleBusinessContact|components\/GoogleBusiness/);
    }
  });
});

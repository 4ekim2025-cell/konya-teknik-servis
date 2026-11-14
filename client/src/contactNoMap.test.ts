import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) => readFileSync(resolve(import.meta.dirname, file), "utf8");

describe("haritasız iletişim ve Google yorum entegrasyonu", () => {
  it("harita yerine WhatsApp iletişim panelini sunar", () => {
    const page = source("pages/ContentPage.tsx");
    expect(page).toContain('className="contact-support-panel"');
    expect(page).toContain("Doğrudan ulaşın,");
    expect(page).not.toMatch(/<iframe|maps\/embed/);
  });

  it("yorumlar yalnız anasayfa ve ortak yüzen eylemde yer alır; içerik sayfalarına ayrı bölüm eklemez", () => {
    expect(source("pages/Home.tsx")).toContain("GoogleReviewsSection");
    expect(source("components/SiteChrome.tsx")).toContain("floating-google-rating");
    expect(source("pages/ContentPage.tsx")).not.toMatch(/GoogleReviewsSection|floating-google-rating/);
  });
});

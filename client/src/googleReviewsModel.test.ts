import { describe, expect, it } from "vitest";
import { EMPTY_GOOGLE_REVIEWS, renderGoogleReviewsGenerated, validateGoogleReviews } from "../../shared/google-reviews";

const valid = (overrides: Record<string, unknown> = {}) => ({
  id: "manual_abcdefgh",
  author: "Ahmet Yılmaz",
  rating: 5,
  text: "Servis süreci açık ve düzenliydi.",
  reviewDate: "2026-11-01",
  consentConfirmed: true,
  independentlyProvided: true,
  consentDate: "2026-11-02",
  visible: true,
  order: 0,
  ...overrides,
});

describe("izinli manuel Google yorum modeli", () => {
  it("boş başlangıç değerini ve Google/manual kaynak ayrımını korur", () => {
    expect(validateGoogleReviews(EMPTY_GOOGLE_REVIEWS)).toEqual({ ok: true, data: EMPTY_GOOGLE_REVIEWS });
    expect(validateGoogleReviews({ version: 1, manualReviews: [{ ...valid(), source: "google-api" }] }).ok).toBe(false);
  });

  it("tekrarlanan kimliği reddeder", () => {
    const result = validateGoogleReviews({ version: 1, manualReviews: [valid(), valid({ order: 1 })] });
    expect(result.ok).toBe(false);
  });

  it.each([
    [{ rating: 0 }, "puan alt sınırı"],
    [{ rating: 6 }, "puan üst sınırı"],
    [{ text: "a".repeat(1201) }, "uzun yorum"],
    [{ reviewDate: "2026-02-30" }, "geçersiz tarih"],
    [{ consentConfirmed: false }, "izin yok"],
    [{ consentDate: "2026-10-31" }, "izin tarihi önce"],
  ])("%s girdisini reddeder (%s)", (overrides) => {
    expect(validateGoogleReviews({ version: 1, manualReviews: [valid(overrides)] }).ok).toBe(false);
  });

  it("yalnız görünür ve izinli kayıtları sıralı ziyaretçi modülüne yazar", () => {
    const data = { version: 1 as const, manualReviews: [valid({ id: "manual_zzzzzzzz", order: 2 }), valid({ id: "manual_aaaaaaaa", order: 0, visible: false }), valid({ id: "manual_bbbbbbbb", order: 1 })] };
    const output = renderGoogleReviewsGenerated(validateGoogleReviews(data).ok ? validateGoogleReviews(data).data : EMPTY_GOOGLE_REVIEWS);
    expect(output).toContain("manual_bbbbbbbb");
    expect(output).toContain("manual_zzzzzzzz");
    expect(output).not.toContain("manual_aaaaaaaa");
    expect(output.indexOf("manual_bbbbbbbb")).toBeLessThan(output.indexOf("manual_zzzzzzzz"));
  });
});

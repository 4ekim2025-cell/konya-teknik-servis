import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { publicGoogleRatingData } from "../../server/google-reviews-public";

const env = { GOOGLE_CLIENT_ID: "istemci", GOOGLE_CLIENT_SECRET: "gizli", GOOGLE_REFRESH_TOKEN: "yenile" };
const config = { enabled: true, accountId: "123", locationId: "456" };

describe("genel Google puanı yanıtı", () => {
  it("yalnız puan ve güncellik tarihi döndürür; yorum sayısını ve yorumları sızdırmaz", async () => {
    const fetchImpl: typeof fetch = vi.fn(async input => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com")) return Response.json({ access_token: "erişim", expires_in: 3600 });
      return Response.json({ averageRating: 4.8, totalReviewCount: 777, reviews: [], nextPageToken: undefined });
    });
    const result = await publicGoogleRatingData(env, fetchImpl, () => Date.parse("2026-11-14T09:00:00Z"), config);
    expect(result).toEqual({ status: 200, body: { averageRating: 4.8, refreshedAt: "2026-11-14T09:00:00.000Z" } });
    expect(JSON.stringify(result)).not.toContain("totalReviewCount");
    expect(JSON.stringify(result)).not.toContain("reviews");
  });

  it("yapılandırma veya puan yoksa güvenli biçimde gizlenir", async () => {
    expect(await publicGoogleRatingData(env, vi.fn() as unknown as typeof fetch, Date.now, { enabled: false })).toMatchObject({ status: 404 });
    const fetchImpl: typeof fetch = vi.fn(async input => String(input).includes("oauth2.googleapis.com") ? Response.json({ access_token: "erişim", expires_in: 3600 }) : Response.json({ reviews: [] }));
    expect(await publicGoogleRatingData(env, fetchImpl, Date.now, config)).toMatchObject({ status: 404 });
  });

  it("başarılı genel yanıtı Vercel CDN'de 48 saat tutar; hata yanıtını saklamaz", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../../server/google-reviews-public.ts"), "utf8");
    expect(source).toContain("172_800");
    expect(source).toContain('"Vercel-CDN-Cache-Control"');
    expect(source).toContain('"Cache-Control": "no-store"');
  });
});

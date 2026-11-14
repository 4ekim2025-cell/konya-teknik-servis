import { describe, expect, it, vi } from "vitest";
import { GoogleError, createGoogleClient } from "../../server/admin/google";

const credentials = { clientId: "istemci", clientSecret: "gizli", refreshToken: "yenile" };
const accountId = "123";
const locationId = "456";

function review(index: number, overrides: Record<string, unknown> = {}) {
  return {
    reviewId: `yorum-${index}`,
    reviewer: { displayName: `Müşteri ${index}`, isAnonymous: false },
    starRating: "FIVE",
    comment: `Yorum ${index}`,
    createTime: "2026-11-01T10:00:00Z",
    ...overrides,
  };
}

function scriptedFetch(pages: Record<string, unknown>, apiStatus?: number) {
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async input => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    urls.push(url.href);
    if (url.host === "oauth2.googleapis.com") return Response.json({ access_token: "erişim", expires_in: 3600 });
    if (apiStatus) return Response.json({ error: { message: "gizli Google gövdesi" } }, { status: apiStatus });
    const token = url.searchParams.get("pageToken") ?? "";
    return Response.json(pages[token] ?? { beklenmeyen: true });
  };
  return { fetchImpl, urls };
}

describe("Google yorum istemcisi", () => {
  it("genel puan için yalnız toplu değeri tek küçük sayfadan okur", async () => {
    const fake = scriptedFetch({ "": { reviews: [review(1)], averageRating: 4.8, nextPageToken: "devam" } });
    await expect(createGoogleClient(credentials, fake.fetchImpl).getRating(accountId, locationId)).resolves.toBe(4.8);
    expect(fake.urls.filter(url => url.includes("/reviews?"))).toEqual([
      "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews?pageSize=1",
    ]);
  });

  it("50 kayıtlık sayfaları nextPageToken ile izler, ortalama ve toplamı döndürür", async () => {
    const first = Array.from({ length: 50 }, (_, index) => review(index + 1));
    const fake = scriptedFetch({
      "": { reviews: first, averageRating: 4.7, totalReviewCount: 51, nextPageToken: "ikinci sayfa/+" },
      "ikinci sayfa/+": { reviews: [review(51)] },
    });
    const result = await createGoogleClient(credentials, fake.fetchImpl).listReviews(accountId, locationId);

    expect(result.reviews).toHaveLength(51);
    expect(result.averageRating).toBe(4.7);
    expect(result.totalReviewCount).toBe(51);
    expect(fake.urls.filter(url => url.includes("/reviews?"))).toEqual([
      "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews?pageSize=50",
      "https://mybusiness.googleapis.com/v4/accounts/123/locations/456/reviews?pageSize=50&pageToken=ikinci+sayfa%2F%2B",
    ]);
  });

  it("eksik veya bozuk yorumları atlar; anonim ve tek yıldızlı geçerli yorumu korur", async () => {
    const fake = scriptedFetch({
      "": {
        reviews: [
          review(1),
          review(2, { reviewer: { isAnonymous: true }, starRating: "ONE", comment: undefined }),
          review(3, { reviewer: {} }),
          review(4, { starRating: "SIX" }),
          review(5, { createTime: "geçersiz" }),
          null,
        ],
      },
    });
    const result = await createGoogleClient(credentials, fake.fetchImpl).listReviews(accountId, locationId);

    expect(result.reviews).toEqual([
      { id: "yorum-1", authorName: "Müşteri 1", anonymous: false, rating: 5, comment: "Yorum 1", createTime: "2026-11-01T10:00:00Z" },
      { id: "yorum-2", anonymous: true, rating: 1, comment: "", createTime: "2026-11-01T10:00:00Z" },
    ]);
  });

  it("bozuk sayfa ve tekrarlanan sayfa belirtecini güvenli hata sayar", async () => {
    const malformed = scriptedFetch({ "": { reviews: "dizi değil" } });
    await expect(createGoogleClient(credentials, malformed.fetchImpl).listReviews(accountId, locationId)).rejects.toMatchObject({ kind: "unavailable", operation: "yorumlar" });

    const repeated = scriptedFetch({ "": { reviews: [], nextPageToken: "aynı" }, aynı: { reviews: [], nextPageToken: "aynı" } });
    await expect(createGoogleClient(credentials, repeated.fetchImpl).listReviews(accountId, locationId)).rejects.toMatchObject({ kind: "unavailable", operation: "yorumlar" });
  });

  it.each([
    [401, "auth"],
    [403, "forbidden"],
    [404, "notfound"],
    [429, "rate"],
  ] as const)("HTTP %i yanıtını %s olarak sınıflandırır ve gövdeyi sızdırmaz", async (status, kind) => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fake = scriptedFetch({}, status);
    try {
      await createGoogleClient(credentials, fake.fetchImpl).listReviews(accountId, locationId);
      throw new Error("hata bekleniyordu");
    } catch (error) {
      expect(error).toBeInstanceOf(GoogleError);
      expect(error).toMatchObject({ kind, status });
      expect(String(error)).not.toContain("gizli Google gövdesi");
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("geçersiz hesap ve konum kimliklerinde Google'a çağrı yapmaz", async () => {
    const fake = scriptedFetch({});
    const client = createGoogleClient(credentials, fake.fetchImpl);
    await expect(client.listReviews("1/../2", locationId)).rejects.toMatchObject({ kind: "invalid", operation: "kimlik" });
    await expect(client.listReviews(accountId, "abc")).rejects.toMatchObject({ kind: "invalid", operation: "kimlik" });
    expect(fake.urls).toHaveLength(0);
  });

  it("yorum isteği zaman aşımına uğradığında güvenli unavailable hatası verir", async () => {
    const fetchImpl: typeof fetch = async input => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com")) return Response.json({ access_token: "erişim", expires_in: 3600 });
      throw new DOMException("zaman aşımı gövdesi", "AbortError");
    };
    await expect(createGoogleClient(credentials, fetchImpl).listReviews(accountId, locationId)).rejects.toMatchObject({ kind: "unavailable", operation: "yorumlar", status: 0 });
  });
});

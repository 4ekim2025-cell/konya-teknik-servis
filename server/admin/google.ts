/**
 * Google İşletme Profili API'si (5. aşama, "API var" yolu). Yalnızca `fetch` kullanılır (ek bağımlılık yok).
 *
 * DURUM: Bu kod Google'ın belgesine göre yazıldı; gerçek bir hesapla SINANMADI (profil 60 günü doldurmadı, API erişimi onaylanmadı).
 * İlk gerçek deneme onaydan sonra "Ayarlar → Bağlantıyı sına" ile yapılır; hata olursa burası düzeltilir. Testler Google'ı bellek içi
 * taklitle sınar (client/src/adminFakeGoogle.ts), testlerde gerçek çağrı yapılmaz.
 *
 * Kimlik: OAuth 2.0 yenileme belirteci akışı (kapsam `business.manage`). Üç değer YALNIZCA Vercel ortam değişkenidir:
 * GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN. `VITE_` öneki yok; değerler yanıta, günlüğe ve hata iletisine yazılmaz,
 * Google'ın yanıt gövdesi de iletiye konmaz (yalnızca HTTP durum kodu günlüğe girer).
 *
 * Uç noktalar (belgeye göre):
 *  - POST https://oauth2.googleapis.com/token                                         (yenileme belirteciyle erişim anahtarı)
 *  - GET  https://mybusiness.googleapis.com/v4/accounts/{a}/locations/{l}/reviews     (yorumları okur ve bağlantıyı sına)
 *  - POST https://mybusiness.googleapis.com/v4/accounts/{a}/locations/{l}/localPosts  (paylaşım oluştur)
 *  - PATCH https://mybusiness.googleapis.com/v4/{name}?updateMask=callToAction         (düğmeyi "Hemen ara"ya çevir)
 */
import { z } from "zod";
import { GOOGLE_POST_NAME, type GoogleLocalPost } from "../../shared/blog-social.js";

export type GoogleEnv = Record<string, string | undefined>;
export type GoogleCredentials = { clientId: string; clientSecret: string; refreshToken: string };

/** Üç değişkenin de dolu olması gerekir; biri eksikse API yolu kapalıdır. */
export function readGoogleCredentials(env: GoogleEnv): GoogleCredentials | undefined {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = env.GOOGLE_REFRESH_TOKEN?.trim();
  return clientId && clientSecret && refreshToken ? { clientId, clientSecret, refreshToken } : undefined;
}

/**
 * auth: anahtar/izin reddedildi ya da yenileme belirteci geçersiz; forbidden: API etkin değil ya da erişim onaylanmadı (kota 0);
 * rate: istek sınırı; notfound: hesap/konum/gönderi bulunamadı; invalid: Google isteği kabul etmedi (alan, metin, fotoğraf);
 * unavailable: ağ ya da Google tarafı hatası (istek hiç işlenmemiş olabilir);
 * uncertain: paylaşım isteği gitti ama sonucu bilinmiyor (zaman aşımı, 5xx, beklenmeyen yanıt) — gönderi Google'da OLUŞMUŞ olabilir, körlemesine tekrar denenmemeli.
 */
export type GoogleErrorKind = "auth" | "forbidden" | "rate" | "notfound" | "invalid" | "unavailable" | "uncertain";
export class GoogleError extends Error {
  /** `status`: HTTP durum kodu (ağ hatası ya da zaman aşımında 0). Günlüğe yazılır; gizli bilgi içermez. */
  constructor(public kind: GoogleErrorKind, public operation: string, public status = 0) {
    super(`google ${operation}: ${kind}`);
    this.name = "GoogleError";
  }
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const POSTS_API = "https://mybusiness.googleapis.com/v4";
const TIMEOUT_MS = 12_000;
/** Erişim anahtarı yaklaşık 1 saat geçerlidir; süresi dolmadan bu kadar önce yenilenir. */
const TOKEN_MARGIN_MS = 60_000;
const ID = /^\d{1,30}$/;

export type GoogleCreated = { name: string; state?: string };
export type GoogleReview = {
  id: string;
  authorName?: string;
  anonymous: boolean;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string;
  createTime: string;
  updateTime?: string;
};
export type GoogleReviewsResult = {
  reviews: GoogleReview[];
  averageRating?: number;
  /** Yalnız yönetim paneli içindir; ziyaretçi yanıtına aktarılmaz. */
  totalReviewCount?: number;
};

const ratingValues = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 } as const;
const googleReviewSchema = z
  .object({
    reviewId: z.string().trim().min(1).max(512),
    reviewer: z
      .object({ displayName: z.string().trim().min(1).max(300).optional(), isAnonymous: z.boolean().optional() })
      .passthrough(),
    starRating: z.enum(["ONE", "TWO", "THREE", "FOUR", "FIVE"]),
    comment: z.string().max(20_000).optional().default(""),
    createTime: z.string().datetime({ offset: true }),
    updateTime: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough()
  .refine(value => value.reviewer.isAnonymous === true || value.reviewer.displayName !== undefined);
const googleReviewsPageSchema = z
  .object({
    reviews: z.array(z.unknown()).optional().default([]),
    averageRating: z.number().finite().min(1).max(5).optional(),
    totalReviewCount: z.number().int().nonnegative().optional(),
    nextPageToken: z.string().trim().min(1).max(4_096).optional(),
  })
  .passthrough();

export function createGoogleClient(credentials: GoogleCredentials, fetchImpl: typeof fetch = fetch, now: () => number = Date.now) {
  let cached: { token: string; expiresAt: number } | undefined;

  async function send(operation: string, url: string, init: { method: string; headers?: Record<string, string>; body?: string }): Promise<Response> {
    let response: Response;
    try {
      response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      throw new GoogleError("unavailable", operation, 0);
    }
    return response;
  }

  const classify = (operation: string, status: number): GoogleError => {
    console.error("admin: google hatası", operation, status);
    if (status === 401) return new GoogleError("auth", operation, status);
    if (status === 403) return new GoogleError("forbidden", operation, status);
    if (status === 404) return new GoogleError("notfound", operation, status);
    if (status === 429) return new GoogleError("rate", operation, status);
    if (status === 400 || status === 409 || status === 422) return new GoogleError("invalid", operation, status);
    return new GoogleError("unavailable", operation, status);
  };

  /** Yenileme belirteciyle erişim anahtarı alır; geçerli anahtar varken yeniden istemez. */
  async function accessToken(): Promise<string> {
    if (cached && cached.expiresAt - TOKEN_MARGIN_MS > now()) return cached.token;
    const response = await send("token", TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", client_id: credentials.clientId, client_secret: credentials.clientSecret, refresh_token: credentials.refreshToken }).toString(),
    });
    if (!response.ok) {
      // Geçersiz/iptal edilmiş belirteç ve yanlış istemci bilgisi 400 (invalid_grant / invalid_client) ya da 401 döner: ikisi de kimlik sorunudur.
      console.error("admin: google hatası", "token", response.status);
      throw new GoogleError(response.status === 400 || response.status === 401 || response.status === 403 ? "auth" : response.status === 429 ? "rate" : "unavailable", "token", response.status);
    }
    let data: { access_token?: unknown; expires_in?: unknown };
    try {
      data = (await response.json()) as typeof data;
    } catch {
      throw new GoogleError("unavailable", "token", response.status);
    }
    if (typeof data.access_token !== "string" || !data.access_token) throw new GoogleError("unavailable", "token", response.status);
    const seconds = typeof data.expires_in === "number" && data.expires_in > 0 ? data.expires_in : 3600;
    cached = { token: data.access_token, expiresAt: now() + seconds * 1000 };
    return cached.token;
  }

  async function call(operation: string, url: string, method: "GET" | "POST" | "PATCH", body?: unknown): Promise<unknown> {
    const token = await accessToken();
    const response = await send(operation, url, { method, headers: { Authorization: `Bearer ${token}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    if (response.status === 401) cached = undefined;
    if (!response.ok) throw classify(operation, response.status);
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  const locationParent = (accountId: string, locationId: string): string => {
    if (!ID.test(accountId) || !ID.test(locationId)) throw new GoogleError("invalid", "kimlik", 0);
    return `${POSTS_API}/accounts/${accountId}/locations/${locationId}`;
  };

  const postsParent = (accountId: string, locationId: string): string => `${locationParent(accountId, locationId)}/localPosts`;

  async function listReviews(accountId: string, locationId: string): Promise<GoogleReviewsResult> {
    const url = `${locationParent(accountId, locationId)}/reviews`;
    const reviews: GoogleReview[] = [];
    const seenTokens = new Set<string>();
    let pageToken: string | undefined;
    let averageRating: number | undefined;
    let totalReviewCount: number | undefined;

    do {
      const query = new URLSearchParams({ pageSize: "50", ...(pageToken ? { pageToken } : {}) });
      const parsedPage = googleReviewsPageSchema.safeParse(await call("yorumlar", `${url}?${query}`, "GET"));
      if (!parsedPage.success) throw new GoogleError("unavailable", "yorumlar", 0);
      const page = parsedPage.data;
      if (averageRating === undefined) averageRating = page.averageRating;
      if (totalReviewCount === undefined) totalReviewCount = page.totalReviewCount;
      for (const candidate of page.reviews) {
        const parsed = googleReviewSchema.safeParse(candidate);
        if (!parsed.success) continue;
        reviews.push({
          id: parsed.data.reviewId,
          ...(parsed.data.reviewer.displayName ? { authorName: parsed.data.reviewer.displayName } : {}),
          anonymous: parsed.data.reviewer.isAnonymous === true,
          rating: ratingValues[parsed.data.starRating],
          comment: parsed.data.comment,
          createTime: parsed.data.createTime,
          ...(parsed.data.updateTime ? { updateTime: parsed.data.updateTime } : {}),
        });
      }
      pageToken = page.nextPageToken;
      if (pageToken) {
        if (seenTokens.has(pageToken)) throw new GoogleError("unavailable", "yorumlar", 0);
        seenTokens.add(pageToken);
      }
    } while (pageToken);

    return { reviews, ...(averageRating !== undefined ? { averageRating } : {}), ...(totalReviewCount !== undefined ? { totalReviewCount } : {}) };
  }

  async function getRating(accountId: string, locationId: string): Promise<number | undefined> {
    const query = new URLSearchParams({ pageSize: "1" });
    const parsed = googleReviewsPageSchema.safeParse(await call("puan", `${locationParent(accountId, locationId)}/reviews?${query}`, "GET"));
    if (!parsed.success) throw new GoogleError("unavailable", "puan", 0);
    return parsed.data.averageRating;
  }

  return {
    /** Bağlantıyı sına: belirteç alınır, hesap/konum erişimi ve yorum okuma yetkisi doğrulanır. Hiçbir şey yazmaz. */
    async test(accountId: string, locationId: string): Promise<void> {
      await listReviews(accountId, locationId);
    },

    /** Doğrulanmış konumun bütün yorumlarını Google'ın 50 kayıtlık sayfalarını izleyerek yalnızca okur. */
    listReviews,

    /** Genel sayfa için yalnızca ilk sayfadaki toplu puanı okur; yorumları ve sonraki sayfaları işlemez. */
    getRating,

    /** Yeni paylaşım (localPosts.create). Dönen `name` biçimi denetlenir. Sonucu belirsiz kalan çağrılar `uncertain` olarak ayrılır (gönderi oluşmuş olabilir). */
    async createPost(accountId: string, locationId: string, post: GoogleLocalPost): Promise<GoogleCreated> {
      try {
        const data = (await call("paylaş", postsParent(accountId, locationId), "POST", post)) as { name?: unknown; state?: unknown };
        if (typeof data.name !== "string" || !GOOGLE_POST_NAME.test(data.name)) throw new GoogleError("unavailable", "paylaş", 0);
        return { name: data.name, ...(typeof data.state === "string" ? { state: data.state } : {}) };
      } catch (error) {
        // Kimlik/ayar/kota/geçersiz istek hataları gönderinin oluşmadığını gösterir. Ağ hatası, zaman aşımı, 5xx ve bozuk yanıtta ise
        // gönderi oluşmuş olabilir; bu durum ayrı bildirilir ki kullanıcı profili kontrol etmeden tekrar paylaşmasın.
        // (Belirteç alınamaması "token" işleminde kalır: istek Google'a hiç gitmemiştir.)
        if (error instanceof GoogleError && error.kind === "unavailable" && error.operation === "paylaş") throw new GoogleError("uncertain", "paylaş", error.status);
        throw error;
      }
    },

    /** Paylaşımın düğmesini "Hemen ara"ya çevirir (yazı silinince bağlantı ölü kalmasın). `url` gönderilmez: CALL için boş olmalıdır. */
    async switchToCall(postName: string): Promise<void> {
      if (!GOOGLE_POST_NAME.test(postName)) throw new GoogleError("invalid", "düğme", 0);
      await call("düğme", `${POSTS_API}/${postName}?updateMask=callToAction`, "PATCH", { callToAction: { actionType: "CALL" } });
    },
  };
}

export type GoogleClient = ReturnType<typeof createGoogleClient>;

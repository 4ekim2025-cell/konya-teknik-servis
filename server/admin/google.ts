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
 *  - GET  https://mybusiness.googleapis.com/v4/accounts/{a}/locations/{l}/localPosts  (bağlantıyı sına: yalnızca okur)
 *  - POST https://mybusiness.googleapis.com/v4/accounts/{a}/locations/{l}/localPosts  (paylaşım oluştur)
 *  - PATCH https://mybusiness.googleapis.com/v4/{name}?updateMask=callToAction         (düğmeyi "Hemen ara"ya çevir)
 */
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
 * unavailable: ağ ya da Google tarafı hatası.
 */
export type GoogleErrorKind = "auth" | "forbidden" | "rate" | "notfound" | "invalid" | "unavailable";
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

  const parent = (accountId: string, locationId: string): string => {
    if (!ID.test(accountId) || !ID.test(locationId)) throw new GoogleError("invalid", "kimlik", 0);
    return `${POSTS_API}/accounts/${accountId}/locations/${locationId}/localPosts`;
  };

  return {
    /** Bağlantıyı sına: belirteç alınır ve konumun paylaşımları bir kayıt okunur. Hiçbir şey yazmaz. */
    async test(accountId: string, locationId: string): Promise<void> {
      await call("sına", `${parent(accountId, locationId)}?pageSize=1`, "GET");
    },

    /** Yeni paylaşım (localPosts.create). Dönen `name` biçimi denetlenir; bozuksa paylaşım yapılmış sayılmaz ama kayıt tutulamaz, hata verilir. */
    async createPost(accountId: string, locationId: string, post: GoogleLocalPost): Promise<GoogleCreated> {
      const data = (await call("paylaş", parent(accountId, locationId), "POST", post)) as { name?: unknown; state?: unknown };
      if (typeof data.name !== "string" || !GOOGLE_POST_NAME.test(data.name)) throw new GoogleError("unavailable", "paylaş", 0);
      return { name: data.name, ...(typeof data.state === "string" ? { state: data.state } : {}) };
    },

    /** Paylaşımın düğmesini "Hemen ara"ya çevirir (yazı silinince bağlantı ölü kalmasın). `url` gönderilmez: CALL için boş olmalıdır. */
    async switchToCall(postName: string): Promise<void> {
      if (!GOOGLE_POST_NAME.test(postName)) throw new GoogleError("invalid", "düğme", 0);
      await call("düğme", `${POSTS_API}/${postName}?updateMask=callToAction`, "PATCH", { callToAction: { actionType: "CALL" } });
    },
  };
}

export type GoogleClient = ReturnType<typeof createGoogleClient>;

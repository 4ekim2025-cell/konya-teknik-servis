/**
 * Panel API'si: `/api/admin?action=<ad>`. Tek Vercel fonksiyonudur (Hobby planda 12 fonksiyon sınırı vardır).
 *
 * Değişmez kurallar (testle korunur, bkz. client/src/adminApi.test.ts):
 *  - `session` ve `login` dışındaki HİÇBİR eylem geçerli oturum çerezi olmadan çalışmaz: veri döndürmez, GitHub'a dokunmaz.
 *  - Yazan her istek JSON olmalı, `X-Admin-Request: 1` başlığı taşımalı ve (varsa) Origin başlığı sitenin kendisi olmalıdır.
 *  - Yanıtlar `noindex` başlığı taşır ve önbelleğe alınmaz. Hata yanıtları gizli anahtar ya da GitHub gövdesi içermez.
 *  - Gizli değerler yalnızca ortam değişkenlerindedir: ADMIN_PASSWORD_HASH, ADMIN_SESSION_SECRET, GITHUB_CONTENT_TOKEN, GEMINI_API_KEY, GROQ_API_KEY,
 *    BLOB_READ_WRITE_TOKEN (Vercel Blob; kimlik bilgisini SDK ortamdan kendisi okur), GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN.
 *  - Fotoğraf eylemleri (`image-upload`, `image-usage`, `image-cleanup`) aynı oturum, CSRF ve istek sınırından geçer; yeni fonksiyon açılmaz.
 *    Yüklenen dosya güvenilmez girdidir (server/admin/images.ts); dosya adını sunucu üretir. Silme ve temizlik yalnızca canlı (main) dalda çalışır.
 *  - Paylaşım paketi ve Google eylemleri (`settings`, `settings-save`, `social-get`, `social-save`, `social-mark`, `google-test`, `google-share`) aynı oturum,
 *    CSRF ve istek sınırından geçer; yeni fonksiyon açılmaz. Paket ve ayarlar yalnızca `content/` altına yazılır (GitHub anahtarının mevcut izni).
 *    Google anahtarları (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) yalnızca ortam değişkenidir; yanıta ve günlüğe yazılmaz.
 *  - `ai-draft` (yapay zeka taslağı) hiçbir şey kaydetmez: GitHub'a dokunmaz, yalnızca editöre dolacak taslağı döndürür. Aynı oturum,
 *    CSRF ve istek sınırından geçer; ayrıca günlük kullanım sınırı vardır. Model çıktısı kurallardan geçmezse taslak dönmez.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { LoginGuard, MIN_SECRET_LENGTH, RateLimiter, ipKey, clearedSessionCookie, createSessionToken, readCookie, SESSION_COOKIE, sessionCookie, sessionSigningKey, verifyPassword, verifySessionToken } from "./auth.js";
import { GithubError, createGithubClient, readGithubConfig, type GithubClient } from "./github.js";
import { AdminError, createAdminService, type AdminService, type SaveBody } from "./service.js";
import { AiError, AiRejectedError, DailyQuota, aiDailyLimit, createAiProviders, generateAiDraft, generateAiSuggestions } from "./ai.js";
import { validateAiCaseInput, validateAiSuggestInput } from "../../shared/blog-ai.js";
import { BLOG_IMAGE_HOST } from "../../shared/blog-images.js";
import { BlobError, blobConfigured, createBlobClient, type BlobClient } from "./blob.js";
import { ImageStoreError, createImageStore, type ImageStore } from "./imageStore.js";
import { checkUpload } from "./images.js";
import { GoogleError, createGoogleClient, readGoogleCredentials, type GoogleClient } from "./google.js";
import { buildGoogleLocalPost, type SocialRecord } from "../../shared/blog-social.js";
import { BLOG_SLUG_PATTERN } from "../../shared/blog-schema.js";

export type AdminEnv = Record<string, string | undefined>;
type HeaderValue = string | string[] | undefined;

export type AdminHttpRequest = {
  method: string;
  /** Yol ve sorgu dizesi: "/api/admin?action=posts" */
  url: string;
  headers: Record<string, HeaderValue>;
  body?: unknown;
  bodyError?: "too_large" | "invalid_json";
  ip: string;
};
export type AdminHttpResponse = { status: number; headers: Record<string, string>; body: unknown };

export type AdminDeps = {
  env: AdminEnv;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  loginGuard: LoginGuard;
  /** Tüm IP'lerden gelen toplam hatalı girişi sayar; eşik aşılınca giriş kilitlenmez, her deneme yavaşlatılır. */
  globalGuard: LoginGuard;
  limiter: RateLimiter;
  fetchImpl?: typeof fetch;
  /** Testlerde hazır servis verilir; yoksa ortam değişkenlerinden kurulur. */
  service?: AdminService;
  /** Yapay zeka sağlayıcısına giden `fetch` (testlerde bellek içi taklit). */
  aiFetchImpl?: typeof fetch;
  /** Yapay zeka taslağının günlük kullanım sayacı; verilmezse örnek ömrü boyunca paylaşılan sayaç kullanılır. */
  aiQuota?: DailyQuota;
  /** Blob istemcisi (testlerde bellek içi taklit); yoksa ortam değişkenlerinden kurulur. */
  blob?: BlobClient;
  /** Fotoğraf adreslerinin geçebileceği alan; yoksa shared/blog-images.ts → BLOG_IMAGE_HOST. Testlerde verilir. */
  imageHost?: string;
  /** Google İşletme API'sine giden `fetch` (testlerde bellek içi taklit). */
  googleFetchImpl?: typeof fetch;
  /** Google API çağrılarının günlük sayacı; verilmezse paylaşılan sayaç kullanılır. */
  googleQuota?: DailyQuota;
  /** Fotoğraf yüklemenin günlük sayacı (Hobby Blob kotasını korur); verilmezse paylaşılan sayaç kullanılır. */
  imageQuota?: DailyQuota;
};

const FAILED_LOGIN_DELAY_MS = 800;
/** Ortak sayaç eşiği aşılınca parola sınanmadan önce eklenen bekleme: eşikte 2 sn, eşiğin üç katında 5 sn. */
const GLOBAL_SLOWDOWN_MS = [2000, 5000] as const;
const MAX_PASSWORD_LENGTH = 200;
const DEFAULT_IMAGE_DAILY_LIMIT = 20;
/** Google İşletme API'sine günde en çok bu kadar çağrı (bağlantıyı sına + paylaşım); yanlışlıkla döngü ya da art arda tıklamaya karşı. */
const GOOGLE_DAILY_LIMIT = 40;
const header = (req: AdminHttpRequest, name: string): string | undefined => {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
};

const baseHeaders: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Content-Type-Options": "nosniff",
};

const reply = (status: number, body: unknown, extra: Record<string, string> = {}): AdminHttpResponse => ({ status, headers: { ...baseHeaders, ...extra }, body });
const fail = (status: number, error: string, message: string, extra?: Record<string, unknown>, headers?: Record<string, string>) => reply(status, { error, message, ...extra }, headers);

export function defaultDeps(env: AdminEnv): AdminDeps {
  return {
    env,
    now: Date.now,
    sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
    loginGuard: shared.loginGuard,
    globalGuard: shared.globalGuard,
    limiter: shared.limiter,
  };
}

// Örnek ömrü boyunca paylaşılan sayaçlar ve servis (sunucusuz ortamda her örnek kendi belleğini taşır).
const shared = {
  loginGuard: new LoginGuard(),
  globalGuard: new LoginGuard({ maxFailures: 30, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 }),
  limiter: new RateLimiter(120, 60 * 1000),
  aiQuota: new DailyQuota(),
  imageQuota: new DailyQuota(),
  googleQuota: new DailyQuota(),
  /** Paylaşımı süren yazılar: aynı yazının iki kez art arda Google'a gönderilmesini (çift tıklama) engeller. */
  googleSharing: new Set<string>(),
  images: undefined as ImageStore | undefined,
  service: undefined as { key: string; value: AdminService } | undefined,
};

const imageHostFor = (deps: AdminDeps): string => deps.imageHost ?? BLOG_IMAGE_HOST;

/** Günlük fotoğraf yükleme sınırı (BLOB_DAILY_UPLOAD_LIMIT, 1–200; varsayılan 20). Her fotoğraf iki gelişmiş işlemdir; Hobby kotası ayda 2.000. */
function imageDailyLimit(env: AdminEnv): number {
  const value = Number.parseInt(env.BLOB_DAILY_UPLOAD_LIMIT ?? "", 10);
  return Number.isFinite(value) && value >= 1 && value <= 200 ? value : DEFAULT_IMAGE_DAILY_LIMIT;
}

function imagesFor(deps: AdminDeps): ImageStore | undefined {
  if (deps.blob) return createImageStore(deps.blob, imageHostFor(deps), { sleep: deps.sleep, now: deps.now });
  if (!blobConfigured(deps.env)) return undefined;
  shared.images ??= createImageStore(createBlobClient(), imageHostFor(deps));
  return shared.images;
}

function serviceFor(deps: AdminDeps): AdminService | undefined {
  if (deps.service) return deps.service;
  const config = readGithubConfig(deps.env);
  if (!config) return undefined;
  // Test için verilen `fetchImpl` önbelleğe alınmaz: her çağrı kendi taklit deposuyla çalışır.
  const images = imagesFor(deps);
  if (deps.fetchImpl) return createAdminService({ github: createGithubClient(config, deps.fetchImpl), ...(images ? { images } : {}), ...(deps.imageHost !== undefined ? { imageHost: deps.imageHost } : {}) });
  const key = `${config.owner}/${config.repo}@${config.branch}:${config.token.slice(-6)}`;
  if (shared.service?.key !== key) {
    const github: GithubClient = createGithubClient(config, deps.fetchImpl);
    shared.service = { key, value: createAdminService({ github, ...(images ? { images } : {}) }) };
  }
  return shared.service.value;
}

const loginConfigured = (env: AdminEnv) => Boolean(env.ADMIN_PASSWORD_HASH?.trim()) && (env.ADMIN_SESSION_SECRET?.trim().length ?? 0) >= MIN_SECRET_LENGTH;

function csrfOk(req: AdminHttpRequest): boolean {
  if (req.method === "GET" || req.method === "HEAD") return true;
  if (!(header(req, "content-type") ?? "").toLowerCase().startsWith("application/json")) return false;
  if (header(req, "x-admin-request") !== "1") return false;
  const origin = header(req, "origin");
  if (origin) {
    try {
      if (new URL(origin).host !== (header(req, "x-forwarded-host") ?? header(req, "host"))) return false;
    } catch {
      return false;
    }
  }
  return true;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function describeGithubError(error: GithubError): AdminHttpResponse {
  if (error.kind === "auth") return fail(502, "github_auth_failed", "GitHub anahtarı geçersiz ya da yetkisiz. Anahtarın bu depoda “Contents: Read and write” iznini ve süresini kontrol edin.");
  if (error.kind === "rate") return fail(503, "github_rate_limited", "GitHub istek sınırına ulaşıldı; birkaç dakika sonra tekrar deneyin.");
  if (error.kind === "notfound") return fail(502, "github_not_found", "Depo ya da dal bulunamadı. GITHUB_REPO ve GITHUB_BRANCH ayarlarını kontrol edin.");
  return fail(502, "github_unavailable", "GitHub'a şu an ulaşılamıyor; birazdan tekrar deneyin.");
}

function describeBlobError(error: BlobError): AdminHttpResponse {
  if (error.kind === "auth") return fail(502, "blob_auth_failed", "Fotoğraf deposuna (Vercel Blob) erişim reddedildi. Store'un bu projeye Production ve Preview ortamları için bağlı olduğunu kontrol edin.");
  if (error.kind === "quota") return fail(503, "blob_unavailable_quota", "Fotoğraf deposu kullanılamıyor: Hobby kotası aşılmış ya da store askıda olabilir (kota aşılırsa Blob 30 gün kapanır). Vercel → Storage ekranına bakın.");
  if (error.kind === "rate") return fail(503, "blob_rate_limited", "Fotoğraf deposu istek sınırına ulaştı; birkaç saniye sonra tekrar deneyin.");
  if (error.kind === "exists") return fail(409, "blob_conflict", "Fotoğraf adı çakıştı; yüklemeyi tekrar deneyin.");
  return fail(502, "blob_unavailable", "Fotoğraf deposuna şu an ulaşılamıyor; birazdan tekrar deneyin.");
}

function describeGoogleError(error: GoogleError): AdminHttpResponse {
  if (error.kind === "auth") return fail(502, "google_auth_failed", "Google anahtarları reddedildi. Vercel'deki GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET ve GOOGLE_REFRESH_TOKEN değerlerini kontrol edin (yenileme belirteci iptal edilmiş ya da süresi dolmuş olabilir).");
  if (error.kind === "forbidden") return fail(502, "google_forbidden", "Google erişimi reddetti: İşletme Profili API'si projede etkin değil, erişim başvurusu henüz onaylanmadı (kota 0) ya da hesabın bu konumu yönetme yetkisi yok.");
  if (error.kind === "notfound") return fail(502, "google_not_found", "Google hesabı, konumu ya da paylaşımı bulamadı. Ayarlardaki hesap ve konum kimliklerini kontrol edin.");
  if (error.kind === "rate") return fail(503, "google_rate_limited", "Google istek sınırına ulaşıldı; birkaç dakika sonra tekrar deneyin.");
  if (error.kind === "invalid") return fail(422, "google_rejected", "Google isteği kabul etmedi (metin, düğme ya da fotoğraf kurallara uymuyor olabilir). Fotoğraf gönderimi açıksa Ayarlar'dan kapatıp tekrar deneyin; ya da paylaşımı elle yapın.");
  if (error.kind === "uncertain") return fail(502, "google_share_uncertain", "Google'dan yanıt alınamadı; gönderi Google'da OLUŞMUŞ olabilir. Tekrar göndermeyin: önce İşletme Profili'nizde yeni gönderi var mı bakın. Varsa paylaşım paketinde “Google'da paylaşıldı” kutusunu işaretleyin; yoksa elle paylaşın.");
  return fail(502, "google_unavailable", "Google'a şu an ulaşılamıyor; birazdan tekrar deneyin ya da paylaşımı elle yapın.");
}

/** Silinen yazının Google paylaşımı için ne yapıldığı: "switched" düğme "Hemen ara"ya çevrildi; "manual" elle çevrilmeli; "failed" otomatik çevrilemedi. */
type GoogleAfterDelete = "switched" | "manual" | "failed";

/**
 * Yazı silindikten SONRA çalışır ve asla hata fırlatmaz: yazı zaten silinmiştir; Google tarafı başarısızsa durum bildirilir.
 * Düğme yalnızca canlı (main) panelde, ayardaki hesap/konuma ait gönderi için çevrilir; önizleme paneli canlı profile dokunmaz.
 */
async function googleAfterDelete(service: AdminService, outcome: { removedSocial?: SocialRecord; socialUnreadable?: boolean }, google: () => GoogleClient | undefined): Promise<GoogleAfterDelete | undefined> {
  const shared = outcome.removedSocial?.shared.google;
  if (!shared) return outcome.socialUnreadable ? "manual" : undefined;
  if (shared.via !== "api" || !shared.postName) return "manual";
  try {
    const client = google();
    if (!client || !service.isLiveBranch()) return "manual";
    const { mode, accountId, locationId } = (await service.settings()).settings.google;
    if (mode !== "api" || !accountId || !locationId || !shared.postName.startsWith(`accounts/${accountId}/locations/${locationId}/`)) return "manual";
    await client.switchToCall(shared.postName);
    return "switched";
  } catch {
    return "failed";
  }
}

function describeAiError(error: AiError): AdminHttpResponse {
  if (error.kind === "auth") return fail(502, "ai_auth_failed", "Yapay zeka anahtarı geçersiz ya da yetkisiz. Vercel'deki GEMINI_API_KEY değerini kontrol edin.");
  if (error.kind === "rate") return fail(503, "ai_rate_limited", "Yapay zeka servisinin ücretsiz kullanım sınırına ulaşıldı; bir süre sonra tekrar deneyin.");
  if (error.kind === "blocked") return fail(502, "ai_blocked", "Yapay zeka servisi bu girdiyi yanıtlamadı; metni sadeleştirip tekrar deneyin.");
  if (error.kind === "bad_response") return fail(502, "ai_bad_response", "Yapay zeka servisi isteği kabul etmedi ya da boş yanıt verdi. Model adı (GEMINI_MODEL) ayarlıysa kontrol edin; yazıyı elle de yazabilirsiniz.");
  return fail(502, "ai_unavailable", "Yapay zeka servisi şu an yanıt vermiyor (aşırı yük ya da bağlantı sorunu); birkaç dakika sonra tekrar deneyin. Yazıyı elle de yazabilirsiniz.");
}

export async function handleAdminRequest(req: AdminHttpRequest, deps: AdminDeps): Promise<AdminHttpResponse> {
  const { env } = deps;
  const method = req.method.toUpperCase();
  const secure = header(req, "x-forwarded-proto") === "https" || Boolean(env.VERCEL);

  const clientKey = ipKey(req.ip);
  if (!deps.limiter.take(clientKey)) return fail(429, "rate_limited", "Çok fazla istek; bir dakika sonra tekrar deneyin.", undefined, { "Retry-After": "60" });

  const url = new URL(req.url, "http://panel.local");
  const action = url.searchParams.get("action") ?? "";
  const signingKey = sessionSigningKey(env.ADMIN_SESSION_SECRET, env.ADMIN_PASSWORD_HASH);
  const authenticated = verifySessionToken(readCookie(req.headers.cookie, SESSION_COOKIE), signingKey, deps.now());

  // --- Oturumsuz erişime açık iki eylem ve çıkış ---
  if (action === "session") {
    if (method !== "GET") return fail(405, "method_not_allowed", "Bu eylem GET ister.", undefined, { Allow: "GET" });
    return reply(200, { configured: loginConfigured(env), authenticated });
  }

  if (action === "logout") {
    if (method !== "POST") return fail(405, "method_not_allowed", "Bu eylem POST ister.", undefined, { Allow: "POST" });
    if (!csrfOk(req)) return fail(403, "csrf", "İstek reddedildi.");
    return reply(200, { ok: true }, { "Set-Cookie": clearedSessionCookie(secure) });
  }

  if (action === "login") {
    if (method !== "POST") return fail(405, "method_not_allowed", "Bu eylem POST ister.", undefined, { Allow: "POST" });
    if (!csrfOk(req)) return fail(403, "csrf", "İstek reddedildi.");
    if (!loginConfigured(env)) return fail(503, "admin_not_configured", "Panel henüz kurulmadı. Kurulum adımları docs/blog-paneli-kurulum.md dosyasındadır.");
    // Eksik ya da bozuk istek parola denemesi değildir: sayaçlara yazılmaz (boş isteklerle kilit tetiklenemesin).
    if (req.bodyError === "too_large") return fail(413, "too_large", "İstek çok büyük.");
    if (req.bodyError === "invalid_json") return fail(400, "bad_json", "İstek gövdesi geçerli JSON değil.");
    const password = isRecord(req.body) && typeof req.body.password === "string" ? req.body.password : "";
    if (password.length === 0 || password.length > MAX_PASSWORD_LENGTH) return fail(400, "bad_request", "Parola gerekli.");

    // Deneme, parola sınanmadan önce sayılır; aynı anda gelen istekler IP kilidini aşamaz.
    const own = deps.loginGuard.begin(clientKey);
    if (!own.allowed) return fail(429, "locked", `Çok fazla hatalı deneme. ${Math.ceil(own.retryAfterSeconds / 60)} dakika sonra tekrar deneyin.`, undefined, { "Retry-After": String(own.retryAfterSeconds) });

    // Ortak sayaç kilitlemez (sahibi dışarıda bırakılamasın); toplu denemede her isteği yavaşlatır.
    const pressure = deps.globalGuard.count("*");
    deps.globalGuard.failure("*");
    if (pressure >= deps.globalGuard.maxFailures) await deps.sleep(GLOBAL_SLOWDOWN_MS[pressure >= deps.globalGuard.maxFailures * 3 ? 1 : 0]);

    const valid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
    if (!valid) {
      await deps.sleep(FAILED_LOGIN_DELAY_MS);
      return fail(401, "invalid_credentials", "Parola hatalı.");
    }
    deps.loginGuard.success(clientKey);
    deps.globalGuard.cancel("*");
    const token = createSessionToken(signingKey!, deps.now());
    return reply(200, { ok: true }, { "Set-Cookie": sessionCookie(token, secure) });
  }

  // --- Buradan sonrası yalnızca oturumlu: eylem adı var olsun ya da olmasın önce kimlik denetlenir ---
  if (!authenticated) return fail(401, "unauthorized", "Oturum açmanız gerekiyor.");
  if (!csrfOk(req)) return fail(403, "csrf", "İstek reddedildi.");
  if (req.bodyError === "too_large") return fail(413, "too_large", "İstek çok büyük.");
  if (req.bodyError === "invalid_json") return fail(400, "bad_json", "İstek gövdesi geçerli JSON değil.");

  const service = serviceFor(deps);
  // Google anahtarları yalnızca ortam değişkenindedir; eksikse API yolu kapalıdır (panelin geri kalanı etkilenmez).
  const googleCredentials = readGoogleCredentials(env);
  const google = (): GoogleClient | undefined => (googleCredentials ? createGoogleClient(googleCredentials, deps.googleFetchImpl, deps.now) : undefined);
  const needGithub = () => fail(503, "github_not_configured", "GitHub anahtarı (GITHUB_CONTENT_TOKEN) tanımlı değil.");
  const needGoogle = () => fail(503, "google_not_configured", "Google anahtarları tanımlı değil (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN). Kurulum adımları docs/blog-paneli-kurulum.md dosyasındadır.");
  const needs = (expected: "GET" | "POST") => (method === expected ? undefined : fail(405, "method_not_allowed", `Bu eylem ${expected} ister.`, undefined, { Allow: expected }));
  const body = isRecord(req.body) ? req.body : {};

  try {
    switch (action) {
      case "posts": {
        const wrong = needs("GET");
        if (wrong) return wrong;
        if (!service) return fail(503, "github_not_configured", "GitHub anahtarı (GITHUB_CONTENT_TOKEN) tanımlı değil.");
        return reply(200, await service.listPosts());
      }
      case "save": {
        const wrong = needs("POST");
        if (wrong) return wrong;
        if (!service) return fail(503, "github_not_configured", "GitHub anahtarı (GITHUB_CONTENT_TOKEN) tanımlı değil.");
        const save: SaveBody = {
          post: body.post,
          mode: body.mode as SaveBody["mode"],
          ...(body.previousSlug !== undefined ? { previousSlug: body.previousSlug as string } : {}),
          ...(body.baseHash !== undefined ? { baseHash: body.baseHash as string } : {}),
        };
        if (save.previousSlug !== undefined && typeof save.previousSlug !== "string") return fail(400, "bad_request", "previousSlug metin olmalı.");
        return reply(200, await service.save(save));
      }
      case "delete": {
        const wrong = needs("POST");
        if (wrong) return wrong;
        if (!service) return fail(503, "github_not_configured", "GitHub anahtarı (GITHUB_CONTENT_TOKEN) tanımlı değil.");
        const outcome = await service.remove({
          slug: body.slug as string,
          confirm: body.confirm === true,
          ...(typeof body.redirectTo === "string" && body.redirectTo ? { redirectTo: body.redirectTo } : {}),
        });
        // Yazı silindi; Google'da paylaşılmışsa düğme "Hemen ara"ya çevrilir (API yoluyla paylaşıldıysa otomatik, değilse elle yapılacağı bildirilir).
        const { removedSocial, socialUnreadable, ...rest } = outcome;
        const googleState = await googleAfterDelete(service, { removedSocial, socialUnreadable }, google);
        return reply(200, { ...rest, ...(googleState ? { google: googleState } : {}) });
      }
      case "history": {
        const wrong = needs("GET");
        if (wrong) return wrong;
        if (!service) return fail(503, "github_not_configured", "GitHub anahtarı (GITHUB_CONTENT_TOKEN) tanımlı değil.");
        return reply(200, { entries: await service.history(url.searchParams.get("slug") ?? "") });
      }
      case "version": {
        const wrong = needs("GET");
        if (wrong) return wrong;
        if (!service) return fail(503, "github_not_configured", "GitHub anahtarı (GITHUB_CONTENT_TOKEN) tanımlı değil.");
        return reply(200, { post: await service.version(url.searchParams.get("slug") ?? "", url.searchParams.get("sha") ?? "") });
      }
      case "builds": {
        const wrong = needs("GET");
        if (wrong) return wrong;
        if (!service) return fail(503, "github_not_configured", "GitHub anahtarı (GITHUB_CONTENT_TOKEN) tanımlı değil.");
        return reply(200, { rows: await service.builds() });
      }
      case "image-upload": {
        const wrong = needs("POST");
        if (wrong) return wrong;
        const images = imagesFor(deps);
        if (!images) return fail(503, "blob_not_configured", "Fotoğraf deposu (Vercel Blob) tanımlı değil. Kurulum adımları docs/blog-paneli-kurulum.md dosyasındadır.");
        if (!imageHostFor(deps)) return fail(503, "image_host_not_configured", "Fotoğraf alanı ayarlanmamış (shared/blog-images.ts → BLOG_IMAGE_HOST).");
        // Dosya güvenilmez girdidir: tür, boyut ve ölçüler dosyanın kendisinden okunur; geçersiz istek günlük sınırdan düşmez.
        const checked = checkUpload({ large: body.large, small: body.small });
        if (!checked.ok) return fail(422, "image_invalid", checked.error);
        const limit = imageDailyLimit(env);
        const quota = (deps.imageQuota ?? shared.imageQuota).take(limit);
        if (!quota.allowed) return fail(429, "image_daily_limit", `Bugünkü fotoğraf yükleme sınırına (${limit}) ulaşıldı; yarın tekrar deneyin. Sınır, Vercel Blob Hobby kotasını (ayda 2.000 işlem) korur.`);
        const stored = await images.upload(checked.upload);
        return reply(200, { src: stored.src, width: stored.width, height: stored.height, remaining: quota.remaining });
      }
      case "image-usage": {
        const wrong = needs("GET");
        if (wrong) return wrong;
        if (!service) return fail(503, "github_not_configured", "GitHub anahtarı (GITHUB_CONTENT_TOKEN) tanımlı değil.");
        return reply(200, await service.imageUsage());
      }
      case "image-cleanup": {
        const wrong = needs("POST");
        if (wrong) return wrong;
        if (!service) return fail(503, "github_not_configured", "GitHub anahtarı (GITHUB_CONTENT_TOKEN) tanımlı değil.");
        return reply(200, await service.imageCleanup({ confirm: body.confirm === true }));
      }
      case "settings": {
        const wrong = needs("GET");
        if (wrong) return wrong;
        if (!service) return needGithub();
        const view = await service.settings();
        return reply(200, { settings: view.settings, ...(view.problem ? { problem: view.problem } : {}), googleConfigured: Boolean(googleCredentials) });
      }
      case "settings-save": {
        const wrong = needs("POST");
        if (wrong) return wrong;
        if (!service) return needGithub();
        const saved = await service.saveSettings(body.settings);
        return reply(200, { ...saved, googleConfigured: Boolean(googleCredentials) });
      }
      case "social-get": {
        const wrong = needs("GET");
        if (wrong) return wrong;
        if (!service) return needGithub();
        return reply(200, await service.social(url.searchParams.get("slug")));
      }
      case "social-save": {
        const wrong = needs("POST");
        if (wrong) return wrong;
        if (!service) return needGithub();
        return reply(200, await service.saveSocial({ slug: body.slug, googleBusiness: body.googleBusiness, instagram: body.instagram, button: body.button }));
      }
      case "social-mark": {
        const wrong = needs("POST");
        if (wrong) return wrong;
        if (!service) return needGithub();
        return reply(200, await service.markShared({ slug: body.slug, channel: body.channel, shared: body.shared }));
      }
      case "google-test": {
        const wrong = needs("POST");
        if (wrong) return wrong;
        if (!service) return needGithub();
        const client = google();
        if (!client) return needGoogle();
        const { accountId, locationId } = (await service.settings()).settings.google;
        if (!accountId || !locationId) return fail(422, "google_ids_missing", "Önce hesap ve konum kimliğini yazıp ayarları kaydedin.");
        const quota = (deps.googleQuota ?? shared.googleQuota).take(GOOGLE_DAILY_LIMIT);
        if (!quota.allowed) return fail(429, "google_daily_limit", `Bugünkü Google çağrı sınırına (${GOOGLE_DAILY_LIMIT}) ulaşıldı; yarın tekrar deneyin.`);
        await client.test(accountId, locationId);
        return reply(200, { ok: true });
      }
      case "google-share": {
        const wrong = needs("POST");
        if (wrong) return wrong;
        if (!service) return needGithub();
        if (!service.isLiveBranch()) return fail(422, "google_live_only", "Google'a paylaşım yalnızca canlı (main) panelde yapılır; önizleme paneli canlıyla aynı Google profilini paylaşırdı.");
        const client = google();
        if (!client) return needGoogle();
        if (typeof body.slug !== "string" || !BLOG_SLUG_PATTERN.test(body.slug)) return fail(400, "bad_request", "Adres geçersiz");
        const key = body.slug;
        const sharing = shared.googleSharing;
        // Kilit, "zaten paylaşıldı" denetiminden ÖNCE alınır: önceki gönderim bitip kilidi bıraktığında bu istek güncel kaydı okur ve ikinci gönderimi reddeder.
        if (sharing.has(key)) return fail(409, "share_in_progress", "Bu yazı şu an Google'a gönderiliyor; birkaç saniye bekleyin.");
        sharing.add(key);
        try {
          const context = await service.shareContext(key);
          const { mode, accountId, locationId, sendPhoto } = context.settings.google;
          if (mode !== "api" || !accountId || !locationId) return fail(422, "google_api_off", "Ayarlarda “API var” seçili değil ya da hesap/konum kimliği eksik. Paylaşımı elle yapıp “paylaşıldı” kutusunu işaretleyin.");
          const quota = (deps.googleQuota ?? shared.googleQuota).take(GOOGLE_DAILY_LIMIT);
          if (!quota.allowed) return fail(429, "google_daily_limit", `Bugünkü Google çağrı sınırına (${GOOGLE_DAILY_LIMIT}) ulaşıldı; yarın tekrar deneyin.`);
          const created = await client.createPost(accountId, locationId, buildGoogleLocalPost(context.post, context.record, sendPhoto));
          // Gönderi Google'da oluştu; kaydı yazamazsak tekrar paylaşılabilir. Bu yüzden kayıt bir kez daha denenir.
          for (let attempt = 1; ; attempt++) {
            try {
              return reply(200, { ok: true, record: await service.recordGoogleShare({ slug: key, postName: created.name }) });
            } catch {
              if (attempt < 2) continue;
              console.error("admin: google paylaşımı yapıldı ama kaydedilemedi");
              return fail(502, "google_share_not_recorded", "Google'da paylaşıldı, ancak kayıt yazılamadı. Tekrar paylaşmayın: paylaşım paketinde “Google'da paylaşıldı” kutusunu elle işaretleyin.", { postName: created.name });
            }
          }
        } finally {
          sharing.delete(key);
        }
      }
      case "ai-draft": {
        const wrong = needs("POST");
        if (wrong) return wrong;
        const providers = createAiProviders(env, deps.aiFetchImpl, deps.aiFetchImpl ? 0 : undefined);
        if (!providers.length) return fail(503, "ai_not_configured", "Yapay zeka anahtarı (GEMINI_API_KEY) tanımlı değil. Kurulum adımları docs/blog-paneli-kurulum.md dosyasındadır.");
        const input = validateAiCaseInput(body.input);
        if (!input.ok) return fail(422, "validation_failed", input.errors[0], { errors: input.errors });
        // Sayım sağlayıcı çağrılmadan önce yapılır; geçersiz girdi ve kurulmamış anahtar kotadan düşmez.
        const quota = (deps.aiQuota ?? shared.aiQuota).take(aiDailyLimit(env));
        if (!quota.allowed) return fail(429, "ai_daily_limit", `Bugünkü yapay zeka taslağı sınırına (${aiDailyLimit(env)}) ulaşıldı; yarın tekrar deneyin ya da yazıyı elle yazın.`);
        const draft = await generateAiDraft(input.input, providers, new Date(deps.now()));
        return reply(200, { post: draft.post, googleBusiness: draft.googleBusiness, instagram: draft.instagram, provider: draft.provider, attempts: draft.attempts, styleNotes: draft.styleNotes, remaining: quota.remaining });
      }
      case "ai-suggest": {
        // Olası nedenler: yalnızca seçenek listesi döner; hiçbir şey kaydedilmez, seçimi proje sahibi editörde yapar. Günlük hak taslakla ortaktır.
        const wrong = needs("POST");
        if (wrong) return wrong;
        const providers = createAiProviders(env, deps.aiFetchImpl, deps.aiFetchImpl ? 0 : undefined);
        if (!providers.length) return fail(503, "ai_not_configured", "Yapay zeka anahtarı (GEMINI_API_KEY) tanımlı değil. Kurulum adımları docs/blog-paneli-kurulum.md dosyasındadır.");
        const input = validateAiSuggestInput(body.input);
        if (!input.ok) return fail(422, "validation_failed", input.errors[0], { errors: input.errors });
        const quota = (deps.aiQuota ?? shared.aiQuota).take(aiDailyLimit(env));
        if (!quota.allowed) return fail(429, "ai_daily_limit", `Bugünkü yapay zeka sınırına (${aiDailyLimit(env)}) ulaşıldı; yarın tekrar deneyin ya da tespiti ve işlemi kendiniz yazın.`);
        const suggested = await generateAiSuggestions(input.input, providers);
        return reply(200, { complaint: suggested.complaint, options: suggested.options, provider: suggested.provider, attempts: suggested.attempts, remaining: quota.remaining });
      }
      default:
        return fail(404, "unknown_action", "Bilinmeyen eylem.");
    }
  } catch (error) {
    if (error instanceof AiRejectedError) return fail(502, "ai_output_rejected", "Yapay zeka çıktısı içerik kurallarından geçmedi; editöre aktarılmadı. Tekrar deneyin ya da yazıyı elle yazın.", { errors: error.reasons.slice(0, 12) });
    if (error instanceof AiError) {
      console.error("admin: yapay zeka hatası", error.provider, error.kind, error.status);
      return describeAiError(error);
    }
    if (error instanceof GoogleError) return describeGoogleError(error);
    if (error instanceof ImageStoreError) return fail(error.status, error.code, error.message);
    if (error instanceof BlobError) return describeBlobError(error);
    if (error instanceof AdminError) return fail(error.status, error.code, error.message, error.errors ? { errors: error.errors } : undefined);
    if (error instanceof GithubError) return describeGithubError(error);
    console.error("admin: beklenmeyen hata", error instanceof Error ? error.name : "bilinmiyor");
    return fail(500, "internal_error", "Beklenmeyen bir hata oluştu.");
  }
}

const MAX_BODY_BYTES = 512 * 1024;
/** Fotoğraf yükleme: iki WebP (en çok 500 KB + 200 KB) base64 olarak ≈ 940 KB eder. Yalnızca OTURUMLU `image-upload` isteğinde geçerlidir. */
const IMAGE_BODY_MAX_BYTES = 1280 * 1024;

/**
 * İstemci IP'si. İletilen IP başlıklarına yalnızca Vercel'de güvenilir (Vercel bu başlıkları kendisi yazar); başka ortamda
 * başlıkları istemci uydurabileceği için bağlantının kendi adresi kullanılır. Aksi hâlde IP kilidi ve istek sınırı başlıkla aşılırdı.
 */
export function clientIp(req: Pick<IncomingMessage, "headers" | "socket">, trustForwardedHeaders: boolean): string {
  const pick = (name: string) => {
    const value = req.headers[name];
    return (Array.isArray(value) ? value[0] : value)?.split(",")[0].trim();
  };
  const forwarded = trustForwardedHeaders ? pick("x-vercel-forwarded-for") || pick("x-real-ip") || pick("x-forwarded-for") : undefined;
  return forwarded || req.socket.remoteAddress || "unknown";
}

async function readJsonBody(req: IncomingMessage, maxBytes: number = MAX_BODY_BYTES): Promise<Pick<AdminHttpRequest, "body" | "bodyError">> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > maxBytes) return { bodyError: "too_large" };
    chunks.push(chunk as Buffer);
  }
  if (size === 0) return {};
  try {
    return { body: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return { bodyError: "invalid_json" };
  }
}

/** Vercel fonksiyonu, express ve Vite geliştirme sunucusu için Node adaptörü. */
export async function adminHandler(req: IncomingMessage, res: ServerResponse, overrides: Partial<AdminDeps> = {}): Promise<void> {
  const deps: AdminDeps = { ...defaultDeps(overrides.env ?? process.env), ...overrides };
  let result: AdminHttpResponse;
  try {
    const method = (req.method ?? "GET").toUpperCase();
    let maxBytes = MAX_BODY_BYTES;
    if (method === "POST" && new URL(req.url ?? "/", "http://panel.local").searchParams.get("action") === "image-upload") {
      // Büyük gövde yalnızca geçerli oturumla kabul edilir; oturumsuz istek diğer eylemlerle aynı sınıra tabidir.
      const key = sessionSigningKey(deps.env.ADMIN_SESSION_SECRET, deps.env.ADMIN_PASSWORD_HASH);
      if (verifySessionToken(readCookie(req.headers.cookie, SESSION_COOKIE), key, deps.now())) maxBytes = IMAGE_BODY_MAX_BYTES;
    }
    const parsed = method === "GET" || method === "HEAD" ? {} : await readJsonBody(req, maxBytes);
    result = await handleAdminRequest({ method, url: req.url ?? "/api/admin", headers: req.headers, ip: clientIp(req, Boolean(deps.env.VERCEL)), ...parsed }, deps);
  } catch {
    result = fail(500, "internal_error", "Beklenmeyen bir hata oluştu.");
  }
  res.statusCode = result.status;
  for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
  res.end((req.method ?? "GET").toUpperCase() === "HEAD" ? undefined : JSON.stringify(result.body));
}

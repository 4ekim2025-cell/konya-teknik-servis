/**
 * Panel API'si: `/api/admin?action=<ad>`. Tek Vercel fonksiyonudur (Hobby planda 12 fonksiyon sınırı vardır).
 *
 * Değişmez kurallar (testle korunur, bkz. client/src/adminApi.test.ts):
 *  - `session` ve `login` dışındaki HİÇBİR eylem geçerli oturum çerezi olmadan çalışmaz: veri döndürmez, GitHub'a dokunmaz.
 *  - Yazan her istek JSON olmalı, `X-Admin-Request: 1` başlığı taşımalı ve (varsa) Origin başlığı sitenin kendisi olmalıdır.
 *  - Yanıtlar `noindex` başlığı taşır ve önbelleğe alınmaz. Hata yanıtları gizli anahtar ya da GitHub gövdesi içermez.
 *  - Gizli değerler yalnızca ortam değişkenlerindedir: ADMIN_PASSWORD_HASH, ADMIN_SESSION_SECRET, GITHUB_CONTENT_TOKEN, GEMINI_API_KEY, GROQ_API_KEY.
 *  - `ai-draft` (yapay zeka taslağı) hiçbir şey kaydetmez: GitHub'a dokunmaz, yalnızca editöre dolacak taslağı döndürür. Aynı oturum,
 *    CSRF ve istek sınırından geçer; ayrıca günlük kullanım sınırı vardır. Model çıktısı kurallardan geçmezse taslak dönmez.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { LoginGuard, MIN_SECRET_LENGTH, RateLimiter, ipKey, clearedSessionCookie, createSessionToken, readCookie, SESSION_COOKIE, sessionCookie, sessionSigningKey, verifyPassword, verifySessionToken } from "./auth.js";
import { GithubError, createGithubClient, readGithubConfig, type GithubClient } from "./github.js";
import { AdminError, createAdminService, type AdminService, type SaveBody } from "./service.js";
import { AiError, AiRejectedError, DailyQuota, aiDailyLimit, createAiProviders, generateAiDraft } from "./ai.js";
import { validateAiCaseInput } from "../../shared/blog-ai.js";

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
};

const FAILED_LOGIN_DELAY_MS = 800;
/** Ortak sayaç eşiği aşılınca parola sınanmadan önce eklenen bekleme: eşikte 2 sn, eşiğin üç katında 5 sn. */
const GLOBAL_SLOWDOWN_MS = [2000, 5000] as const;
const MAX_PASSWORD_LENGTH = 200;
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
  service: undefined as { key: string; value: AdminService } | undefined,
};

function serviceFor(deps: AdminDeps): AdminService | undefined {
  if (deps.service) return deps.service;
  const config = readGithubConfig(deps.env);
  if (!config) return undefined;
  // Test için verilen `fetchImpl` önbelleğe alınmaz: her çağrı kendi taklit deposuyla çalışır.
  if (deps.fetchImpl) return createAdminService({ github: createGithubClient(config, deps.fetchImpl) });
  const key = `${config.owner}/${config.repo}@${config.branch}:${config.token.slice(-6)}`;
  if (shared.service?.key !== key) {
    const github: GithubClient = createGithubClient(config, deps.fetchImpl);
    shared.service = { key, value: createAdminService({ github }) };
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

function describeAiError(error: AiError): AdminHttpResponse {
  if (error.kind === "auth") return fail(502, "ai_auth_failed", "Yapay zeka anahtarı geçersiz ya da yetkisiz. Vercel'deki GEMINI_API_KEY değerini kontrol edin.");
  if (error.kind === "rate") return fail(503, "ai_rate_limited", "Yapay zeka servisinin ücretsiz kullanım sınırına ulaşıldı; bir süre sonra tekrar deneyin.");
  if (error.kind === "blocked") return fail(502, "ai_blocked", "Yapay zeka servisi bu girdiyi yanıtlamadı; metni sadeleştirip tekrar deneyin.");
  return fail(502, "ai_unavailable", "Yapay zeka servisine şu an ulaşılamıyor; birazdan tekrar deneyin. Yazıyı elle de yazabilirsiniz.");
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
        return reply(200, await service.remove({
          slug: body.slug as string,
          confirm: body.confirm === true,
          ...(typeof body.redirectTo === "string" && body.redirectTo ? { redirectTo: body.redirectTo } : {}),
        }));
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
      case "ai-draft": {
        const wrong = needs("POST");
        if (wrong) return wrong;
        const providers = createAiProviders(env, deps.aiFetchImpl);
        if (!providers.length) return fail(503, "ai_not_configured", "Yapay zeka anahtarı (GEMINI_API_KEY) tanımlı değil. Kurulum adımları docs/blog-paneli-kurulum.md dosyasındadır.");
        const input = validateAiCaseInput(body.input);
        if (!input.ok) return fail(422, "validation_failed", input.errors[0], { errors: input.errors });
        // Sayım sağlayıcı çağrılmadan önce yapılır; geçersiz girdi ve kurulmamış anahtar kotadan düşmez.
        const quota = (deps.aiQuota ?? shared.aiQuota).take(aiDailyLimit(env));
        if (!quota.allowed) return fail(429, "ai_daily_limit", `Bugünkü yapay zeka taslağı sınırına (${aiDailyLimit(env)}) ulaşıldı; yarın tekrar deneyin ya da yazıyı elle yazın.`);
        const draft = await generateAiDraft(input.input, providers, new Date(deps.now()));
        return reply(200, { post: draft.post, googleBusiness: draft.googleBusiness, instagram: draft.instagram, provider: draft.provider, attempts: draft.attempts, remaining: quota.remaining });
      }
      default:
        return fail(404, "unknown_action", "Bilinmeyen eylem.");
    }
  } catch (error) {
    if (error instanceof AiRejectedError) return fail(502, "ai_output_rejected", "Yapay zeka çıktısı içerik kurallarından geçmedi; editöre aktarılmadı. Tekrar deneyin ya da yazıyı elle yazın.", { errors: error.reasons.slice(0, 12) });
    if (error instanceof AiError) {
      console.error("admin: yapay zeka hatası", error.provider, error.kind);
      return describeAiError(error);
    }
    if (error instanceof AdminError) return fail(error.status, error.code, error.message, error.errors ? { errors: error.errors } : undefined);
    if (error instanceof GithubError) return describeGithubError(error);
    console.error("admin: beklenmeyen hata", error instanceof Error ? error.name : "bilinmiyor");
    return fail(500, "internal_error", "Beklenmeyen bir hata oluştu.");
  }
}

const MAX_BODY_BYTES = 512 * 1024;

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

async function readJsonBody(req: IncomingMessage): Promise<Pick<AdminHttpRequest, "body" | "bodyError">> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) return { bodyError: "too_large" };
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
    const parsed = method === "GET" || method === "HEAD" ? {} : await readJsonBody(req);
    result = await handleAdminRequest({ method, url: req.url ?? "/api/admin", headers: req.headers, ip: clientIp(req, Boolean(deps.env.VERCEL)), ...parsed }, deps);
  } catch {
    result = fail(500, "internal_error", "Beklenmeyen bir hata oluştu.");
  }
  res.statusCode = result.status;
  for (const [name, value] of Object.entries(result.headers)) res.setHeader(name, value);
  res.end((req.method ?? "GET").toUpperCase() === "HEAD" ? undefined : JSON.stringify(result.body));
}

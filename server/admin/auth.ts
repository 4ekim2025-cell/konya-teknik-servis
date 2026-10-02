/**
 * Panel girişi: tek kullanıcı, tek parola.
 *  - Parola yalnızca scrypt özeti olarak ortam değişkeninde durur (`ADMIN_PASSWORD_HASH`); `pnpm admin:hash` ile üretilir.
 *  - Oturum, `ADMIN_SESSION_SECRET` + parola özetinden türeyen anahtarla HMAC imzalı, HttpOnly + SameSite=Strict çerezdir (30 gün,
 *    yalnızca /api/admin yoluna gönderilir). Oturum anahtarı YA DA parola değişirse tüm oturumlar düşer.
 *  - Hatalı parolada bekleme + IP başına geçici kilit + genel istek sınırı (bellek içi; sunucusuz örnekler arası paylaşılmaz,
 *    bu yüzden asıl koruma uzun rastgele paroladır).
 *  - Deneme, parola sınanmadan ÖNCE sayılır (`begin`); aynı anda gelen istekler kilidi aşamaz.
 *  - Tüm IP'lerin toplam hatası girişi kilitlemez, yalnızca yavaşlatır: aksi hâlde herkes birkaç istekle sahibini dışarıda bırakabilirdi.
 */
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual, type BinaryLike, type ScryptOptions } from "node:crypto";

export const SESSION_COOKIE = "esli_admin";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const MIN_SECRET_LENGTH = 32;
export const MIN_PASSWORD_LENGTH = 12;

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 32 } as const;

const scryptAsync = (password: BinaryLike, salt: BinaryLike, keylen: number, options: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password, salt, keylen, options, (error, key) => (error ? reject(error) : resolve(key))));

const b64 = (buffer: Buffer) => buffer.toString("base64url");

/** `scrypt$N$r$p$tuz$özet` biçiminde parola özeti üretir. */
export async function hashPassword(password: string, salt: Buffer = randomBytes(16)): Promise<string> {
  const { N, r, p, keylen } = SCRYPT_PARAMS;
  const key = await scryptAsync(password.normalize("NFKC"), salt, keylen, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${b64(salt)}$${b64(key)}`;
}

/** Sabit sürede karşılaştırır; bozuk ya da tanınmayan özet her zaman `false` verir. */
export async function verifyPassword(password: string, stored: string | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.trim().split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every(value => Number.isInteger(value) && value > 0) || N > 1 << 17 || N < 1024 || r > 16 || p > 4) return false;
  try {
    const salt = Buffer.from(parts[4], "base64url");
    const expected = Buffer.from(parts[5], "base64url");
    if (salt.length < 8 || expected.length < 16) return false;
    const actual = await scryptAsync(password.normalize("NFKC"), salt, expected.length, { N, r, p, maxmem: 64 * 1024 * 1024 });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Oturum imza anahtarı: oturum anahtarı + parola özetinin özeti. Parola değiştirildiğinde (özet değişir) eski çerezlerin
 * hepsi geçersiz olur; çalınmış bir oturum parola değişikliğiyle kapatılabilir. Ayar eksikse `undefined` döner.
 */
export function sessionSigningKey(secret: string | undefined, passwordHash: string | undefined): string | undefined {
  const key = secret?.trim();
  const hash = passwordHash?.trim();
  if (!key || key.length < MIN_SECRET_LENGTH || !hash) return undefined;
  return `${key}.${createHash("sha256").update(hash).digest("base64url")}`;
}

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url");

/** `v1.<bitiş-saniye>.<rastgele>.<imza>` biçiminde oturum belirteci. */
export function createSessionToken(secret: string, nowMs: number = Date.now()): string {
  const payload = `v1.${Math.floor(nowMs / 1000) + SESSION_MAX_AGE_SECONDS}.${b64(randomBytes(12))}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string | undefined, secret: string | undefined, nowMs: number = Date.now()): boolean {
  if (!token || !secret || secret.length < MIN_SECRET_LENGTH) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return false;
  const payload = parts.slice(0, 3).join(".");
  const expected = Buffer.from(sign(payload, secret));
  const given = Buffer.from(parts[3]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  const expires = Number(parts[1]);
  return Number.isFinite(expires) && expires * 1000 > nowMs;
}

export function readCookie(header: string | string[] | undefined, name: string): string | undefined {
  const raw = Array.isArray(header) ? header.join("; ") : header;
  if (!raw) return undefined;
  for (const piece of raw.split(";")) {
    const index = piece.indexOf("=");
    if (index > 0 && piece.slice(0, index).trim() === name) return piece.slice(index + 1).trim();
  }
  return undefined;
}

/** Çerez yalnızca panel API'sine gönderilir; sitenin diğer sayfalarına ve uç noktalarına gitmez. */
export const SESSION_COOKIE_PATH = "/api/admin";

/** `secure: false` yalnızca http://localhost geliştirmesi içindir. */
export function sessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Path=${SESSION_COOKIE_PATH}; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
}

export function clearedSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=${SESSION_COOKIE_PATH}; Max-Age=0; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
}

/** Hatalı girişleri sayar: pencere içinde `maxFailures` hatadan sonra anahtar (IP) `lockMs` boyunca kilitlenir. */
export class LoginGuard {
  private failures = new Map<string, { count: number; first: number; lockedUntil: number }>();
  constructor(
    private options = { maxFailures: 5, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 },
    private now: () => number = Date.now,
  ) {}

  check(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const entry = this.failures.get(key);
    const time = this.now();
    if (entry && entry.lockedUntil > time) return { allowed: false, retryAfterSeconds: Math.ceil((entry.lockedUntil - time) / 1000) };
    return { allowed: true, retryAfterSeconds: 0 };
  }

  failure(key: string): void {
    const time = this.now();
    const entry = this.failures.get(key);
    const fresh = !entry || time - entry.first > this.options.windowMs;
    const next = fresh ? { count: 1, first: time, lockedUntil: 0 } : { ...entry, count: entry.count + 1 };
    if (next.count >= this.options.maxFailures) next.lockedUntil = time + this.options.lockMs;
    this.failures.set(key, next);
    if (this.failures.size > 500) for (const [k, v] of this.failures) if (time - v.first > this.options.windowMs && v.lockedUntil < time) this.failures.delete(k);
  }

  success(key: string): void {
    this.failures.delete(key);
  }

  /**
   * Denemeyi parola sınanmadan önce sayar. Kilitliyse saymadan reddeder. Sayım eşzamansız işten (scrypt) önce yapıldığı için
   * aynı anda gelen istekler sınırı aşamaz. Parola doğruysa `success` (IP sayacı) ya da `cancel` (ortak sayaç) ile geri alınır.
   */
  begin(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const state = this.check(key);
    if (state.allowed) this.failure(key);
    return state;
  }

  /** `begin` ya da `failure` ile sayılmış tek denemeyi geri alır; sayı sınırın altına inerse kilidi kaldırır. */
  cancel(key: string): void {
    const entry = this.failures.get(key);
    if (!entry) return;
    const count = entry.count - 1;
    if (count <= 0) this.failures.delete(key);
    else this.failures.set(key, { ...entry, count, lockedUntil: count >= this.options.maxFailures ? entry.lockedUntil : 0 });
  }

  /** Pencere içinde sayılmış deneme sayısı. */
  count(key: string): number {
    const entry = this.failures.get(key);
    return entry && this.now() - entry.first <= this.options.windowMs ? entry.count : 0;
  }

  get maxFailures(): number {
    return this.options.maxFailures;
  }
}

/**
 * Sayaç anahtarı: IPv4 olduğu gibi, IPv6'da /64 öneki. Bir aboneye genelde bütün bir /64 verilir;
 * tam adres anahtar olsaydı adres değiştirerek IP kilidi ve istek sınırı aşılabilirdi.
 */
export function ipKey(ip: string): string {
  const value = ip.trim().toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(value);
  if (mapped) return mapped[1];
  if (!value.includes(":")) return value;
  const [head, tail = ""] = value.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = value.includes("::") ? [...left, ...new Array<string>(Math.max(0, 8 - left.length - right.length)).fill("0"), ...right] : left;
  return `${groups.slice(0, 4).map(group => group.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}

/** Anahtar başına pencere içi istek sınırı (`/api/admin/` genel sınırı). */
export class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private limit: number, private windowMs: number, private now: () => number = Date.now) {}

  /** `true`: istek kabul edildi; `false`: sınır aşıldı. */
  take(key: string): boolean {
    const time = this.now();
    const recent = (this.hits.get(key) ?? []).filter(stamp => time - stamp < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(time);
    this.hits.set(key, recent);
    if (this.hits.size > 1000) for (const [k, v] of this.hits) if (v.every(stamp => time - stamp >= this.windowMs)) this.hits.delete(k);
    return true;
  }
}

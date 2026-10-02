/**
 * Panel girişi: tek kullanıcı, tek parola.
 *  - Parola yalnızca scrypt özeti olarak ortam değişkeninde durur (`ADMIN_PASSWORD_HASH`); `pnpm admin:hash` ile üretilir.
 *  - Oturum, `ADMIN_SESSION_SECRET` ile HMAC imzalı, HttpOnly + SameSite=Strict çerezdir (30 gün). Anahtar değişirse tüm oturumlar düşer.
 *  - Hatalı parolada bekleme + IP başına geçici kilit + genel istek sınırı (bellek içi; sunucusuz örnekler arası paylaşılmaz,
 *    bu yüzden ek koruma olarak uzun rastgele parola kullanılır).
 */
import { createHmac, randomBytes, scrypt, timingSafeEqual, type BinaryLike, type ScryptOptions } from "node:crypto";

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

/** `secure: false` yalnızca http://localhost geliştirmesi içindir. */
export function sessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
}

export function clearedSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict${secure ? "; Secure" : ""}`;
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

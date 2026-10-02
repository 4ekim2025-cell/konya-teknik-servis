import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { planBuild } from "../../scripts/build-content";
import { BLOG_SLUGS_LINKED_FROM_CODE } from "../../shared/blog-protected";
import { redirectPageHtml } from "../../shared/blog-redirects";
import { clearedSessionCookie, createSessionToken, hashPassword, ipKey, LoginGuard, RateLimiter, readCookie, sessionCookie, sessionSigningKey, verifyPassword, verifySessionToken } from "../../server/admin/auth";
import { GithubError, createGithubClient, readGithubConfig } from "../../server/admin/github";
import { clientIp, handleAdminRequest, type AdminDeps, type AdminHttpRequest, type AdminHttpResponse } from "../../server/admin/handler";
import { SKIP_BUILD_MARKER, createAdminService } from "../../server/admin/service";
import { FakeGithubRepo } from "./adminFakeGithub";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

const PASSWORD = "doğru-at-pil-zımba-4821";
const SECRET = "x".repeat(48);
const TOKEN = "ghp_TESTTOKEN123456";
const GENERATED_FILES = ["shared/blog-content.generated.ts", "client/public/sitemap.xml", "client/public/llms.txt"];

/** Gerçek depodaki içerik dosyaları: panel testleri gerçek veriyle çalışır. */
function realRepoFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const name of readdirSync(resolve(projectRoot, "content/blog"))) files[`content/blog/${name}`] = read(`content/blog/${name}`);
  for (const path of GENERATED_FILES) files[path] = read(path);
  return files;
}

const newPost = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  slug: "/blog/yeni-deneme-yazisi/",
  category: "Bakım Rehberi",
  title: "Deneme yazısı: panelden eklendi",
  description: "Panelden eklenen deneme yazısının, arama sonuçlarında görünecek 90 ile 160 karakter arasındaki açıklaması burada yer alır.",
  excerpt: "Panelden eklenen deneme yazısı.",
  device: "Çamaşır Makinesi",
  servicePath: "/camasir-makinesi-tamiri-konya/",
  blocks: [{ type: "p", text: "Deneme paragrafı." }],
  ...overrides,
});

type Kit = Awaited<ReturnType<typeof setup>>;
async function setup(options: { files?: Record<string, string>; env?: Record<string, string | undefined> } = {}) {
  const repo = new FakeGithubRepo(options.files ?? realRepoFiles(), TOKEN);
  const clock = { now: Date.parse("2026-10-02T09:00:00Z") };
  const env: Record<string, string | undefined> = {
    ADMIN_PASSWORD_HASH: await hashPassword(PASSWORD),
    ADMIN_SESSION_SECRET: SECRET,
    GITHUB_CONTENT_TOKEN: TOKEN,
    GITHUB_REPO: "o/r",
    GITHUB_BRANCH: "main",
    ...options.env,
  };
  const config = readGithubConfig(env);
  const sleeps: number[] = [];
  const deps: AdminDeps = {
    env,
    now: () => clock.now,
    sleep: async ms => void sleeps.push(ms),
    loginGuard: new LoginGuard(undefined, () => clock.now),
    globalGuard: new LoginGuard({ maxFailures: 30, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 }, () => clock.now),
    limiter: new RateLimiter(120, 60 * 1000, () => clock.now),
    fetchImpl: repo.fetch,
    ...(config ? { service: createAdminService({ github: createGithubClient(config, repo.fetch), now: () => new Date(clock.now) }) } : {}),
  };
  const log: AdminHttpResponse[] = [];
  const call = async (opts: { method?: string; action: string; query?: Record<string, string>; body?: unknown; cookie?: string; headers?: Record<string, string>; ip?: string }) => {
    const method = opts.method ?? "GET";
    const req: AdminHttpRequest = {
      method,
      url: `/api/admin?${new URLSearchParams({ action: opts.action, ...opts.query })}`,
      headers: { host: "esliteknik.com", ...(opts.cookie ? { cookie: opts.cookie } : {}), ...(method === "POST" ? { "content-type": "application/json", "x-admin-request": "1", origin: "https://esliteknik.com" } : {}), ...opts.headers },
      body: opts.body,
      ip: opts.ip ?? "203.0.113.7",
    };
    const response = await handleAdminRequest(req, deps);
    log.push(response);
    return { status: response.status, headers: response.headers, body: response.body as any };
  };
  const login = async () => {
    const response = await call({ method: "POST", action: "login", body: { password: PASSWORD } });
    if (response.status !== 200) throw new Error(`giriş başarısız: ${response.status}`);
    return response.headers["Set-Cookie"].split(";")[0];
  };
  return { repo, env, deps, clock, sleeps, call, login, log };
}

/** Sunucunun döndürdüğü yazı listesinden bir yazının içerik özetini (hash) alır. */
async function hashOf(kit: Kit, cookie: string, slug: string): Promise<string> {
  const list = await kit.call({ action: "posts", cookie });
  const item = list.body.items.find((entry: any) => entry.post.slug === slug);
  if (!item) throw new Error(`liste içinde yok: ${slug}`);
  return item.hash;
}

/** Son commit'te değişen dosyalar. */
function lastCommitChanges(repo: FakeGithubRepo) {
  const [latest, previous] = repo.log();
  const before = repo.commits.get(latest.parent!)!.files;
  void previous;
  const paths = new Set([...latest.files.keys(), ...before.keys()]);
  const added: string[] = [], modified: string[] = [], deleted: string[] = [];
  for (const path of [...paths].sort()) {
    if (!before.has(path)) added.push(path);
    else if (!latest.files.has(path)) deleted.push(path);
    else if (before.get(path) !== latest.files.get(path)) modified.push(path);
  }
  return { added, modified, deleted, message: latest.message };
}

/** Taklit depodaki dosyaları geçici klasöre yazıp gerçek derleyiciyi (planBuild) çalıştırır: hata fırlatırsa içerik geçersizdir. */
function buildCheck(repo: FakeGithubRepo) {
  const root = mkdtempSync(join(tmpdir(), "panel-"));
  try {
    for (const [path, content] of repo.headFiles()) {
      mkdirSync(join(root, dirname(path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    const plan = planBuild(root);
    return { stale: plan.files.filter(file => file.changed).map(file => file.path), posts: plan.posts };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe("parola ve oturum (auth)", () => {
  it("parolayı scrypt özetiyle doğrular; yanlış, boş ve bozuk özeti reddeder", async () => {
    const stored = await hashPassword(PASSWORD);
    expect(stored.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(await verifyPassword(PASSWORD, stored)).toBe(true);
    expect(await verifyPassword(`${PASSWORD}x`, stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
    expect(await verifyPassword(PASSWORD, undefined)).toBe(false);
    expect(await verifyPassword(PASSWORD, "bozuk")).toBe(false);
    expect(await verifyPassword(PASSWORD, "scrypt$999999999$8$1$YWJj$YWJj")).toBe(false);
    expect(await hashPassword(PASSWORD)).not.toBe(stored);
  });

  it("oturum belirteci imzalıdır; kurcalanmış, süresi dolmuş ve yanlış anahtarlı belirteci reddeder", () => {
    const now = Date.parse("2026-10-02T09:00:00Z");
    const token = createSessionToken(SECRET, now);
    expect(verifySessionToken(token, SECRET, now)).toBe(true);
    expect(verifySessionToken(token, SECRET, now + 29 * 24 * 3600 * 1000)).toBe(true);
    expect(verifySessionToken(token, SECRET, now + 31 * 24 * 3600 * 1000)).toBe(false);
    expect(verifySessionToken(token, "y".repeat(48), now)).toBe(false);
    expect(verifySessionToken(`${token}x`, SECRET, now)).toBe(false);
    const [v, exp, nonce, sig] = token.split(".");
    expect(verifySessionToken([v, String(Number(exp) + 99999), nonce, sig].join("."), SECRET, now)).toBe(false);
    expect(verifySessionToken(undefined, SECRET, now)).toBe(false);
    expect(verifySessionToken(token, undefined, now)).toBe(false);
    expect(verifySessionToken(token, "kısa", now)).toBe(false);
  });

  it("çerez HttpOnly, SameSite=Strict ve 30 gün ömürlüdür; yalnızca https'te Secure", () => {
    const secure = sessionCookie("abc", true);
    expect(secure).toContain("HttpOnly");
    expect(secure).toContain("SameSite=Strict");
    expect(secure).toContain("Max-Age=2592000");
    expect(secure).toContain("; Secure");
    expect(secure).toContain("Path=/api/admin;");
    expect(clearedSessionCookie(true)).toContain("Path=/api/admin;");
    expect(sessionCookie("abc", false)).not.toContain("Secure");
    expect(clearedSessionCookie(true)).toContain("Max-Age=0");
    expect(readCookie("a=1; esli_admin=tok; b=2", "esli_admin")).toBe("tok");
    expect(readCookie(undefined, "esli_admin")).toBeUndefined();
  });

  it("hatalı denemelerde kilitler, süre dolunca açar; başarılı girişte sayacı sıfırlar", () => {
    let now = 0;
    const guard = new LoginGuard({ maxFailures: 3, windowMs: 1000, lockMs: 5000 }, () => now);
    guard.failure("ip"); guard.failure("ip");
    expect(guard.check("ip").allowed).toBe(true);
    guard.failure("ip");
    expect(guard.check("ip").allowed).toBe(false);
    expect(guard.check("ip").retryAfterSeconds).toBe(5);
    expect(guard.check("baska").allowed).toBe(true);
    now = 5001;
    expect(guard.check("ip").allowed).toBe(true);
    guard.failure("x"); guard.failure("x"); guard.success("x"); guard.failure("x");
    expect(guard.check("x").allowed).toBe(true);
  });

  it("begin denemeyi önceden sayar, kilitliyken saymaz; cancel sayımı ve gereksiz kilidi geri alır", () => {
    let now = 0;
    const guard = new LoginGuard({ maxFailures: 3, windowMs: 1000, lockMs: 5000 }, () => now);
    expect([guard.begin("ip").allowed, guard.begin("ip").allowed, guard.begin("ip").allowed]).toEqual([true, true, true]);
    expect(guard.begin("ip").allowed).toBe(false);
    expect(guard.count("ip")).toBe(3);
    guard.cancel("ip");
    expect(guard.count("ip")).toBe(2);
    expect(guard.check("ip").allowed).toBe(true);
    guard.cancel("ip"); guard.cancel("ip"); guard.cancel("ip");
    expect(guard.count("ip")).toBe(0);
    guard.failure("y");
    now = 1001;
    expect(guard.count("y")).toBe(0);
  });

  it("istek sınırı pencere içinde aşılınca reddeder, pencere geçince sıfırlanır", () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1000, () => now);
    expect(limiter.take("a")).toBe(true);
    expect(limiter.take("a")).toBe(true);
    expect(limiter.take("a")).toBe(false);
    expect(limiter.take("b")).toBe(true);
    now = 1001;
    expect(limiter.take("a")).toBe(true);
  });
});

describe("giriş akışı (/api/admin?action=login)", () => {
  it("doğru parolayla güvenli çerez verir ve çerezle oturum açık görünür", async () => {
    const kit = await setup();
    expect((await kit.call({ action: "session" })).body).toEqual({ configured: true, authenticated: false });
    const response = await kit.call({ method: "POST", action: "login", body: { password: PASSWORD }, headers: { "x-forwarded-proto": "https" } });
    expect(response.status).toBe(200);
    const cookie = response.headers["Set-Cookie"];
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Strict");
    expect((await kit.call({ action: "session", cookie: cookie.split(";")[0] })).body.authenticated).toBe(true);
  });

  it("yanlış parolada 401 verir, bekler ve çerez vermez", async () => {
    const kit = await setup();
    const response = await kit.call({ method: "POST", action: "login", body: { password: "yanlış-parola-12345" } });
    expect(response.status).toBe(401);
    expect(response.headers["Set-Cookie"]).toBeUndefined();
    expect(kit.sleeps).toEqual([800]);
  });

  it("5 hatalı denemeden sonra aynı IP'yi kilitler; doğru parola da kilitliyken reddedilir, süre dolunca çalışır", async () => {
    const kit = await setup();
    for (let i = 0; i < 5; i++) expect((await kit.call({ method: "POST", action: "login", body: { password: `yanlış-${i}-parola` } })).status).toBe(401);
    const locked = await kit.call({ method: "POST", action: "login", body: { password: PASSWORD } });
    expect(locked.status).toBe(429);
    expect(Number(locked.headers["Retry-After"])).toBeGreaterThan(0);
    expect((await kit.call({ method: "POST", action: "login", body: { password: PASSWORD }, ip: "198.51.100.9" })).status).toBe(200);
    kit.clock.now += 16 * 60 * 1000;
    expect((await kit.call({ method: "POST", action: "login", body: { password: PASSWORD } })).status).toBe(200);
  });

  it("farklı IP'lerden gelen toplu deneme girişi kilitlemez, yavaşlatır: sahibi doğru parolayla yine girer", async () => {
    const kit = await setup();
    for (let i = 0; i < 30; i++) await kit.call({ method: "POST", action: "login", body: { password: "yanlış-parola-123" }, ip: `198.51.100.${i}` });
    expect(kit.sleeps).toEqual(new Array(30).fill(800));
    kit.sleeps.length = 0;
    expect((await kit.call({ method: "POST", action: "login", body: { password: PASSWORD }, ip: "192.0.2.50" })).status).toBe(200);
    expect(kit.sleeps).toEqual([2000]);
    for (let i = 0; i < 60; i++) await kit.call({ method: "POST", action: "login", body: { password: "yanlış-parola-123" }, ip: `203.0.${i}.9` });
    kit.sleeps.length = 0;
    expect((await kit.call({ method: "POST", action: "login", body: { password: "yanlış-parola-123" }, ip: "192.0.2.51" })).status).toBe(401);
    expect(kit.sleeps).toEqual([5000, 800]);
  });

  it("aynı anda gelen denemeler IP kilidini aşamaz: yalnızca 5'i sınanır", async () => {
    const kit = await setup();
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => kit.call({ method: "POST", action: "login", body: { password: `yanlış-${i}-parola` } })));
    expect(results.filter(result => result.status === 401)).toHaveLength(5);
    expect(results.filter(result => result.status === 429)).toHaveLength(15);
  });

  it("boş, eksik ya da bozuk giriş isteği deneme sayılmaz; sahibi kilitlenmez", async () => {
    const kit = await setup();
    for (let i = 0; i < 40; i++) expect((await kit.call({ method: "POST", action: "login", body: i % 2 ? {} : { password: "" } })).status).toBe(400);
    expect((await kit.call({ method: "POST", action: "login", body: { password: "x".repeat(201) } })).status).toBe(400);
    const badJson = await handleAdminRequest({ method: "POST", url: "/api/admin?action=login", headers: { host: "esliteknik.com", "content-type": "application/json", "x-admin-request": "1" }, bodyError: "invalid_json", ip: "203.0.113.7" }, kit.deps);
    expect(badJson.status).toBe(400);
    expect(kit.sleeps).toEqual([]);
    expect((await kit.call({ method: "POST", action: "login", body: { password: PASSWORD } })).status).toBe(200);
  });

  it("IPv6'da sayaç anahtarı /64 önekidir; aynı ağdan adres değiştirerek kilit aşılamaz", async () => {
    expect(ipKey("203.0.113.7")).toBe("203.0.113.7");
    expect(ipKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(ipKey("2a02:ff0:1:2:aaaa:bbbb:cccc:dddd")).toBe("2a02:ff0:1:2::/64");
    expect(ipKey("2A02:0FF0:0001:0002::1")).toBe("2a02:ff0:1:2::/64");
    expect(ipKey("2a02:ff0:1:3::1")).toBe("2a02:ff0:1:3::/64");
    expect(ipKey("::1")).toBe("0:0:0:0::/64");
    const kit = await setup();
    for (let i = 0; i < 5; i++) await kit.call({ method: "POST", action: "login", body: { password: "yanlış-parola-123" }, ip: `2a02:ff0:1:2::${i + 1}` });
    expect((await kit.call({ method: "POST", action: "login", body: { password: PASSWORD }, ip: "2a02:ff0:1:2::99" })).status).toBe(429);
    expect((await kit.call({ method: "POST", action: "login", body: { password: PASSWORD }, ip: "2a02:ff0:1:3::99" })).status).toBe(200);
  });

  it("parola (özeti) değişince eski oturum çerezi düşer; yalnızca oturum anahtarıyla imzalı çerez kabul edilmez", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    expect((await kit.call({ action: "session", cookie })).body.authenticated).toBe(true);
    expect((await kit.call({ action: "session", cookie: `esli_admin=${createSessionToken(SECRET, kit.clock.now)}` })).body.authenticated).toBe(false);
    kit.env.ADMIN_PASSWORD_HASH = await hashPassword("yeni-parola-değişti-456");
    expect((await kit.call({ action: "session", cookie })).body.authenticated).toBe(false);
    expect((await kit.call({ action: "posts", cookie })).status).toBe(401);
    expect(sessionSigningKey(SECRET, undefined)).toBeUndefined();
    expect(sessionSigningKey("kısa", "scrypt$x")).toBeUndefined();
    expect(sessionSigningKey(SECRET, "a")).not.toBe(sessionSigningKey(SECRET, "b"));
  });

  it("iletilen IP başlıklarına yalnızca Vercel'de güvenir; başka ortamda bağlantı adresini kullanır", () => {
    const req = { headers: { "x-vercel-forwarded-for": "198.51.100.1", "x-real-ip": "198.51.100.2", "x-forwarded-for": "198.51.100.3, 10.0.0.1" }, socket: { remoteAddress: "192.0.2.10" } } as never;
    expect(clientIp(req, true)).toBe("198.51.100.1");
    expect(clientIp(req, false)).toBe("192.0.2.10");
    expect(clientIp({ headers: { "x-forwarded-for": "198.51.100.3, 10.0.0.1" }, socket: { remoteAddress: "192.0.2.10" } } as never, true)).toBe("198.51.100.3");
    expect(clientIp({ headers: {}, socket: {} } as never, true)).toBe("unknown");
  });

  it("kurulmamış panelde giriş 503 verir; oturum sorgusu 'configured: false' der", async () => {
    const kit = await setup({ env: { ADMIN_PASSWORD_HASH: undefined } });
    expect((await kit.call({ method: "POST", action: "login", body: { password: PASSWORD } })).status).toBe(503);
    expect((await kit.call({ action: "session" })).body).toEqual({ configured: false, authenticated: false });
    const short = await setup({ env: { ADMIN_SESSION_SECRET: "kısa" } });
    expect((await short.call({ action: "session" })).body.configured).toBe(false);
  });

  it("çıkış çerezi siler", async () => {
    const kit = await setup();
    const response = await kit.call({ method: "POST", action: "logout", cookie: await kit.login() });
    expect(response.headers["Set-Cookie"]).toContain("Max-Age=0");
  });

  it("kurcalanmış, süresi dolmuş ya da başka anahtarla imzalı çerezle veri alınamaz", async () => {
    const kit = await setup();
    const good = await kit.login();
    expect((await kit.call({ action: "posts", cookie: good })).status).toBe(200);
    expect((await kit.call({ action: "posts", cookie: `${good}x` })).status).toBe(401);
    expect((await kit.call({ action: "posts", cookie: `esli_admin=${createSessionToken("y".repeat(48))}` })).status).toBe(401);
    kit.clock.now += 31 * 24 * 3600 * 1000;
    expect((await kit.call({ action: "posts", cookie: good })).status).toBe(401);
  });

  it("dakikada 120'den fazla isteği reddeder", async () => {
    const kit = await setup();
    let last = 0;
    for (let i = 0; i < 121; i++) last = (await kit.call({ action: "session" })).status;
    expect(last).toBe(429);
  });
});

describe("kabul ölçütü: oturumsuz hiçbir /api/admin/ isteği veri döndürmez ya da yazmaz", () => {
  const actions = ["posts", "save", "delete", "history", "version", "builds", "bilinmeyen-eylem", ""];

  it("her eylem ve her yöntem 401 verir; GitHub'a tek istek bile gitmez", async () => {
    const kit = await setup();
    let n = 0;
    for (const action of actions) {
      for (const method of ["GET", "POST", "PUT", "DELETE"]) {
        for (const cookie of [undefined, "", "esli_admin=", "esli_admin=sahte.belirtec", "baska=1"]) {
          const response = await kit.call({ method, action, cookie, ip: `198.51.100.${++n}`, body: { mode: "publish", post: newPost(), slug: "/blog/yeni-deneme-yazisi/", confirm: true }, query: { slug: "/blog/x/", sha: "abcdef1" } });
          expect(response.status, `${method} ${action}`).toBe(401);
          expect(Object.keys(response.body).sort()).toEqual(["error", "message"]);
        }
      }
    }
    expect(kit.repo.requests).toEqual([]);
    expect(kit.repo.writes).toBe(0);
  });

  it("oturumsuz kaydetme ve silme hiçbir şey yazmaz, mevcut yazılar yerinde kalır", async () => {
    const kit = await setup();
    const before = kit.repo.head;
    await kit.call({ method: "POST", action: "save", body: { mode: "publish", post: newPost() } });
    await kit.call({ method: "POST", action: "delete", body: { slug: "/blog/firin-isitmiyor-konya/", confirm: true } });
    expect(kit.repo.head).toBe(before);
    expect(kit.repo.file("content/blog/firin-isitmiyor-konya.json")).toBeDefined();
  });

  it("yanıtlar noindex ve önbellek yasağı başlıklarını taşır", async () => {
    const kit = await setup();
    const response = await kit.call({ action: "posts" });
    expect(response.headers["X-Robots-Tag"]).toContain("noindex");
    expect(response.headers["Cache-Control"]).toBe("no-store");
    expect(response.headers["X-Content-Type-Options"]).toBe("nosniff");
  });
});

describe("istek doğrulama (CSRF ve kayıt kuralları)", () => {
  it("yazan istek JSON, X-Admin-Request başlığı ve aynı site kökeni olmadan reddedilir", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const body = { mode: "draft", post: newPost() };
    const noHeader = await kit.call({ method: "POST", action: "save", cookie, body, headers: { "x-admin-request": "" } });
    const wrongOrigin = await kit.call({ method: "POST", action: "save", cookie, body, headers: { origin: "https://kotu-site.example" } });
    const wrongType = await kit.call({ method: "POST", action: "save", cookie, body, headers: { "content-type": "text/plain" } });
    expect([noHeader.status, wrongOrigin.status, wrongType.status]).toEqual([403, 403, 403]);
    expect(kit.repo.writes).toBe(0);
  });

  it("geçersiz gövdeyi ve çok büyük gövdeyi reddeder; yanlış yöntem 405 verir", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const bad = await handleAdminRequest({ method: "POST", url: "/api/admin?action=save", headers: { host: "esliteknik.com", cookie, "content-type": "application/json", "x-admin-request": "1" }, bodyError: "invalid_json", ip: "1.1.1.1" }, kit.deps);
    expect(bad.status).toBe(400);
    const big = await handleAdminRequest({ method: "POST", url: "/api/admin?action=save", headers: { host: "esliteknik.com", cookie, "content-type": "application/json", "x-admin-request": "1" }, bodyError: "too_large", ip: "1.1.1.1" }, kit.deps);
    expect(big.status).toBe(413);
    expect((await kit.call({ method: "POST", action: "posts", cookie })).status).toBe(405);
    expect((await kit.call({ action: "save", cookie })).status).toBe(405);
    expect((await kit.call({ action: "bilinmeyen", cookie })).status).toBe(404);
  });

  it("GitHub anahtarı tanımlı değilse oturumlu kullanıcıya açık bir mesaj verir", async () => {
    const kit = await setup({ env: { GITHUB_CONTENT_TOKEN: undefined } });
    const response = await kit.call({ action: "posts", cookie: await kit.login() });
    expect(response.status).toBe(503);
    expect(response.body.error).toBe("github_not_configured");
  });
});

describe("yazı listesi", () => {
  it("21 yazıyı içerik özetiyle ve dal bilgisiyle döndürür", async () => {
    const kit = await setup();
    const response = await kit.call({ action: "posts", cookie: await kit.login() });
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(21);
    expect(response.body.problems).toEqual([]);
    expect(response.body.branch).toBe("main");
    expect(response.body.items[0].hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("şemaya uymayan dosyayı sorun olarak bildirir ve o dosya varken yazmayı reddeder", async () => {
    const kit = await setup();
    kit.repo.externalCommit({ "content/blog/bozuk-yazi.json": "{ bozuk" });
    const cookie = await kit.login();
    const list = await kit.call({ action: "posts", cookie });
    expect(list.body.problems[0].file).toBe("bozuk-yazi.json");
    const writes = kit.repo.writes;
    const save = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: newPost() } });
    expect(save.status).toBe(422);
    expect(save.body.error).toBe("content_invalid");
    expect(kit.repo.writes).toBe(writes);
  });
});

describe("kaydetme: taslak ve yayın (GitHub taklidiyle uçtan uca)", () => {
  it("yeni taslak yalnızca kendi JSON dosyasını yazar ve derlemeyi atlatan işareti taşır", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const response = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "draft", post: newPost() } });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ noChange: false, status: "draft", siteAffecting: false });
    const changes = lastCommitChanges(kit.repo);
    expect(changes.added).toEqual(["content/blog/yeni-deneme-yazisi.json"]);
    expect(changes.modified).toEqual([]);
    expect(changes.message).toContain(SKIP_BUILD_MARKER);
    expect(changes.message).toContain("taslak eklendi");
    expect(JSON.parse(kit.repo.file("content/blog/yeni-deneme-yazisi.json")!).status).toBe("draft");
    const build = buildCheck(kit.repo);
    expect(build.stale).toEqual([]);
    expect(build.posts.some(post => post.slug === "/blog/yeni-deneme-yazisi/")).toBe(false);
    expect(kit.repo.file("client/public/sitemap.xml")).not.toContain("yeni-deneme-yazisi");
  });

  it("taslağı yayınlamak JSON + üretilen üç dosyayı TEK commit'te yazar ve içerik denetimi yeşil kalır", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    await kit.call({ method: "POST", action: "save", cookie, body: { mode: "draft", post: newPost() } });
    const baseHash = await hashOf(kit, cookie, "/blog/yeni-deneme-yazisi/");
    const before = kit.repo.log().length;
    const response = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: newPost(), previousSlug: "/blog/yeni-deneme-yazisi/", baseHash } });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "published", siteAffecting: true });
    expect(kit.repo.log().length).toBe(before + 1);
    const changes = lastCommitChanges(kit.repo);
    expect(changes.modified.sort()).toEqual(["client/public/llms.txt", "client/public/sitemap.xml", "content/blog/yeni-deneme-yazisi.json", "shared/blog-content.generated.ts"]);
    expect(changes.message).not.toContain(SKIP_BUILD_MARKER);
    expect(changes.message).toContain("yazı yayınlandı");
    expect(kit.repo.file("client/public/sitemap.xml")).toContain("<loc>https://esliteknik.com/blog/yeni-deneme-yazisi/</loc>");
    expect(kit.repo.file("client/public/llms.txt")).toContain("(https://esliteknik.com/blog/yeni-deneme-yazisi/)");
    expect(kit.repo.file("shared/blog-content.generated.ts")).toContain("Deneme yazısı: panelden eklendi");
    const saved = JSON.parse(kit.repo.file("content/blog/yeni-deneme-yazisi.json")!);
    expect(saved.status).toBeUndefined();
    expect(saved.published).toBe("2026-10-02");
    const build = buildCheck(kit.repo);
    expect(build.stale).toEqual([]);
    expect(build.posts).toHaveLength(22);
    expect(build.posts.at(-1)!.slug).toBe("/blog/yeni-deneme-yazisi/");
  });

  it("doğrudan yayın da aynı şekilde tek commit'tir; sitemap ve llms.txt'deki diğer satırlara dokunulmaz", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const sitemapBefore = kit.repo.file("client/public/sitemap.xml")!;
    await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: newPost() } });
    const sitemapAfter = kit.repo.file("client/public/sitemap.xml")!;
    const removed = sitemapBefore.split("\n").filter(line => !sitemapAfter.split("\n").includes(line));
    expect(removed.every(line => line.includes("/blog/</loc>"))).toBe(true);
    expect(buildCheck(kit.repo).stale).toEqual([]);
  });

  it("yayındaki yazıyı düzenlemek updated tarihini bugüne çeker; içerik aynıysa commit atılmaz", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const slug = "/blog/firin-isitmiyor-konya/";
    const list = await kit.call({ action: "posts", cookie });
    const item = list.body.items.find((entry: any) => entry.post.slug === slug);
    const same = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: item.post, previousSlug: slug, baseHash: item.hash } });
    expect(same.body).toEqual({ noChange: true });
    expect(kit.repo.log()).toHaveLength(1);
    const edited = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: { ...item.post, excerpt: "Değiştirilmiş özet metni." }, previousSlug: slug, baseHash: item.hash } });
    expect(edited.status).toBe(200);
    const saved = JSON.parse(kit.repo.file("content/blog/firin-isitmiyor-konya.json")!);
    expect(saved.updated).toBe("2026-10-02");
    expect(saved.published).toBe(item.post.published);
    expect(saved.order).toBe(item.post.order);
    expect(lastCommitChanges(kit.repo).message).toContain("yazı güncellendi");
    expect(buildCheck(kit.repo).stale).toEqual([]);
  });

  it("başka yerde değişmiş yazının üzerine eski özetle yazmayı reddeder (409)", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const slug = "/blog/firin-isitmiyor-konya/";
    const list = await kit.call({ action: "posts", cookie });
    const item = list.body.items.find((entry: any) => entry.post.slug === slug);
    const changed = JSON.parse(kit.repo.file("content/blog/firin-isitmiyor-konya.json")!);
    changed.excerpt = "Başka cihazdan değiştirildi.";
    kit.repo.externalCommit({ "content/blog/firin-isitmiyor-konya.json": `${JSON.stringify(changed, null, 2)}\n` });
    const writes = kit.repo.writes;
    const response = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: { ...item.post, title: "Yeni başlık" }, previousSlug: slug, baseHash: item.hash } });
    expect(response.status).toBe(409);
    expect(response.body.error).toBe("stale");
    expect(kit.repo.writes).toBe(writes);
  });

  it("düzenleme isteği baseHash'siz gelirse ve yeni yazı var olan adrese yazmaya çalışırsa reddedilir", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const slug = "/blog/firin-isitmiyor-konya/";
    expect((await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: newPost({ slug }), previousSlug: slug } })).status).toBe(400);
    const overwrite = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: newPost({ slug, description: "Üzerine yazma denemesi için tamamen farklı bir açıklama." }) } });
    expect(overwrite.status).toBe(409);
    expect(kit.repo.writes).toBe(0);
  });

  it("kabul ölçütü: kurala aykırı yazı ne taslak ne yayın olarak, ne editörden ne doğrudan API çağrısıyla kaydedilir", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const violations: [string, Record<string, unknown>][] = [
      ["açıklama 160 karakteri aşıyor", { description: "a".repeat(161) }],
      ["fiyat", { blocks: [{ type: "p", text: "Ücret 500 TL" }] }],
      ["hukuki konu", { blocks: [{ type: "p", text: "Tazminat için başvurun." }] }],
      ["yetkili servis iddiası", { blocks: [{ type: "p", text: "Biz yetkili servisiyiz." }] }],
      ["yabancı kaynak", { sources: [{ label: "English source", url: "https://example.com/a" }] }],
      ["usta yazısında servis kaydı yok", { category: "Ustanın Defterinden" }],
      ["bilinmeyen alan", { ekstra: 1 }],
      ["geçersiz adres", { slug: "/blog/Büyük Harf/" }],
      ["boş blok", { blocks: [] }],
      ["var olan açıklamanın tekrarı", { description: JSON.parse(kit.repo.file("content/blog/firin-isitmiyor-konya.json")!).description }],
    ];
    for (const mode of ["draft", "publish"]) {
      for (const [name, overrides] of violations) {
        const response = await kit.call({ method: "POST", action: "save", cookie, body: { mode, post: newPost(overrides) } });
        expect(response.status, `${mode}: ${name}`).toBe(422);
        expect(response.body.errors.length, name).toBeGreaterThan(0);
      }
    }
    expect(kit.repo.writes).toBe(0);
    expect(kit.repo.log()).toHaveLength(1);
  });

  it("yayındaki yazı taslağa çevrilemez ve adresi değiştirilemez", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const slug = "/blog/firin-isitmiyor-konya/";
    const list = await kit.call({ action: "posts", cookie });
    const item = list.body.items.find((entry: any) => entry.post.slug === slug);
    const toDraft = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "draft", post: item.post, previousSlug: slug, baseHash: item.hash } });
    const rename = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: { ...item.post, slug: "/blog/yeni-adres/" }, previousSlug: slug, baseHash: item.hash } });
    expect([toDraft.status, rename.status]).toEqual([422, 422]);
    expect(kit.repo.writes).toBe(0);
  });

  it("taslağın adresi değişince eski dosya silinir, yenisi eklenir (tek commit)", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    await kit.call({ method: "POST", action: "save", cookie, body: { mode: "draft", post: newPost() } });
    const baseHash = await hashOf(kit, cookie, "/blog/yeni-deneme-yazisi/");
    const response = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "draft", post: newPost({ slug: "/blog/duzeltilmis-adres/" }), previousSlug: "/blog/yeni-deneme-yazisi/", baseHash } });
    expect(response.status).toBe(200);
    const changes = lastCommitChanges(kit.repo);
    expect(changes.added).toEqual(["content/blog/duzeltilmis-adres.json"]);
    expect(changes.deleted).toEqual(["content/blog/yeni-deneme-yazisi.json"]);
    expect(buildCheck(kit.repo).stale).toEqual([]);
  });

  it("dal ilerlemişse bir kez yeniden dener; iki kez başarısızsa 409 verir ve hiçbir şey yazılmaz", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    kit.repo.failRefUpdates = 1;
    const retried = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "draft", post: newPost() } });
    expect(retried.status).toBe(200);
    expect(kit.repo.requests.filter(request => request.startsWith("PATCH")).length).toBe(2);
    const headBefore = kit.repo.head;
    kit.repo.failRefUpdates = 2;
    const failed = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "draft", post: newPost({ slug: "/blog/ikinci-taslak/", description: "İkinci taslağın açıklaması, ilkinden tamamen farklı bir cümledir." }) } });
    expect(failed.status).toBe(409);
    expect(failed.body.error).toBe("head_moved");
    expect(kit.repo.head).toBe(headBefore);
  });

  it("başkasının araya giren commit'ini ezmez: taze durumdan hesaplar", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    await kit.call({ action: "posts", cookie });
    const other = JSON.parse(kit.repo.file("content/blog/firin-isitmiyor-konya.json")!);
    kit.repo.externalCommit({ "content/blog/baska-kisinin-yazisi.json": `${JSON.stringify({ ...other, slug: "/blog/baska-kisinin-yazisi/", order: 9990, description: "Başka bir kişinin eklediği yazının benzersiz açıklaması." }, null, 2)}\n` });
    await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: newPost() } });
    const build = buildCheck(kit.repo);
    expect(build.stale).toEqual([]);
    expect(build.posts.map(post => post.slug)).toContain("/blog/baska-kisinin-yazisi/");
    expect(build.posts.map(post => post.slug)).toContain("/blog/yeni-deneme-yazisi/");
  });
});

describe("silme", () => {
  it("taslak doğrudan silinir; yalnızca kendi dosyası gider ve derleme atlanır", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    await kit.call({ method: "POST", action: "save", cookie, body: { mode: "draft", post: newPost() } });
    const response = await kit.call({ method: "POST", action: "delete", cookie, body: { slug: "/blog/yeni-deneme-yazisi/" } });
    expect(response.status).toBe(200);
    expect(response.body.wasPublished).toBe(false);
    const changes = lastCommitChanges(kit.repo);
    expect(changes.deleted).toEqual(["content/blog/yeni-deneme-yazisi.json"]);
    expect(changes.modified).toEqual([]);
    expect(changes.message).toContain(SKIP_BUILD_MARKER);
    expect(buildCheck(kit.repo).stale).toEqual([]);
  });

  it("yayındaki yazı onay olmadan silinmez; onayla silinince siteden, sitemap'ten ve llms.txt'den kalkar", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const slug = "/blog/regal-bulasik-makinesi-calismiyor-kontrol-karti/";
    const noConfirm = await kit.call({ method: "POST", action: "delete", cookie, body: { slug } });
    expect(noConfirm.status).toBe(400);
    expect(noConfirm.body.error).toBe("confirm_required");
    expect(kit.repo.writes).toBe(0);
    const response = await kit.call({ method: "POST", action: "delete", cookie, body: { slug, confirm: true } });
    expect(response.status).toBe(200);
    expect(response.body.wasPublished).toBe(true);
    expect(kit.repo.file("content/blog/regal-bulasik-makinesi-calismiyor-kontrol-karti.json")).toBeUndefined();
    expect(kit.repo.file("client/public/sitemap.xml")).not.toContain(slug);
    expect(kit.repo.file("client/public/llms.txt")).not.toContain(slug);
    expect(kit.repo.file("shared/blog-content.generated.ts")).not.toContain(slug);
    expect(kit.repo.file("content/redirects.json")).toBeUndefined();
    const changes = lastCommitChanges(kit.repo);
    expect(changes.message).toContain("yazı silindi");
    expect(changes.message).toContain("adres 404 verir");
    expect(changes.message).not.toContain(SKIP_BUILD_MARKER);
    const build = buildCheck(kit.repo);
    expect(build.stale).toEqual([]);
    expect(build.posts).toHaveLength(20);
  });

  it("yönlendirme seçilirse content/redirects.json'a yazılır ve derleyici kabul eder", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const slug = "/blog/regal-bulasik-makinesi-calismiyor-kontrol-karti/";
    const response = await kit.call({ method: "POST", action: "delete", cookie, body: { slug, confirm: true, redirectTo: "/regal-servisi-konya/" } });
    expect(response.status).toBe(200);
    expect(response.body.redirectedTo).toBe("/regal-servisi-konya/");
    expect(JSON.parse(kit.repo.file("content/redirects.json")!)).toEqual([{ from: slug, to: "/regal-servisi-konya/", date: "2026-10-02" }]);
    expect(lastCommitChanges(kit.repo).message).toContain("Yönlendirme: /regal-servisi-konya/");
    expect(buildCheck(kit.repo).stale).toEqual([]);
    const html = redirectPageHtml("/regal-servisi-konya/", "https://esliteknik.com");
    expect(html).toContain('http-equiv="refresh" content="0; url=https://esliteknik.com/regal-servisi-konya/"');
    expect(html).toContain('<link rel="canonical" href="https://esliteknik.com/regal-servisi-konya/" />');
  });

  it("yönlendirme hedefi yalnızca yazının hizmet sayfası, marka sayfası ya da /blog/ olabilir", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const slug = "/blog/regal-bulasik-makinesi-calismiyor-kontrol-karti/";
    for (const redirectTo of ["https://kotu-site.example/", "/baska-sayfa/", "/blog/firin-isitmiyor-konya/", "//kotu-site.example"]) {
      const response = await kit.call({ method: "POST", action: "delete", cookie, body: { slug, confirm: true, redirectTo } });
      expect(response.status, redirectTo).toBe(422);
    }
    expect((await kit.call({ method: "POST", action: "delete", cookie, body: { slug, confirm: true, redirectTo: "/blog/" } })).status).toBe(200);
  });

  it("ana sayfadan sabit bağlantı verilen yazılar silinemez", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    for (const slug of BLOG_SLUGS_LINKED_FROM_CODE) {
      const response = await kit.call({ method: "POST", action: "delete", cookie, body: { slug, confirm: true } });
      expect(response.status, slug).toBe(422);
      expect(response.body.error).toBe("protected");
    }
    expect(kit.repo.writes).toBe(0);
  });

  it("olmayan yazıyı ve geçersiz adresi reddeder", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    expect((await kit.call({ method: "POST", action: "delete", cookie, body: { slug: "/blog/yok-boyle-yazi/", confirm: true } })).status).toBe(404);
    for (const slug of ["../package.json", "/blog/../x/", "/blog/a/b/", "", 5, undefined]) {
      expect((await kit.call({ method: "POST", action: "delete", cookie, body: { slug, confirm: true } })).status, String(slug)).toBe(400);
    }
    expect(kit.repo.writes).toBe(0);
  });

  it("yönlendirilen adresle yeni yazı yayınlanırsa yönlendirme kalkar (build 'adres hâlâ yayında' demesin)", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const slug = "/blog/regal-bulasik-makinesi-calismiyor-kontrol-karti/";
    await kit.call({ method: "POST", action: "delete", cookie, body: { slug, confirm: true, redirectTo: "/regal-servisi-konya/" } });
    expect(kit.repo.file("content/redirects.json")).toBeDefined();
    const response = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: newPost({ slug }) } });
    expect(response.status).toBe(200);
    expect(JSON.parse(kit.repo.file("content/redirects.json")!)).toEqual([]);
    expect(buildCheck(kit.repo).stale).toEqual([]);
  });
});

describe("geçmiş ve önceki sürüme dönme", () => {
  it("yazının dosya geçmişini ve eski sürümü doğrulanmış olarak getirir", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const slug = "/blog/firin-isitmiyor-konya/";
    const list = await kit.call({ action: "posts", cookie });
    const item = list.body.items.find((entry: any) => entry.post.slug === slug);
    await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: { ...item.post, excerpt: "Yeni özet." }, previousSlug: slug, baseHash: item.hash } });
    const history = await kit.call({ action: "history", cookie, query: { slug } });
    expect(history.status).toBe(200);
    expect(history.body.entries).toHaveLength(2);
    expect(history.body.entries[0].message).toContain("yazı güncellendi");
    const oldest = history.body.entries[1].sha;
    const version = await kit.call({ action: "version", cookie, query: { slug, sha: oldest } });
    expect(version.status).toBe(200);
    expect(version.body.post.excerpt).toBe(item.post.excerpt);
  });

  it("geçersiz adres, geçersiz sürüm kimliği ve olmayan sürümü reddeder", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    expect((await kit.call({ action: "history", cookie, query: { slug: "../x" } })).status).toBe(400);
    expect((await kit.call({ action: "version", cookie, query: { slug: "/blog/firin-isitmiyor-konya/", sha: "../../etc" } })).status).toBe(400);
    expect((await kit.call({ action: "version", cookie, query: { slug: "/blog/firin-isitmiyor-konya/", sha: "abcdef1234" } })).status).toBe(404);
    expect((await kit.call({ action: "version", cookie, query: { slug: "/blog/yok/", sha: kit.repo.head } })).status).toBe(404);
  });
});

describe("derleme durumu", () => {
  it("son commit'lerin Vercel durumunu gösterir; taslak commit'lerini 'atlandı' işaretler", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: newPost() } });
    const publishSha = kit.repo.head;
    await kit.call({ method: "POST", action: "save", cookie, body: { mode: "draft", post: newPost({ slug: "/blog/taslak-bir/", description: "Taslak yazının açıklaması, yayındaki yazılardan tamamen farklıdır." }) } });
    const draftSha = kit.repo.head;
    kit.repo.statuses.set(publishSha, { state: "failure", statuses: [{ context: "Vercel", state: "failure", description: "Deployment failed", target_url: "https://vercel.com/esli3/konya-teknik-servis/abc" }] });
    const response = await kit.call({ action: "builds", cookie });
    expect(response.status).toBe(200);
    const rows = response.body.rows;
    expect(rows[0]).toMatchObject({ sha: draftSha, skipped: true, state: "unknown" });
    expect(rows[1]).toMatchObject({ sha: publishSha, skipped: false, state: "failure", description: "Deployment failed", url: "https://vercel.com/esli3/konya-teknik-servis/abc" });
  });
});

describe("hata yanıtları gizli değer sızdırmaz", () => {
  it("GitHub anahtarı reddedilirse 502 ve açıklayıcı mesaj verir; yanıtta anahtar yoktur", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    kit.repo.forceStatus = 401;
    const response = await kit.call({ action: "posts", cookie });
    expect(response.status).toBe(502);
    expect(response.body.error).toBe("github_auth_failed");
    kit.repo.forceStatus = 500;
    expect((await kit.call({ action: "posts", cookie })).body.error).toBe("github_unavailable");
    kit.repo.forceStatus = 404;
    expect((await kit.call({ action: "posts", cookie })).body.error).toBe("github_not_found");
  });

  it("hiçbir yanıt parola özetini, oturum anahtarını ya da GitHub anahtarını içermez", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    await kit.call({ action: "posts", cookie });
    await kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post: newPost({ description: "x".repeat(200) }) } });
    kit.repo.forceStatus = 401;
    await kit.call({ action: "posts", cookie });
    await kit.call({ method: "POST", action: "login", body: { password: "yanlış-parola-123" }, ip: "9.9.9.9" });
    const everything = JSON.stringify(kit.log);
    expect(everything).not.toContain(TOKEN);
    expect(everything).not.toContain(SECRET);
    expect(everything).not.toContain(kit.env.ADMIN_PASSWORD_HASH!);
    expect(everything).not.toContain(PASSWORD);
  });
});

describe("GitHub istemcisi: yazma izni ve ayar", () => {
  it("yalnızca content/ altına ve üretilen üç dosyaya yazar; başka her yol ağa çıkmadan reddedilir", async () => {
    const repo = new FakeGithubRepo(realRepoFiles(), TOKEN);
    const client = createGithubClient(readGithubConfig({ GITHUB_CONTENT_TOKEN: TOKEN, GITHUB_REPO: "o/r" })!, repo.fetch);
    const forbidden = ["package.json", "vercel.json", "client/src/App.tsx", "server/admin/auth.ts", "api/admin.ts", ".github/workflows/x.yml", "content/../package.json", "/etc/passwd", "content/", "contentx/a.json", "client/public/robots.txt", "docs/blog-panel-plani.md"];
    for (const path of forbidden) {
      await expect(client.commit({ upserts: [{ path, content: "x" }], deletes: [] }, "m", repo.head)).rejects.toThrow("yazma izni yok");
      await expect(client.commit({ upserts: [], deletes: [path] }, "m", repo.head)).rejects.toThrow("yazma izni yok");
    }
    expect(repo.writes).toBe(0);
    const ok = await client.commit({ upserts: [{ path: "content/blog/x.json", content: "{}" }, { path: "client/public/llms.txt", content: "x" }], deletes: [] }, "m", repo.head);
    expect(ok).toMatch(/^[0-9a-f]{40}$/);
    await expect(client.commit({ upserts: [], deletes: [] }, "m", repo.head)).rejects.toThrow("değişiklik yok");
  });

  it("dalı zorla yazmaz (force: false) ve hata türlerini ayırır", async () => {
    const repo = new FakeGithubRepo(realRepoFiles(), TOKEN);
    const client = createGithubClient(readGithubConfig({ GITHUB_CONTENT_TOKEN: TOKEN, GITHUB_REPO: "o/r" })!, repo.fetch);
    const stale = repo.head;
    repo.externalCommit({ "content/blog/a.json": "{}" });
    await expect(client.commit({ upserts: [{ path: "content/blog/b.json", content: "{}" }], deletes: [] }, "m", stale)).rejects.toThrow("reddetti");
    const wrong = createGithubClient(readGithubConfig({ GITHUB_CONTENT_TOKEN: "yanlis", GITHUB_REPO: "o/r" })!, repo.fetch);
    try {
      await wrong.headSha();
      throw new Error("fırlatmalıydı");
    } catch (error) {
      expect(error instanceof GithubError && error.kind).toBe("auth");
    }
  });

  it("dal ve depo ayarını ortamdan okur: üretimde main, önizlemede önizlemenin kendi dalı", () => {
    const base = { GITHUB_CONTENT_TOKEN: TOKEN };
    expect(readGithubConfig(base)).toMatchObject({ owner: "4ekim2025-cell", repo: "konya-teknik-servis", branch: "main" });
    expect(readGithubConfig({ ...base, VERCEL_ENV: "production", VERCEL_GIT_COMMIT_REF: "feat/x" })?.branch).toBe("main");
    expect(readGithubConfig({ ...base, VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "feat/blog-paneli" })?.branch).toBe("feat/blog-paneli");
    expect(readGithubConfig({ ...base, VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_REF: "feat/x", GITHUB_BRANCH: "deneme" })?.branch).toBe("deneme");
    expect(readGithubConfig({})).toBeUndefined();
    expect(readGithubConfig({ ...base, GITHUB_REPO: "bozuk repo adı" })).toBeUndefined();
    expect(readGithubConfig({ ...base, GITHUB_BRANCH: "a..b" })).toBeUndefined();
    expect(readGithubConfig({ ...base, GITHUB_BRANCH: "dal adı; rm -rf" })).toBeUndefined();
  });
});

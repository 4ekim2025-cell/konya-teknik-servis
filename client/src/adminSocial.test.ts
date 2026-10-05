import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { planBuild } from "../../scripts/build-content";
import { BLOG_SLUGS_LINKED_FROM_CODE } from "../../shared/blog-protected";
import { GOOGLE_POST_NAME, SETTINGS_PATH, SOCIAL_SKIP_MARKER, TRACKING, buildGoogleLocalPost, emptySocialRecord, parseSocialFile, plainUrl, serializeSettings, serializeSocial, socialPath, trackedUrl, validateSettings, validateSocialRecord } from "../../shared/blog-social";
import { SITE_URL } from "../../shared/blog-build";
import { LoginGuard, RateLimiter, hashPassword } from "../../server/admin/auth";
import { GoogleError, createGoogleClient, readGoogleCredentials } from "../../server/admin/google";
import { createGithubClient, readGithubConfig } from "../../server/admin/github";
import { handleAdminRequest, type AdminDeps, type AdminHttpRequest } from "../../server/admin/handler";
import { DailyQuota } from "../../server/admin/ai";
import { createAdminService } from "../../server/admin/service";
import { FakeGithubRepo } from "./adminFakeGithub";
import { FakeGoogle } from "./adminFakeGoogle";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

const PASSWORD = "doğru-at-pil-zımba-4821";
const SECRET = "x".repeat(48);
const TOKEN = "ghp_TESTTOKEN123456";
const GENERATED_FILES = ["shared/blog-content.generated.ts", "client/public/sitemap.xml", "client/public/llms.txt"];
const GOOD_GOOGLE = "Karatay'da su almayan çamaşır makinesinde basınç anahtarı değişti. Yazının tamamında nedenleri ve kontrol adımlarını anlattık.";
const GOOD_INSTAGRAM = "Su almayan çamaşır makinesi: basınç anahtarı. Sahada gördüğümüz vakayı ve kullanıcıların kontrol edebileceği adımları blogda yazdık.";

/** Gerçek depodaki içerik dosyaları: testler gerçek veriyle çalışır. */
function realRepoFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const name of readdirSync(resolve(projectRoot, "content/blog"))) files[`content/blog/${name}`] = read(`content/blog/${name}`);
  for (const path of GENERATED_FILES) files[path] = read(path);
  return files;
}

const draftPost = (overrides: Record<string, unknown> = {}) => ({
  slug: "/blog/paylasim-deneme-taslagi/",
  category: "Bakım Rehberi",
  title: "Paylaşım denemesi: taslak yazı",
  description: "Paylaşım paketi denemesi için eklenen taslak yazının, arama sonuçlarında görünecek 90 ile 160 karakter arasındaki açıklaması burada yer alır.",
  excerpt: "Paylaşım denemesi taslağı.",
  device: "Çamaşır Makinesi",
  servicePath: "/camasir-makinesi-tamiri-konya/",
  blocks: [{ type: "p", text: "Deneme paragrafı." }],
  ...overrides,
});

const errorLog: string[] = [];
const realError = console.error;
console.error = (...args: unknown[]) => void errorLog.push(args.map(String).join(" "));
afterEach(() => void (errorLog.length = 0));
void realError;

type Kit = Awaited<ReturnType<typeof setup>>;
async function setup(options: { google?: boolean; env?: Record<string, string | undefined>; googleQuota?: DailyQuota; branch?: string } = {}) {
  const repo = new FakeGithubRepo(realRepoFiles(), TOKEN, options.branch ?? "main");
  const google = new FakeGoogle();
  const clock = { now: Date.parse("2026-10-05T09:00:00Z") };
  const env: Record<string, string | undefined> = {
    ADMIN_PASSWORD_HASH: await hashPassword(PASSWORD),
    ADMIN_SESSION_SECRET: SECRET,
    GITHUB_CONTENT_TOKEN: TOKEN,
    GITHUB_REPO: "o/r",
    GITHUB_BRANCH: options.branch ?? "main",
    ...(options.google === false ? {} : google.env()),
    ...options.env,
  };
  const config = readGithubConfig(env)!;
  const deps: AdminDeps = {
    env,
    now: () => clock.now,
    sleep: async () => undefined,
    loginGuard: new LoginGuard(undefined, () => clock.now),
    globalGuard: new LoginGuard({ maxFailures: 30, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 }, () => clock.now),
    limiter: new RateLimiter(1000, 60 * 1000, () => clock.now),
    fetchImpl: repo.fetch,
    googleFetchImpl: google.fetch,
    googleQuota: options.googleQuota ?? new DailyQuota(() => clock.now),
    service: createAdminService({ github: createGithubClient(config, repo.fetch), now: () => new Date(clock.now) }),
  };
  const call = async (opts: { method?: string; action: string; query?: Record<string, string>; body?: unknown; cookie?: string; headers?: Record<string, string> }) => {
    const method = opts.method ?? "GET";
    const req: AdminHttpRequest = {
      method,
      url: `/api/admin?${new URLSearchParams({ action: opts.action, ...opts.query })}`,
      headers: { host: "esliteknik.com", ...(opts.cookie ? { cookie: opts.cookie } : {}), ...(method === "POST" ? { "content-type": "application/json", "x-admin-request": "1", origin: "https://esliteknik.com" } : {}), ...opts.headers },
      body: opts.body,
      ip: "203.0.113.7",
    };
    const response = await handleAdminRequest(req, deps);
    return { status: response.status, headers: response.headers, body: response.body as any };
  };
  const login = async () => {
    const response = await call({ method: "POST", action: "login", body: { password: PASSWORD } });
    if (response.status !== 200) throw new Error(`giriş başarısız: ${response.status}`);
    return response.headers["Set-Cookie"].split(";")[0];
  };
  const cookie = await login();
  const post = (action: string, body: unknown) => call({ method: "POST", action, body, cookie });
  const get = (action: string, query?: Record<string, string>) => call({ action, query, cookie });
  /** Yayındaki, koddan bağlantı verilmeyen (silinebilir) ilk gerçek yazı. */
  const list = await get("posts");
  const published = list.body.items.map((item: any) => item.post).filter((item: any) => item.status !== "draft");
  const target = published.find((item: any) => !BLOG_SLUGS_LINKED_FROM_CODE.includes(item.slug))!;
  const withCover = published.find((item: any) => item.cover && !BLOG_SLUGS_LINKED_FROM_CODE.includes(item.slug));
  return { repo, google, env, deps, clock, call, cookie, post, get, target: target.slug as string, withCover: withCover?.slug as string | undefined };
}

function lastCommitChanges(repo: FakeGithubRepo) {
  const latest = repo.log()[0];
  const before = repo.commits.get(latest.parent!)!.files;
  const paths = new Set([...latest.files.keys(), ...before.keys()]);
  const added: string[] = [], modified: string[] = [], deleted: string[] = [];
  for (const path of [...paths].sort()) {
    if (!before.has(path)) added.push(path);
    else if (!latest.files.has(path)) deleted.push(path);
    else if (before.get(path) !== latest.files.get(path)) modified.push(path);
  }
  return { added, modified, deleted, message: latest.message };
}

/** Taklit depodaki dosyaları geçici klasöre yazıp gerçek derleyiciyi (planBuild) çalıştırır. */
function buildPlan(repo: FakeGithubRepo) {
  const root = mkdtempSync(join(tmpdir(), "social-"));
  try {
    for (const [path, content] of repo.headFiles()) {
      mkdirSync(join(root, dirname(path)), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    const plan = planBuild(root);
    return { files: plan.files.map(file => ({ path: file.path, content: file.content, changed: file.changed })), posts: plan.posts.map(item => item.slug) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const SLUG = "/blog/ornek-yazi/";

describe("paylaşım paketi: ortak kurallar", () => {
  it("takip etiketli bağlantı yalnızca pakette kurulur; Google ve Instagram etiketleri ayrıdır", () => {
    expect(trackedUrl(SLUG, "google")).toBe("https://esliteknik.com/blog/ornek-yazi/?utm_source=google&utm_medium=organic&utm_campaign=gbp-post");
    expect(trackedUrl(SLUG, "instagram")).toBe("https://esliteknik.com/blog/ornek-yazi/?utm_source=instagram&utm_medium=social&utm_campaign=blog-paylasim");
    expect(TRACKING.google).toBe("utm_source=google&utm_medium=organic&utm_campaign=gbp-post");
    expect(plainUrl(SLUG)).toBe(`${SITE_URL}${SLUG}`);
    expect(plainUrl(SLUG)).not.toContain("utm_");
  });

  it("dosya yolu yazının adresinden türer ve content/social altındadır", () => {
    expect(socialPath(SLUG)).toBe("content/social/ornek-yazi.json");
    expect(SETTINGS_PATH).toBe("content/settings.json");
    expect(SOCIAL_SKIP_MARKER).toBe("[panel-paylasim]");
  });

  it("paket kuralları: fiyat, hukuki konu, yetkili servis iddiası, bağlantı/iletişim, denetim karakteri ve fazla uzunluk reddedilir", () => {
    const base = { slug: SLUG, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE", shared: {}, updated: "2026-10-05" };
    expect(validateSocialRecord(base).ok).toBe(true);
    const bad = (change: Record<string, unknown>) => validateSocialRecord({ ...base, ...change });
    expect(bad({ googleBusiness: "Parça değişimi 500 ₺ tuttu." }).ok).toBe(false);
    expect(bad({ instagram: "Tazminat süreci hakkında konuştuk." }).ok).toBe(false);
    expect(bad({ googleBusiness: "Biz yetkili servisiyiz, güvenle arayın." }).ok).toBe(false);
    expect(bad({ googleBusiness: "Detaylar için https://esliteknik.com adresine bakın." }).ok).toBe(false);
    expect(bad({ instagram: "Bize yazın: info@esliteknik.com" }).ok).toBe(false);
    expect(bad({ googleBusiness: "Satır\u0000sonu" }).ok).toBe(false);
    expect(bad({ googleBusiness: "a".repeat(1501) }).ok).toBe(false);
    expect(bad({ instagram: "a".repeat(2201) }).ok).toBe(false);
    expect(bad({ button: "SHOP" }).ok).toBe(false);
    expect(bad({ slug: "/hakkimizda/" }).ok).toBe(false);
    expect(bad({ extra: "alan" }).ok).toBe(false);
    expect(bad({ shared: { google: { at: "2026-13-45", via: "manual" } } }).ok).toBe(false);
    expect(bad({ shared: { google: { at: "2026-10-05", via: "api", postName: "../../kötü" } } }).ok).toBe(false);
    // Boş metin geçerlidir (paket henüz yazılmadı); metinler kırpılır.
    expect(bad({ googleBusiness: "", instagram: "" }).ok).toBe(true);
    const trimmed = validateSocialRecord({ ...base, googleBusiness: `  ${GOOD_GOOGLE}  ` });
    expect(trimmed.ok && trimmed.record.googleBusiness).toBe(GOOD_GOOGLE);
  });

  it("dosya sabit biçimde yazılır ve geri okunur; adres uyuşmazlığı ve bozuk JSON hatadır", () => {
    const record = { ...emptySocialRecord(SLUG, "2026-10-05"), googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, shared: { google: { at: "2026-10-05", via: "api" as const, postName: "accounts/1/locations/2/localPosts/3" }, instagram: { at: "2026-10-06" } } };
    const text = serializeSocial(record);
    expect(text.endsWith("\n")).toBe(true);
    expect(Object.keys(JSON.parse(text))).toEqual(["slug", "googleBusiness", "instagram", "button", "shared", "updated"]);
    expect(Object.keys(JSON.parse(text).shared.google)).toEqual(["at", "via", "postName"]);
    const parsed = parseSocialFile(text, SLUG);
    expect(parsed.ok && parsed.record).toEqual(record);
    expect(serializeSocial(parsed.ok ? parsed.record : record)).toBe(text);
    expect(parseSocialFile(text, "/blog/baska/").ok).toBe(false);
    expect(parseSocialFile("{bozuk", SLUG).ok).toBe(false);
    expect(GOOGLE_POST_NAME.test("accounts/1/locations/2/localPosts/3")).toBe(true);
    expect(GOOGLE_POST_NAME.test("accounts/1/locations/2/localPosts/../x")).toBe(false);
  });

  it("ayarlar: başlangıç 'API yok'; 'API var' hesap ve konum kimliği ister, kimlik yalnızca rakamdır, bilinmeyen alan reddedilir", () => {
    expect(validateSettings({ google: { mode: "none", sendPhoto: false } }).ok).toBe(true);
    expect(validateSettings({ google: { mode: "api", sendPhoto: false } }).ok).toBe(false);
    expect(validateSettings({ google: { mode: "api", accountId: "123", sendPhoto: false } }).ok).toBe(false);
    expect(validateSettings({ google: { mode: "api", accountId: "abc", locationId: "9", sendPhoto: false } }).ok).toBe(false);
    expect(validateSettings({ google: { mode: "none", sendPhoto: false }, gizli: "x" }).ok).toBe(false);
    expect(validateSettings({ google: { mode: "none", sendPhoto: false, token: "x" } }).ok).toBe(false);
    const ok = validateSettings({ google: { mode: "api", accountId: " accounts/123 ", locationId: "locations/456", sendPhoto: true } });
    expect(ok.ok && ok.settings.google).toEqual({ mode: "api", accountId: "123", locationId: "456", sendPhoto: true });
    const settings = ok.ok ? ok.settings : (undefined as never);
    expect(JSON.parse(serializeSettings(settings))).toEqual({ google: { mode: "api", accountId: "123", locationId: "456", sendPhoto: true } });
  });

  it("Google gönderisi: 'Daha fazla bilgi' etiketli bağlantı taşır, 'Hemen ara' bağlantı taşımaz; fotoğraf yalnızca açıksa ve kapak varsa", () => {
    const cover = { src: "https://img.example/blog/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-1600.webp", alt: "x", width: 10, height: 10 };
    const learn = buildGoogleLocalPost({ slug: SLUG, cover }, { googleBusiness: GOOD_GOOGLE, button: "LEARN_MORE" }, false);
    expect(learn).toEqual({ languageCode: "tr", summary: GOOD_GOOGLE, topicType: "STANDARD", callToAction: { actionType: "LEARN_MORE", url: trackedUrl(SLUG, "google") } });
    const call = buildGoogleLocalPost({ slug: SLUG, cover }, { googleBusiness: GOOD_GOOGLE, button: "CALL" }, false);
    expect(call.callToAction).toEqual({ actionType: "CALL" });
    expect("url" in call.callToAction).toBe(false);
    expect(buildGoogleLocalPost({ slug: SLUG, cover }, { googleBusiness: GOOD_GOOGLE, button: "LEARN_MORE" }, true).media).toEqual([{ mediaFormat: "PHOTO", sourceUrl: cover.src }]);
    expect(buildGoogleLocalPost({ slug: SLUG }, { googleBusiness: GOOD_GOOGLE, button: "LEARN_MORE" }, true).media).toBeUndefined();
  });
});

describe("Google istemcisi (bellek içi Google taklidiyle)", () => {
  it("anahtarlar üç değişkenin de dolu olmasını ister", () => {
    const fake = new FakeGoogle();
    expect(readGoogleCredentials(fake.env())).toEqual(fake.credentials);
    expect(readGoogleCredentials({ ...fake.env(), GOOGLE_REFRESH_TOKEN: " " })).toBeUndefined();
    expect(readGoogleCredentials({})).toBeUndefined();
  });

  it("yenileme belirteciyle erişim anahtarı alır, geçerli anahtarı yeniden kullanır; paylaşım ve düğme çevirme çalışır", async () => {
    const fake = new FakeGoogle();
    let now = 1_000_000;
    const client = createGoogleClient(fake.credentials, fake.fetch, () => now);
    await client.test(fake.accountId, fake.locationId);
    const created = await client.createPost(fake.accountId, fake.locationId, buildGoogleLocalPost({ slug: SLUG }, { googleBusiness: GOOD_GOOGLE, button: "LEARN_MORE" }, false));
    expect(created.name).toBe(fake.postName(1));
    expect(fake.tokenCalls).toBe(1);
    await client.switchToCall(created.name);
    expect(fake.posts.get(created.name)?.callToAction).toEqual({ actionType: "CALL" });
    expect(fake.requests.at(-1)).toBe(`PATCH mybusiness.googleapis.com/v4/${created.name}?updateMask=callToAction`);
    expect(fake.bodies.at(-1)).toEqual({ callToAction: { actionType: "CALL" } });
    expect(fake.authorizations.filter(Boolean).every(value => value === `Bearer ${fake.accessToken}`)).toBe(true);
    now += 2 * 3600 * 1000;
    await client.test(fake.accountId, fake.locationId);
    expect(fake.tokenCalls).toBe(2);
  });

  it("hata türlerini ayırır; hata iletisi anahtar ya da Google gövdesi taşımaz", async () => {
    const kinds = async (setupFake: (fake: FakeGoogle) => void) => {
      const fake = new FakeGoogle();
      setupFake(fake);
      const client = createGoogleClient(fake.credentials, fake.fetch);
      try {
        await client.test(fake.accountId, fake.locationId);
        return "ok";
      } catch (error) {
        expect(error).toBeInstanceOf(GoogleError);
        const message = (error as GoogleError).message;
        for (const secret of [fake.credentials.clientSecret, fake.credentials.refreshToken, fake.accessToken, "zorunlu durum"]) expect(message).not.toContain(secret);
        return (error as GoogleError).kind;
      }
    };
    expect(await kinds(() => undefined)).toBe("ok");
    expect(await kinds(fake => (fake.forceTokenStatus = 400))).toBe("auth");
    expect(await kinds(fake => (fake.forceApiStatus = 403))).toBe("forbidden");
    expect(await kinds(fake => (fake.forceApiStatus = 404))).toBe("notfound");
    expect(await kinds(fake => (fake.forceApiStatus = 429))).toBe("rate");
    expect(await kinds(fake => (fake.forceApiStatus = 400))).toBe("invalid");
    expect(await kinds(fake => (fake.forceApiStatus = 503))).toBe("unavailable");
    const wrong = new FakeGoogle();
    const bad = createGoogleClient({ ...wrong.credentials, refreshToken: "yanlış" }, wrong.fetch);
    await expect(bad.test(wrong.accountId, wrong.locationId)).rejects.toMatchObject({ kind: "auth" });
    const network = createGoogleClient(wrong.credentials, (async () => { throw new Error("ağ"); }) as typeof fetch);
    await expect(network.test(wrong.accountId, wrong.locationId)).rejects.toMatchObject({ kind: "unavailable" });
  });

  it("kimlik ve gönderi adı adrese yazılmadan denetlenir (enjeksiyon yok)", async () => {
    const fake = new FakeGoogle();
    const client = createGoogleClient(fake.credentials, fake.fetch);
    await expect(client.test("1/../2", fake.locationId)).rejects.toMatchObject({ kind: "invalid" });
    await expect(client.switchToCall("accounts/1/locations/2/localPosts/../../x")).rejects.toMatchObject({ kind: "invalid" });
    expect(fake.requests).toHaveLength(0);
    fake.badCreateName = true;
    await expect(client.createPost(fake.accountId, fake.locationId, buildGoogleLocalPost({ slug: SLUG }, { googleBusiness: GOOD_GOOGLE, button: "CALL" }, false))).rejects.toMatchObject({ kind: "uncertain" });
  });
});

describe("panel API: oturum ve yetki", () => {
  it("oturumsuz hiçbir yeni eylem veri döndürmez, GitHub'a ya da Google'a dokunmaz", async () => {
    const kit = await setup();
    const before = { github: kit.repo.requests.length, google: kit.google.requests.length };
    for (const [method, action] of [["GET", "settings"], ["POST", "settings-save"], ["GET", "social-get"], ["POST", "social-save"], ["POST", "social-mark"], ["POST", "google-test"], ["POST", "google-share"]] as const) {
      const response = await kit.call({ method, action, body: method === "POST" ? { slug: kit.target } : undefined, query: { slug: kit.target } });
      expect(response.status, action).toBe(401);
    }
    expect(kit.repo.requests.length).toBe(before.github);
    expect(kit.google.requests.length).toBe(before.google);
  });

  it("yazan eylemler JSON ve X-Admin-Request başlığı ister; yanlış yöntem 405 verir", async () => {
    const kit = await setup();
    for (const action of ["settings-save", "social-save", "social-mark", "google-test", "google-share"]) {
      const response = await kit.call({ method: "POST", action, body: {}, cookie: kit.cookie, headers: { "x-admin-request": "0" } });
      expect(response.status, action).toBe(403);
    }
    expect((await kit.post("settings", {})).status).toBe(405);
    expect((await kit.get("social-save")).status).toBe(405);
    expect((await kit.get("google-share")).status).toBe(405);
    expect(kit.repo.writes).toBe(0);
    expect(kit.google.requests).toHaveLength(0);
  });
});

describe("panel API: ayarlar", () => {
  it("dosya yoksa 'API yok' döner; Google anahtarlarının tanımlı olup olmadığı bildirilir, değerler asla", async () => {
    const withKeys = await setup();
    const response = await withKeys.get("settings");
    expect(response.status).toBe(200);
    expect(response.body.settings).toEqual({ google: { mode: "none", sendPhoto: false } });
    expect(response.body.googleConfigured).toBe(true);
    expect(JSON.stringify(response.body)).not.toContain(withKeys.google.credentials.clientSecret);
    const without = await setup({ google: false });
    expect((await without.get("settings")).body.googleConfigured).toBe(false);
  });

  it("kaydetme content/settings.json'a tek dosya olarak yazılır, build işareti taşır; aynı ayar tekrar commit atmaz; geçersiz ayar yazılmaz", async () => {
    const kit = await setup();
    const bad = await kit.post("settings-save", { settings: { google: { mode: "api", sendPhoto: false } } });
    expect(bad.status).toBe(422);
    expect(kit.repo.writes).toBe(0);
    const saved = await kit.post("settings-save", { settings: { google: { mode: "api", accountId: "123456789", locationId: "987654321", sendPhoto: false } } });
    expect(saved.status).toBe(200);
    expect(saved.body.noChange).toBe(false);
    const change = lastCommitChanges(kit.repo);
    expect(change.added).toEqual([SETTINGS_PATH]);
    expect(change.modified).toEqual([]);
    expect(change.deleted).toEqual([]);
    expect(change.message).toContain(SOCIAL_SKIP_MARKER);
    expect(JSON.parse(kit.repo.file(SETTINGS_PATH)!)).toEqual({ google: { mode: "api", accountId: "123456789", locationId: "987654321", sendPhoto: false } });
    const commits = kit.repo.log().length;
    const again = await kit.post("settings-save", { settings: { google: { mode: "api", accountId: "123456789", locationId: "987654321", sendPhoto: false } } });
    expect(again.body.noChange).toBe(true);
    expect(kit.repo.log().length).toBe(commits);
    expect((await kit.get("settings")).body.settings.google.mode).toBe("api");
  });

  it("bozuk ayar dosyası güvenli varsayılana ('API yok') düşer ve nedeni bildirilir", async () => {
    const kit = await setup();
    kit.repo.externalCommit({ [SETTINGS_PATH]: "{bozuk" });
    const response = await kit.get("settings");
    expect(response.body.settings.google.mode).toBe("none");
    expect(response.body.problem).toContain("JSON");
    kit.repo.externalCommit({ [SETTINGS_PATH]: JSON.stringify({ google: { mode: "api", sendPhoto: false } }) });
    const missingIds = await kit.get("settings");
    expect(missingIds.body.settings.google.mode).toBe("none");
    expect(missingIds.body.problem).toBeDefined();
  });
});

describe("panel API: paylaşım paketi", () => {
  it("metinleri content/social altına tek dosya olarak yazar, geri okur; aynı metin commit atmaz", async () => {
    const kit = await setup();
    const saved = await kit.post("social-save", { slug: kit.target, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE" });
    expect(saved.status).toBe(200);
    expect(saved.body.noChange).toBe(false);
    const change = lastCommitChanges(kit.repo);
    expect(change.added).toEqual([socialPath(kit.target)]);
    expect(change.modified).toEqual([]);
    expect(change.message).toContain(SOCIAL_SKIP_MARKER);
    const got = await kit.get("social-get", { slug: kit.target });
    expect(got.body.published).toBe(true);
    expect(got.body.record).toMatchObject({ slug: kit.target, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE", shared: {}, updated: "2026-10-05" });
    const commits = kit.repo.log().length;
    expect((await kit.post("social-save", { slug: kit.target, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE" })).body.noChange).toBe(true);
    expect(kit.repo.log().length).toBe(commits);
    const changed = await kit.post("social-save", { slug: kit.target, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "CALL" });
    expect(changed.body.noChange).toBe(false);
    expect(lastCommitChanges(kit.repo).modified).toEqual([socialPath(kit.target)]);
  });

  it("kurala aykırı metin, bilinmeyen yazı ve geçersiz adres yazılmaz", async () => {
    const kit = await setup();
    const base = { slug: kit.target, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE" };
    expect((await kit.post("social-save", { ...base, googleBusiness: "Bu işlem 750 ₺ tuttu, bizi arayın." })).status).toBe(422);
    expect((await kit.post("social-save", { ...base, instagram: "Biz yetkili servisiyiz." })).status).toBe(422);
    expect((await kit.post("social-save", { ...base, googleBusiness: "Ayrıntı: https://example.com" })).status).toBe(422);
    expect((await kit.post("social-save", { ...base, button: "SHOP" })).status).toBe(422);
    expect((await kit.post("social-save", { ...base, googleBusiness: 5 })).status).toBe(422);
    expect((await kit.post("social-save", { ...base, slug: "/blog/olmayan-yazi/" })).status).toBe(404);
    expect((await kit.post("social-save", { ...base, slug: "../../content/blog/x" })).status).toBe(400);
    expect((await kit.get("social-get", { slug: "/blog/olmayan-yazi/" })).status).toBe(404);
    expect(kit.repo.writes).toBe(0);
  });

  it("taslak yazı için metinler kaydedilir ama 'paylaşıldı' işaretlenemez ve Google'a gönderilemez", async () => {
    const kit = await setup();
    const saved = await kit.post("save", { post: draftPost(), mode: "draft" });
    expect(saved.status).toBe(200);
    const slug = saved.body.slug as string;
    expect((await kit.post("social-save", { slug, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE" })).status).toBe(200);
    expect((await kit.get("social-get", { slug })).body.published).toBe(false);
    const mark = await kit.post("social-mark", { slug, channel: "google", shared: true });
    expect(mark.status).toBe(422);
    expect(mark.body.error).toBe("not_published");
    const kitSettings = await kit.post("settings-save", { settings: { google: { mode: "api", accountId: kit.google.accountId, locationId: kit.google.locationId, sendPhoto: false } } });
    expect(kitSettings.status).toBe(200);
    const share = await kit.post("google-share", { slug });
    expect(share.status).toBe(422);
    expect(kit.google.requests).toHaveLength(0);
  });

  it("'paylaşıldı' kutusu kalıcıdır: Google ve Instagram ayrı işaretlenir, geri alınır; paket yoksa boş paket oluşur", async () => {
    const kit = await setup();
    const marked = await kit.post("social-mark", { slug: kit.target, channel: "google", shared: true });
    expect(marked.status).toBe(200);
    expect(marked.body.record.shared.google).toEqual({ at: "2026-10-05", via: "manual" });
    expect(lastCommitChanges(kit.repo).added).toEqual([socialPath(kit.target)]);
    expect(lastCommitChanges(kit.repo).message).toContain(SOCIAL_SKIP_MARKER);
    expect((await kit.post("social-mark", { slug: kit.target, channel: "instagram", shared: true })).body.record.shared).toEqual({ google: { at: "2026-10-05", via: "manual" }, instagram: { at: "2026-10-05" } });
    const commits = kit.repo.log().length;
    expect((await kit.post("social-mark", { slug: kit.target, channel: "google", shared: true })).body.noChange).toBe(true);
    expect(kit.repo.log().length).toBe(commits);
    // Sayfa yenilenince de durur (kalıcı).
    const reread = await kit.get("social-get", { slug: kit.target });
    expect(reread.body.record.shared.google.via).toBe("manual");
    expect(reread.body.record.shared.instagram.at).toBe("2026-10-05");
    // Metin kaydetmek işareti silmez.
    await kit.post("social-save", { slug: kit.target, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "CALL" });
    expect((await kit.get("social-get", { slug: kit.target })).body.record.shared.google.via).toBe("manual");
    // Geri alma.
    const undone = await kit.post("social-mark", { slug: kit.target, channel: "google", shared: false });
    expect(undone.body.record.shared).toEqual({ instagram: { at: "2026-10-05" } });
    expect((await kit.post("social-mark", { slug: kit.target, channel: "tiktok", shared: true })).status).toBe(400);
    expect((await kit.post("social-mark", { slug: kit.target, channel: "google", shared: "evet" })).status).toBe(400);
  });

  it("bozuk paket dosyası panelde boş görünür, nedeni bildirilir; kaydedince yeniden yazılır", async () => {
    const kit = await setup();
    kit.repo.externalCommit({ [socialPath(kit.target)]: "{bozuk" });
    const got = await kit.get("social-get", { slug: kit.target });
    expect(got.body.record).toBeNull();
    expect(got.body.problem).toBeDefined();
    const saved = await kit.post("social-save", { slug: kit.target, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE" });
    expect(saved.status).toBe(200);
    expect(JSON.parse(kit.repo.file(socialPath(kit.target))!).slug).toBe(kit.target);
  });

  it("taslağın adresi değişirse paylaşım paketi yeni adrese taşınır", async () => {
    const kit = await setup();
    const first = await kit.post("save", { post: draftPost(), mode: "draft" });
    const slug = first.body.slug as string;
    await kit.post("social-save", { slug, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "CALL" });
    const hash = (await kit.get("posts")).body.items.find((item: any) => item.post.slug === slug).hash;
    const renamed = await kit.post("save", { post: draftPost({ slug: "/blog/paylasim-yeni-adres/" }), mode: "draft", previousSlug: slug, baseHash: hash });
    expect(renamed.status).toBe(200);
    expect(kit.repo.file(socialPath(slug))).toBeUndefined();
    const moved = JSON.parse(kit.repo.file(socialPath("/blog/paylasim-yeni-adres/"))!);
    expect(moved).toMatchObject({ slug: "/blog/paylasim-yeni-adres/", googleBusiness: GOOD_GOOGLE, button: "CALL" });
  });

  it("paket ve ayar dosyaları siteyi etkilemez: üretilen dosyalar, yazı listesi ve derleme çıktısı aynı kalır", async () => {
    const kit = await setup();
    const before = buildPlan(kit.repo);
    await kit.post("social-save", { slug: kit.target, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE" });
    await kit.post("social-mark", { slug: kit.target, channel: "google", shared: true });
    await kit.post("settings-save", { settings: { google: { mode: "api", accountId: "1", locationId: "2", sendPhoto: true } } });
    expect(kit.repo.file(socialPath(kit.target))).toBeDefined();
    expect(kit.repo.file(SETTINGS_PATH)).toBeDefined();
    const after = buildPlan(kit.repo);
    expect(after.posts).toEqual(before.posts);
    expect(after.files).toEqual(before.files);
    expect(after.files.filter(file => file.changed)).toEqual([]);
    for (const file of after.files) {
      expect(file.content, file.path).not.toContain("utm_");
      expect(file.content, file.path).not.toContain("content/social");
    }
    for (const path of GENERATED_FILES) expect(kit.repo.file(path), path).toBe(read(path));
  });
});

describe("panel API: Google bağlantısını sına", () => {
  const apiSettings = (kit: Kit, overrides: Record<string, unknown> = {}) => kit.post("settings-save", { settings: { google: { mode: "api", accountId: kit.google.accountId, locationId: kit.google.locationId, sendPhoto: false, ...overrides } } });

  it("kayıtlı kimliklerle yalnızca okur ve ok döner; hiçbir şey yazmaz", async () => {
    const kit = await setup();
    expect((await apiSettings(kit)).status).toBe(200);
    const writes = kit.repo.writes;
    const response = await kit.post("google-test", {});
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(kit.google.requests.filter(line => line.startsWith("GET"))).toHaveLength(1);
    expect(kit.google.requests.some(line => /^(POST mybusiness|PATCH)/.test(line))).toBe(false);
    expect(kit.repo.writes).toBe(writes);
  });

  it("anahtar ya da kimlik eksikse Google'a gitmeden anlaşılır hata verir", async () => {
    const noKeys = await setup({ google: false });
    expect((await noKeys.post("google-test", {})).status).toBe(503);
    expect((await noKeys.post("google-test", {})).body.error).toBe("google_not_configured");
    const noIds = await setup();
    const response = await noIds.post("google-test", {});
    expect(response.status).toBe(422);
    expect(response.body.error).toBe("google_ids_missing");
    expect(noIds.google.requests).toHaveLength(0);
  });

  it("Google hata türleri panelde ayrı ve açıklayıcı iletilerle görünür; yanıt ve günlük gizli değer taşımaz", async () => {
    const run = async (setupFake: (fake: FakeGoogle) => void) => {
      const kit = await setup();
      await apiSettings(kit);
      setupFake(kit.google);
      const response = await kit.post("google-test", {});
      const leaked = JSON.stringify([response.body, errorLog]);
      for (const secret of [kit.google.credentials.clientSecret, kit.google.credentials.refreshToken, kit.google.accessToken, TOKEN, SECRET]) expect(leaked).not.toContain(secret);
      return response;
    };
    expect((await run(fake => (fake.forceTokenStatus = 400))).body.error).toBe("google_auth_failed");
    expect((await run(fake => (fake.forceApiStatus = 403))).body.error).toBe("google_forbidden");
    expect((await run(fake => (fake.forceApiStatus = 404))).body.error).toBe("google_not_found");
    const limited = await run(fake => (fake.forceApiStatus = 429));
    expect([limited.status, limited.body.error]).toEqual([503, "google_rate_limited"]);
    expect((await run(fake => (fake.forceApiStatus = 503))).body.error).toBe("google_unavailable");
  });

  it("günlük çağrı sınırı aşılınca Google'a gidilmez", async () => {
    const quota = new DailyQuota();
    const kit = await setup({ googleQuota: quota });
    await apiSettings(kit);
    for (let index = 0; index < 40; index++) quota.take(40);
    const response = await kit.post("google-test", {});
    expect(response.status).toBe(429);
    expect(kit.google.requests).toHaveLength(0);
  });
});

describe("panel API: Google'a paylaş (API var)", () => {
  async function ready(options: { button?: "LEARN_MORE" | "CALL"; sendPhoto?: boolean; slug?: (kit: Kit) => string; mode?: "api" | "none" } = {}) {
    const kit = await setup();
    const slug = options.slug ? options.slug(kit) : kit.target;
    await kit.post("settings-save", { settings: { google: options.mode === "none" ? { mode: "none", sendPhoto: false } : { mode: "api", accountId: kit.google.accountId, locationId: kit.google.locationId, sendPhoto: options.sendPhoto ?? false } } });
    await kit.post("social-save", { slug, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: options.button ?? "LEARN_MORE" });
    return { kit, slug };
  }

  it("etiketli bağlantı ve metinle paylaşır, gönderi adını ve tarihi kaydeder; ikinci kez paylaşmaz", async () => {
    const { kit, slug } = await ready();
    const response = await kit.post("google-share", { slug });
    expect(response.status).toBe(200);
    expect(response.body.record.shared.google).toEqual({ at: "2026-10-05", via: "api", postName: kit.google.postName(1) });
    expect(kit.google.posts.size).toBe(1);
    const sent = [...kit.google.posts.values()][0];
    expect(sent.summary).toBe(GOOD_GOOGLE);
    expect(sent.languageCode).toBe("tr");
    expect(sent.callToAction).toEqual({ actionType: "LEARN_MORE", url: trackedUrl(slug, "google") });
    expect(sent.callToAction?.url).toContain("utm_source=google&utm_medium=organic&utm_campaign=gbp-post");
    expect(sent.media).toBeUndefined();
    expect(lastCommitChanges(kit.repo).modified).toEqual([socialPath(slug)]);
    expect(lastCommitChanges(kit.repo).message).toContain(SOCIAL_SKIP_MARKER);
    const again = await kit.post("google-share", { slug });
    expect(again.status).toBe(409);
    expect(again.body.error).toBe("already_shared");
    expect(kit.google.posts.size).toBe(1);
    const view = await kit.get("social-get", { slug });
    expect(view.body.record.shared.google.postName).toBe(kit.google.postName(1));
  });

  it("'Hemen ara' paylaşımı bağlantı göndermez; fotoğraf yalnızca ayar açıksa ve yazının kapağı varsa gider", async () => {
    const call = await ready({ button: "CALL" });
    expect((await call.kit.post("google-share", { slug: call.slug })).status).toBe(200);
    expect([...call.kit.google.posts.values()][0].callToAction).toEqual({ actionType: "CALL" });

    const photo = await ready({ sendPhoto: true, slug: kit => kit.withCover! });
    expect(photo.kit.withCover).toBeDefined();
    expect((await photo.kit.post("google-share", { slug: photo.slug })).status).toBe(200);
    const media = [...photo.kit.google.posts.values()][0].media;
    expect(media).toHaveLength(1);
    expect(media![0].sourceUrl).toMatch(/\/blog\/[0-9a-f]{32}-1600\.webp$/);

    const noPhoto = await ready({ sendPhoto: false, slug: kit => kit.withCover! });
    expect((await noPhoto.kit.post("google-share", { slug: noPhoto.slug })).status).toBe(200);
    expect([...noPhoto.kit.google.posts.values()][0].media).toBeUndefined();
  });

  it("'API yok' seçiliyken, anahtar yokken, metin yokken ya da yazı yokken Google'a hiçbir şey gönderilmez", async () => {
    const off = await ready({ mode: "none" });
    const response = await off.kit.post("google-share", { slug: off.slug });
    expect([response.status, response.body.error]).toEqual([422, "google_api_off"]);
    expect(off.kit.google.requests).toHaveLength(0);

    const kit = await setup({ google: false });
    await kit.post("settings-save", { settings: { google: { mode: "api", accountId: "1", locationId: "2", sendPhoto: false } } });
    await kit.post("social-save", { slug: kit.target, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE" });
    expect((await kit.post("google-share", { slug: kit.target })).body.error).toBe("google_not_configured");

    const noText = await setup();
    await noText.post("settings-save", { settings: { google: { mode: "api", accountId: noText.google.accountId, locationId: noText.google.locationId, sendPhoto: false } } });
    expect((await noText.post("google-share", { slug: noText.target })).body.error).toBe("no_text");
    expect((await noText.post("google-share", { slug: "/blog/olmayan-yazi/" })).status).toBe(404);
    expect((await noText.post("google-share", {})).status).toBe(400);
    expect(noText.google.requests).toHaveLength(0);
  });

  it("Google reddederse paylaşıldı işaretlenmez; çift tıklama tek paylaşım yapar", async () => {
    const rejected = await ready();
    rejected.kit.google.forceApiStatus = 400;
    const response = await rejected.kit.post("google-share", { slug: rejected.slug });
    expect([response.status, response.body.error]).toEqual([422, "google_rejected"]);
    expect(JSON.parse(rejected.kit.repo.file(socialPath(rejected.slug))!).shared).toEqual({});
    rejected.kit.google.forceApiStatus = undefined;
    expect((await rejected.kit.post("google-share", { slug: rejected.slug })).status).toBe(200);

    const double = await ready();
    const [first, second] = await Promise.all([double.kit.post("google-share", { slug: double.slug }), double.kit.post("google-share", { slug: double.slug })]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);
    expect(double.kit.google.posts.size).toBe(1);
  });

  it("Google'da paylaşıldı ama kayıt yazılamazsa tekrar paylaşılmaması için açık uyarı verilir", async () => {
    const { kit, slug } = await ready();
    kit.repo.failRefUpdates = 20;
    const response = await kit.post("google-share", { slug });
    expect([response.status, response.body.error]).toEqual([502, "google_share_not_recorded"]);
    expect(response.body.postName).toBe(kit.google.postName(1));
    expect(kit.google.posts.size).toBe(1);
  });

  it("kayıt ilk denemede yazılamazsa bir kez daha denenir ve paylaşım kaydedilir", async () => {
    const { kit, slug } = await ready();
    kit.repo.failRefUpdates = 2;
    const response = await kit.post("google-share", { slug });
    expect(response.status).toBe(200);
    expect(kit.google.posts.size).toBe(1);
  });

  it("sonucu belirsiz Google hatasında (zaman aşımı/5xx) tekrar denemeyi önleyen ayrı uyarı verilir; kesin red hatalarında verilmez", async () => {
    const { kit, slug } = await ready();
    kit.google.forceApiStatus = 503;
    const response = await kit.post("google-share", { slug });
    expect([response.status, response.body.error]).toEqual([502, "google_share_uncertain"]);
    expect(response.body.message).toContain("OLUŞMUŞ olabilir");
    expect(JSON.parse(kit.repo.file(socialPath(slug))!).shared).toEqual({});
    kit.google.forceApiStatus = 400;
    expect((await kit.post("google-share", { slug })).body.error).toBe("google_rejected");
    kit.google.forceApiStatus = 403;
    expect((await kit.post("google-share", { slug })).body.error).toBe("google_forbidden");
  });

  it("önizleme dalındaki panel Google'a paylaşım yapmaz (canlıyla aynı profil)", async () => {
    const kit = await setup({ branch: "onizleme-dali" });
    const slug = kit.target;
    await kit.post("settings-save", { settings: { google: { mode: "api", accountId: kit.google.accountId, locationId: kit.google.locationId, sendPhoto: false } } });
    await kit.post("social-save", { slug, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE" });
    const response = await kit.post("google-share", { slug });
    expect([response.status, response.body.error]).toEqual([422, "google_live_only"]);
    expect(kit.google.posts.size).toBe(0);
    expect(kit.google.requests.filter(line => line.startsWith("POST mybusiness"))).toHaveLength(0);
  });

  it("geçersiz adres kilide girmeden reddedilir", async () => {
    const { kit } = await ready();
    expect((await kit.post("google-share", { slug: "../x" })).status).toBe(400);
  });
});

describe("paylaşım paketi: dayanıklılık ve içerik denetimi", () => {
  it("bozuk paket dosyasında 'paylaşıldı' bölümü kurtarılır, metin kaydı Google gönderi adını silmez", async () => {
    const kit = await setup();
    const shared = { google: { at: "2026-10-04", via: "api", postName: kit.google.postName(7) } };
    kit.repo.externalCommit({ [socialPath(kit.target)]: JSON.stringify({ slug: kit.target, googleBusiness: "1500 TL", shared }) });
    const saved = await kit.post("social-save", { slug: kit.target, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE" });
    expect(saved.status).toBe(200);
    expect(JSON.parse(kit.repo.file(socialPath(kit.target))!).shared).toEqual(shared);
  });

  it("bozuk paket dosyasıyla 'paylaşıldı' işaretlenmez", async () => {
    const kit = await setup();
    kit.repo.externalCommit({ [socialPath(kit.target)]: "{bozuk" });
    const response = await kit.post("social-mark", { slug: kit.target, channel: "instagram", shared: true });
    expect([response.status, response.body.error]).toEqual([422, "social_unreadable"]);
  });

  it("API paylaşımı gönderi adı olmadan kaydedilemez", () => {
    const record = emptySocialRecord(SLUG, "2026-10-05");
    const bad = validateSocialRecord({ ...record, shared: { google: { at: "2026-10-05", via: "api" } } });
    expect(bad.ok).toBe(false);
  });

  it("metin denetimi harf büyüklüğü, görünmez karakter, bitişik fiyat ve kısaltılmış bağlantıyla atlatılamaz", () => {
    const base = emptySocialRecord(SLUG, "2026-10-05");
    for (const text of ["Tamir 1500TL", "Tamir 750 lira", "TAZMİNAT hakkı", "taz\u200bminat", "Yazı wa.me/905551234567", "bit.ly/abc", "site.tr adresinde"]) {
      expect(validateSocialRecord({ ...base, googleBusiness: text }).ok, text).toBe(false);
    }
    expect(validateSocialRecord({ ...base, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM }).ok).toBe(true);
  });
});

describe("panel API: yazı silinince Google düğmesi", () => {
  async function sharedVia(via: "api" | "manual", options: { mode?: "api" | "none"; google?: boolean } = {}) {
    const kit = await setup({ google: options.google });
    await kit.post("settings-save", { settings: { google: options.mode === "none" ? { mode: "none", sendPhoto: false } : { mode: "api", accountId: kit.google.accountId, locationId: kit.google.locationId, sendPhoto: false } } });
    await kit.post("social-save", { slug: kit.target, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE" });
    if (via === "api") {
      await kit.post("settings-save", { settings: { google: { mode: "api", accountId: kit.google.accountId, locationId: kit.google.locationId, sendPhoto: false } } });
      if (options.google === false) kit.repo.externalCommit({ [socialPath(kit.target)]: serializeSocial({ ...(parseSocialFile(kit.repo.file(socialPath(kit.target))!, kit.target) as any).record, shared: { google: { at: "2026-10-04", via: "api", postName: kit.google.postName(7) } } }) });
      else {
        const shared = await kit.post("google-share", { slug: kit.target });
        expect(shared.status).toBe(200);
      }
    } else {
      expect((await kit.post("social-mark", { slug: kit.target, channel: "google", shared: true })).status).toBe(200);
    }
    return kit;
  }

  it("API ile paylaşılmışsa düğme otomatik 'Hemen ara'ya çevrilir ve paket aynı commit'te silinir", async () => {
    const kit = await sharedVia("api");
    const name = kit.google.postName(1);
    const response = await kit.post("delete", { slug: kit.target, confirm: true });
    expect(response.status).toBe(200);
    expect(response.body.google).toBe("switched");
    expect(response.body.removedSocial).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain(GOOD_GOOGLE);
    expect(kit.google.posts.get(name)?.callToAction).toEqual({ actionType: "CALL" });
    expect(kit.repo.file(socialPath(kit.target))).toBeUndefined();
    const change = lastCommitChanges(kit.repo);
    expect(change.deleted).toContain(socialPath(kit.target));
    expect(change.deleted).toContain(`content/blog/${kit.target.replace("/blog/", "").replace("/", "")}.json`);
  });

  it("elle paylaşılmışsa 'manual' bildirilir ve Google'a dokunulmaz; paylaşılmamışsa hiçbir Google alanı yoktur", async () => {
    const manual = await sharedVia("manual");
    const requestsBefore = manual.google.requests.length;
    const response = await manual.post("delete", { slug: manual.target, confirm: true });
    expect(response.body.google).toBe("manual");
    expect(manual.google.requests.length).toBe(requestsBefore);
    expect(manual.repo.file(socialPath(manual.target))).toBeUndefined();

    const plain = await setup();
    const none = await plain.post("delete", { slug: plain.target, confirm: true });
    expect(none.status).toBe(200);
    expect("google" in none.body).toBe(false);
    expect(plain.google.requests).toHaveLength(0);

    const textOnly = await setup();
    await textOnly.post("social-save", { slug: textOnly.target, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE" });
    const deleted = await textOnly.post("delete", { slug: textOnly.target, confirm: true });
    expect("google" in deleted.body).toBe(false);
    expect(textOnly.repo.file(socialPath(textOnly.target))).toBeUndefined();
  });

  it("Google düğmeyi çeviremezse yazı yine silinir ve 'failed' bildirilir; ayar kapalıysa ya da anahtar yoksa 'manual'", async () => {
    const failing = await sharedVia("api");
    failing.google.forcePatchStatus = 403;
    const response = await failing.post("delete", { slug: failing.target, confirm: true });
    expect(response.status).toBe(200);
    expect(response.body.google).toBe("failed");
    expect(failing.repo.file(`content/blog/${failing.target.replace("/blog/", "").replace("/", "")}.json`)).toBeUndefined();

    const off = await sharedVia("api");
    await off.post("settings-save", { settings: { google: { mode: "none", sendPhoto: false } } });
    const requests = off.google.requests.length;
    expect((await off.post("delete", { slug: off.target, confirm: true })).body.google).toBe("manual");
    expect(off.google.requests.length).toBe(requests);

    const noKeys = await sharedVia("api", { google: false });
    expect((await noKeys.post("delete", { slug: noKeys.target, confirm: true })).body.google).toBe("manual");
  });

  it("taslak silinince paketi de silinir", async () => {
    const kit = await setup();
    const saved = await kit.post("save", { post: draftPost(), mode: "draft" });
    const slug = saved.body.slug as string;
    await kit.post("social-save", { slug, googleBusiness: GOOD_GOOGLE, instagram: GOOD_INSTAGRAM, button: "LEARN_MORE" });
    expect(kit.repo.file(socialPath(slug))).toBeDefined();
    expect((await kit.post("delete", { slug, confirm: false })).status).toBe(200);
    expect(kit.repo.file(socialPath(slug))).toBeUndefined();
  });
});

describe("yazma izni: paylaşım dosyaları yalnızca content/ altındadır", () => {
  it("yeni dosyalar mevcut izin kapsamındadır; GitHub anahtarının izni genişletilmedi", () => {
    const source = read("server/admin/github.ts");
    expect(source).toContain('export const WRITABLE_PREFIXES: readonly string[] = ["content/"];');
    expect(source).toContain('export const WRITABLE_FILES: readonly string[] = ["shared/blog-content.generated.ts", "client/public/sitemap.xml", "client/public/llms.txt"];');
    expect(socialPath(SLUG).startsWith("content/")).toBe(true);
    expect(SETTINGS_PATH.startsWith("content/")).toBe(true);
  });

  it("yeni sunucu ve ortak dosyalar ziyaretçi tarafına bağlanmaz ve sırları VITE_ önekiyle kullanmaz", () => {
    const visitorSide = ["scripts/prerender.ts", "scripts/build-content.ts", "scripts/indexnow.ts", "shared/blog-build.ts", "shared/blog-posts.ts", "shared/blog-meta.ts", "client/src/App.tsx", "client/src/pages/ContentPage.tsx", "client/src/main.tsx"];
    for (const file of visitorSide) expect(read(file), file).not.toMatch(/blog-social|content\/social|content\/settings|server\/admin\/google/);
    for (const file of ["server/admin/google.ts", "server/admin/handler.ts", "shared/blog-social.ts", ".env.example"]) expect(read(file), file).not.toMatch(/VITE_(GOOGLE|ADMIN|GITHUB)/);
    const env = read(".env.example");
    for (const name of ["GOOGLE_CLIENT_ID=", "GOOGLE_CLIENT_SECRET=", "GOOGLE_REFRESH_TOKEN="]) expect(env).toContain(name);
    expect(read("client/public/robots.txt")).toContain("Disallow: /api/admin");
    expect(read("client/public/robots.txt")).toContain("Disallow: /yonetim/");
  });
});

describe("panel arayüzü: paylaşım paketi bağlantıları", () => {
  it("paket ve ayarlar yalnızca yönetim arayüzüne bağlıdır; takip etiketli bağlantı ziyaretçi koduna girmez", () => {
    const app = read("client/src/admin/AdminApp.tsx");
    expect(app).toContain('import SocialPackage from "./SocialPackage"');
    expect(app).toContain('import SettingsView from "./SettingsView"');
    expect(app).toContain('["settings", "Ayarlar"]');
    expect(read("client/src/admin/PostsView.tsx")).toContain("Paylaşım</button>");
    const files = readdirSync(resolve(projectRoot, "client/src"), { recursive: true, encoding: "utf8" }).filter(name => /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) && !name.startsWith("admin"));
    for (const name of files) expect(read(`client/src/${name}`), name).not.toMatch(/trackedUrl|TRACKING|utm_source|blog-social/);
    const social = read("client/src/admin/SocialPackage.tsx");
    expect(social).toContain("trackedUrl(post.slug");
    expect(social).toContain("Hemen ara");
    expect(social).toContain("JPEG indir");
  });

  it("silme penceresi Google paylaşımı için uyarı verir ve sonucu bildirir", () => {
    const dialog = read("client/src/admin/DeleteDialog.tsx");
    expect(dialog).toContain("result.google");
    expect(dialog).toContain("Hemen ara");
  });
});

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { AI_CASE_DEVICES, buildAiDraft, findUngroundedDetails, placeAiDraft, validateAiCaseInput, type AiCaseInput } from "../../shared/blog-ai";
import { validateBlogPost } from "../../shared/blog-schema";
import { BLOG_BRANDS, BLOG_DEVICES } from "../../shared/blog-taxonomy";
import { DailyQuota, aiDailyLimit, buildAiPrompt, createAiProviders, parseModelJson } from "../../server/admin/ai";
import { LoginGuard, RateLimiter, hashPassword } from "../../server/admin/auth";
import { createGithubClient, readGithubConfig } from "../../server/admin/github";
import { handleAdminRequest, type AdminDeps, type AdminHttpRequest, type AdminHttpResponse } from "../../server/admin/handler";
import { createAdminService } from "../../server/admin/service";
import { FakeAi, wellBehavedDraft, type FakeAiFacts } from "./adminFakeAi";
import { FakeGithubRepo } from "./adminFakeGithub";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

const PASSWORD = "doğru-at-pil-zımba-4821";
const SECRET = "x".repeat(48);
const GITHUB_TOKEN = "ghp_TESTTOKEN123456";

function realRepoFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const name of readdirSync(resolve(projectRoot, "content/blog"))) files[`content/blog/${name}`] = read(`content/blog/${name}`);
  for (const path of ["shared/blog-content.generated.ts", "client/public/sitemap.xml", "client/public/llms.txt"]) files[path] = read(path);
  return files;
}

/** Kabul ölçütündeki üç farklı vaka girdisi: beyaz eşya, mahalle + küçük ev aleti + rakamlı not, başka ilçe ve marka. */
const CASES: Record<string, AiCaseInput> = {
  karatayBeko: { topic: "Su almayan çamaşır makinesinde basınç anahtarı arızası", district: "Karatay", brand: "Beko", device: "Çamaşır Makinesi", complaint: "Makine su almıyor", finding: "Basınç anahtarı arızalı", action: "Basınç anahtarı değiştirildi" },
  selcukluPhilips: {
    topic: "Çalışırken kapanan airfryer", district: "Selçuklu", neighborhood: "Yazır", brand: "Philips", device: "Küçük Ev Aletleri", deviceName: "Airfryer",
    complaint: "Airfryer çalışırken kapanıyor", finding: "Fan motoru sıkışmış, termal koruma devreye giriyor", action: "Fan motoru temizlendi ve yağlandı", note: "Cihaz 3 yıllıktı. Model HD9252.",
  },
  meramBosch: { topic: "Kirli yıkayan bulaşık makinesi", district: "Meram", brand: "Bosch", device: "Bulaşık Makinesi", complaint: "Bulaşıklar kirli çıkıyor", finding: "Püskürtme kollarının delikleri tıkalı", action: "Püskürtme kolları sökülüp temizlendi" },
};

type Kit = Awaited<ReturnType<typeof setup>>;
async function setup(options: { env?: Record<string, string | undefined> } = {}) {
  const repo = new FakeGithubRepo(realRepoFiles(), GITHUB_TOKEN);
  const ai = new FakeAi();
  const clock = { now: Date.parse("2026-10-02T09:00:00Z") };
  const env: Record<string, string | undefined> = {
    ADMIN_PASSWORD_HASH: await hashPassword(PASSWORD),
    ADMIN_SESSION_SECRET: SECRET,
    GITHUB_CONTENT_TOKEN: GITHUB_TOKEN,
    GITHUB_REPO: "o/r",
    GITHUB_BRANCH: "main",
    GEMINI_API_KEY: ai.geminiKey,
    ...options.env,
  };
  const deps: AdminDeps = {
    env,
    now: () => clock.now,
    sleep: async () => undefined,
    loginGuard: new LoginGuard(undefined, () => clock.now),
    globalGuard: new LoginGuard({ maxFailures: 30, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 }, () => clock.now),
    limiter: new RateLimiter(120, 60 * 1000, () => clock.now),
    fetchImpl: repo.fetch,
    service: createAdminService({ github: createGithubClient(readGithubConfig(env)!, repo.fetch), now: () => new Date(clock.now) }),
    aiFetchImpl: ai.fetch,
    aiQuota: new DailyQuota(() => clock.now),
  };
  const log: AdminHttpResponse[] = [];
  const call = async (opts: { method?: string; action: string; body?: unknown; cookie?: string; headers?: Record<string, string | undefined> }) => {
    const method = opts.method ?? "GET";
    const req: AdminHttpRequest = {
      method,
      url: `/api/admin?${new URLSearchParams({ action: opts.action })}`,
      headers: { host: "esliteknik.com", ...(opts.cookie ? { cookie: opts.cookie } : {}), ...(method === "POST" ? { "content-type": "application/json", "x-admin-request": "1", origin: "https://esliteknik.com" } : {}), ...opts.headers },
      body: opts.body,
      ip: "203.0.113.7",
    };
    const response = await handleAdminRequest(req, deps);
    log.push(response);
    return { status: response.status, headers: response.headers, body: response.body as any };
  };
  const login = async () => (await call({ method: "POST", action: "login", body: { password: PASSWORD } })).headers["Set-Cookie"].split(";")[0];
  const draft = (cookie: string, input: unknown) => call({ method: "POST", action: "ai-draft", cookie, body: { input } });
  return { repo, ai, env, clock, call, login, draft, log };
}

const allText = (value: unknown): string => (typeof value === "string" ? value : Array.isArray(value) ? value.map(allText).join("\n") : value && typeof value === "object" ? Object.entries(value).filter(([key]) => key !== "type").map(([, item]) => allText(item)).join("\n") : "");
const outputOf = (body: any) => ({ title: body.post.title, description: body.post.description, excerpt: body.post.excerpt, blocks: body.post.blocks, googleBusiness: body.googleBusiness, instagram: body.instagram });
const facts = (input: AiCaseInput): FakeAiFacts => JSON.parse(/<vaka>\n([\s\S]*?)\n<\/vaka>/.exec(buildAiPrompt(input).user)![1]);
const spoiled = (change: (draft: ReturnType<typeof wellBehavedDraft>) => unknown) => ({ draft: (value: FakeAiFacts) => change(wellBehavedDraft(value)) });

describe("kabul ölçütü: üç farklı vaka girdisiyle üretilen taslak şemadan geçer ve girilmemiş vaka ayrıntısı içermez", () => {
  const expected: Record<string, { district: string; device: string; servicePath: string; brandPath: string; serviceLabel?: string }> = {
    karatayBeko: { district: "Karatay", device: "Çamaşır makinesi", servicePath: "/camasir-makinesi-tamiri-konya/", brandPath: "/beko-servisi-konya/" },
    selcukluPhilips: { district: "Selçuklu · Yazır", device: "Airfryer", servicePath: "/philips-servisi-konya/", brandPath: "/philips-servisi-konya/", serviceLabel: "Philips servisi" },
    meramBosch: { district: "Meram", device: "Bulaşık makinesi", servicePath: "/bulasik-makinesi-tamiri-konya/", brandPath: "/bosch-servisi-konya/" },
  };

  for (const [name, input] of Object.entries(CASES)) {
    it(`${name}: taslak şemadan geçer, servis kaydı girdiyle aynıdır, adresler listeden türetilir, hiçbir şey kaydedilmez`, async () => {
      const kit = await setup();
      const cookie = await kit.login();
      const head = kit.repo.head;
      const response = await kit.draft(cookie, input);
      expect(response.status).toBe(200);
      const post = response.body.post;

      // 1) Ortak şema ve içerik kuralları
      expect(validateBlogPost(post).ok).toBe(true);
      expect(post.status).toBe("draft");
      expect(post.category).toBe("Ustanın Defterinden");

      // 2) Servis kaydı girilen bilgiyle birebir aynı; model bu alanlara yazamaz
      expect(post.caseFile).toEqual({ district: expected[name].district, brand: input.brand, device: expected[name].device, complaint: input.complaint, finding: input.finding, action: input.action });

      // 3) Servis ve marka adresleri shared/blog-taxonomy.ts'ten türetilir
      expect(post.device).toBe(input.device);
      expect(post.servicePath).toBe(expected[name].servicePath);
      expect(post.brandPath).toBe(expected[name].brandPath);
      expect(post.serviceLabel).toBe(expected[name].serviceLabel);

      // 4) Girilmemiş vaka ayrıntısı yok: denetim temiz, çıktıdaki her sayı girdide var, başka marka geçmiyor
      expect(findUngroundedDetails(input, outputOf(response.body))).toEqual([]);
      const inputNumbers = allText(input).match(/\d+/g) ?? [];
      for (const number of allText(outputOf(response.body)).match(/\d+/g) ?? []) expect(inputNumbers, `sayı ${number}`).toContain(String(number));
      for (const brand of BLOG_BRANDS) if (brand.name !== input.brand) expect(allText(outputOf(response.body)), brand.name).not.toContain(brand.name);

      // 5) Sosyal metinler dolu, bağlantısız
      expect(response.body.googleBusiness.length).toBeGreaterThan(80);
      expect(response.body.instagram).toContain("#konya");
      expect(`${response.body.googleBusiness}${response.body.instagram}`).not.toMatch(/https?:|www\./);

      // 6) Hiçbir şey kaydedilmez: GitHub'a tek istek bile gitmez
      expect(kit.repo.requests).toEqual([]);
      expect(kit.repo.writes).toBe(0);
      expect(kit.repo.head).toBe(head);
      expect(kit.ai.requests).toHaveLength(1);
    });
  }

  it("üretilen taslak, sahibi kaydedene kadar depoda yoktur; kaydedince normal taslak akışından (aynı kurallardan) geçer", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const response = await kit.draft(cookie, CASES.karatayBeko);
    expect([...kit.repo.headFiles().keys()].some(path => path.includes(response.body.post.slug.slice(6, -1)))).toBe(false);
    const saved = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "draft", post: response.body.post } });
    expect(saved.status).toBe(200);
    expect(saved.body.status).toBe("draft");
    expect(kit.repo.log()[0].message).toContain("[panel-taslak]");
  });
});

describe("model çıktısı güvenilmez girdidir: kurallardan geçmeyen çıktı editöre dolmaz", () => {
  const input = CASES.karatayBeko;
  const withParagraph = (text: string) => spoiled(draft => ({ ...draft, blocks: [draft.blocks[0], { type: "p", text }, ...draft.blocks.slice(1)] }));
  const rejected: [string, ReturnType<typeof spoiled> | { text: string }, RegExp][] = [
    ["uydurma sayı (cihaz yaşı)", withParagraph("Makine 8 yıllıktı ve daha önce hiç arıza yapmamıştı."), /Girdide olmayan sayı: 8/],
    ["uydurma hata kodu", withParagraph("Ekranda E18 hata kodu görünüyordu."), /Girdide olmayan sayı: 18/],
    ["yazıyla uydurma süre", withParagraph("Onarım iki saat sürdü."), /süre\/yaş/],
    ["başka marka", withParagraph("Aynı arızayı Arçelik makinelerde de görüyoruz."), /Girdide olmayan marka: Arçelik/],
    ["başka ilçe", withParagraph("Meram’dan da benzer bir talep gelmişti."), /Girdide olmayan ilçe: Meram/],
    ["uydurma tarih", withParagraph("Talep geçen hafta gelmişti."), /tarih\/zaman/],
    ["uydurma kişi", withParagraph("Ayşe Hanım makinenin su almadığını söyledi."), /kişi/],
    ["uydurma adres", withParagraph("Fetih Mahallesi’ndeki eve gittik."), /adres/],
    ["aynı gün sözü", spoiled(draft => ({ ...draft, googleBusiness: `${draft.googleBusiness} Aynı gün servis veriyoruz.` })), /söz\/vaat/],
    ["fiyat", spoiled(draft => ({ ...draft, instagram: `${draft.instagram} Parça ücreti yalnızca 500 TL.` })), /Yasak ifade|Girdide olmayan sayı/],
    ["hukuki konu", withParagraph("Bu durumda hakem heyeti yoluna gidilebilir."), /yasak ifade/i],
    ["yetkili servis iddiası", withParagraph("Beko yetkili servisi olarak parçayı değiştirdik."), /Yetkili servis iddiası/],
    ["yabancı kaynak / bağlantı", withParagraph("Ayrıntı için https://example.com/pressure-switch adresine bakın."), /bağlantı/],
    ["sosyal metinde bağlantı", spoiled(draft => ({ ...draft, instagram: `${draft.instagram} www.ornek-site.com` })), /bağlantı/],
    ["model adres yazmaya çalışıyor (slug)", spoiled(draft => ({ ...draft, slug: "/blog/baska-adres/" })), /çıktı/],
    ["model servis adresi yazmaya çalışıyor", spoiled(draft => ({ ...draft, servicePath: "/klima-servisi/", brandPath: "/sahte-servisi-konya/" })), /çıktı/],
    ["model servis kaydı yazmaya çalışıyor", spoiled(draft => ({ ...draft, caseFile: { district: "Karatay", brand: "Beko", device: "Çamaşır makinesi", complaint: "x", finding: "uydurma tespit", action: "x" } })), /çıktı/],
    ["model kaynak ekliyor", spoiled(draft => ({ ...draft, sources: [{ label: "FDA", url: "https://www.fda.gov/x" }] })), /çıktı/],
    ["bilinmeyen blok türü", spoiled(draft => ({ ...draft, blocks: [...draft.blocks, { type: "html", text: "<script>alert(1)</script>" }] })), /blocks/],
    ["açıklama 160 karakterden uzun", spoiled(draft => ({ ...draft, description: "a".repeat(161) })), /description/],
    ["usta notu yok", spoiled(draft => ({ ...draft, blocks: draft.blocks.filter(block => block.type !== "note") })), /usta notu/],
    ["JSON değil", { text: "Elbette! İşte yazınız: başlık…" }, /JSON/],
    ["dizi dönmüş", { text: "[]" }, /çıktı/],
  ];

  for (const [name, reply, reason] of rejected) {
    it(`reddeder: ${name}`, async () => {
      const kit = await setup();
      const cookie = await kit.login();
      kit.ai.queue.push(reply, reply);
      const response = await kit.draft(cookie, input);
      expect(response.status, JSON.stringify(response.body)).toBe(502);
      expect(response.body.error).toBe("ai_output_rejected");
      expect(Object.keys(response.body).sort()).toEqual(["error", "errors", "message"]);
      expect(response.body.errors.join(" | ")).toMatch(reason);
      // İki deneme yapılır; ikinci istekte ret nedeni modele geri verilir. GitHub'a dokunulmaz.
      expect(kit.ai.requests).toHaveLength(2);
      expect(kit.ai.requests[1].user).toContain("reddedildi");
      expect(kit.repo.requests).toEqual([]);
    });
  }

  it("ilk çıktı reddedilip ikincisi kurallara uyarsa taslak döner (attempts: 2)", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    kit.ai.queue.push(withParagraph("Makine 8 yıllıktı."));
    const response = await kit.draft(cookie, input);
    expect(response.status).toBe(200);
    expect(response.body.attempts).toBe(2);
    expect(allText(response.body.post.blocks)).not.toContain("8 yıllık");
  });

  it("girdide geçen sayı, mahalle ve ikinci marka çıktıda kullanılabilir (yalnızca girilmemiş ayrıntı reddedilir)", () => {
    const noted: AiCaseInput = { ...CASES.selcukluPhilips, note: "Cihaz 3 yıllıktı. Müşteri daha önce Arnica kullanmış. Yazır Mahallesi." };
    const draft = wellBehavedDraft(facts(noted));
    expect(buildAiDraft(noted, draft, "2026-10-02").ok).toBe(true);
    const without = buildAiDraft(CASES.selcukluPhilips, draft, "2026-10-02");
    expect(without.ok).toBe(false);
    if (!without.ok) expect(without.errors.join(" | ")).toMatch(/Girdide olmayan marka: Arnica/);
  });

  it("kod çitiyle sarılmış JSON'u çözer; aşırı uzun metni ve bozuk JSON'u çözmez", () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseModelJson("{ bozuk")).toBe(undefined);
    expect(parseModelJson(`{"a":"${"x".repeat(50_000)}"}`)).toBe(undefined);
  });
});

describe("ai-draft: oturum, CSRF, yöntem ve girdi denetimi", () => {
  it("oturumsuz istek 401 verir; sağlayıcıya ve GitHub'a tek istek bile gitmez", async () => {
    const kit = await setup();
    for (const cookie of [undefined, "esli_admin=sahte.belirtec"]) {
      const response = await kit.call({ method: "POST", action: "ai-draft", cookie, body: { input: CASES.karatayBeko } });
      expect(response.status).toBe(401);
      expect(Object.keys(response.body).sort()).toEqual(["error", "message"]);
    }
    expect(kit.ai.requests).toEqual([]);
    expect(kit.repo.requests).toEqual([]);
  });

  it("X-Admin-Request başlığı, JSON türü ya da aynı site kökeni olmadan reddedilir; GET 405 verir", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const body = { input: CASES.karatayBeko };
    expect((await kit.call({ method: "POST", action: "ai-draft", cookie, body, headers: { "x-admin-request": undefined } })).status).toBe(403);
    expect((await kit.call({ method: "POST", action: "ai-draft", cookie, body, headers: { "content-type": "text/plain" } })).status).toBe(403);
    expect((await kit.call({ method: "POST", action: "ai-draft", cookie, body, headers: { origin: "https://kotu-site.example" } })).status).toBe(403);
    expect((await kit.call({ method: "GET", action: "ai-draft", cookie })).status).toBe(405);
    expect(kit.ai.requests).toEqual([]);
  });

  it("genel istek sınırı bu eylem için de geçerlidir", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    for (let i = 0; i < 119; i++) await kit.call({ action: "session", cookie });
    const response = await kit.draft(cookie, CASES.karatayBeko);
    expect(response.status).toBe(429);
    expect(response.body.error).toBe("rate_limited");
    expect(kit.ai.requests).toEqual([]);
  });

  it("anahtar tanımlı değilse 503 ve değişkenin adını söyleyen açık bir mesaj verir", async () => {
    const kit = await setup({ env: { GEMINI_API_KEY: undefined } });
    const cookie = await kit.login();
    const response = await kit.draft(cookie, CASES.karatayBeko);
    expect(response.status).toBe(503);
    expect(response.body.error).toBe("ai_not_configured");
    expect(response.body.message).toContain("GEMINI_API_KEY");
    expect(kit.ai.requests).toEqual([]);
  });

  it("geçersiz girdiyi sağlayıcıya göndermeden reddeder ve günlük haktan düşmez", async () => {
    const kit = await setup({ env: { AI_DAILY_LIMIT: "1" } });
    const cookie = await kit.login();
    const base = CASES.karatayBeko;
    const bad: unknown[] = [
      undefined,
      "metin",
      { ...base, brand: "Miele" },
      { ...base, district: "Akşehir" },
      { ...base, device: "Genel" },
      { ...base, device: "Klima" },
      { ...base, device: "Küçük Ev Aletleri" },
      { ...base, complaint: "" },
      { ...base, complaint: "satır\nsonu" },
      { ...base, finding: "x".repeat(301) },
      { ...base, note: "Parça 750 TL tuttu." },
      { ...base, note: "Beko yetkili servisi olarak gittik." },
      { ...base, servicePath: "/baska-sayfa/" },
    ];
    for (const input of bad) {
      const response = await kit.draft(cookie, input);
      expect(response.status, JSON.stringify(input)).toBe(422);
      expect(response.body.error).toBe("validation_failed");
    }
    expect(kit.ai.requests).toEqual([]);
    expect((await kit.draft(cookie, base)).status).toBe(200);
  });

  it("cihaz listesi taxonomy'den gelir; 'Genel' vaka cihazı değildir", () => {
    expect(AI_CASE_DEVICES).toEqual(BLOG_DEVICES.map(option => option.device).filter(device => device !== "Genel"));
    expect(validateAiCaseInput({ ...CASES.karatayBeko, topic: "  Konu  " })).toEqual({ ok: true, input: { ...CASES.karatayBeko, topic: "Konu" } });
  });
});

describe("ai-draft: günlük kullanım sınırı", () => {
  it("sınır dolunca 429 verir ve sağlayıcıyı çağırmaz; ertesi gün (İstanbul) sıfırlanır", async () => {
    const kit = await setup({ env: { AI_DAILY_LIMIT: "2" } });
    const cookie = await kit.login();
    expect((await kit.draft(cookie, CASES.karatayBeko)).body.remaining).toBe(1);
    expect((await kit.draft(cookie, CASES.meramBosch)).body.remaining).toBe(0);
    const blocked = await kit.draft(cookie, CASES.selcukluPhilips);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe("ai_daily_limit");
    expect(kit.ai.requests).toHaveLength(2);
    kit.clock.now += 24 * 60 * 60 * 1000;
    expect((await kit.draft(cookie, CASES.selcukluPhilips)).status).toBe(200);
  });

  it("başarısız üretim de haktan düşer (reddedilen çıktıyla sınırsız deneme yapılamaz)", async () => {
    const kit = await setup({ env: { AI_DAILY_LIMIT: "1" } });
    const cookie = await kit.login();
    kit.ai.queue.push({ text: "bozuk" }, { text: "bozuk" });
    expect((await kit.draft(cookie, CASES.karatayBeko)).status).toBe(502);
    expect((await kit.draft(cookie, CASES.karatayBeko)).status).toBe(429);
  });

  it("aynı anda gelen istekler sınırı aşamaz", async () => {
    const kit = await setup({ env: { AI_DAILY_LIMIT: "3" } });
    const cookie = await kit.login();
    const statuses = (await Promise.all(Array.from({ length: 8 }, () => kit.draft(cookie, CASES.karatayBeko)))).map(response => response.status);
    expect(statuses.filter(status => status === 200)).toHaveLength(3);
    expect(statuses.filter(status => status === 429)).toHaveLength(5);
    expect(kit.ai.requests).toHaveLength(3);
  });

  it("sınır ortamdan okunur; geçersiz değer varsayılana (20) döner", () => {
    expect(aiDailyLimit({})).toBe(20);
    expect(aiDailyLimit({ AI_DAILY_LIMIT: "5" })).toBe(5);
    for (const value of ["0", "-3", "abc", "1.5", "100000"]) expect(aiDailyLimit({ AI_DAILY_LIMIT: value })).toBe(20);
  });
});

describe("sağlayıcı: anahtar, hata türleri ve yedek", () => {
  it("anahtar adrese değil başlığa konur; model adı ortamdan gelir, geçersiz ad varsayılana döner", async () => {
    const kit = await setup({ env: { GEMINI_MODEL: "gemini-3.5-flash" } });
    const cookie = await kit.login();
    expect((await kit.draft(cookie, CASES.karatayBeko)).status).toBe(200);
    const request = kit.ai.requests[0];
    expect(request.authorized).toBe(true);
    expect(request.url).not.toContain(kit.ai.geminiKey);
    expect(request.url).not.toContain("key=");
    expect(request.model).toBe("gemini-3.5-flash");
    expect(createAiProviders({ GEMINI_API_KEY: "k", GEMINI_MODEL: "../../baska?x=1" }).map(provider => provider.model)).toEqual(["gemini-flash-latest"]);
    expect(createAiProviders({})).toEqual([]);
  });

  it("geçersiz anahtar 502, kota 503 verir; yanıt anahtarı ve sağlayıcının gövdesini içermez", async () => {
    const kit = await setup({ env: { GEMINI_API_KEY: "AIzaYANLISANAHTAR000000" } });
    const cookie = await kit.login();
    const denied = await kit.draft(cookie, CASES.karatayBeko);
    expect(denied.status).toBe(502);
    expect(denied.body.error).toBe("ai_auth_failed");

    const other = await setup();
    const otherCookie = await other.login();
    other.ai.queue.push({ status: 429 });
    const limited = await other.draft(otherCookie, CASES.karatayBeko);
    expect(limited.status).toBe(503);
    expect(limited.body.error).toBe("ai_rate_limited");
    other.ai.queue.push({ status: 500 });
    expect((await other.draft(otherCookie, CASES.karatayBeko)).body.error).toBe("ai_unavailable");

    const everything = JSON.stringify([kit.log, other.log]);
    for (const secret of ["AIzaYANLISANAHTAR000000", other.ai.geminiKey, other.ai.groqKey, "sağlayıcı-gövdesi-sızmamalı", GITHUB_TOKEN, SECRET, PASSWORD]) expect(everything).not.toContain(secret);
  });

  it("Gemini kotası dolunca, anahtarı varsa Groq'a geçer; yanıt hangi sağlayıcının yazdığını söyler", async () => {
    const kit = await setup({ env: { GROQ_API_KEY: "gsk_TESTGROQKEY0123456789" } });
    const cookie = await kit.login();
    kit.ai.queueFor.gemini.push({ status: 429 });
    const response = await kit.draft(cookie, CASES.meramBosch);
    expect(response.status).toBe(200);
    expect(response.body.provider).toBe("groq");
    expect(kit.ai.requests.map(request => request.provider)).toEqual(["gemini", "groq"]);
    expect(kit.ai.requests[1].authorized).toBe(true);
    expect(validateBlogPost(response.body.post).ok).toBe(true);
  });

  it("başarılı yanıtlar da hiçbir anahtarı içermez", async () => {
    const kit = await setup({ env: { GROQ_API_KEY: "gsk_TESTGROQKEY0123456789" } });
    const cookie = await kit.login();
    await kit.draft(cookie, CASES.karatayBeko);
    const everything = JSON.stringify(kit.log);
    for (const secret of [kit.ai.geminiKey, kit.ai.groqKey, GITHUB_TOKEN, SECRET]) expect(everything).not.toContain(secret);
  });
});

describe("prompt", () => {
  it("vakayı aynen taşır, en çok iki üslup örneği verir; adres, sıra ve servis sayfası bilgisi modele gitmez", () => {
    const prompt = buildAiPrompt(CASES.selcukluPhilips);
    expect(facts(CASES.selcukluPhilips)).toEqual({ konu: "Çalışırken kapanan airfryer", ilce: "Selçuklu · Yazır", marka: "Philips", cihaz: "Airfryer", sikayet: "Airfryer çalışırken kapanıyor", tespit: "Fan motoru sıkışmış, termal koruma devreye giriyor", yapilanIslem: "Fan motoru temizlendi ve yağlandı", serbestNot: "Cihaz 3 yıllıktı. Model HD9252." });
    expect(prompt.user.match(/<ornek-\d>/g)?.length ?? 0).toBeLessThanOrEqual(2);
    for (const hidden of ["/blog/", "-servisi-konya/", "-tamiri-konya/", '"order"', '"slug"']) expect(prompt.user, hidden).not.toContain(hidden);
    for (const rule of ["AYRINTI UYDURMA", "Fiyat", "Yetkili servis", "Hukuki konu", "yabancı kaynak"]) expect(prompt.system, rule).toContain(rule);
  });
});

describe("editör tarafı: sunucudan gelen taslak da yeniden denetlenir", () => {
  const input = CASES.karatayBeko;
  const today = "2026-10-02";
  const good = () => {
    const built = buildAiDraft(input, wellBehavedDraft(facts(input)), today);
    if (!built.ok) throw new Error(built.errors.join("; "));
    return built.draft;
  };

  it("sırayı ve adresi mevcut yazılarla çakışmayacak şekilde kurar", () => {
    const draft = good();
    const placed = placeAiDraft(input, draft, [{ slug: draft.post.slug, order: 210 }, { slug: "/blog/baska/", order: 40 }], today);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.draft.post.order).toBe(220);
    expect(placed.draft.post.slug).toBe(draft.post.slug.replace(/\/$/, "-2/"));
    expect(validateBlogPost(placed.draft.post).ok).toBe(true);
  });

  it("yanıttaki servis kaydı ve adresler yok sayılır; girdiden ve listeden yeniden kurulur", () => {
    const draft = good();
    const tampered = { ...draft, post: { ...draft.post, status: "published", servicePath: "/iletisim/", brandPath: "/arcelik-servisi-konya/", caseFile: { ...draft.post.caseFile!, finding: "uydurma tespit" }, sources: [{ label: "Kaynak şu", url: "https://ornek.example/" }] } };
    const placed = placeAiDraft(input, tampered, [], today);
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.draft.post.status).toBe("draft");
    expect(placed.draft.post.servicePath).toBe("/camasir-makinesi-tamiri-konya/");
    expect(placed.draft.post.brandPath).toBe("/beko-servisi-konya/");
    expect(placed.draft.post.caseFile!.finding).toBe(input.finding);
    expect(placed.draft.post.sources).toBe(undefined);
  });

  it("uydurma ayrıntı taşıyan ya da eksik yanıt editöre dolmaz", () => {
    const draft = good();
    const fabricated = { ...draft, post: { ...draft.post, excerpt: "Makine 12 yıllıktı." } };
    expect(placeAiDraft(input, fabricated, [], today).ok).toBe(false);
    expect(placeAiDraft(input, { post: draft.post }, [], today).ok).toBe(false);
    expect(placeAiDraft(input, null, [], today).ok).toBe(false);
  });
});

describe("yapı: tek fonksiyon, sunucuda kalan anahtar, kaydetmeyen akış", () => {
  it("yeni Vercel fonksiyonu açılmadı (Hobby'de 12 sınırı): api/ altında yalnızca iki dosya var", () => {
    expect(readdirSync(resolve(projectRoot, "api")).sort()).toEqual(["admin.ts", "instagram-feed.ts"]);
    expect(read("server/admin/handler.ts")).toContain('case "ai-draft"');
  });

  it("anahtarlar yalnızca sunucu ortam değişkenidir: VITE_ öneki yok, istemci kodunda adı geçmez", () => {
    expect(read(".env.example")).toContain("GEMINI_API_KEY=");
    expect(read(".env.example")).not.toMatch(/VITE_(GEMINI|GROQ|AI)/);
    for (const file of ["client/src/admin/AiDraftBox.tsx", "client/src/admin/api.ts", "client/src/admin/EditorView.tsx", "shared/blog-ai.ts"]) expect(read(file), file).not.toMatch(/GEMINI_API_KEY|GROQ_API_KEY|import\.meta\.env/);
  });

  it("yapay zeka modülü GitHub istemcisine erişmez ve günlüğe yalnızca hata türünü yazar", () => {
    const ai = read("server/admin/ai.ts");
    expect(ai).not.toMatch(/from "\.\/(github|service)\.js"/);
    expect(ai).not.toContain("console.");
    const handler = read("server/admin/handler.ts");
    expect(handler).toContain('console.error("admin: yapay zeka hatası", error.provider, error.kind)');
    expect(handler.slice(handler.indexOf('case "ai-draft"'), handler.indexOf("default:", handler.indexOf('case "ai-draft"')))).not.toMatch(/service\.|github/i);
  });

  it("editör taslağı yalnızca doldurur: form bileşeni kaydetme ya da silme çağrısı yapmaz", () => {
    const box = read("client/src/admin/AiDraftBox.tsx");
    expect(box).toContain("api.aiDraft(");
    expect(box).toContain("placeAiDraft(");
    expect(box).not.toMatch(/api\.(save|remove)\(/);
    const editor = read("client/src/admin/EditorView.tsx");
    expect(editor).toContain("onDraft={fillFromAi}");
    expect(editor.slice(editor.indexOf("const fillFromAi"), editor.indexOf("const hasContent"))).not.toContain("submit(");
  });

  it("panel ve API arama motorlarına kapalı kalır; ziyaretçi dosyalarına yapay zekadan söz eden satır girmedi", () => {
    const config = JSON.parse(read("vercel.json"));
    for (const source of ["/yonetim/(.*)", "/api/admin(.*)"]) expect(JSON.stringify(config.headers.find((item: { source: string }) => item.source === source))).toContain("noindex");
    expect(read("client/public/robots.txt")).toContain("Disallow: /api/admin");
    for (const file of ["client/public/sitemap.xml", "client/public/llms.txt", "client/public/robots.txt"]) expect(read(file), file).not.toMatch(/ai-draft|gemini|yapay zeka/i);
  });
});

import { readFileSync, readdirSync } from "node:fs";
import { Readable } from "node:stream";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { aiDraftOutputSchema } from "../../shared/blog-ai";
import { BLOG_IMAGE_LIMIT_PER_POST, BLOG_IMAGE_SIZES, BLOG_IMAGE_HOST, blobPathImageId, blogImageId, blogImageSmallUrl, blogImageSrcSet, fitWithin, isBlogImageUrl, postImageIds } from "../../shared/blog-images";
import { blogPosts } from "../../shared/blog-posts";
import { blogBlockSchema, validateBlogPost } from "../../shared/blog-schema";
import { LoginGuard, RateLimiter, hashPassword } from "../../server/admin/auth";
import { BlobError } from "../../server/admin/blob";
import { createGithubClient, readGithubConfig } from "../../server/admin/github";
import { DailyQuota } from "../../server/admin/ai";
import { adminHandler, handleAdminRequest, type AdminDeps, type AdminHttpRequest, type AdminHttpResponse } from "../../server/admin/handler";
import { checkUpload, decodeBase64, inspectWebp } from "../../server/admin/images";
import { createImageStore, UNREFERENCED_GRACE_MS } from "../../server/admin/imageStore";
import { createAdminService } from "../../server/admin/service";
import { FIXTURES, FakeBlob, syntheticWebp, toBase64 } from "./adminFakeBlob";
import { FakeGithubRepo } from "./adminFakeGithub";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

const PASSWORD = "doğru-at-pil-zımba-4821";
const SECRET = "x".repeat(48);
const TOKEN = "ghp_TESTTOKEN123456";
const HOST = "teststore123.public.blob.vercel-storage.com";
const ID = "0123456789abcdef0123456789abcdef";
const SRC = `https://${HOST}/blog/${ID}-1600.webp`;
const image = (overrides: Record<string, unknown> = {}) => ({ src: SRC, alt: "Açılmış çamaşır makinesi pompası", width: 1600, height: 1200, ...overrides });
const hexId = (n: number) => n.toString(16).padStart(32, "0");

function realRepoFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  for (const name of readdirSync(resolve(projectRoot, "content/blog"))) files[`content/blog/${name}`] = read(`content/blog/${name}`);
  for (const path of ["shared/blog-content.generated.ts", "client/public/sitemap.xml", "client/public/llms.txt"]) files[path] = read(path);
  return files;
}

const newPost = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  slug: "/blog/foto-deneme-yazisi/",
  category: "Bakım Rehberi",
  title: "Fotoğraflı deneme yazısı: panelden eklendi",
  description: "Panelden eklenen fotoğraflı deneme yazısının, arama sonuçlarında görünecek 90 ile 160 karakter arasındaki açıklaması burada yer alır.",
  excerpt: "Panelden eklenen fotoğraflı deneme yazısı.",
  device: "Çamaşır Makinesi",
  servicePath: "/camasir-makinesi-tamiri-konya/",
  blocks: [{ type: "p", text: "Deneme paragrafı." }],
  ...overrides,
});

/** Depoya elle konmuş, fotoğraflı bir taslak (Blob'suz kurulumda silme denemesi için). */
function manualDraftFiles(): Record<string, string> {
  const files = realRepoFiles();
  const name = readdirSync(resolve(projectRoot, "content/blog")).find(file => JSON.parse(read(`content/blog/${file}`)).category !== "Ustanın Defterinden")!;
  const draft = { ...JSON.parse(read(`content/blog/${name}`)), slug: "/blog/foto-elle-eklendi/", order: 99990, status: "draft", title: "Elle eklenen fotoğraflı taslak", description: "Elle eklenen fotoğraflı taslağın, benzersiz olması için ayrı yazılmış, 90 ile 160 karakter arasındaki deneme açıklaması burada yer alır.", cover: image() };
  files["content/blog/foto-elle-eklendi.json"] = `${JSON.stringify(draft, null, 2)}\n`;
  return files;
}

type Kit = Awaited<ReturnType<typeof setup>>;
async function setup(options: { env?: Record<string, string | undefined>; branch?: string; blob?: FakeBlob | null; imageHost?: string; files?: Record<string, string> } = {}) {
  const branch = options.branch ?? "main";
  const repo = new FakeGithubRepo(options.files ?? realRepoFiles(), TOKEN, branch);
  const blob = options.blob === null ? undefined : (options.blob ?? new FakeBlob(HOST));
  const clock = { now: Date.parse("2026-10-02T09:00:00Z") };
  if (blob) blob.clock = clock.now;
  const env: Record<string, string | undefined> = {
    ADMIN_PASSWORD_HASH: await hashPassword(PASSWORD),
    ADMIN_SESSION_SECRET: SECRET,
    GITHUB_CONTENT_TOKEN: TOKEN,
    GITHUB_REPO: "o/r",
    GITHUB_BRANCH: branch,
    ...(blob ? { BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_TESTTOKEN" } : {}),
    ...options.env,
  };
  const imageHost = options.imageHost ?? HOST;
  const sleeps: number[] = [];
  const images = blob ? createImageStore(blob, imageHost, { sleep: async ms => void sleeps.push(ms), now: () => clock.now }) : undefined;
  const deps: AdminDeps = {
    env,
    now: () => clock.now,
    sleep: async ms => void sleeps.push(ms),
    loginGuard: new LoginGuard(undefined, () => clock.now),
    globalGuard: new LoginGuard({ maxFailures: 30, windowMs: 15 * 60 * 1000, lockMs: 15 * 60 * 1000 }, () => clock.now),
    limiter: new RateLimiter(1000, 60 * 1000, () => clock.now),
    fetchImpl: repo.fetch,
    service: createAdminService({ github: createGithubClient(readGithubConfig(env)!, repo.fetch), now: () => new Date(clock.now), imageHost, ...(images ? { images } : {}) }),
    ...(blob ? { blob } : {}),
    imageHost,
    imageQuota: new DailyQuota(() => clock.now),
  };
  const call = async (opts: { method?: string; action: string; body?: unknown; cookie?: string; headers?: Record<string, string | undefined> }) => {
    const method = opts.method ?? "GET";
    const req: AdminHttpRequest = {
      method,
      url: `/api/admin?${new URLSearchParams({ action: opts.action })}`,
      headers: { host: "esliteknik.com", ...(opts.cookie ? { cookie: opts.cookie } : {}), ...(method === "POST" ? { "content-type": "application/json", "x-admin-request": "1", origin: "https://esliteknik.com" } : {}), ...opts.headers },
      body: opts.body,
      ip: "203.0.113.7",
    };
    const response: AdminHttpResponse = await handleAdminRequest(req, deps);
    return { status: response.status, headers: response.headers, body: response.body as any };
  };
  const login = async () => (await call({ method: "POST", action: "login", body: { password: PASSWORD } })).headers["Set-Cookie"].split(";")[0];
  return { repo, blob, env, deps, clock, sleeps, call, login };
}

const clean = () => toBase64(FIXTURES.clean);
const upload = (kit: Kit, cookie: string, body: Record<string, unknown> = { large: clean(), small: clean() }) => kit.call({ method: "POST", action: "image-upload", cookie, body });
const save = (kit: Kit, cookie: string, post: Record<string, unknown>) => kit.call({ method: "POST", action: "save", cookie, body: { mode: "publish", post } });
const remove = (kit: Kit, cookie: string, slug: string) => kit.call({ method: "POST", action: "delete", cookie, body: { slug, confirm: true } });

/** Yüklemeyle gerçekten depoya yazılmış, şemadan geçen bir fotoğraf alanı. */
async function uploaded(kit: Kit, cookie: string, alt = "Deneme fotoğrafı") {
  const response = await upload(kit, cookie);
  expect(response.status).toBe(200);
  return { src: response.body.src as string, alt, width: response.body.width as number, height: response.body.height as number };
}

describe("fotoğraf adresi ve boyut kuralları (shared/blog-images)", () => {
  it("adresi yalnızca projenin Blob alanından ve tam kalıpta kabul eder", () => {
    expect(isBlogImageUrl(SRC, HOST)).toBe(true);
    const bad = [
      `http://${HOST}/blog/${ID}-1600.webp`,
      `https://baska.example/blog/${ID}-1600.webp`,
      `https://${HOST}.baska.example/blog/${ID}-1600.webp`,
      `https://kullanici@${HOST}/blog/${ID}-1600.webp`,
      `https://${HOST}:8443/blog/${ID}-1600.webp`,
      `${SRC}?x=1`,
      `${SRC}#parca`,
      `https://${HOST}/blog/${ID}-800.webp`,
      `https://${HOST}/blog/${ID}-1600.png`,
      `https://${HOST}/blog/../blog/${ID}-1600.webp`,
      `https://${HOST}/blog/${ID.toUpperCase()}-1600.webp`,
      `https://${HOST}/blog/${ID.slice(1)}-1600.webp`,
      `https://${HOST}//blog/${ID}-1600.webp`,
      `https://${HOST.toUpperCase()}/blog/${ID}-1600.webp`,
      "", "javascript:alert(1)", "/blog/x.webp",
    ];
    bad.forEach(value => expect(isBlogImageUrl(value, HOST), value).toBe(false));
    expect(isBlogImageUrl(undefined, HOST)).toBe(false);
    expect(isBlogImageUrl(SRC, "")).toBe(false);
  });

  it("alan ayarlanmamışken (varsayılan) hiçbir adres geçmez", () => {
    const host: string = BLOG_IMAGE_HOST;
    expect(host).toBe(host.toLowerCase());
    expect(isBlogImageUrl(SRC, "")).toBe(false);
  });

  it("kimlik, 800 sürümü, srcset ve boyut hesapları", () => {
    expect(blogImageId(SRC)).toBe(ID);
    expect(blogImageSmallUrl(SRC)).toBe(`https://${HOST}/blog/${ID}-800.webp`);
    expect(blobPathImageId(`blog/${ID}-800.webp`)).toBe(ID);
    expect(blobPathImageId(`blog/${ID}-400.webp`)).toBeNull();
    expect(blobPathImageId(`baska/${ID}-800.webp`)).toBeNull();
    expect(blobPathImageId("blog/notlar.txt")).toBeNull();
    expect(fitWithin(1600, 1200, 800)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1200, 1600, 800)).toEqual({ width: 600, height: 800 });
    expect(fitWithin(500, 300, 800)).toEqual({ width: 500, height: 300 });
    expect(blogImageSrcSet(image())).toBe(`https://${HOST}/blog/${ID}-800.webp 800w, ${SRC} 1600w`);
    expect(BLOG_IMAGE_SIZES).toContain("760px");
  });
});

describe("yazı şeması: kapak ve görsel bloğu", () => {
  const base = () => ({ ...blogPosts[0], order: 1 }) as Record<string, unknown>;
  const errorsOf = (post: Record<string, unknown>, host = HOST) => {
    const result = validateBlogPost(post, host);
    return result.ok ? [] : result.errors;
  };

  it("fotoğrafsız yazılar alan ayarlansa da ayarlanmasa da aynı şekilde geçer", () => {
    expect(errorsOf(base())).toEqual([]);
    expect(errorsOf(base(), "")).toEqual([]);
  });

  it("kapak ve görsel bloğu geçerli adres ve alt metinle kabul edilir", () => {
    const post = { ...base(), cover: image(), blocks: [...(blogPosts[0].blocks as unknown[]), { type: "image", ...image({ src: `https://${HOST}/blog/${hexId(2)}-1600.webp` }) }] };
    expect(errorsOf(post)).toEqual([]);
  });

  it("alan ayarlanmamışken (boş) fotoğraflı yazı reddedilir", () => {
    expect(errorsOf({ ...base(), cover: image() }, "").length).toBeGreaterThan(0);
  });

  it("başka alandan, sorgulu ya da yanlış adlı adresi reddeder", () => {
    for (const src of [`https://baska.example/blog/${ID}-1600.webp`, `${SRC}?v=2`, `http://${HOST}/blog/${ID}-1600.webp`, `https://${HOST}/blog/${ID}-800.webp`]) {
      expect(errorsOf({ ...base(), cover: image({ src }) }).length, src).toBeGreaterThan(0);
      expect(errorsOf({ ...base(), blocks: [...(blogPosts[0].blocks as unknown[]), { type: "image", ...image({ src }) }] }).length, src).toBeGreaterThan(0);
    }
  });

  it("alt metin zorunlu, tek satır ve en çok 200 karakter; ölçüler tam sayı ve 1–1600", () => {
    const bads: Record<string, unknown>[] = [
      image({ alt: "" }), image({ alt: "   " }), image({ alt: undefined }), image({ alt: "iki\nsatır" }), image({ alt: "a".repeat(201) }),
      image({ width: 0 }), image({ width: 1601 }), image({ height: 1.5 }), image({ height: -3 }), image({ width: "1600" }), image({ width: undefined }),
      { ...image(), ekstra: "x" },
    ];
    bads.forEach((cover, index) => expect(errorsOf({ ...base(), cover }).length, `kapak ${index}`).toBeGreaterThan(0));
    bads.forEach((block, index) => expect(errorsOf({ ...base(), blocks: [...(blogPosts[0].blocks as unknown[]), { type: "image", ...block }] }).length, `blok ${index}`).toBeGreaterThan(0));
  });

  it(`bir yazıda en çok ${BLOG_IMAGE_LIMIT_PER_POST} fotoğraf olur (kapak dahil)`, () => {
    const blocks = (count: number) => Array.from({ length: count }, (_, index) => ({ type: "image", ...image({ src: `https://${HOST}/blog/${hexId(index + 1)}-1600.webp` }) }));
    expect(errorsOf({ ...base(), blocks: [...(blogPosts[0].blocks as unknown[]), ...blocks(BLOG_IMAGE_LIMIT_PER_POST)] })).toEqual([]);
    expect(errorsOf({ ...base(), blocks: [...(blogPosts[0].blocks as unknown[]), ...blocks(BLOG_IMAGE_LIMIT_PER_POST + 1)] }).length).toBeGreaterThan(0);
    expect(errorsOf({ ...base(), cover: image({ src: `https://${HOST}/blog/${hexId(99)}-1600.webp` }), blocks: [...(blogPosts[0].blocks as unknown[]), ...blocks(BLOG_IMAGE_LIMIT_PER_POST)] }).length).toBeGreaterThan(0);
  });

  it("postImageIds kapak ve bloklardaki kimlikleri tekrarsız toplar", () => {
    const post = { cover: image(), blocks: [{ type: "image", ...image() }, { type: "image", ...image({ src: `https://${HOST}/blog/${hexId(5)}-1600.webp` }) }, { type: "p" }] };
    expect([...postImageIds(post)].sort()).toEqual([ID, hexId(5)].sort());
  });
});

describe("yapay zeka fotoğraf üretemez", () => {
  it("yapay zekanın blok şeması görsel bloğunu ve çıktı şeması kapak alanını reddeder", () => {
    expect(blogBlockSchema.safeParse({ type: "image", ...image() }).success).toBe(false);
    expect(blogBlockSchema.safeParse({ type: "p", text: "Düz paragraf." }).success).toBe(true);
    const output = { title: "t", description: "d", excerpt: "e", blocks: [], googleBusiness: "g", instagram: "i" };
    expect(aiDraftOutputSchema.safeParse({ ...output, cover: image() }).success).toBe(false);
    const source = read("shared/blog-ai.ts");
    expect(source).not.toMatch(/\bcover\b|\bimage\b|blog-images/);
  });
});

describe("WebP denetimi (server/admin/images)", () => {
  it("temiz WebP'yi kabul eder ve ölçüyü dosyadan okur", () => {
    expect(inspectWebp(FIXTURES.clean)).toEqual({ ok: true, info: { width: 48, height: 36 } });
    expect(inspectWebp(FIXTURES.alpha).ok).toBe(true);
    expect(inspectWebp(syntheticWebp(1600, 1200))).toEqual({ ok: true, info: { width: 1600, height: 1200 } });
  });

  it("konum (EXIF), XMP ve animasyon taşıyan gerçek dosyaları reddeder; küçük renk profilini kabul eder (Chromium canvas çıktısı sRGB profili taşır)", () => {
    const reason = (bytes: Uint8Array) => {
      const result = inspectWebp(bytes);
      return result.ok ? "" : result.error;
    };
    expect(reason(FIXTURES.exif)).toMatch(/EXIF/);
    expect(reason(FIXTURES.xmp)).toMatch(/XMP/);
    expect(reason(FIXTURES.animated)).toMatch(/animasyon/);
    expect(inspectWebp(FIXTURES.icc)).toEqual({ ok: true, info: { width: 48, height: 36 } });
  });

  it("renk profili 4 KB'ı aşarsa ya da yanlış yerdeyse reddedilir (profil alanına veri sığdırılamaz)", () => {
    const le32 = (value: number) => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
    const ascii = (text: string) => text.split("").map(char => char.charCodeAt(0));
    const withIcc = (iccSize: number) => {
      const icc = [...ascii("ICCP"), ...le32(iccSize), ...new Array(iccSize + (iccSize % 2)).fill(0)];
      const vp8x = [...ascii("VP8X"), ...le32(10), 0x20, 0, 0, 0, 47, 0, 0, 35, 0, 0];
      const vp8l = [...ascii("VP8L"), ...le32(5), 0x2f, 47, 0xc0, 8, 0, 0];
      const body = [...ascii("WEBP"), ...vp8x, ...icc, ...vp8l];
      return Uint8Array.from([...ascii("RIFF"), ...le32(body.length), ...body]);
    };
    expect(inspectWebp(withIcc(456)).ok).toBe(true);
    expect(inspectWebp(withIcc(4096)).ok).toBe(true);
    expect(inspectWebp(withIcc(4098)).ok).toBe(false);
    expect(inspectWebp(withIcc(60_000)).ok).toBe(false);
  });

  it("bayrağı kapalı ama parçası duran EXIF'i de, parçası olmayan ama bayrağı açık VP8X'i de reddeder", () => {
    const withFlag = Uint8Array.from(FIXTURES.alpha);
    withFlag[20] |= 0x08; // VP8X bayrakları: EXIF var
    expect(inspectWebp(withFlag).ok).toBe(false);
    const noFlag = Uint8Array.from(FIXTURES.exif);
    noFlag[20] &= ~0x08;
    expect(inspectWebp(noFlag).ok).toBe(false); // parça duruyor
  });

  it("WebP olmayan, kısa, bozuk, eksik ya da sonunda artık veri olan dosyaları reddeder", () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(40).fill(0)]);
    expect(inspectWebp(png).ok).toBe(false);
    expect(inspectWebp(new Uint8Array(0)).ok).toBe(false);
    expect(inspectWebp(FIXTURES.clean.slice(0, 30)).ok).toBe(false);
    expect(inspectWebp(Uint8Array.from([...FIXTURES.clean, 0, 0])).ok).toBe(false);
    const wrongSize = Uint8Array.from(FIXTURES.clean);
    wrongSize[4] += 2;
    expect(inspectWebp(wrongSize).ok).toBe(false);
  });

  it("base64 girdisini ve boyut sınırını denetler", () => {
    expect(decodeBase64("", 100).ok).toBe(false);
    expect(decodeBase64(42, 100).ok).toBe(false);
    expect(decodeBase64("abc", 100).ok).toBe(false);
    expect(decodeBase64("****", 100).ok).toBe(false);
    expect(decodeBase64(toBase64(new Uint8Array(200)), 100).ok).toBe(false);
    expect(decodeBase64(toBase64(new Uint8Array(100)), 100).ok).toBe(true);
  });

  it("iki sürümü kurallara göre denetler: boyut sınırı, en uzun kenar, küçük sürümün büyükle uyumu", () => {
    const ok = (large: Uint8Array, small: Uint8Array) => checkUpload({ large: toBase64(large), small: toBase64(small) }).ok;
    expect(ok(FIXTURES.clean, FIXTURES.clean)).toBe(true);
    expect(ok(syntheticWebp(1600, 1200), syntheticWebp(800, 600))).toBe(true);
    expect(ok(syntheticWebp(1600, 1200), syntheticWebp(800, 601))).toBe(true); // 1 piksel yuvarlama payı
    expect(ok(syntheticWebp(1600, 1200), syntheticWebp(900, 675))).toBe(false);
    expect(ok(syntheticWebp(1600, 1200), syntheticWebp(800, 400))).toBe(false);
    expect(ok(syntheticWebp(1601, 900), syntheticWebp(800, 450))).toBe(false);
    expect(ok(syntheticWebp(1600, 1200, 600 * 1024), syntheticWebp(800, 600))).toBe(false);
    expect(ok(syntheticWebp(1600, 1200), syntheticWebp(800, 600, 300 * 1024))).toBe(false);
    expect(checkUpload({ large: toBase64(FIXTURES.clean) }).ok).toBe(false);
    expect(checkUpload({}).ok).toBe(false);
  });
});

describe("image-upload: oturum, CSRF ve girdi denetimi", () => {
  it("oturumsuz hiçbir fotoğraf eylemi 401 verir ve Blob'a dokunmaz", async () => {
    const kit = await setup();
    for (const [method, action] of [["POST", "image-upload"], ["GET", "image-usage"], ["POST", "image-cleanup"], ["GET", "image-upload"], ["DELETE", "image-cleanup"]]) {
      for (const cookie of [undefined, "esli_admin=sahte.belirtec"]) {
        const response = await kit.call({ method, action, cookie, body: { large: clean(), small: clean(), confirm: true } });
        expect(response.status, `${method} ${action}`).toBe(401);
        expect(Object.keys(response.body).sort()).toEqual(["error", "message"]);
      }
    }
    expect(kit.blob!.calls).toEqual({ put: [], del: [], list: 0 });
    expect(kit.repo.writes).toBe(0);
  });

  it("CSRF üstbilgisi, çıkış noktası ve içerik türü denetlenir; yanlış yöntem 405 verir", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const body = { large: clean(), small: clean() };
    expect((await kit.call({ method: "POST", action: "image-upload", cookie, body, headers: { "x-admin-request": "" } })).status).toBe(403);
    expect((await kit.call({ method: "POST", action: "image-upload", cookie, body, headers: { origin: "https://kotu-site.example" } })).status).toBe(403);
    expect((await kit.call({ method: "POST", action: "image-upload", cookie, body, headers: { "content-type": "text/plain" } })).status).toBe(403);
    expect((await kit.call({ action: "image-upload", cookie })).status).toBe(405);
    expect((await kit.call({ method: "POST", action: "image-usage", cookie, body: {} })).status).toBe(405);
    expect((await kit.call({ action: "image-cleanup", cookie })).status).toBe(405);
    expect(kit.blob!.calls.put).toEqual([]);
  });

  it("geçerli yüklemede adı sunucu üretir; iki dosya yazılır; istemcinin adı yok sayılır", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const response = await upload(kit, cookie, { large: clean(), small: clean(), name: "../../etc/passwd", pathname: "x/y.webp", src: "https://baska.example/a.webp" });
    expect(response.status).toBe(200);
    expect(response.body.src).toMatch(new RegExp(`^https://${HOST.replaceAll(".", "\\.")}/blog/[0-9a-f]{32}-1600\\.webp$`));
    expect(response.body).toMatchObject({ width: 48, height: 36, remaining: 19 });
    expect(isBlogImageUrl(response.body.src, HOST)).toBe(true);
    expect(kit.blob!.paths()).toHaveLength(2);
    expect(kit.blob!.allPathsValid()).toBe(true);
    expect(kit.blob!.paths().map(path => path.replace(/[0-9a-f]{32}/, "ID"))).toEqual(["blog/ID-1600.webp", "blog/ID-800.webp"]);
    const second = await upload(kit, cookie);
    expect(second.body.src).not.toBe(response.body.src);
    expect(JSON.stringify(response.body)).not.toMatch(/TESTTOKEN|vercel_blob_rw/);
  });

  it("konum, XMP ve animasyon taşıyan yüklemeyi 422 ile reddeder; hiçbir şey yazılmaz ve sınırdan düşmez", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    for (const name of ["exif", "xmp", "animated"] as const) {
      const large = toBase64(FIXTURES[name]);
      const response = await upload(kit, cookie, { large, small: clean() });
      expect(response.status, name).toBe(422);
      expect(response.body.error).toBe("image_invalid");
      const swapped = await upload(kit, cookie, { large: clean(), small: large });
      expect(swapped.status, `${name} (küçük)`).toBe(422);
    }
    expect(kit.blob!.calls.put).toEqual([]);
    expect((await upload(kit, cookie)).body.remaining).toBe(19);
  });

  it("bozuk, eksik, çok büyük ya da boyutları tutarsız yüklemeyi reddeder", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const cases: Record<string, unknown>[] = [
      {}, { large: clean() }, { small: clean() }, { large: 5, small: clean() }, { large: "bozuk-base64!", small: clean() },
      { large: toBase64(new Uint8Array(100)), small: clean() },
      { large: toBase64(syntheticWebp(1600, 1200, 600 * 1024)), small: clean() },
      { large: toBase64(syntheticWebp(2000, 1500)), small: toBase64(syntheticWebp(800, 600)) },
      { large: toBase64(syntheticWebp(1600, 1200)), small: toBase64(syntheticWebp(500, 500)) },
    ];
    for (const body of cases) expect((await upload(kit, cookie, body)).status, JSON.stringify(body).slice(0, 60)).toBe(422);
    expect((await kit.call({ method: "POST", action: "image-upload", cookie })).status).toBe(422);
    expect(kit.blob!.calls.put).toEqual([]);
  });

  it("günlük yükleme sınırını (BLOB_DAILY_UPLOAD_LIMIT) uygular; ertesi gün sıfırlanır", async () => {
    const kit = await setup({ env: { BLOB_DAILY_UPLOAD_LIMIT: "2" } });
    const cookie = await kit.login();
    expect((await upload(kit, cookie)).status).toBe(200);
    expect((await upload(kit, cookie)).body.remaining).toBe(0);
    const blocked = await upload(kit, cookie);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe("image_daily_limit");
    expect(kit.blob!.paths()).toHaveLength(4);
    kit.clock.now += 24 * 60 * 60 * 1000;
    expect((await upload(kit, await kit.login())).status).toBe(200);
  });

  it("Blob tanımlı değilse ya da fotoğraf alanı ayarlı değilse 503 verir", async () => {
    const noBlob = await setup({ blob: null });
    expect((await upload(noBlob, await noBlob.login())).body.error).toBe("blob_not_configured");
    const noHost = await setup({ imageHost: "" });
    const response = await upload(noHost, await noHost.login());
    expect(response.status).toBe(503);
    expect(response.body.error).toBe("image_host_not_configured");
    expect(noHost.blob!.calls.put).toEqual([]);
  });

  it("ikinci dosya yazılamazsa ilki geri silinir; hata kimlik bilgisi sızdırmaz", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    kit.blob!.failPutAfter = 1;
    const response = await upload(kit, cookie);
    expect(response.status).toBe(502);
    expect(response.body.error).toBe("blob_unavailable");
    expect(kit.blob!.paths()).toEqual([]);
  });

  it("Blob hata türlerini anlaşılır durum kodlarıyla bildirir", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    kit.blob!.failNext.put = new BlobError("quota", "put");
    const quota = await upload(kit, cookie);
    expect([quota.status, quota.body.error]).toEqual([503, "blob_unavailable_quota"]);
    kit.blob!.failNext.put = new BlobError("auth", "put");
    const auth = await upload(kit, cookie);
    expect([auth.status, auth.body.error]).toEqual([502, "blob_auth_failed"]);
    kit.blob!.failNext.put = new BlobError("rate", "put");
    expect((await upload(kit, cookie)).body.error).toBe("blob_rate_limited");
  });

  it("Blob'un döndürdüğü adres ayarlı alandan değilse dosyalar silinir ve yükleme reddedilir", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    kit.blob!.returnHost = "baska-store.public.blob.vercel-storage.com";
    const response = await upload(kit, cookie);
    expect(response.status).toBe(502);
    expect(response.body.error).toBe("image_host_mismatch");
    expect(kit.blob!.calls.del.flat().every(url => url.startsWith("https://baska-store."))).toBe(true);
    expect(kit.blob!.calls.del.flat()).toHaveLength(2);
  });
});

describe("gövde boyutu sınırı (Node adaptörü)", () => {
  /** Gerçek `adminHandler`'ı sahte bir IncomingMessage ile çalıştırır; gövde 100 KB'lık parçalarla verilir, kaç parça okunduğu sayılır. */
  async function viaNode(kit: Kit, action: string, payload: string, cookie?: string) {
    const bytes = Buffer.from(payload);
    const chunk = 100 * 1024;
    let offset = 0;
    const stats = { pulled: 0 };
    const stream = new Readable({
      highWaterMark: 1,
      read() {
        if (offset >= bytes.length) return void this.push(null);
        stats.pulled++;
        this.push(bytes.subarray(offset, (offset += chunk)));
      },
    });
    const req = Object.assign(stream, { method: "POST", url: `/api/admin?action=${action}`, headers: { host: "esliteknik.com", "content-type": "application/json", "x-admin-request": "1", origin: "https://esliteknik.com", ...(cookie ? { cookie } : {}) }, socket: { remoteAddress: "203.0.113.9" } });
    let body = "";
    const res = { statusCode: 0, headers: {} as Record<string, string>, setHeader(name: string, value: string) { this.headers[name] = value; }, end(text?: string) { body = text ?? ""; } };
    await adminHandler(req as never, res as never, kit.deps);
    return { status: res.statusCode, body: body ? JSON.parse(body) : undefined, pulled: stats.pulled };
  }
  const json = (kilobytes: number) => JSON.stringify({ large: "A".repeat(kilobytes * 1024), small: "A".repeat(10) });

  it("oturumsuz istek yükseltilmiş sınırı alamaz: gövde 512 KB'ta kesilir, yanıt 401 olur", async () => {
    const kit = await setup();
    const response = await viaNode(kit, "image-upload", json(1000));
    expect(response.status).toBe(401);
    expect(response.pulled).toBeLessThanOrEqual(7);
    expect((await viaNode(kit, "image-upload", json(1000), "esli_admin=sahte.belirtec")).pulled).toBeLessThanOrEqual(7);
  });

  it("diğer eylemlerin sınırı oturumlu olsa da 512 KB kalır", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const response = await viaNode(kit, "save", json(1000), cookie);
    expect(response.status).toBe(413);
    expect(response.pulled).toBeLessThanOrEqual(7);
    expect((await viaNode(kit, "login", json(1000))).status).toBe(413);
  });

  it("oturumlu image-upload yükseltilmiş sınırı kullanır ama onun da üstü kesilir", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const accepted = await viaNode(kit, "image-upload", json(1000), cookie);
    expect(accepted.status).toBe(422); // gövde baştan sona okundu; içerik WebP olmadığı için reddedildi
    expect(accepted.pulled).toBeGreaterThanOrEqual(10);
    const tooBig = await viaNode(kit, "image-upload", json(1500), cookie);
    expect(tooBig.status).toBe(413);
    expect(tooBig.pulled).toBeLessThanOrEqual(14);
    expect(kit.blob!.calls.put).toEqual([]);
  });
});

describe("yazıda fotoğraf: kaydetme", () => {
  it("yüklenen fotoğraflı yazı kaydedilir, dosyada kapak alanı sıralı yazılır ve listede geri okunur", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const cover = await uploaded(kit, cookie, "Kapak fotoğrafı");
    const inner = await uploaded(kit, cookie, "Pompa filtresi");
    const response = await save(kit, cookie, newPost({ cover, blocks: [{ type: "p", text: "Giriş." }, { type: "image", ...inner }, { type: "p", text: "Son." }] }));
    expect(response.status).toBe(200);
    const file = kit.repo.file("content/blog/foto-deneme-yazisi.json")!;
    const parsed = JSON.parse(file);
    expect(Object.keys(parsed).indexOf("cover")).toBe(Object.keys(parsed).indexOf("excerpt") + 1);
    expect(Object.keys(parsed.cover)).toEqual(["src", "alt", "width", "height"]);
    expect(parsed.blocks[1]).toEqual({ type: "image", ...inner });
    const list = await kit.call({ action: "posts", cookie });
    expect(list.body.items.find((item: any) => item.post.slug === "/blog/foto-deneme-yazisi/").post.cover.src).toBe(cover.src);
  });

  it("başka alandan adres, alt metinsiz fotoğraf ve 11. fotoğraf 422 verir; hiçbir şey yazılmaz", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const before = kit.repo.head;
    const good = await uploaded(kit, cookie);
    const bads = [
      newPost({ cover: { ...good, src: `https://baska.example/blog/${ID}-1600.webp` } }),
      newPost({ cover: { ...good, alt: "" } }),
      newPost({ blocks: [{ type: "p", text: "x" }, { type: "image", ...good, src: `${good.src}?v=1` }] }),
      newPost({ blocks: [{ type: "p", text: "x" }, ...Array.from({ length: 11 }, () => ({ type: "image", ...good }))] }),
    ];
    for (const post of bads) expect((await save(kit, cookie, post)).status).toBe(422);
    expect(kit.repo.head).toBe(before);
  });

  it("fotoğrafsız mevcut yazıların dosyaları ve üretilen dosyalar kaydetmeyle değişmez", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const before = kit.repo.headFiles();
    expect((await save(kit, cookie, newPost())).status).toBe(200);
    const after = kit.repo.headFiles();
    for (const [path, content] of before) if (path.startsWith("content/blog/")) expect(after.get(path), path).toBe(content);
  });
});

describe("yazı silinince fotoğrafları da silinir", () => {
  async function twoPosts(kit: Kit, cookie: string) {
    const cover = await uploaded(kit, cookie, "Kapak");
    const inner = await uploaded(kit, cookie, "İç fotoğraf");
    const shared = await uploaded(kit, cookie, "Ortak fotoğraf");
    expect((await save(kit, cookie, newPost({ cover, blocks: [{ type: "p", text: "x" }, { type: "image", ...inner }, { type: "image", ...shared }] }))).status).toBe(200);
    expect((await save(kit, cookie, newPost({ slug: "/blog/foto-ikinci-yazi/", title: "İkinci fotoğraflı deneme yazısı: ortak fotoğraf", description: "İkinci deneme yazısının, ortak bir fotoğrafı kullanan ve arama sonuçlarında görünecek açıklaması burada yer alır, 90 ile 160 karakter arası.", excerpt: "İkinci deneme yazısı.", blocks: [{ type: "p", text: "y" }, { type: "image", ...shared }] }))).status).toBe(200);
    return { cover, inner, shared };
  }

  it("canlı (main) dalda yazının yalnızca başka yazıların kullanmadığı fotoğrafları silinir", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const { cover, inner, shared } = await twoPosts(kit, cookie);
    expect(kit.blob!.paths()).toHaveLength(6);
    const response = await remove(kit, cookie, "/blog/foto-deneme-yazisi/");
    expect(response.status).toBe(200);
    expect(response.body.imagesDeleted).toBe(4);
    const left = kit.blob!.paths();
    expect(left).toEqual([`blog/${blogImageId(shared.src)}-1600.webp`, `blog/${blogImageId(shared.src)}-800.webp`].sort());
    expect(left.some(path => path.includes(blogImageId(cover.src)!) || path.includes(blogImageId(inner.src)!))).toBe(false);
    expect(kit.repo.file("content/blog/foto-deneme-yazisi.json")).toBeUndefined();
    const last = await remove(kit, cookie, "/blog/foto-ikinci-yazi/");
    expect(last.body.imagesDeleted).toBe(2);
    expect(kit.blob!.paths()).toEqual([]);
  });

  it("silme gruplar hâlinde ve aralıklı yapılır (saniyede 15 işlem sınırı)", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const images = [];
    for (let index = 0; index < 8; index++) images.push(await uploaded(kit, cookie, `Fotoğraf ${index}`));
    expect((await save(kit, cookie, newPost({ blocks: [{ type: "p", text: "x" }, ...images.map(item => ({ type: "image", ...item }))] }))).status).toBe(200);
    kit.sleeps.length = 0;
    const response = await remove(kit, cookie, "/blog/foto-deneme-yazisi/");
    expect(response.body.imagesDeleted).toBe(16);
    expect(kit.blob!.calls.del.map(group => group.length)).toEqual([10, 6]);
    expect(kit.sleeps).toEqual([700]);
    expect(kit.blob!.paths()).toEqual([]);
  });

  it("önizleme dalında fotoğraflar silinmez (canlıyla aynı depo paylaşılır)", async () => {
    const kit = await setup({ branch: "feat/deneme" });
    const cookie = await kit.login();
    const cover = await uploaded(kit, cookie);
    await save(kit, cookie, newPost({ cover }));
    const response = await remove(kit, cookie, "/blog/foto-deneme-yazisi/");
    expect(response.status).toBe(200);
    expect(response.body.imagesNote).toBe("kept_preview");
    expect(response.body.imagesDeleted).toBeUndefined();
    expect(kit.blob!.paths()).toHaveLength(2);
    expect(kit.blob!.calls.del).toEqual([]);
  });

  it("silme hata verirse yazı yine silinir ve durum bildirilir (kalanlar 'temizle' ile alınır)", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const cover = await uploaded(kit, cookie);
    await save(kit, cookie, newPost({ cover }));
    kit.blob!.failNext.del = new BlobError("unavailable", "del");
    const response = await remove(kit, cookie, "/blog/foto-deneme-yazisi/");
    expect(response.status).toBe(200);
    expect(response.body.imagesNote).toBe("failed");
    expect(kit.repo.file("content/blog/foto-deneme-yazisi.json")).toBeUndefined();
    expect(kit.blob!.paths()).toHaveLength(2);
  });

  it("Blob tanımsızsa yazı yine silinir ve 'not_configured' bildirilir", async () => {
    const bare = await setup({ blob: null, files: manualDraftFiles() });
    const cookie = await bare.login();
    const response = await remove(bare, cookie, "/blog/foto-elle-eklendi/");
    expect(response.status).toBe(200);
    expect(response.body.imagesNote).toBe("not_configured");
    expect(bare.repo.file("content/blog/foto-elle-eklendi.json")).toBeUndefined();
  });

  it("fotoğrafsız yazının silinmesi Blob'a hiç dokunmaz", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    await save(kit, cookie, newPost());
    const response = await remove(kit, cookie, "/blog/foto-deneme-yazisi/");
    expect(response.status).toBe(200);
    expect(response.body.imagesDeleted).toBeUndefined();
    expect(response.body.imagesNote).toBeUndefined();
    expect(kit.blob!.calls).toEqual({ put: [], del: [], list: 0 });
  });
});

describe("kullanım göstergesi ve kullanılmayan fotoğrafları temizleme", () => {
  const OLD = UNREFERENCED_GRACE_MS + 60_000;

  it("kullanımı ve kullanılmayan fotoğrafları sayar; 24 saatten yeni olan 'kullanılıyor' sayılır", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const cover = await uploaded(kit, cookie);
    await save(kit, cookie, newPost({ cover }));
    kit.blob!.seed(hexId(10), { ageMs: OLD, sizes: [1000, 400] });
    kit.blob!.seed(hexId(11), { ageMs: 60 * 60 * 1000, sizes: [2000, 800] });
    kit.blob!.objects.set(`https://${HOST}/blog/notlar.txt`, { url: `https://${HOST}/blog/notlar.txt`, pathname: "blog/notlar.txt", size: 77, uploadedAt: 0, bytes: new Uint8Array(77) });
    const response = await kit.call({ action: "image-usage", cookie });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ imageCount: 3, referencedImages: 1, unreferencedImages: 1, unreferencedBytes: 1400, truncated: false, contentProblems: 0, canCleanup: true, limitBytes: 1024 ** 3, graceHours: 24 });
    expect(response.body.storageBytes).toBe([...kit.blob!.objects.values()].reduce((sum, object) => sum + object.size, 0));
    expect(kit.blob!.calls.list).toBe(1);
  });

  it("temizlik onay ister; yalnızca kullanılmayan ve eski panel dosyalarını siler", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    const cover = await uploaded(kit, cookie);
    await save(kit, cookie, newPost({ cover }));
    const old = kit.blob!.seed(hexId(10), { ageMs: OLD });
    kit.blob!.seed(hexId(11), { ageMs: 60 * 60 * 1000 });
    kit.blob!.objects.set(`https://${HOST}/blog/notlar.txt`, { url: `https://${HOST}/blog/notlar.txt`, pathname: "blog/notlar.txt", size: 5, uploadedAt: 0, bytes: new Uint8Array(5) });
    const before = kit.blob!.paths();
    expect((await kit.call({ method: "POST", action: "image-cleanup", cookie, body: {} })).body.error).toBe("confirm_required");
    expect(kit.blob!.paths()).toEqual(before);
    const response = await kit.call({ method: "POST", action: "image-cleanup", cookie, body: { confirm: true } });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ deletedFiles: 2, freedBytes: 1400, remainingImages: 0 });
    expect(kit.blob!.objects.has(old.large)).toBe(false);
    expect(kit.blob!.objects.has(old.small)).toBe(false);
    expect(kit.blob!.paths()).toEqual([...before.filter(path => !path.includes(hexId(10)))]);
    expect(kit.blob!.paths()).toContain("blog/notlar.txt");
    expect(kit.blob!.paths()).toContain(`blog/${hexId(11)}-1600.webp`);
    expect(kit.blob!.paths()).toContain(`blog/${blogImageId(cover.src)}-1600.webp`);
  });

  it("önizleme dalında temizlik reddedilir ve hiçbir şey silinmez", async () => {
    const kit = await setup({ branch: "feat/deneme" });
    const cookie = await kit.login();
    kit.blob!.seed(hexId(10), { ageMs: OLD });
    expect((await kit.call({ action: "image-usage", cookie })).body.canCleanup).toBe(false);
    const response = await kit.call({ method: "POST", action: "image-cleanup", cookie, body: { confirm: true } });
    expect(response.status).toBe(422);
    expect(response.body.error).toBe("cleanup_production_only");
    expect(kit.blob!.calls.del).toEqual([]);
    expect(kit.blob!.paths()).toHaveLength(2);
  });

  it("okunamayan bir yazı dosyası varsa temizlik reddedilir (onun fotoğrafları 'kullanılmıyor' görünebilir)", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    kit.blob!.seed(hexId(10), { ageMs: OLD });
    kit.repo.externalCommit({ "content/blog/bozuk-yazi.json": "{ bozuk" });
    const usage = await kit.call({ action: "image-usage", cookie });
    expect(usage.body.contentProblems).toBe(1);
    const response = await kit.call({ method: "POST", action: "image-cleanup", cookie, body: { confirm: true } });
    expect(response.status).toBe(422);
    expect(response.body.error).toBe("content_invalid");
    expect(kit.blob!.calls.del).toEqual([]);
  });

  it("taslaktaki yazının fotoğrafı da 'kullanılıyor' sayılır", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    kit.blob!.clock -= OLD; // fotoğraf 24 saatten eski görünsün
    const cover = await uploaded(kit, cookie);
    const draft = await kit.call({ method: "POST", action: "save", cookie, body: { mode: "draft", post: newPost({ cover }) } });
    expect(draft.status).toBe(200);
    const response = await kit.call({ method: "POST", action: "image-cleanup", cookie, body: { confirm: true } });
    expect(response.body.deletedFiles).toBe(0);
    expect(kit.blob!.paths()).toHaveLength(2);
  });

  it("bir istekte en çok 40 dosya siler ve kalanı bildirir; silme gruplar hâlinde yapılır", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    for (let index = 0; index < 30; index++) kit.blob!.seed(hexId(100 + index), { ageMs: OLD });
    const usage = await kit.call({ action: "image-usage", cookie });
    expect(usage.body.unreferencedImages).toBe(30);
    kit.sleeps.length = 0;
    const response = await kit.call({ method: "POST", action: "image-cleanup", cookie, body: { confirm: true } });
    expect(response.body).toMatchObject({ deletedFiles: 40, remainingImages: 10 });
    expect(kit.blob!.paths()).toHaveLength(20);
    expect(kit.blob!.calls.del.every(group => group.length <= 10)).toBe(true);
    expect(kit.sleeps.filter(ms => ms === 700)).toHaveLength(3);
    const again = await kit.call({ method: "POST", action: "image-cleanup", cookie, body: { confirm: true } });
    expect(again.body).toMatchObject({ deletedFiles: 20, remainingImages: 0 });
    expect(kit.blob!.paths()).toEqual([]);
  });

  it("liste eksik okunduysa (çok dosya) hiçbir şey silinmez", async () => {
    const kit = await setup();
    const cookie = await kit.login();
    for (let index = 0; index < 2600; index++) kit.blob!.seed(hexId(1000 + index), { ageMs: OLD });
    const usage = await kit.call({ action: "image-usage", cookie });
    expect(usage.body.truncated).toBe(true);
    const response = await kit.call({ method: "POST", action: "image-cleanup", cookie, body: { confirm: true } });
    expect(response.status).toBe(409);
    expect(response.body.error).toBe("listing_incomplete");
    expect(kit.blob!.calls.del).toEqual([]);
  });

  it("Blob tanımsızsa kullanım ve temizlik 503 verir", async () => {
    const kit = await setup({ blob: null });
    const cookie = await kit.login();
    expect((await kit.call({ action: "image-usage", cookie })).status).toBe(503);
    expect((await kit.call({ method: "POST", action: "image-cleanup", cookie, body: { confirm: true } })).status).toBe(503);
  });
});

describe("kaynak metin denetimleri", () => {
  it("Blob anahtarı VITE_ önekiyle kullanılmaz; istemci koduna ve yanıtlara girmez", () => {
    const files = ["server/admin/blob.ts", "server/admin/imageStore.ts", "server/admin/images.ts", "server/admin/handler.ts", "server/admin/service.ts"];
    files.forEach(path => expect(read(path), path).not.toMatch(/VITE_BLOB|VITE_.*BLOB/));
    const client = readdirSync(resolve(projectRoot, "client/src/admin")).map(name => read(`client/src/admin/${name}`)).join("\n");
    expect(client).not.toMatch(/BLOB_READ_WRITE_TOKEN|VERCEL_OIDC_TOKEN|@vercel\/blob/);
    expect(read("server/admin/blob.ts")).not.toMatch(/console\.\w+\([^)]*(token|env\.)/i);
  });

  it("silme yalnızca panelin yazdığı ad kalıbına uyan yollara uygulanır ve yeni fonksiyon açılmaz", () => {
    expect(read("server/admin/imageStore.ts")).toContain("blobPathImageId(object.pathname)");
    const vercel = JSON.parse(read("vercel.json"));
    expect(Object.keys(vercel.functions ?? {}).filter(path => /admin|image|blob/i.test(path))).toEqual(["api/admin.ts"].filter(path => path in (vercel.functions ?? {})));
    expect(readdirSync(resolve(projectRoot, "api")).filter(name => /image|blob|upload/i.test(name))).toEqual([]);
  });

  it("yükseltilmiş gövde sınırı yalnızca oturum doğrulandıktan sonra ve yalnızca image-upload için uygulanır", () => {
    const source = read("server/admin/handler.ts");
    expect(source).toContain('"image-upload"');
    expect(source.indexOf("verifySessionToken(readCookie(req.headers.cookie, SESSION_COOKIE), key, deps.now())")).toBeGreaterThan(source.indexOf("IMAGE_BODY_MAX_BYTES = "));
  });
});

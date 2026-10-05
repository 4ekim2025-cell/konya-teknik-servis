import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderAdminShell } from "../../shared/admin-shell";
import { BLOG_SLUGS_LINKED_FROM_CODE } from "../../shared/blog-protected";
import { parseRedirects, redirectPageHtml, removeRedirectFrom, renderRedirectsFile, upsertRedirect, validateRedirectsAgainstPosts } from "../../shared/blog-redirects";

const root = resolve(import.meta.dirname, "..", "..");
const read = (file: string) => readFileSync(join(root, file), "utf8");

describe("panel: arama motoru kuralları", () => {
  it("robots.txt paneli ve API'sini engeller, mevcut Allow ve Sitemap satırlarını korur", () => {
    const robots = read("client/public/robots.txt");
    expect(robots).toContain("Allow: /\n");
    expect(robots).toContain("Disallow: /yonetim/");
    expect(robots).toContain("Disallow: /api/admin");
    expect(robots).toContain("Sitemap: https://esliteknik.com/sitemap.xml");
  });

  it("sitemap.xml ve llms.txt panele hiç değinmez", () => {
    expect(read("client/public/sitemap.xml")).not.toContain("yonetim");
    expect(read("client/public/llms.txt")).not.toContain("yonetim");
  });

  it("vercel.json panel ve API için noindex ve önbellek yasağı başlığı verir", () => {
    const config = JSON.parse(read("vercel.json"));
    for (const source of ["/yonetim/(.*)", "/api/admin(.*)"]) {
      const rule = config.headers.find((item: { source: string }) => item.source === source);
      expect(rule, source).toBeDefined();
      const values = Object.fromEntries(rule.headers.map((header: { key: string; value: string }) => [header.key, header.value]));
      expect(values["X-Robots-Tag"]).toContain("noindex");
      expect(values["Cache-Control"]).toBe("no-store");
    }
    expect(config.ignoreCommand).toBe("bash scripts/vercel-ignore-build.sh");
  });

  it("panel kabuğu noindex'tir; canonical, açıklama, paylaşım etiketi ve JSON-LD taşımaz", () => {
    const html = renderAdminShell(read("client/index.html"));
    expect(html).toContain('<meta name="robots" content="noindex,nofollow,noarchive" />');
    expect(html).toContain("<title>Yönetim</title>");
    for (const gone of ['rel="canonical"', 'name="description"', "og:", "twitter:", "application/ld+json", 'rel="preload" as="image"']) expect(html, gone).not.toContain(gone);
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('src="/src/main.tsx"');
  });

  it("sır değişkenleri VITE_ önekiyle kullanılmaz", () => {
    for (const file of [".env.example", "server/admin/handler.ts", "server/admin/github.ts", "server/admin/ai.ts", "server/admin/google.ts", "shared/blog-social.ts"]) expect(read(file), file).not.toMatch(/VITE_(ADMIN|GITHUB|GEMINI|GROQ|AI|GOOGLE)/);
    expect(read(".env.example")).toContain("ADMIN_PASSWORD_HASH=");
    expect(read(".env.example")).toContain("GITHUB_CONTENT_TOKEN=");
    for (const name of ["GOOGLE_CLIENT_ID=", "GOOGLE_CLIENT_SECRET=", "GOOGLE_REFRESH_TOKEN="]) expect(read(".env.example")).toContain(name);
  });
});

describe("vercel-ignore-build.sh", () => {
  const script = join(root, "scripts/vercel-ignore-build.sh");
  const git = (cwd: string, ...args: string[]) => execFileSync("git", ["-c", "user.name=test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args], { cwd, stdio: "pipe" }).toString().trim();
  /** Geçici depo: her adım bir dosyayı değiştirip commit eder; commit kimliklerini döndürür. */
  const repoWith = (steps: string[]) => {
    const dir = mkdtempSync(join(tmpdir(), "ignore-"));
    git(dir, "init", "-q");
    const shas = steps.map((file, index) => {
      mkdirSync(join(dir, dirname(file)), { recursive: true });
      writeFileSync(join(dir, file), `${index}\n`);
      git(dir, "add", "-A");
      git(dir, "commit", "-q", "-m", `adım ${index}`);
      return git(dir, "rev-parse", "HEAD");
    });
    return { dir, shas };
  };
  const run = (cwd: string, message?: string, previous?: string) => {
    try {
      execFileSync("bash", [script], { cwd, env: { PATH: process.env.PATH ?? "", ...(message === undefined ? {} : { VERCEL_GIT_COMMIT_MESSAGE: message }), ...(previous === undefined ? {} : { VERCEL_GIT_PREVIOUS_SHA: previous }) }, stdio: "pipe" });
      return 0;
    } catch (error) {
      return (error as { status: number }).status;
    }
  };
  const DRAFT = "content: taslak kaydedildi — Deneme [panel-taslak]";

  it("işaretli commit yalnızca content/blog değiştiyse build'i atlar (0); işaretsiz her commit build edilir (1)", () => {
    const { dir, shas } = repoWith(["shared/x.ts", "content/blog/a.json", "content/blog/b.json"]);
    try {
      expect(run(dir, DRAFT)).toBe(0);
      expect(run(dir, DRAFT, shas[0])).toBe(0);
      expect(run(dir, "content: yayınlandı — Deneme")).toBe(1);
      expect(run(dir, "feat: yeni özellik")).toBe(1);
      expect(run(dir, "")).toBe(1);
      expect(run(dir, undefined)).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("[panel-paylasim] commit'i yalnızca content/social ve content/settings.json değiştiyse build'i atlar; site dosyası ya da yönlendirme varsa atlamaz", () => {
    const SHARE = "content: paylaşım paketi kaydedildi — Deneme [panel-paylasim]";
    const social = repoWith(["shared/x.ts", "content/social/a.json", "content/settings.json", "content/blog/a.json"]);
    try {
      expect(run(social.dir, SHARE)).toBe(0);
      expect(run(social.dir, SHARE, social.shas[0])).toBe(0);
      expect(run(social.dir, "content: paylaşım paketi kaydedildi — Deneme")).toBe(1);
    } finally {
      rmSync(social.dir, { recursive: true, force: true });
    }
    const site = repoWith(["content/social/a.json", "shared/x.ts", "content/social/b.json"]);
    try {
      expect(run(site.dir, SHARE, site.shas[0])).toBe(1);
      expect(run(site.dir, SHARE, site.shas[1])).toBe(0);
    } finally {
      rmSync(site.dir, { recursive: true, force: true });
    }
    const redirects = repoWith(["shared/x.ts", "content/redirects.json", "content/social/a.json"]);
    try {
      expect(run(redirects.dir, SHARE, redirects.shas[0])).toBe(1);
    } finally {
      rmSync(redirects.dir, { recursive: true, force: true });
    }
  });

  it("son yayından beri site dosyası değiştiyse taslak işareti build'i atlatamaz; karşılaştırma yapılamazsa build edilir", () => {
    const { dir, shas } = repoWith(["shared/x.ts", "client/public/sitemap.xml", "content/blog/a.json"]);
    try {
      expect(run(dir, DRAFT, shas[0])).toBe(1);
      expect(run(dir, DRAFT, shas[1])).toBe(0);
      expect(run(dir, DRAFT, "0000000000000000000000000000000000000000")).toBe(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    const single = repoWith(["content/blog/a.json"]);
    try {
      expect(run(single.dir, DRAFT)).toBe(1);
    } finally {
      rmSync(single.dir, { recursive: true, force: true });
    }
    const redirects = repoWith(["shared/x.ts", "content/redirects.json"]);
    try {
      expect(run(redirects.dir, DRAFT)).toBe(1);
    } finally {
      rmSync(redirects.dir, { recursive: true, force: true });
    }
  });
});

describe("yönlendirmeler", () => {
  const entry = { from: "/blog/eski-yazi/", to: "/regal-servisi-konya/", date: "2026-10-02" };

  it("geçerli kaydı okur, bozuk kaydı hatayla bildirir", () => {
    expect(parseRedirects([entry]).errors).toEqual([]);
    expect(parseRedirects(undefined).redirects).toEqual([]);
    expect(parseRedirects({}).errors.length).toBeGreaterThan(0);
    expect(parseRedirects([{ ...entry, to: "https://baska-site.example/" }]).errors.length).toBeGreaterThan(0);
    expect(parseRedirects([{ ...entry, from: "/ana-sayfa/" }]).errors.length).toBeGreaterThan(0);
    expect(parseRedirects([entry, entry]).errors.length).toBeGreaterThan(0);
  });

  it("yayındaki bir yazının adresi yönlendirme kaynağı olamaz", () => {
    expect(validateRedirectsAgainstPosts([entry], ["/blog/eski-yazi/"]).length).toBeGreaterThan(0);
    expect(validateRedirectsAgainstPosts([entry], ["/blog/baska/"])).toEqual([]);
  });

  it("ekleme aynı adresi günceller, çıkarma kaydı siler, dosya sabit biçimde yazılır", () => {
    const list = upsertRedirect([entry], { ...entry, to: "/blog/" });
    expect(list).toHaveLength(1);
    expect(list[0].to).toBe("/blog/");
    expect(removeRedirectFrom(list, entry.from)).toEqual([]);
    expect(renderRedirectsFile([entry]).endsWith("\n")).toBe(true);
    expect(JSON.parse(renderRedirectsFile([entry]))).toEqual([entry]);
  });

  it("yönlendirme sayfası anında yönlendirir, canonical hedeftir ve metni bağlantıyla verir", () => {
    const html = redirectPageHtml("/regal-servisi-konya/", "https://esliteknik.com");
    expect(html).toContain('<link rel="canonical" href="https://esliteknik.com/regal-servisi-konya/" />');
    expect(html).toContain('http-equiv="refresh" content="0; url=https://esliteknik.com/regal-servisi-konya/"');
    expect(html).toContain('href="https://esliteknik.com/regal-servisi-konya/"');
  });
});

describe("koruma: koddan bağlantı verilen yazılar", () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap(name => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return name === "admin" ? [] : walk(path);
      return /\.(tsx?|html)$/.test(name) && !/\.test\./.test(name) ? [path] : [];
    });

  it("istemci kodundaki her sabit blog adresi korunan listede yer alır", () => {
    const found = new Set<string>();
    for (const file of walk(join(root, "client/src"))) for (const match of readFileSync(file, "utf8").matchAll(/\/blog\/[a-z0-9-]+\//g)) found.add(match[0]);
    const unprotected = [...found].filter(slug => !BLOG_SLUGS_LINKED_FROM_CODE.includes(slug));
    expect(unprotected).toEqual([]);
  });
});

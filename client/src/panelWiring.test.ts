import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
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
    for (const file of [".env.example", "server/admin/handler.ts", "server/admin/github.ts"]) expect(read(file), file).not.toMatch(/VITE_(ADMIN|GITHUB)/);
    expect(read(".env.example")).toContain("ADMIN_PASSWORD_HASH=");
    expect(read(".env.example")).toContain("GITHUB_CONTENT_TOKEN=");
  });
});

describe("vercel-ignore-build.sh", () => {
  const run = (message?: string) => {
    try {
      execFileSync("bash", [join(root, "scripts/vercel-ignore-build.sh")], { env: { PATH: process.env.PATH ?? "", ...(message === undefined ? {} : { VERCEL_GIT_COMMIT_MESSAGE: message }) }, stdio: "pipe" });
      return 0;
    } catch (error) {
      return (error as { status: number }).status;
    }
  };
  it("yalnızca panel taslağı commit'inde build'i atlar (0), diğer her durumda build eder (1)", () => {
    expect(run("content: taslak kaydedildi — Deneme [panel-taslak]")).toBe(0);
    expect(run("content: yayınlandı — Deneme")).toBe(1);
    expect(run("feat: yeni özellik")).toBe(1);
    expect(run("")).toBe(1);
    expect(run(undefined)).toBe(1);
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

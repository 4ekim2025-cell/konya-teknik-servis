import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { INDEXNOW_KEY, SITE_HOST, buildPayload, extractSitemapUrls, shouldSubmit } from "../../scripts/indexnow";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const sitemap = readFileSync(resolve(projectRoot, "client", "public", "sitemap.xml"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8")) as { scripts: Record<string, string> };

describe("IndexNow bildirimi", () => {
  it("doğrulama anahtar dosyasını sitenin kökünde anahtarın kendisiyle yayınlar", () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
    const keyFile = readFileSync(resolve(projectRoot, "client", "public", `${INDEXNOW_KEY}.txt`), "utf8");
    expect(keyFile.trim()).toBe(INDEXNOW_KEY);
  });

  it("yalnızca Vercel üretim build'inde bildirim gönderir", () => {
    expect(shouldSubmit({ VERCEL_ENV: "production" })).toBe(true);
    expect(shouldSubmit({ VERCEL_ENV: "preview" })).toBe(false);
    expect(shouldSubmit({})).toBe(false);
    expect(shouldSubmit({ INDEXNOW_FORCE: "1" })).toBe(true);
  });

  it("sitemap'teki tüm üretim URL'lerini tekrarsız gönderir", () => {
    const urls = extractSitemapUrls(sitemap);
    expect(urls.length).toBe((sitemap.match(/<loc>/g) ?? []).length);
    expect(new Set(urls).size).toBe(urls.length);
    urls.forEach(url => expect(url.startsWith(`https://${SITE_HOST}/`)).toBe(true));
    expect(extractSitemapUrls("<loc>https://baska-site.com/</loc>")).toEqual([]);
  });

  it("anahtar konumunu üretim alan adında belirtir", () => {
    expect(buildPayload(["https://esliteknik.com/"])).toEqual({
      host: "esliteknik.com",
      key: INDEXNOW_KEY,
      keyLocation: `https://esliteknik.com/${INDEXNOW_KEY}.txt`,
      urlList: ["https://esliteknik.com/"],
    });
  });

  it("build sonunda, prerender'dan sonra çalışır", () => {
    const build = packageJson.scripts.build;
    expect(build).toContain("tsx scripts/indexnow.ts");
    expect(build.indexOf("scripts/prerender.ts")).toBeLessThan(build.indexOf("scripts/indexnow.ts"));
  });
});

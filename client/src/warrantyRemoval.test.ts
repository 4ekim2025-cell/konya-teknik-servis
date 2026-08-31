import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const contentPage = readFileSync(
  resolve(projectRoot, "client", "src", "pages", "ContentPage.tsx"),
  "utf8",
);
const siteChrome = readFileSync(
  resolve(projectRoot, "client", "src", "components", "SiteChrome.tsx"),
  "utf8",
);
const sitemap = readFileSync(resolve(projectRoot, "client", "public", "sitemap.xml"), "utf8");
const vercelConfig = readFileSync(resolve(projectRoot, "vercel.json"), "utf8");

describe("Garanti ve Koşullar sayfasının kaldırılması", () => {
  it("uygulama ve footer içinde kaldırılan URL'ye yönlendirme bırakmaz", () => {
    expect(contentPage).not.toContain('path==="/garanti-kosullari/"');
    expect(siteChrome).not.toContain('href="/garanti-kosullari/"');
  });

  it("Vercel SPA listesi ve sitemap içinde kaldırılan URL'yi yayımlamaz", () => {
    expect(vercelConfig).not.toContain("garanti-kosullari");
    expect(sitemap).not.toContain("garanti-kosullari");
  });
});

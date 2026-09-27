import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

describe("sayfa hızı düzenlemeleri", () => {
  it("logolar WebP olarak yüklenir", () => {
    expect(existsSync(resolve(projectRoot, "client/public/assets/KLXoIeMTHIbByoPV.webp"))).toBe(true);
    expect(existsSync(resolve(projectRoot, "client/public/assets/whKXPqVCkcFXVkjz.webp"))).toBe(true);
    expect(read("client/src/index.css")).toContain('url("/assets/KLXoIeMTHIbByoPV.webp")');
    expect(read("client/src/pages/Home.tsx")).toContain('src="/assets/whKXPqVCkcFXVkjz.webp"');
  });

  it("Google Fonts sayfa çizimini engellemez ve Instagram görseli geç yüklenir", () => {
    const html = read("client/index.html");
    expect(html).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />');
    expect(html).toContain(`onload="this.onload=null;this.rel='stylesheet'"`);
    expect(html).toContain("<noscript><link href=\"https://fonts.googleapis.com/css2?");
    expect(read("client/src/pages/Home.tsx")).toContain('width={800} height={800} loading="lazy" decoding="async" />');
  });

  it("ana sayfa görselini telefonda küçük sürümüyle yükler", () => {
    const srcset = "/esli-teknik-konya-hero-background-800.webp 800w, /esli-teknik-konya-hero-background.webp 1600w";
    expect(existsSync(resolve(projectRoot, "client/public/esli-teknik-konya-hero-background-800.webp"))).toBe(true);
    expect(read("client/src/pages/Home.tsx")).toContain(`srcSet="${srcset}" sizes="100vw"`);
    expect(read("scripts/prerender.ts")).toContain(`srcset="${srcset}" sizes="100vw"`);
    expect(read("client/index.html")).toContain(`imagesrcset="${srcset}" imagesizes="100vw"`);
  });
});

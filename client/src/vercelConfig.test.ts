import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

type RouteRule = {
  handle?: string;
  src?: string;
  dest?: string;
  status?: number;
};

type VercelConfig = {
  framework: string;
  installCommand: string;
  buildCommand: string;
  outputDirectory: string;
  trailingSlash: boolean;
  headers: HeaderRule[];
  routes: RouteRule[];
};

const config = JSON.parse(
  readFileSync(resolve(import.meta.dirname, "..", "..", "vercel.json"), "utf8"),
) as VercelConfig;

describe("Vercel statik SPA yapılandırması", () => {
  it("Vite çıktısını Vercel'in yayınlayacağı dizine üretir", () => {
    expect(config.framework).toBe("vite");
    expect(config.installCommand).toBe("pnpm install --frozen-lockfile");
    expect(config.buildCommand).toBe("pnpm build");
    expect(config.outputDirectory).toBe("dist/public");
    expect(config.trailingSlash).toBe(true);
  });

  it("prerender edilmiş statik dosyaları korur ve özel 404 yanıtını tanımlar", () => {
    expect(config.routes[0]).toEqual({ handle: "filesystem" });
    expect(config.routes.some(route => route.dest === "/index.html")).toBe(false);
    expect(config.routes).toContainEqual({ src: "/(.*)", status: 404, dest: "/404.html" });
  });

  it("değişmez asset önbelleği ve temel güvenlik başlıklarını içerir", () => {
    const assetRule = config.headers.find(rule => rule.source === "/assets/(.*)");
    const siteRule = config.headers.find(rule => rule.source === "/(.*)");

    expect(assetRule?.headers).toContainEqual({
      key: "Cache-Control",
      value: "public, max-age=31536000, immutable",
    });
    expect(siteRule?.headers.map(header => header.key)).toEqual(
      expect.arrayContaining(["X-Content-Type-Options", "Referrer-Policy", "X-Frame-Options"]),
    );
  });
});

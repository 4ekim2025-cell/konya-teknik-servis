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
  readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"),
) as VercelConfig;

describe("Vercel static SPA configuration", () => {
  it("builds the Vite site to the deployed static output directory", () => {
    expect(config.framework).toBe("vite");
    expect(config.installCommand).toBe("pnpm install --frozen-lockfile");
    expect(config.buildCommand).toBe("pnpm build");
    expect(config.outputDirectory).toBe("dist/public");
    expect(config.trailingSlash).toBe(true);
  });

  it("preserves static files, serves known SPA URLs, and keeps an explicit 404 response", () => {
    expect(config.routes[0]).toEqual({ handle: "filesystem" });
    expect(config.routes.some(route => route.dest === "/index.html")).toBe(true);
    expect(config.routes).toContainEqual({ src: "/(.*)", status: 404, dest: "/404.html" });
  });

  it("defines immutable asset caching and baseline response headers", () => {
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

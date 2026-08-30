import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const html = readFileSync(resolve(projectRoot, "client", "index.html"), "utf8");

describe("favicon yapılandırması", () => {
  it("yayınlanan favicon dosyasını ve tarayıcı bildirimlerini içerir", () => {
    expect(existsSync(resolve(projectRoot, "client", "public", "favicon.png"))).toBe(true);
    expect(html).toContain('rel="icon" type="image/png" sizes="512x512" href="/favicon.png"');
    expect(html).toContain('rel="apple-touch-icon" sizes="512x512" href="/favicon.png"');
  });
});

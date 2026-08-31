import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const styles = readFileSync(resolve(projectRoot, "client", "src", "index.css"), "utf8");

describe("geniş viewport merkezleme", () => {
  it("zoom out karşılığı geniş CSS viewportlarda header ve hero için ortak merkez rayı tanımlar", () => {
    expect(styles).toContain("@media(min-width:2600px)");
    expect(styles).toContain(".header-row{width:min(1530px,calc(100% - 60px))");
    expect(styles).toContain(".header-subrow{width:min(1530px,calc(100% - 60px))");
    expect(styles).toContain(".hero-inner{width:min(1530px,calc(100% - 60px))");
  });
});

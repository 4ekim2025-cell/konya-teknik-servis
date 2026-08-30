import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const styles = readFileSync(resolve(projectRoot, "client", "src", "index.css"), "utf8");

describe("mobil sabit eylem çubuğu", () => {
  it("çağrı ve servis talebi metinlerini okunur ölçüde tutar", () => {
    expect(styles).toContain(".mobile-action-bar{height:70px}");
    expect(styles).toContain("font-size:clamp(12px,3vw,13px)");
    expect(styles).toContain("line-height:1.2");
  });
});

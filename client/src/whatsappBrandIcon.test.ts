import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const styles = readFileSync(resolve(projectRoot, "client", "src", "index.css"), "utf8");

describe("özgün WhatsApp simgesi", () => {
  it("kullanıcının sağladığı SVG'yi ortak marka varlığı olarak kullanır", () => {
    expect(styles).toContain("--esli-whatsapp-logo:url");
    expect(styles).toContain("IqShanjjQzLpQbpX.svg");
  });

  it("WhatsApp eylemlerindeki simge alanlarına ortak varlığı uygular", () => {
    expect(styles).toContain(".whatsapp-mark,.smart-whatsapp-mark,.mobile-whatsapp-mark");
    expect(styles).toContain('a[href^="https://wa.me/"]');
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { brandContent } from "@/brandContent";

const root = resolve(import.meta.dirname, "..", "..");
const appSource = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const brands = Object.keys(brandContent);

describe("marka anahtar kelime ve schema denetimi", () => {
  it("19 marka rotasını marka adı ve ayrı Service/Brand düğümleriyle eşler", () => {
    expect(brands).toHaveLength(19);
    expect(appSource).toContain("const brandNamesByPath:Record<string,string>");
    expect(appSource).toContain('"@type":"Brand"');
    expect(appSource).toContain('"@type":"Service"');
    expect(appSource).toContain("serviceType:isBrand?`${brandName} cihaz teknik servisi`");
    expect(appSource).toContain("category:isBrand?`${brandName} beyaz eşya ve küçük ev aletleri`");
    expect(appSource).toContain("about:isBrand?[{\"@id\":businessId},{\"@id\":`${currentUrl}#brand`}]");
  });

  it("marka içeriklerinde isim kullanımı doğal yoğunlukta kalır", () => {
    for (const brand of brands) {
      const content = brandContent[brand];
      const text = [content.heading, content.intro, content.focus, ...content.faq].join(" ");
      const occurrences = text.split(brand).length - 1;
      expect(occurrences).toBeGreaterThanOrEqual(1);
      expect(occurrences).toBeLessThanOrEqual(6);
      expect(text.length).toBeGreaterThan(420);
    }
  });
});

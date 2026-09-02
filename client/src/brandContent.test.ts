import { describe, expect, it } from "vitest";
import { brandContent } from "@/brandContent";

const brands = [
  "Altus", "Arçelik", "Arnica", "Beko", "Bosch", "Electrolux", "Franke",
  "Hoover", "Kumtel", "Philips", "Profilo", "Rowenta", "Samsung", "Siemens",
  "Silverline", "Şenocak", "Teka", "Uğur Soğutma", "Vestel",
];

describe("marka özel içerik profilleri", () => {
  it("hizmet verilen 19 markanın tamamını kapsar", () => {
    expect(Object.keys(brandContent)).toEqual(brands);
  });

  it("her marka için özgün rehber metni ve SSS tanımlar", () => {
    const headings = brands.map(brand => brandContent[brand].heading);
    expect(new Set(headings).size).toBe(brands.length);
    for (const brand of brands) {
      const content = brandContent[brand];
      expect(content.intro.length).toBeGreaterThan(140);
      expect(content.focus.length).toBeGreaterThan(90);
      expect(content.faq[0]).toContain(brand);
      expect(content.faq[1].length).toBeGreaterThan(70);
    }
  });
});

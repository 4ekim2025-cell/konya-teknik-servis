import { describe, expect, it } from "vitest";
import { brandSeo } from "@/brandSeo";

const brands = [
  "Altus", "Arçelik", "Arnica", "Beko", "Bosch", "Electrolux", "Franke",
  "Hoover", "Kumtel", "Philips", "Profilo", "Rowenta", "Samsung", "Siemens",
  "Silverline", "Şenocak", "Teka", "Uğur Soğutma", "Vestel",
];

describe("marka SEO metadata kayıtları", () => {
  it("19 marka için benzersiz title ve description tanımlar", () => {
    expect(Object.keys(brandSeo)).toEqual(brands);
    expect(new Set(brands.map(brand => brandSeo[brand].title)).size).toBe(brands.length);
    expect(new Set(brands.map(brand => brandSeo[brand].description)).size).toBe(brands.length);
  });

  it("başlıklarda markayı, açıklamalarda arama niyetini taşır", () => {
    for (const brand of brands) {
      const { title, description } = brandSeo[brand];
      expect(title).toContain(brand);
      expect(title.length).toBeGreaterThanOrEqual(35);
      expect(title.length).toBeLessThanOrEqual(65);
      expect(description).toContain("Konya");
      expect(description).toContain(brand);
      expect(description.length).toBeGreaterThanOrEqual(120);
      expect(description.length).toBeLessThanOrEqual(170);
    }
  });
});

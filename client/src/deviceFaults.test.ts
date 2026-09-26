import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { deviceFaultGuides } from "../../shared/device-faults";
import { serviceFaqs } from "../../shared/seo-content";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const contentPage = readFileSync(resolve(projectRoot, "client", "src", "pages", "ContentPage.tsx"), "utf8");
const prerender = readFileSync(resolve(projectRoot, "scripts", "prerender.ts"), "utf8");
const priorityDevices = ["Çamaşır Makinesi", "Buzdolabı", "Bulaşık Makinesi", "Fırın", "Kurutma Makinesi"];

describe("öncelikli cihazların arıza rehberi", () => {
  it("beş öncelikli cihazın her biri için en az beş arıza açıklar", () => {
    priorityDevices.forEach(device => {
      const guide = deviceFaultGuides[device];
      expect(guide, device).toBeDefined();
      expect(guide.faults.length).toBeGreaterThanOrEqual(5);
      guide.faults.forEach(fault => {
        expect(fault.title.length).toBeGreaterThan(10);
        expect(fault.causes.length).toBeGreaterThan(80);
        expect(fault.check.length).toBeGreaterThan(60);
      });
    });
  });

  it("her cihaza arama sonucuna uygun uzunlukta, birbirinden farklı açıklama verir", () => {
    const descriptions = priorityDevices.map(device => deviceFaultGuides[device].description);
    descriptions.forEach(description => {
      expect(description.length).toBeLessThanOrEqual(160);
      expect(description).toContain("Konya");
    });
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("fiyat, garanti veya yetkili servis iddiası içermez", () => {
    const text = JSON.stringify(deviceFaultGuides);
    expect(text).not.toMatch(/yetkili servis|garanti|₺|\bTL\b|%\d/i);
  });

  it("gerçek aramalardan gelen soruları SSS'ye ve FAQ şemasına ekler", () => {
    priorityDevices.forEach(device => expect(serviceFaqs[device].length).toBeGreaterThanOrEqual(7));
    expect(serviceFaqs["Buzdolabı"].map(([question]) => question)).toContain("Buzdolabı gazının bittiği nasıl anlaşılır?");
  });

  it("arıza rehberini hem React sayfasında hem prerender HTML'inde aynı kaynaktan gösterir", () => {
    expect(contentPage).toContain('import { deviceFaultGuides } from "@shared/device-faults";');
    expect(contentPage).toContain("<Faults name={d.name}/>");
    expect(contentPage).toContain("deviceFaultGuides[name]?.description");
    expect(prerender).toContain('import { deviceFaultGuides } from "../shared/device-faults";');
    expect(prerender).toContain("${faultsHtml(deviceName)}");
  });
});

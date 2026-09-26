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

  it("SSS'de arıza bölümünde veya süreç kartlarında zaten cevaplanan soruları tekrar etmez", () => {
    priorityDevices.forEach(device => {
      const questions = serviceFaqs[device].map(([question]) => question);
      expect(questions.length).toBe(3);
      expect(questions.join(" ")).not.toMatch(/takip linki|aynı gün/i);
      const faultTitles = deviceFaultGuides[device].faults.map(fault => fault.title.toLocaleLowerCase("tr-TR"));
      questions.forEach(question => faultTitles.forEach(title => expect(question.toLocaleLowerCase("tr-TR")).not.toContain(title)));
    });
    expect(serviceFaqs["Buzdolabı"].map(([question]) => question)).toContain("Buzdolabı gazının bittiği nasıl anlaşılır?");
  });

  it("süre-ücret ve acil durum bilgisini arızalardan ayrı, tek yerde verir", () => {
    priorityDevices.forEach(device => {
      expect(deviceFaultGuides[device].service).toMatch(/onay/);
      expect(deviceFaultGuides[device].urgent.length).toBeGreaterThan(80);
    });
  });

  it("arıza rehberini hem React sayfasında hem prerender HTML'inde aynı kaynaktan gösterir", () => {
    expect(contentPage).toContain('import { deviceFaultGuides } from "@shared/device-faults";');
    expect(contentPage).toContain("{faultGuide?<Faults name={d.name}/>:<>{!isDistrict&&<Guide d={d}/>}<DeviceCare d={d}/></>}");
    expect(contentPage).toContain("{faultGuide?<FaultJumpList name={d.name}/>:");
    expect(contentPage).toContain("deviceFaultGuides[name]?.description");
    expect(prerender).toContain('import { deviceFaultGuides } from "../shared/device-faults";');
    expect(prerender).toContain("${faultsHtml(deviceName)}");
  });
});

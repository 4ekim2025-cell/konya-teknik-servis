import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { districtGuides } from "../../shared/district-guides";
import { blogPosts } from "../../shared/blog-posts";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const page = readFileSync(resolve(projectRoot, "client", "src", "pages", "ContentPage.tsx"), "utf8");
const prerender = readFileSync(resolve(projectRoot, "scripts", "prerender.ts"), "utf8");
const districts = ["Karatay", "Meram", "Selçuklu"];

describe("ilçe sayfaları", () => {
  it("her ilçeye ayrı açıklama, giriş ve hero metni verir", () => {
    districts.forEach(name => {
      const guide = districtGuides[name];
      expect(guide.description.length).toBeLessThanOrEqual(160);
      expect(guide.description).toContain(name);
      expect(guide.intro).not.toBe(guide.hero);
    });
    expect(new Set(districts.map(name => districtGuides[name].description)).size).toBe(3);
    expect(new Set(districts.map(name => districtGuides[name].intro)).size).toBe(3);
  });

  it("ilçeler arasında aynı soruyu tekrar etmez ve genel süreç sorularını SSS'ye koymaz", () => {
    const questions = districts.flatMap(name => districtGuides[name].faqs.map(([question]) => question.replace(name, "X")));
    expect(new Set(questions).size).toBe(questions.length);
    expect(questions.join(" ")).not.toMatch(/takip|aynı gün|ne yazmalıyım|nasıl açılır|hangi bilgiler/i);
  });

  it("her ilçede o ilçeden en az bir gerçek servis kaydını gösterir", () => {
    districts.forEach(name => expect(blogPosts.some(post => post.caseFile?.district.startsWith(name))).toBe(true));
    expect(page).toContain("<DistrictNotes name={d.name}/>");
    expect(prerender).toContain("districtGuides[district]");
  });

  it("ilçe başlığını cihaz kalıbıyla yazmaz", () => {
    expect(page).toContain('districtNeighborhoods[d.name]?"beyaz eşya servisi.":"tamiri ve servis desteği."');
  });
});

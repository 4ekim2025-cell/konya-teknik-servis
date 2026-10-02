import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "../../scripts/build-content";
import { computeOverview } from "../../shared/blog-overview";
import { advisoryChecks, canonicalizePost, nextOrder, prepareSave, serializePost, slugFromTitle, todayInIstanbul, type PreparedSave } from "../../shared/blog-publish";
import { blogFileName, validateBlogPost, type BlogPostInput } from "../../shared/blog-schema";
import { BLOG_BRANDS, BLOG_DEVICES, BLOG_DISTRICTS, defaultCaseDeviceName, derivedServiceFields, districtOf } from "../../shared/blog-taxonomy";
import { deviceFaultGuides } from "../../shared/device-faults";
import { brandGuides } from "../../shared/brand-guides";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");
const TODAY = "2026-10-02";

const valid = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  slug: "/blog/ornek-yazi/",
  category: "Bakım Rehberi",
  title: "Örnek rehber yazısı",
  description: "Örnek açıklama: Konya’da çamaşır makinesi filtresinin nasıl temizleneceğini adım adım anlatan kısa bir bakım rehberi.",
  excerpt: "Filtre temizliği için kısa özet.",
  device: "Çamaşır Makinesi",
  servicePath: "/camasir-makinesi-tamiri-konya/",
  blocks: [{ type: "p", text: "Örnek paragraf." }],
  ...overrides,
});
const stored = (overrides: Record<string, unknown> = {}): BlogPostInput => {
  const result = validateBlogPost({ order: 10, published: "2026-09-01", updated: "2026-09-01", ...valid(), ...overrides });
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.post;
};
const ok = (result: PreparedSave) => { if (!result.ok) throw new Error(result.errors.join("; ")); return result; };
const errorsOf = (result: PreparedSave) => (result.ok ? [] : result.errors).join("\n");

describe("kaydetme kuralları (prepareSave)", () => {
  it("yeni taslağı sıra ve tarihle kaydeder; istemciden gelen sunucu alanlarını yok sayar", () => {
    const result = ok(prepareSave({ mode: "draft", post: valid({ slug: "/blog/yeni-yazi/", description: "Yeni yazının farklı açıklaması.", order: 5, status: "published", published: "2020-01-01", updated: "2020-01-01" }) }, [stored({ order: 210 })], TODAY));
    expect(result.noChange).toBe(false);
    if (result.noChange) return;
    expect(result.post.order).toBe(220);
    expect(result.post.status).toBe("draft");
    expect(result.post.published).toBe(TODAY);
    expect(result.post.updated).toBe(TODAY);
    expect(result.isNew).toBe(true);
  });

  it("yayında olan yazıda status yazılmaz (mevcut dosyalarla aynı)", () => {
    const result = ok(prepareSave({ mode: "publish", post: valid() }, [], TODAY));
    if (result.noChange) throw new Error("beklenmiyordu");
    expect(result.post.status).toBeUndefined();
    expect(serializePost(result.post)).not.toContain('"status"');
    expect(result.becamePublished).toBe(true);
  });

  it("kurala aykırı yazı taslak da olsa yayın da olsa kaydedilmez", () => {
    for (const mode of ["draft", "publish"] as const) {
      expect(errorsOf(prepareSave({ mode, post: valid({ description: "a".repeat(161) }) }, [], TODAY))).toContain("en fazla 160 karakter");
      expect(errorsOf(prepareSave({ mode, post: valid({ blocks: [{ type: "p", text: "Ücret 500 TL" }] }) }, [], TODAY))).toContain("yasak ifade");
      expect(errorsOf(prepareSave({ mode, post: valid({ blocks: [{ type: "p", text: "Biz yetkili servisiyiz." }] }) }, [], TODAY))).toContain("Yetkili servis iddiası");
      expect(errorsOf(prepareSave({ mode, post: valid({ sources: [{ label: "English source", url: "https://example.com" }] }) }, [], TODAY))).toContain("Türkçe olmalı");
      expect(errorsOf(prepareSave({ mode, post: valid({ category: "Ustanın Defterinden" }) }, [], TODAY))).toContain("servis kaydı");
      expect(errorsOf(prepareSave({ mode, post: valid({ unknownField: 1 }) }, [], TODAY)).length).toBeGreaterThan(0);
    }
    expect(errorsOf(prepareSave({ mode: "publish", post: "yazı" }, [], TODAY))).toContain("geçersiz");
    expect(errorsOf(prepareSave({ mode: "yayinla" as never, post: valid() }, [], TODAY))).toContain("taslak ya da yayın");
  });

  it("aynı adres ya da aynı açıklamayla ikinci yazı kaydedilmez", () => {
    const existing = [stored()];
    const sameSlug = prepareSave({ mode: "draft", post: valid() }, existing, TODAY);
    expect(sameSlug.ok).toBe(false);
    if (!sameSlug.ok) expect(sameSlug.status).toBe(409);
    const sameDescription = prepareSave({ mode: "draft", post: valid({ slug: "/blog/baska-yazi/" }) }, existing, TODAY);
    expect(errorsOf(sameDescription)).toContain("Açıklama tekrar ediyor");
  });

  it("previousSlug göndermeyen istek yeni yazıdır: var olan bir yazının üzerine yazamaz", () => {
    const existing = [stored()];
    for (const mode of ["draft", "publish"] as const) {
      const result = prepareSave({ mode, post: valid({ excerpt: "Üzerine yazma denemesi." }) }, existing, TODAY);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(409);
    }
  });

  it("yayındaki yazının adresi değiştirilemez ve yazı taslağa çevrilemez", () => {
    const existing = [stored()];
    expect(errorsOf(prepareSave({ mode: "publish", previousSlug: "/blog/ornek-yazi/", post: valid({ slug: "/blog/yeni-adres/" }) }, existing, TODAY))).toContain("adresi değiştirilemez");
    expect(errorsOf(prepareSave({ mode: "draft", previousSlug: "/blog/ornek-yazi/", post: valid() }, existing, TODAY))).toContain("taslağa çevrilemez");
    expect(errorsOf(prepareSave({ mode: "publish", previousSlug: "/blog/yok/", post: valid() }, existing, TODAY))).toContain("bulunamadı");
  });

  it("taslağın adresi yayından önce değiştirilebilir", () => {
    const existing = [stored({ status: "draft" })];
    const result = ok(prepareSave({ mode: "draft", previousSlug: "/blog/ornek-yazi/", post: valid({ slug: "/blog/yeni-adres/" }) }, existing, TODAY));
    if (result.noChange) throw new Error("beklenmiyordu");
    expect(result.renamedFrom).toBe("/blog/ornek-yazi/");
    expect(result.post.slug).toBe("/blog/yeni-adres/");
    expect(result.post.order).toBe(10);
  });

  it("taslak yayınlanınca yayın ve güncelleme tarihi bugün olur, sıra korunur", () => {
    const existing = [stored({ status: "draft", published: "2026-09-01", updated: "2026-09-01" })];
    const result = ok(prepareSave({ mode: "publish", previousSlug: "/blog/ornek-yazi/", post: valid() }, existing, TODAY));
    if (result.noChange) throw new Error("beklenmiyordu");
    expect(result.becamePublished).toBe(true);
    expect(result.post.published).toBe(TODAY);
    expect(result.post.updated).toBe(TODAY);
    expect(result.post.order).toBe(10);
    expect(result.post.status).toBeUndefined();
  });

  it("yayındaki yazı düzenlenince updated bugüne çekilir, yayın tarihi korunur", () => {
    const existing = [stored()];
    const result = ok(prepareSave({ mode: "publish", previousSlug: "/blog/ornek-yazi/", post: valid({ excerpt: "Değişen özet." }) }, existing, TODAY));
    if (result.noChange) throw new Error("beklenmiyordu");
    expect(result.post.published).toBe("2026-09-01");
    expect(result.post.updated).toBe(TODAY);
    expect(result.isNew).toBe(false);
  });

  it("içerik değişmediyse değişiklik yok der (updated oynamaz, commit atılmaz)", () => {
    const existing = [stored()];
    const result = ok(prepareSave({ mode: "publish", previousSlug: "/blog/ornek-yazi/", post: valid() }, existing, TODAY));
    expect(result.noChange).toBe(true);
    const spaced = ok(prepareSave({ mode: "publish", previousSlug: "/blog/ornek-yazi/", post: valid({ title: "  Örnek rehber yazısı  " }) }, existing, TODAY));
    expect(spaced.noChange).toBe(true);
  });

  it("güncelleme tarihi yayın tarihinden önceye düşmez", () => {
    const existing = [stored({ published: "2026-12-01", updated: "2026-12-01" })];
    expect(errorsOf(prepareSave({ mode: "publish", previousSlug: "/blog/ornek-yazi/", post: valid({ excerpt: "Yeni özet." }) }, existing, TODAY))).toContain("yayın tarihinden önce olamaz");
  });

  it("kaydedilen yazı kararlı anahtar sırasıyla ve kırpılmış metinle yazılır", () => {
    const result = ok(prepareSave({ mode: "draft", post: valid({ title: "  Başlık  ", sources: [], brandPath: "", serviceLabel: "" }) }, [], TODAY));
    if (result.noChange) throw new Error("beklenmiyordu");
    const text = serializePost(result.post);
    expect(text.endsWith("}\n")).toBe(true);
    expect(Object.keys(JSON.parse(text))).toEqual(["slug", "order", "status", "category", "title", "description", "excerpt", "published", "updated", "device", "servicePath", "blocks"]);
    expect(JSON.parse(text).title).toBe("Başlık");
  });
});

describe("mevcut içerikle uyum", () => {
  const { posts } = loadContent(projectRoot);

  it("21 yazının hepsi panelin yazacağı biçimle bayt bayt aynıdır (ilk kayıtta gereksiz fark oluşmaz)", () => {
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) expect(serializePost(post), blogFileName(post.slug)).toBe(read(`content/blog/${blogFileName(post.slug)}`));
  });

  it("değiştirilmeden yeniden kaydedilen mevcut yazı değişiklik yok sayılır", () => {
    for (const post of posts) {
      const result = prepareSave({ mode: post.status === "draft" ? "draft" : "publish", previousSlug: post.slug, post: canonicalizePost(post as never) }, posts, TODAY);
      expect(result.ok && result.noChange, post.slug).toBe(true);
    }
  });

  it("yeni yazının sırası mevcut en büyük sıranın 10 fazlasıdır", () => {
    expect(nextOrder(posts)).toBe(Math.max(...posts.map(post => post.order)) + 10);
    expect(nextOrder([])).toBe(10);
  });
});

describe("adres ve tarih yardımcıları", () => {
  it("başlıktan Türkçe karakterleri dönüştürerek adres üretir", () => {
    expect(slugFromTitle("Çamaşır Makinesi Su Almıyor: Ne Yapmalı?")).toBe("/blog/camasir-makinesi-su-almiyor-ne-yapmali/");
    expect(slugFromTitle("IŞIK İçeri Giriyor")).toBe("/blog/isik-iceri-giriyor/");
    expect(slugFromTitle("Meram’da Bosch: arıza rulmandaydı")).toBe("/blog/meramda-bosch-ariza-rulmandaydi/");
    expect(slugFromTitle("  --Şğüöç--  ")).toBe("/blog/sguoc/");
  });

  it("uzun başlığı kelime ortasında kesmeden en çok 80 karakterde bırakır ve şema kalıbına uyar", () => {
    const slug = slugFromTitle("Meram’da ciddi titreyip çok sesli çalışan Bosch çamaşır makinesinde arızanın rulmandan çıkması ve evde ayırt etme yolları");
    expect(slug.length).toBeLessThanOrEqual(80 + "/blog//".length);
    expect(slug).toMatch(/^\/blog\/[a-z0-9-]+\/$/);
    expect(slug.endsWith("-/")).toBe(false);
  });

  it("bugünün tarihini İstanbul saatine göre verir", () => {
    expect(todayInIstanbul(new Date("2026-10-02T12:00:00Z"))).toBe("2026-10-02");
    expect(todayInIstanbul(new Date("2026-10-02T21:30:00Z"))).toBe("2026-10-03");
  });
});

describe("kontrol listesi (uyarılar)", () => {
  it("kısa ve eksik yazıyı işaretler, düzgün yazıyı işaretlemez", () => {
    const weak = advisoryChecks(valid() as never).filter(check => !check.ok).map(check => check.id);
    expect(weak).toContain("word-count");
    const long = "kelime ".repeat(160).trim();
    const strong = advisoryChecks(valid({
      blocks: [{ type: "p", text: long }, { type: "h2", text: "Başlık" }, { type: "list", items: ["a"] }, { type: "p", text: "b" }],
    }) as never);
    expect(strong.every(check => check.ok)).toBe(true);
    expect(advisoryChecks(valid({ category: "Ustanın Defterinden" }) as never).map(check => check.id)).toContain("usta-note");
    expect(advisoryChecks(valid({ title: "x".repeat(71) }) as never).find(check => check.id === "title-length")?.ok).toBe(false);
    expect(advisoryChecks(valid({ excerpt: valid().description }) as never).find(check => check.id === "excerpt-differs")?.ok).toBe(false);
  });
});

describe("seçim listeleri (blog-taxonomy)", () => {
  it("markalar sitedeki marka sayfalarıyla ve marka içerik dosyasıyla birebir aynıdır", () => {
    const app = read("client/src/App.tsx");
    const siteBrands = [...app.matchAll(/"(\/[a-z-]+-servisi-konya\/)":"([^"]+)"/g)].map(match => [match[1], match[2]]);
    expect(siteBrands.length).toBe(22);
    expect(BLOG_BRANDS.map(brand => [brand.path, brand.name])).toEqual(siteBrands);
    BLOG_BRANDS.forEach(brand => expect(brandGuides[brand.name], brand.name).toBeDefined());
    expect(Object.keys(brandGuides).sort()).toEqual(BLOG_BRANDS.map(brand => brand.name).sort());
  });

  it("cihazlar arıza rehberi olan cihazlarla ve hizmet sayfalarıyla eşleşir", () => {
    const withPage = BLOG_DEVICES.filter(option => option.servicePath);
    expect(withPage.map(option => option.device).sort()).toEqual(Object.keys(deviceFaultGuides).sort());
    const prerender = read("scripts/prerender.ts");
    withPage.forEach(option => expect(prerender, option.device).toContain(`"${option.servicePath}"`));
    expect(BLOG_DISTRICTS).toEqual(["Karatay", "Meram", "Selçuklu"]);
    expect(districtOf("Selçuklu · Yazır")).toBe("Selçuklu");
    expect(districtOf("Ankara")).toBeUndefined();
  });

  it("mevcut yazıların hizmet ve marka adresleri, listeden otomatik kurulanla aynıdır", () => {
    const { posts } = loadContent(projectRoot);
    for (const post of posts) {
      const derived = derivedServiceFields({ device: post.device === "Su sebili" ? "Su Sebili" : post.device, brand: post.caseFile?.brand, generalPath: post.servicePath });
      expect(derived.servicePath, post.slug).toBe(post.servicePath);
      expect(derived.brandPath, post.slug).toBe(post.brandPath);
      expect(derived.serviceLabel, post.slug).toBe(post.serviceLabel);
    }
    expect(defaultCaseDeviceName("Çamaşır Makinesi")).toBe("Çamaşır makinesi");
    expect(defaultCaseDeviceName("Elektrikli Süpürge")).toBe("Elektrikli süpürge");
  });
});

describe("özet görünümü (computeOverview)", () => {
  it("yayındaki yazıları ilçe, marka, cihaz ve kategoriye göre sayar; boş konuları listeler", () => {
    const { posts } = loadContent(projectRoot);
    const overview = computeOverview(posts);
    expect(overview.total).toBe(posts.length);
    expect(overview.published + overview.drafts).toBe(overview.total);
    expect(overview.byCategory.reduce((sum, row) => sum + row.count, 0)).toBe(overview.published);
    const cases = posts.filter(post => post.caseFile);
    expect(overview.byDistrict.reduce((sum, row) => sum + row.count, 0)).toBe(cases.length);
    expect(overview.byBrand.reduce((sum, row) => sum + row.count, 0)).toBe(cases.length);
    expect(overview.byDevice.find(row => row.name === "Su Sebili")?.count).toBe(1);
    expect(overview.empty.brands).toContain("Samsung");
    expect(overview.empty.brands).not.toContain("Philips");
    expect(overview.byBrand[0].count).toBeGreaterThanOrEqual(overview.byBrand[1].count);
  });

  it("taslaklar sayıya girmez, ayrı gösterilir", () => {
    const overview = computeOverview([stored(), stored({ slug: "/blog/taslak/", order: 20, description: "Başka açıklama.", status: "draft" })]);
    expect(overview.published).toBe(1);
    expect(overview.drafts).toBe(1);
    expect(overview.byDevice.find(row => row.name === "Çamaşır Makinesi")?.count).toBe(1);
  });
});

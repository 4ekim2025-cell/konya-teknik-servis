import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { blogPosts } from "../../shared/blog-posts";
import { blogFileName, validateBlogCollection, validateBlogPost, type BlogPostInput } from "../../shared/blog-schema";
import { CONTENT_DIR, GENERATED_PATH, LLMS_PATH, SITEMAP_PATH, loadContent, planBuild, renderGeneratedModule, syncLlmsTxt, syncSitemap, toSitePosts } from "../../scripts/build-content";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

/** Kuralları sınamak için kendi içinde tutarlı örnek yazı (gerçek içeriğe bağlı değildir). */
const sample = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  slug: "/blog/ornek-yazi/",
  order: 10,
  category: "Ustanın Defterinden",
  title: "Karatay’da örnek arıza: parça değişti",
  description: "Örnek açıklama.",
  excerpt: "Örnek özet.",
  published: "2026-10-02",
  updated: "2026-10-02",
  device: "Çamaşır Makinesi",
  servicePath: "/camasir-makinesi-tamiri-konya/",
  caseFile: { district: "Karatay", brand: "Beko", device: "Çamaşır makinesi", complaint: "Su almıyor", finding: "Basınç anahtarı arızalı", action: "Basınç anahtarı değiştirildi" },
  brandPath: "/beko-servisi-konya/",
  blocks: [{ type: "p", text: "Örnek paragraf." }],
  ...overrides,
});
const errorsOf = (data: unknown) => { const result = validateBlogPost(data); return result.ok ? [] : result.errors; };
const input = (overrides: Record<string, unknown> = {}) => { const result = validateBlogPost(sample(overrides)); if (!result.ok) throw new Error(result.errors.join("; ")); return result.post; };

describe("içerik dosyaları (content/blog)", () => {
  it("her dosya ortak şemadan geçer, dosya adı adresle uyuşur, adres/açıklama/sıra benzersizdir", () => {
    const { posts, errors } = loadContent(projectRoot);
    expect(errors).toEqual([]);
    expect(posts.length).toBeGreaterThan(0);
  });

  it("üretilen veri dosyası içerikle birebir aynıdır (pnpm content çalıştırılmış)", () => {
    const { posts } = loadContent(projectRoot);
    expect(read(GENERATED_PATH)).toBe(renderGeneratedModule(toSitePosts(posts)));
    expect(blogPosts).toEqual(toSitePosts(posts));
  });

  it("sitemap.xml ve llms.txt blog bölümleri içerikle eşittir", () => {
    const stale = planBuild(projectRoot).files.filter(file => file.changed).map(file => file.path);
    expect(stale).toEqual([]);
  });

  it("taslak olmayan her yazı sitemap'te ve llms.txt'de bulunur", () => {
    const sitemap = read(SITEMAP_PATH), llms = read(LLMS_PATH);
    blogPosts.forEach(post => {
      expect(sitemap).toContain(`<loc>https://esliteknik.com${post.slug}</loc>`);
      expect(llms).toContain(`(https://esliteknik.com${post.slug})`);
    });
  });

  it("eksik, bozuk ya da yanlış adlı dosyayı hata olarak bildirir", () => {
    const root = mkdtempSync(join(tmpdir(), "icerik-"));
    try {
      mkdirSync(join(root, CONTENT_DIR), { recursive: true });
      writeFileSync(join(root, CONTENT_DIR, "ornek-yazi.json"), JSON.stringify(sample()));
      writeFileSync(join(root, CONTENT_DIR, "baska-ad.json"), JSON.stringify(sample({ slug: "/blog/farkli-yazi/", order: 20, description: "Başka açıklama." })));
      writeFileSync(join(root, CONTENT_DIR, "bozuk.json"), "{ bozuk");
      const { posts, errors } = loadContent(root);
      expect(posts).toHaveLength(2);
      expect(errors.join("\n")).toContain("bozuk.json: geçerli JSON değil");
      expect(errors.join("\n")).toContain('baska-ad.json: dosya adı adresle uyuşmuyor, "farkli-yazi.json" olmalı');
      expect(loadContent(join(root, "yok")).errors.join("\n")).toContain("klasörü bulunamadı");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("yazı şeması kuralları", () => {
  it("geçerli örnek yazıyı kabul eder", () => {
    expect(errorsOf(sample())).toEqual([]);
  });

  it("adres kalıbı, açıklama uzunluğu, kategori ve tarih sırasını denetler", () => {
    expect(errorsOf(sample({ slug: "/blog/Buyuk Harf/" })).join("\n")).toContain("slug:");
    expect(errorsOf(sample({ slug: "/blog/sonda-egik-cizgi-yok" })).join("\n")).toContain("slug:");
    expect(errorsOf(sample({ description: "a".repeat(161) })).join("\n")).toContain("en fazla 160 karakter");
    expect(errorsOf(sample({ description: "a".repeat(160) }))).toEqual([]);
    expect(errorsOf(sample({ category: "Bilinmeyen" })).join("\n")).toContain("category:");
    expect(errorsOf(sample({ published: "2026-10-02", updated: "2026-10-01" })).join("\n")).toContain("yayın tarihinden önce olamaz");
    expect(errorsOf(sample({ published: "2026-02-30", updated: "2026-02-30" })).join("\n")).toContain("geçerli bir tarih");
  });

  it("usta vakasında servis kaydı, hizmet bölgesi ve marka sayfası zorunludur", () => {
    expect(errorsOf(sample({ caseFile: undefined })).join("\n")).toContain("servis kaydı");
    expect(errorsOf(sample({ caseFile: { ...(sample().caseFile as object), district: "Ankara" } })).join("\n")).toContain("Karatay, Meram veya Selçuklu");
    expect(errorsOf(sample({ caseFile: { ...(sample().caseFile as object), district: "Selçuklu · Yazır" } }))).toEqual([]);
    expect(errorsOf(sample({ brandPath: undefined })).join("\n")).toContain("brandPath");
    expect(errorsOf(sample({ brandPath: "/beko/" })).join("\n")).toContain("brandPath:");
    expect(errorsOf(sample({ category: "Bakım Rehberi", caseFile: undefined, brandPath: undefined }))).toEqual([]);
  });

  it("hukuki konu, fiyat ve yetkili servis iddiasını reddeder", () => {
    ["MEDAŞ başvurusu", "tazminat hakkı", "hakem heyeti", "mahkemeye gidin", "Ücret 500 ₺", "Ücret 500 TL"].forEach(text =>
      expect(errorsOf(sample({ blocks: [{ type: "p", text }] })).join("\n"), text).toContain("yasak ifade"));
    expect(errorsOf(sample({ blocks: [{ type: "p", text: "Biz yetkili servisiyiz." }] })).join("\n")).toContain("Yetkili servis iddiası");
    expect(errorsOf(sample({ blocks: [{ type: "p", text: "Yetkili servise yönlendirdik." }] }))).toEqual([]);
  });

  it("kaynaklar yalnızca Türkçe olur", () => {
    expect(errorsOf(sample({ sources: [{ label: "Haber — Konya Gündem", url: "https://konyagundem.com/haber" }] }))).toEqual([]);
    expect(errorsOf(sample({ sources: [{ label: "English source", url: "https://example.com/a" }] })).join("\n")).toContain("Türkçe olmalı");
    expect(errorsOf(sample({ sources: [{ label: "Kaynak şeysi", url: "https://www.fda.gov/x" }] })).join("\n")).toContain("Yabancı kurum");
    expect(errorsOf(sample({ sources: [{ label: "Kaynak şeysi", url: "bağlantı değil" }] })).join("\n")).toContain("geçerli bir bağlantı");
    for (const url of ['https://ornek.com.tr/"><img src=x onerror=alert(1)>', "https://ornek.com.tr/a b", "https://ornek.com.tr/'x", "https://ornek.com.tr/<b>"]) {
      expect(errorsOf(sample({ sources: [{ label: "Kaynak şeysi", url }] })).join("\n"), url).toContain("tırnak, <, > ya da boşluk içeremez");
    }
  });

  it("blokları denetler: bilinmeyen tür, boş metin, boş liste, fazladan alan", () => {
    expect(errorsOf(sample({ blocks: [] })).join("\n")).toContain("en az bir blok");
    expect(errorsOf(sample({ blocks: [{ type: "video", text: "x" }] })).length).toBeGreaterThan(0);
    expect(errorsOf(sample({ blocks: [{ type: "p", text: "  " }] })).join("\n")).toContain("boş olamaz");
    expect(errorsOf(sample({ blocks: [{ type: "list", items: [] }] })).join("\n")).toContain("en az bir madde");
    expect(errorsOf(sample({ blocks: [{ type: "p", text: "x", extra: 1 }] })).length).toBeGreaterThan(0);
    expect(errorsOf(sample({ blocks: [{ type: "steps", items: [{ title: "Başlık", text: "Metin" }] }, { type: "note", title: "Ustanın notu", text: "Not" }, { type: "h2", text: "Başlık" }, { type: "list", items: ["a"] }] }))).toEqual([]);
  });

  it("bilinmeyen alanı reddeder", () => {
    expect(errorsOf(sample({ cover: "x.webp" })).length).toBeGreaterThan(0);
  });

  it("yazılar arasında aynı adres, açıklama ve sıra numarasını reddeder", () => {
    const a = input(), b = input({ slug: "/blog/ikinci-yazi/", description: "İkinci açıklama.", order: 20 });
    expect(validateBlogCollection([a, b])).toEqual([]);
    expect(validateBlogCollection([a, input({ description: "Başka.", order: 20 })]).join("\n")).toContain("Adres tekrar ediyor");
    expect(validateBlogCollection([a, input({ slug: "/blog/ikinci-yazi/", order: 20 })]).join("\n")).toContain("Açıklama tekrar ediyor");
    expect(validateBlogCollection([a, input({ slug: "/blog/ikinci-yazi/", description: "Başka." })]).join("\n")).toContain("Sıra numarası tekrar ediyor");
  });

  it("dosya adını adresten üretir", () => {
    expect(blogFileName("/blog/ornek-yazi/")).toBe("ornek-yazi.json");
  });
});

describe("site listesi ve sitemap/llms.txt eşitleme", () => {
  const a = input({ slug: "/blog/a-yazisi/", order: 10, description: "A.", updated: "2026-09-01", published: "2026-09-01" });
  const b = input({ slug: "/blog/b-yazisi/", order: 20, description: "B.", updated: "2026-09-05", published: "2026-09-05", category: "Bakım Rehberi", caseFile: undefined, brandPath: undefined });
  const c = input({ slug: "/blog/c-yazisi/", order: 5, description: "C.", updated: "2026-09-09", published: "2026-09-09", status: "draft" });
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url><loc>https://esliteknik.com/</loc><lastmod>2026-09-12</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>',
    '  <url><loc>https://esliteknik.com/blog/eski-yazi/</loc><lastmod>2026-08-01</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>',
    '  <url><loc>https://esliteknik.com/blog/b-yazisi/</loc><lastmod>2026-08-02</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>',
    '  <url><loc>https://esliteknik.com/kvkk/</loc><lastmod>2026-09-02</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>',
    '  <url><loc>https://esliteknik.com/blog/</loc><lastmod>2026-08-02</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>',
    '</urlset>',
    "",
  ].join("\n");

  it("taslağı çıkarır, order sırasına dizer ve order/status alanlarını siteye vermez", () => {
    const posts = toSitePosts([b, c, a]);
    expect(posts.map(post => post.slug)).toEqual(["/blog/a-yazisi/", "/blog/b-yazisi/"]);
    expect(Object.keys(posts[0])).not.toContain("order");
    expect(Object.keys(posts[0])).not.toContain("status");
  });

  it("sitemap: mevcut satırı yerinde günceller, silineni kaldırır, yeniyi /blog/ öncesine ekler, blog dışına dokunmaz", () => {
    const out = syncSitemap(sitemap, toSitePosts([a, b, c])).split("\n");
    expect(out).toEqual([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      '  <url><loc>https://esliteknik.com/</loc><lastmod>2026-09-12</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>',
      '  <url><loc>https://esliteknik.com/blog/b-yazisi/</loc><lastmod>2026-09-05</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>',
      '  <url><loc>https://esliteknik.com/kvkk/</loc><lastmod>2026-09-02</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>',
      '  <url><loc>https://esliteknik.com/blog/a-yazisi/</loc><lastmod>2026-09-01</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>',
      '  <url><loc>https://esliteknik.com/blog/</loc><lastmod>2026-09-05</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>',
      '</urlset>',
      "",
    ]);
  });

  it("sitemap: ikinci çalıştırma sonucu değiştirmez; /blog/ satırı yoksa hata verir", () => {
    const once = syncSitemap(sitemap, toSitePosts([a, b]));
    expect(syncSitemap(once, toSitePosts([a, b]))).toBe(once);
    expect(() => syncSitemap("<urlset>\n</urlset>\n", toSitePosts([a]))).toThrow("/blog/ satırı bulunamadı");
  });

  it("llms.txt: yalnızca blog bölümünü yeniden yazar", () => {
    const llms = ["# Eşli Teknik", "", "## Bilgi Merkezi", "", "- [Blog: sahadan arıza hikâyeleri ve bakım rehberleri](https://esliteknik.com/blog/) — Yazar: Esad Eşli", "  - [Eski](https://esliteknik.com/blog/eski-yazi/) (Bakım Rehberi)", "- [Sık Sorulan Sorular](https://esliteknik.com/sss/)", ""].join("\n");
    expect(syncLlmsTxt(llms, toSitePosts([a, b, c])).split("\n")).toEqual([
      "# Eşli Teknik", "", "## Bilgi Merkezi", "",
      "- [Blog: sahadan arıza hikâyeleri ve bakım rehberleri](https://esliteknik.com/blog/) — Yazar: Esad Eşli",
      "  - [Karatay’da örnek arıza: parça değişti](https://esliteknik.com/blog/a-yazisi/) (Ustanın Defterinden)",
      "  - [Karatay’da örnek arıza: parça değişti](https://esliteknik.com/blog/b-yazisi/) (Bakım Rehberi)",
      "- [Sık Sorulan Sorular](https://esliteknik.com/sss/)",
      "",
    ]);
    expect(() => syncLlmsTxt("# boş\n", toSitePosts([a]))).toThrow("blog bölümü bulunamadı");
  });

  it("build komutu içerik derleyiciyi ilk adım olarak çalıştırır", () => {
    const build = (JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts.build;
    expect(build.startsWith("tsx scripts/build-content.ts && vite build")).toBe(true);
  });
});

// Yardımcı tür kontrolü: sample() çıktısı BlogPostInput olarak okunabilmeli.
const _typed: BlogPostInput = input();
void _typed;

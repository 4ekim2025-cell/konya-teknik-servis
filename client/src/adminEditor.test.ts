import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { aiInputFromPost, errorSection, errorsBySection, hasWrittenText, splitDistrict, applyDeviceAndBrand, blockingSummary, checklist, emptyBlock, filterItems, insertAt, newestFirst, moveItem, newPost, removeAt, setCaseFile, setCategory, slugFor, toPayload } from "./admin/editorModel";

const longText = "Kelime ".repeat(160).trim();
const valid = () => ({
  ...newPost("2026-10-02", 220),
  slug: "/blog/deneme-yazisi/",
  title: "Deneme yazısı",
  description: "Panelden eklenen deneme yazısının, arama sonuçlarında görünecek 90 ile 160 karakter arasındaki açıklaması burada yer alır.",
  excerpt: "Kısa özet.",
  blocks: [{ type: "p" as const, text: longText }],
});

describe("editör modeli", () => {
  it("blok taşıma, ekleme ve silme listeyi bozmadan yeni dizi döndürür", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a"]);
    expect(moveItem(list, 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(list, 1, 9)).toEqual(list);
    expect(insertAt(list, 1, "x")).toEqual(["a", "x", "b", "c"]);
    expect(removeAt(list, 1)).toEqual(["a", "c"]);
    expect(list).toEqual(["a", "b", "c"]);
  });

  it("boş bloklar beş türde de şemaya uygun biçimde başlar", () => {
    for (const type of ["p", "h2", "list", "steps", "note"] as const) expect(emptyBlock(type).type).toBe(type);
  });

  it("başlıktan adres üretir, boş başlıkta boş bırakır", () => {
    expect(slugFor("Meram’da titreyen Bosch")).toBe("/blog/meramda-titreyen-bosch/");
    expect(slugFor("   ")).toBe("");
  });

  it("cihaz seçimi hizmet adresini otomatik kurar; küçük ev aletinde marka sayfasına gider", () => {
    const fridge = applyDeviceAndBrand(valid(), { device: "Buzdolabı" });
    expect(fridge.servicePath).toBe("/buzdolabi-tamiri-konya/");
    const small = applyDeviceAndBrand(setCaseFile(valid(), { brand: "Philips" }), { device: "Küçük Ev Aletleri" });
    expect(small.servicePath).toBe("/philips-servisi-konya/");
    expect(small.brandPath).toBe("/philips-servisi-konya/");
    expect(small.serviceLabel).toBe("Philips servisi");
  });

  it("usta kategorisi servis kaydı açar; marka seçimi marka adresini kurar", () => {
    const usta = setCategory(valid(), "Ustanın Defterinden");
    expect(usta.caseFile).toBeDefined();
    expect(setCaseFile(usta, { brand: "Bosch" }).brandPath).toBe("/bosch-servisi-konya/");
  });

  it("geçerli yazı yayına hazırdır; kuralı bozan yazı hazır değildir", () => {
    expect(checklist(valid()).canPublish).toBe(true);
    const bad = checklist({ ...valid(), title: "", slug: "" });
    expect(bad.canPublish).toBe(false);
    expect(bad.errors.length).toBeGreaterThan(0);
    expect(checklist({ ...valid(), blocks: [{ type: "p", text: "Fiyat 500 ₺" }] }).canPublish).toBe(false);
    expect(checklist({ ...valid(), description: "x".repeat(161) }).canPublish).toBe(false);
  });

  it("boş yeni yazı kaydedilemez; eksikler kısa özetle gösterilir ve düğme kapalı kalır", () => {
    const empty = checklist(newPost("2026-10-02", 220));
    expect(empty.canPublish).toBe(false);
    const summary = blockingSummary(empty.errors, 2);
    expect(summary).toContain("Adres zorunlu");
    expect(summary).not.toContain("slug:");
    expect(summary).toContain("madde daha");
    expect(blockingSummary(["description: Açıklama boş olamaz"])).toBe("Açıklama boş olamaz");
    const editor = readFileSync(resolve(import.meta.dirname, "admin/EditorView.tsx"), "utf8");
    expect(editor).toContain('disabled={busy || !sheet.canPublish} onClick={() => submit("draft")}');
  });

  it("usta yazısı servis kaydı ve marka adresi olmadan hazır sayılmaz", () => {
    expect(checklist(setCategory(valid(), "Ustanın Defterinden")).canPublish).toBe(false);
  });

  it("yük boş isteğe bağlı alanları atar", () => {
    const payload = toPayload({ ...valid(), serviceLabel: " ", sources: [{ label: "", url: "" }] });
    expect("serviceLabel" in payload).toBe(false);
    expect("sources" in payload).toBe(false);
  });

  it("panel listesi en son yazıyı en üstte gösterir", () => {
    const item = (slug: string, published: string, order: number) => ({ post: { ...valid(), slug, published, updated: published, order } });
    const sorted = newestFirst([item("/blog/eski/", "2026-08-01", 10), item("/blog/yeni/", "2026-10-02", 230), item("/blog/ayni-gun-once/", "2026-10-02", 220)]);
    expect(sorted.map(entry => entry.post.slug)).toEqual(["/blog/yeni/", "/blog/ayni-gun-once/", "/blog/eski/"]);
  });

  it("liste süzgeci metin, kategori ve duruma göre çalışır", () => {
    const items = [{ post: { ...valid(), status: "published" as const } }, { post: { ...valid(), title: "Fırın notu", category: "Karar Rehberi" as const, status: "draft" as const } }];
    expect(filterItems(items, { query: "fırın", category: "", status: "" })).toHaveLength(1);
    expect(filterItems(items, { query: "", category: "Karar Rehberi", status: "" })).toHaveLength(1);
    expect(filterItems(items, { query: "", category: "", status: "draft" })).toHaveLength(1);
    expect(filterItems(items, { query: "", category: "", status: "published" })).toHaveLength(1);
  });
});

describe("editör bölümleri", () => {
  it("eksikler ait olduğu bölüme dağılır; tekrar eden satırlar elenir ve blok numarası yazılır", () => {
    const grouped = errorsBySection(checklist(setCategory(newPost("2026-10-05", 300), "Ustanın Defterinden")).errors);
    expect(grouped.intro).toEqual(["Başlık boş olamaz", "Açıklama boş olamaz", "Özet boş olamaz"]);
    expect(grouped.case).toEqual(["İlçe boş olamaz", "Marka boş olamaz", "Şikâyet boş olamaz", "Tespit boş olamaz", "Yapılan işlem boş olamaz"]);
    expect(grouped.body).toEqual(["1. blok: Paragraf boş olamaz"]);
    expect(grouped.type).toEqual([]);
  });

  it("hiçbir hata gizlenmez: başlık doluyken adres hatası, tanınmayan alan da bir bölümde görünür", () => {
    expect(errorsBySection(["slug: Adres /blog/kucuk-harf-ve-tire/ biçiminde olmalı"]).intro).toHaveLength(1);
    expect(errorsBySection(["brandPath: Marka sayfası zorunlu"]).case).toHaveLength(1);
    expect(errorSection("bilinmeyen: x")).toBe("type");
    expect(errorSection("cover.alt: Alt metin boş olamaz")).toBe("cover");
    expect(errorSection("sources.0.label: x")).toBe("sources");
    const all = checklist(setCategory(newPost("2026-10-05", 300), "Ustanın Defterinden")).errors;
    expect(Object.values(errorsBySection(all)).flat().length).toBeGreaterThan(0);
    for (const line of ["title: a", "device: b", "blocks.2.text: c"]) expect(Object.values(errorsBySection([line])).flat()).toHaveLength(1);
  });

  it("yapay zeka girdisi servis kaydından kurulur; aynı bilgi ikinci kez sorulmaz", () => {
    expect(splitDistrict("Meram · Yaka")).toEqual({ district: "Meram", neighborhood: "Yaka" });
    expect(splitDistrict("Karatay")).toEqual({ district: "Karatay", neighborhood: "" });
    expect(splitDistrict(undefined)).toEqual({ district: "", neighborhood: "" });
    const post = { device: "Çamaşır Makinesi", caseFile: { district: "Meram · Yaka", brand: "Beko", device: "Çamaşır makinesi", complaint: "Su almıyor", finding: "Basınç anahtarı arızalı", action: "Değiştirildi" } };
    expect(aiInputFromPost(post, { topic: "Konu", note: " " })).toEqual({ topic: "Konu", district: "Meram", neighborhood: "Yaka", brand: "Beko", device: "Çamaşır Makinesi", complaint: "Su almıyor", finding: "Basınç anahtarı arızalı", action: "Değiştirildi" });
    expect(aiInputFromPost({ device: "Küçük Ev Aletleri", caseFile: { ...post.caseFile, device: "Airfryer" } }, { topic: "K", note: "not" })).toMatchObject({ deviceName: "Airfryer", note: "not" });
    const box = readFileSync(resolve(import.meta.dirname, "admin/AiDraftBox.tsx"), "utf8");
    expect(box).toContain("aiInputFromPost(post");
    expect(box).not.toContain("BLOG_DISTRICTS");
  });

  it("üzerine yazma onayı yalnızca yazılmış metin varken istenir (servis kaydı girdidir)", () => {
    const empty = newPost("2026-10-05", 300);
    expect(hasWrittenText(empty)).toBe(false);
    expect(hasWrittenText(setCaseFile(setCategory(empty, "Ustanın Defterinden"), { complaint: "Su almıyor" }))).toBe(false);
    expect(hasWrittenText({ ...empty, title: "Başlık" })).toBe(true);
  });

  it("ana gruplar sabittir (açılıp kapanmaz); yalnızca ekler açılır, yazı türü kutuları tek sırada durur", () => {
    const editor = readFileSync(resolve(import.meta.dirname, "admin/EditorView.tsx"), "utf8");
    const openers = editor.split("\n").filter(line => line.includes("<Section id=") && / collapsible /.test(line));
    expect(openers.map(line => /id="([a-z]+)"/.exec(line)![1]).sort()).toEqual(["history", "sources"]);
    expect(editor.split("\n").filter(line => line.includes("<Section id=")).length).toBe(5);
    const css = readFileSync(resolve(import.meta.dirname, "admin/admin.css"), "utf8");
    expect(css).toContain(".admin-choices{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))");
  });

  it("editör bölümlü düzeni kullanır; kaydet düğmeleri üst çubukta kalır", () => {
    const editor = readFileSync(resolve(import.meta.dirname, "admin/EditorView.tsx"), "utf8");
    for (const text of ['className="admin-editbar"', '<Section id="type"', '<Section id="record"', '<Section id="article"', '<Section id="sources"', '<Part title="Başlık ve tanıtım"', '<Part title="Metin"', "errorsBySection(sheet.errors)", "Kaydetmek için tamamlayın"]) expect(editor, text).toContain(text);
  });
});

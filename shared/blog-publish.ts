/**
 * Panelde yazı kaydetme kuralları — editör ve `api/admin` aynı fonksiyonu kullanır.
 *
 * Düzenleme isteği `previousSlug` taşır (yazının yüklendiği adres); taşımayan istek yeni yazıdır ve var olan bir adrese yazamaz.
 * Sunucu tarafında belirlenen alanlar (istemciden gelen değer yok sayılır): `order`, `status`, `published`, `updated`.
 *  - Yeni yazı: sıra = en büyük sıra + 10; tarihler bugün.
 *  - Taslak yayınlanınca: `published` ve `updated` bugün olur.
 *  - Yayındaki yazı düzenlenince: `updated` yalnızca içerik gerçekten değiştiyse bugüne çekilir; değişiklik yoksa commit atılmaz.
 *  - Yayındaki yazının adresi (slug) değiştirilemez ve yazı taslağa çevrilemez (adres siteden kalkardı; silmek ayrı, bilinçli bir işlemdir).
 *  - Taslağın adresi yayından önce değiştirilebilir (dosya yeniden adlandırılır).
 * İçerik kuralları `shared/blog-schema.ts` şemasından gelir; kurala aykırı yazı hiçbir yoldan kaydedilemez.
 */
import { blogWordCount } from "./blog-meta.js";
import { USTA_CATEGORY, validateBlogCollection, validateBlogPost, type BlogPostInput } from "./blog-schema.js";

export type SaveMode = "draft" | "publish";
export type SaveRequest = { post: unknown; mode: SaveMode; previousSlug?: string };

export type PreparedSave =
  | { ok: false; status: 400 | 409 | 422; errors: string[] }
  | { ok: true; noChange: true; post: BlogPostInput }
  | { ok: true; noChange: false; post: BlogPostInput; previous?: BlogPostInput; isNew: boolean; becamePublished: boolean; renamedFrom?: string; warnings: string[] };

const TOP_ORDER = ["slug", "order", "status", "category", "title", "description", "excerpt", "published", "updated", "device", "servicePath", "serviceLabel", "caseFile", "brandPath", "blocks", "sources"];
const CASE_ORDER = ["district", "brand", "device", "complaint", "finding", "action"];
const BLOCK_ORDER: Record<string, string[]> = { p: ["type", "text"], h2: ["type", "text"], list: ["type", "items"], steps: ["type", "items"], note: ["type", "title", "text"] };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Bilinen anahtarları sabit sırayla yazar; bilinmeyenler sona kalır (şema onları reddeder, sessizce silinmez). */
function orderKeys(value: Record<string, unknown>, order: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of order) if (key in value && value[key] !== undefined) out[key] = value[key];
  for (const key of Object.keys(value)) if (!(key in out) && value[key] !== undefined) out[key] = value[key];
  return out;
}

function trimDeep(value: unknown): unknown {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(trimDeep);
  if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, trimDeep(item)]));
  return value;
}

/** Yazıyı dosyaya yazılacak kararlı biçime getirir: sabit anahtar sırası, kırpılmış metinler, boş isteğe bağlı alanlar atılır. */
export function canonicalizePost(raw: Record<string, unknown>): Record<string, unknown> {
  const post = trimDeep(raw) as Record<string, unknown>;
  for (const key of ["brandPath", "serviceLabel", "caseFile"]) if (post[key] === "" || post[key] === null) delete post[key];
  if (Array.isArray(post.sources) && post.sources.length === 0) delete post.sources;
  if (isRecord(post.caseFile)) post.caseFile = orderKeys(post.caseFile, CASE_ORDER);
  if (Array.isArray(post.blocks)) {
    post.blocks = post.blocks.map(block => {
      if (!isRecord(block)) return block;
      const ordered = orderKeys(block, BLOCK_ORDER[String(block.type)] ?? ["type"]);
      if (block.type === "steps" && Array.isArray(ordered.items)) ordered.items = ordered.items.map(item => (isRecord(item) ? orderKeys(item, ["title", "text"]) : item));
      return ordered;
    });
  }
  if (Array.isArray(post.sources)) post.sources = post.sources.map(source => (isRecord(source) ? orderKeys(source, ["label", "url"]) : source));
  return orderKeys(post, TOP_ORDER);
}

/** Dosyaya yazılacak metin: iki boşluk girintili JSON ve son satır sonu (mevcut dosyalarla aynı). */
export function serializePost(post: BlogPostInput): string {
  return `${JSON.stringify(canonicalizePost(post as unknown as Record<string, unknown>), null, 2)}\n`;
}

/** İstanbul saatine göre bugünün tarihi (YYYY-AA-GG). */
export function todayInIstanbul(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const TURKISH_MAP: Record<string, string> = { ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" };

/** "Meram’da titreyen Bosch" → "/blog/meramda-titreyen-bosch/". Kelime ortasında kesilmez, en çok 80 karakter. */
export function slugFromTitle(title: string): string {
  const ascii = title
    .toLocaleLowerCase("tr-TR")
    .replace(/[’'`´]/g, "")
    .replace(/[çğıöşüâîû]/g, char => TURKISH_MAP[char] ?? char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  let slug = ascii;
  if (slug.length > 80) {
    slug = slug.slice(0, 80);
    const cut = slug.lastIndexOf("-");
    if (cut > 40) slug = slug.slice(0, cut);
  }
  return `/blog/${slug.replace(/^-+|-+$/g, "")}/`;
}

export function nextOrder(posts: { order: number }[]): number {
  return posts.reduce((max, post) => Math.max(max, post.order), 0) + 10;
}

export type AdvisoryCheck = { id: string; label: string; ok: boolean };

/** Yayını engellemeyen, ama aramada ve okunurlukta fark yaratan kontroller (editördeki kontrol listesinin ikinci yarısı). */
export function advisoryChecks(post: Partial<BlogPostInput>): AdvisoryCheck[] {
  const title = post.title?.trim() ?? "";
  const description = post.description?.trim() ?? "";
  const blocks = post.blocks ?? [];
  const words = post.blocks?.length ? blogWordCount({ blocks } as never) : 0;
  const checks: AdvisoryCheck[] = [
    { id: "title-length", label: "Başlık 70 karakteri geçmiyor (arama sonucunda kesilmesin)", ok: title.length > 0 && title.length <= 70 },
    { id: "description-length", label: "Açıklama 90–160 karakter arasında", ok: description.length >= 90 && description.length <= 160 },
    { id: "excerpt-differs", label: "Özet, açıklamayı kelimesi kelimesine tekrar etmiyor", ok: Boolean(post.excerpt?.trim()) && post.excerpt?.trim() !== description },
    { id: "word-count", label: "Metin en az 150 kelime", ok: words >= 150 },
    { id: "has-heading", label: "Dört bloktan uzun yazıda ara başlık var", ok: blocks.length < 4 || blocks.some(block => block.type === "h2") },
  ];
  if (post.category === USTA_CATEGORY) checks.push({ id: "usta-note", label: "Ustanın notu bloğu var", ok: blocks.some(block => block.type === "note") });
  return checks;
}

const comparable = (post: Record<string, unknown>) => JSON.stringify(canonicalizePost({ ...post, updated: "-" }));

/**
 * Kaydetme isteğini doğrular ve dosyaya yazılacak yazıyı üretir. Saf fonksiyondur (ağ ve disk kullanmaz).
 * `existing`: depodaki tüm yazılar (taslaklar dahil). `today`: YYYY-AA-GG.
 */
export function prepareSave(request: SaveRequest, existing: BlogPostInput[], today: string): PreparedSave {
  if (!isRecord(request.post)) return { ok: false, status: 400, errors: ["Yazı verisi geçersiz"] };
  if (request.mode !== "draft" && request.mode !== "publish") return { ok: false, status: 400, errors: ["Kayıt türü taslak ya da yayın olmalı"] };
  const raw = request.post;
  if (typeof raw.slug !== "string") return { ok: false, status: 422, errors: ["slug: Adres zorunlu"] };

  // Düzenleme, yazının yüklendiği adresi (`previousSlug`) açıkça bildirir. Bildirmeyen istek yeni yazıdır ve var olan bir adrese yazamaz;
  // böylece "yeni yazı" ekranında yanlışlıkla seçilen adres mevcut bir yazının üzerine yazılmaz.
  const previous = request.previousSlug === undefined ? undefined : existing.find(post => post.slug === request.previousSlug);
  const renamed = Boolean(previous && previous.slug !== raw.slug);
  const wasPublished = Boolean(previous && previous.status !== "draft");

  if (request.previousSlug !== undefined && !previous) return { ok: false, status: 409, errors: ["Düzenlenen yazı bulunamadı; başka bir yerden silinmiş olabilir"] };
  if (renamed && wasPublished) return { ok: false, status: 422, errors: ["Yayındaki yazının adresi değiştirilemez"] };
  if (!previous || renamed) {
    if (existing.some(post => post.slug === raw.slug)) return { ok: false, status: 409, errors: [`Bu adres kullanımda: ${raw.slug}`] };
  }
  if (request.mode === "draft" && wasPublished) {
    return { ok: false, status: 422, errors: ["Yayındaki yazı taslağa çevrilemez; adres siteden kalkardı. Kaldırmak için silme seçeneğini kullanın"] };
  }

  const publishing = request.mode === "publish";
  const becamePublished = publishing && !wasPublished;
  const candidateRaw: Record<string, unknown> = {
    ...raw,
    order: previous ? previous.order : nextOrder(existing),
    published: previous && wasPublished ? previous.published : today,
    updated: today,
  };
  delete candidateRaw.status;
  if (!publishing) candidateRaw.status = "draft";
  if (previous && !becamePublished && !renamed) candidateRaw.published = previous.published;
  if (becamePublished || !previous) candidateRaw.published = today;

  const candidate = canonicalizePost(candidateRaw);
  const validation = validateBlogPost(candidate);
  if (!validation.ok) return { ok: false, status: 422, errors: validation.errors };

  const others = existing.filter(post => post.slug !== (previous?.slug ?? raw.slug));
  const collection = validateBlogCollection([...others, validation.post]);
  if (collection.length) return { ok: false, status: 422, errors: collection };

  if (previous && !renamed && !becamePublished && comparable(candidate) === comparable(previous as unknown as Record<string, unknown>)) {
    return { ok: true, noChange: true, post: previous };
  }

  const warnings = advisoryChecks(validation.post).filter(check => !check.ok).map(check => check.label);
  return { ok: true, noChange: false, post: validation.post, previous, isNew: !previous, becamePublished, ...(renamed ? { renamedFrom: previous!.slug } : {}), warnings };
}

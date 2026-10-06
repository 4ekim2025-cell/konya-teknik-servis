/** Panel editörünün saf (React'siz) mantığı: blok işlemleri, otomatik alanlar, filtre. Testler: client/src/adminEditor.test.ts */
import { collectPostImages } from "@shared/blog-images";
import { advisoryChecks, slugFromTitle, type AdvisoryCheck } from "@shared/blog-publish";
import { USTA_CATEGORY, validateBlogPost, type BlogPostInput } from "@shared/blog-schema";
import { BLOG_DISTRICTS, defaultCaseDeviceName, derivedServiceFields, deviceOption, GENERAL_DEVICE, SMALL_APPLIANCE_DEVICE } from "@shared/blog-taxonomy";

export type BlogBlockInput = BlogPostInput["blocks"][number];
export type BlockType = BlogBlockInput["type"];

export const BLOCK_LABELS: Record<BlockType, string> = { p: "Paragraf", h2: "Ara başlık", list: "Liste", steps: "Adımlar", note: "Ustanın notu", image: "Fotoğraf" };
/** Elle boş eklenebilen bloklar; fotoğraf bloğu yalnızca yükleme sonrası oluşur (adresi sunucu verir). */
export type TextBlockType = Exclude<BlockType, "image">;
export const TEXT_BLOCK_TYPES = (Object.keys(BLOCK_LABELS) as BlockType[]).filter((type): type is TextBlockType => type !== "image");

export function emptyBlock(type: TextBlockType): BlogBlockInput {
  switch (type) {
    case "p": return { type: "p", text: "" };
    case "h2": return { type: "h2", text: "" };
    case "list": return { type: "list", items: [""] };
    case "steps": return { type: "steps", items: [{ title: "", text: "" }] };
    case "note": return { type: "note", title: "Ustanın notu", text: "" };
  }
}

/** Yazıdaki fotoğraf sayısı (kapak dahil). */
export const imageCount = (post: Pick<BlogPostInput, "cover" | "blocks">): number => collectPostImages(post).length;

export function newPost(today: string, order: number): BlogPostInput {
  return {
    slug: "", order, status: "draft", category: "Bakım Rehberi", title: "", description: "", excerpt: "", published: today, updated: today,
    device: "Çamaşır Makinesi", servicePath: "/camasir-makinesi-tamiri-konya/", blocks: [emptyBlock("p")],
  };
}

export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
export const removeAt = <T,>(list: readonly T[], index: number): T[] => list.filter((_, i) => i !== index);
export const insertAt = <T,>(list: readonly T[], index: number, item: T): T[] => [...list.slice(0, index), item, ...list.slice(index)];
export const replaceAt = <T,>(list: readonly T[], index: number, item: T): T[] => list.map((old, i) => (i === index ? item : old));

/** Cihaz/marka seçiminden servis adresi, marka adresi ve düğme metnini yeniden kurar (elle yazılmaz). */
export function applyDeviceAndBrand(post: BlogPostInput, change: { device?: string; brand?: string; generalPath?: string }): BlogPostInput {
  const device = change.device ?? post.device;
  const brand = change.brand ?? post.caseFile?.brand;
  const derived = derivedServiceFields({ device, brand, generalPath: change.generalPath ?? (device === GENERAL_DEVICE ? post.servicePath : undefined) });
  const { serviceLabel: _old, brandPath: _oldBrand, ...rest } = post;
  const next: BlogPostInput = { ...rest, device, servicePath: derived.servicePath ?? post.servicePath, ...(derived.brandPath ? { brandPath: derived.brandPath } : {}), ...(derived.serviceLabel ? { serviceLabel: derived.serviceLabel } : {}) };
  if (change.device && post.caseFile && change.device !== post.device) {
    const previousDefault = defaultCaseDeviceName(post.device);
    if (post.caseFile.device === previousDefault || !post.caseFile.device) next.caseFile = { ...post.caseFile, device: device === SMALL_APPLIANCE_DEVICE ? "" : defaultCaseDeviceName(device) };
  }
  return next;
}

export function setCategory(post: BlogPostInput, category: BlogPostInput["category"]): BlogPostInput {
  if (category !== USTA_CATEGORY) return { ...post, category };
  const brand = post.caseFile?.brand ?? "";
  return {
    ...post, category,
    caseFile: post.caseFile ?? { district: "", brand, device: deviceOption(post.device)?.servicePath ? defaultCaseDeviceName(post.device) : "", complaint: "", finding: "", action: "" },
  };
}

export function setCaseFile(post: BlogPostInput, patch: Partial<NonNullable<BlogPostInput["caseFile"]>>): BlogPostInput {
  const caseFile = { district: "", brand: "", device: "", complaint: "", finding: "", action: "", ...post.caseFile, ...patch };
  const next = { ...post, caseFile };
  return patch.brand !== undefined ? applyDeviceAndBrand(next, { brand: patch.brand }) : next;
}

/** Başlıktan adres üretir; yalnızca henüz kaydedilmemiş (kilitsiz) yazıda çağrılır. */
export const slugFor = (title: string): string => (title.trim() ? slugFromTitle(title) : "");

/** Sunucuya gidecek yazı: boş isteğe bağlı alanlar atılır. Asıl doğrulama sunucudadır; bu yalnızca temiz bir yük hazırlar. */
export function toPayload(post: BlogPostInput): BlogPostInput {
  const { serviceLabel, brandPath, caseFile, sources, ...rest } = post;
  const cleanSources = (sources ?? []).filter(source => source.label.trim() || source.url.trim());
  return {
    ...rest,
    ...(serviceLabel?.trim() ? { serviceLabel } : {}),
    ...(brandPath ? { brandPath } : {}),
    ...(caseFile && (post.category === USTA_CATEGORY || Object.values(caseFile).some(value => value.trim())) ? { caseFile } : {}),
    ...(cleanSources.length ? { sources: cleanSources } : {}),
  };
}

export type Checklist = { errors: string[]; advisory: AdvisoryCheck[]; canPublish: boolean };

/** Yayın öncesi kontrol listesi: şema hataları yayını engeller (sunucuyla aynı kural), öneriler engellemez. */
export function checklist(post: BlogPostInput): Checklist {
  const payload = toPayload(post);
  const result = validateBlogPost(payload);
  const errors = result.ok ? [] : result.errors;
  if (!post.slug) errors.unshift("slug: Adres zorunlu (başlıktan otomatik üretilir)");
  return { errors, advisory: advisoryChecks(payload), canPublish: errors.length === 0 };
}

/** Kaydı engelleyen hataların kısa özeti: alan yolu ("description: ") atılır, en çok `limit` madde gösterilir. */
export function blockingSummary(errors: string[], limit = 4): string {
  const short = errors.map(line => line.replace(/^[A-Za-z0-9_.]+: /, ""));
  return short.slice(0, limit).join("; ") + (short.length > limit ? `; +${short.length - limit} madde daha (ayrıntı sayfanın altındaki kontrol listesinde)` : "");
}

export type ListFilter = { query: string; category: string; status: "" | "published" | "draft" };

export function filterItems<T extends { post: BlogPostInput }>(items: T[], filter: ListFilter): T[] {
  const query = filter.query.toLocaleLowerCase("tr-TR").trim();
  return items.filter(({ post }) => {
    if (filter.category && post.category !== filter.category) return false;
    const draft = post.status === "draft";
    if (filter.status === "draft" && !draft) return false;
    if (filter.status === "published" && draft) return false;
    return !query || `${post.title} ${post.slug} ${post.device} ${post.caseFile?.brand ?? ""}`.toLocaleLowerCase("tr-TR").includes(query);
  });
}

/** Panel listesi: en son yazı en üstte (yayın tarihi yeni olan önce; aynı gündekilerde son eklenen önce). Sitedeki sırayı değiştirmez. */
export function newestFirst<T extends { post: BlogPostInput }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.post.published.localeCompare(a.post.published) || b.post.order - a.post.order);
}

export const isPublished = (post: { status?: string }): boolean => post.status !== "draft";

// ---------------------------------------------------------------------------------------------------------------------
// Editör bölümleri: eksikler sayfanın altındaki tek listede değil, ait olduğu bölümün başında gösterilir.

/** Editör ekranındaki bölümler (sıra ekrandaki sıradır). */
export const EDITOR_SECTIONS = ["type", "case", "intro", "cover", "body", "sources"] as const;
export type EditorSection = (typeof EDITOR_SECTIONS)[number];
export const EDITOR_SECTION_LABELS: Record<EditorSection, string> = { type: "Yazı türü ve cihaz", case: "Servis kaydı", intro: "Başlık ve tanıtım", cover: "Kapak fotoğrafı", body: "Yazı metni", sources: "Kaynaklar" };

/** Şema hatasının alan yolundan ("caseFile.brand: …") ait olduğu bölüm. Tanınmayan yol "Yazı türü ve cihaz" bölümüne düşer ki hiçbir hata gizli kalmasın. */
export function errorSection(line: string): EditorSection {
  const path = /^([A-Za-z0-9_.]+): /.exec(line)?.[1] ?? "";
  const root = path.split(".")[0];
  if (root === "caseFile" || root === "brandPath") return "case";
  if (root === "title" || root === "slug" || root === "description" || root === "excerpt") return "intro";
  if (root === "cover") return "cover";
  if (root === "blocks") return "body";
  if (root === "sources") return "sources";
  return "type";
}

const BLOCK_PATH = /^blocks\.(\d+)\b/;

/**
 * Hataları bölümlere dağıtır ve okunur hâle getirir: alan yolu atılır, blok hatasına sıra numarası eklenir ("3. blok: …"),
 * aynı eksiğin tekrarı olan satırlar elenir (başlık boşken adres hatası; marka seçilmemişken marka sayfası hatası; alanlar tek tek
 * sayılmışken genel "servis kaydı zorunlu" satırı). Hiçbir bölüm, başka satırı kalmadan hatasını yitirmez.
 */
export function errorsBySection(errors: readonly string[]): Record<EditorSection, string[]> {
  const has = (prefix: string) => errors.some(line => line.startsWith(prefix));
  const grouped = Object.fromEntries(EDITOR_SECTIONS.map(id => [id, [] as string[]])) as Record<EditorSection, string[]>;
  let slugSeen = false;
  for (const line of errors) {
    if (line.startsWith("slug: ")) {
      if (has("title: ") || slugSeen) continue;
      slugSeen = true;
    }
    if (line.startsWith("brandPath: ") && has("caseFile.brand: ")) continue;
    if (line.startsWith("caseFile: ") && has("caseFile.")) continue;
    const block = BLOCK_PATH.exec(line);
    const text = line.replace(/^[A-Za-z0-9_.]+: /, "");
    const message = block ? `${Number(block[1]) + 1}. blok: ${text}` : text;
    const list = grouped[errorSection(line)];
    if (!list.includes(message)) list.push(message);
  }
  return grouped;
}

/** Yapay zeka taslağının üzerine yazacağı metin var mı (başlık, açıklama, özet, kapak dışı bloklar)? Servis kaydı sayılmaz: o girdidir. */
export function hasWrittenText(post: Pick<BlogPostInput, "title" | "description" | "excerpt" | "blocks">): boolean {
  return Boolean(post.title.trim() || post.description.trim() || post.excerpt.trim() || post.blocks.some(block => block.type === "image" || JSON.stringify(block) !== JSON.stringify(emptyBlock(block.type))));
}

/** Servis kaydındaki "İlçe · Mahalle" metnini ayırır. */
export function splitDistrict(value: string | undefined): { district: string; neighborhood: string } {
  const text = value ?? "";
  const district = BLOG_DISTRICTS.find(name => text.startsWith(name)) ?? "";
  return { district, neighborhood: district ? text.slice(district.length).replace(/^\s*·\s*/, "").trim() : "" };
}

/**
 * Yapay zeka girdisi editördeki servis kaydından kurulur: ilçe, marka, cihaz, şikâyet, tespit ve işlem ikinci kez yazılmaz.
 * Yalnızca konu ve serbest not ayrıca sorulur. Doğrulama ortak şemayla (`validateAiCaseInput`, sunucuyla aynı) yapılır.
 */
export function aiInputFromPost(post: Pick<BlogPostInput, "device" | "caseFile">, extra: { topic: string; note: string }): unknown {
  const file = post.caseFile;
  const { district, neighborhood } = splitDistrict(file?.district);
  return {
    topic: extra.topic,
    district,
    ...(neighborhood ? { neighborhood } : {}),
    brand: file?.brand ?? "",
    device: post.device,
    ...(post.device === SMALL_APPLIANCE_DEVICE && file?.device.trim() ? { deviceName: file.device } : {}),
    complaint: file?.complaint ?? "",
    finding: file?.finding ?? "",
    action: file?.action ?? "",
    ...(extra.note.trim() ? { note: extra.note } : {}),
  };
}

/** "Olası nedenler" isteğinin girdisi: yalnızca konu (belirti), marka ve cihaz. İlçe ve mahalle modele gitmez. */
export function aiSuggestInputFromPost(post: Pick<BlogPostInput, "device" | "caseFile">, topic: string): unknown {
  const file = post.caseFile;
  return { topic, brand: file?.brand ?? "", device: post.device, ...(post.device === SMALL_APPLIANCE_DEVICE && file?.device.trim() ? { deviceName: file.device } : {}) };
}

/**
 * Servis kaydı hataları (yapay zeka akışında): neden henüz seçilmediyse "Şikâyet / Tespit / Yapılan işlem boş" satırları tek satıra iner;
 * çünkü bu üç alan seçimle dolar ve seçimden önce ekranda görünmez.
 */
export function collapseCaseIssues(issues: readonly string[], detailsVisible: boolean): string[] {
  if (detailsVisible) return [...issues];
  const hidden = ["Şikâyet boş olamaz", "Tespit boş olamaz", "Yapılan işlem boş olamaz"];
  const rest = issues.filter(line => !hidden.includes(line));
  return rest.length === issues.length ? rest : [...rest, "Arıza nedeni seçilmedi (olası nedenleri getirip sahada yaptığınızı seçin ya da kendiniz yazın)"];
}

/** Panel editörünün saf (React'siz) mantığı: blok işlemleri, otomatik alanlar, filtre. Testler: client/src/adminEditor.test.ts */
import { advisoryChecks, slugFromTitle, type AdvisoryCheck } from "@shared/blog-publish";
import { USTA_CATEGORY, validateBlogPost, type BlogPostInput } from "@shared/blog-schema";
import { defaultCaseDeviceName, derivedServiceFields, deviceOption, GENERAL_DEVICE, SMALL_APPLIANCE_DEVICE } from "@shared/blog-taxonomy";

export type BlogBlockInput = BlogPostInput["blocks"][number];
export type BlockType = BlogBlockInput["type"];

export const BLOCK_LABELS: Record<BlockType, string> = { p: "Paragraf", h2: "Ara başlık", list: "Liste", steps: "Adımlar", note: "Ustanın notu" };

export function emptyBlock(type: BlockType): BlogBlockInput {
  switch (type) {
    case "p": return { type: "p", text: "" };
    case "h2": return { type: "h2", text: "" };
    case "list": return { type: "list", items: [""] };
    case "steps": return { type: "steps", items: [{ title: "", text: "" }] };
    case "note": return { type: "note", title: "Ustanın notu", text: "" };
  }
}

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

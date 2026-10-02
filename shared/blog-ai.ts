/**
 * Yapay zeka taslağı (3. aşama) — girdi şeması, model çıktısı şeması ve "girilmemiş ayrıntı" denetimi.
 * Aynı dosyayı sunucu (`server/admin/ai.ts`) ve editör (`client/src/admin/AiDraftBox.tsx`) kullanır; saf fonksiyonlardır (ağ yok).
 *
 * Değişmez kurallar:
 *  - Model yalnızca başlık, açıklama, özet, bloklar ve iki sosyal metni yazar. Servis kaydı (ilçe, marka, cihaz, şikâyet, tespit,
 *    işlem) girilen formdan AYNEN kopyalanır; servis ve marka adresleri `blog-taxonomy.ts`'ten türetilir, modele yazdırılmaz.
 *  - Model çıktısı güvenilmez girdidir: bilinmeyen alan (slug, adres, kaynak…) taşıyan, `blog-schema.ts` şemasından geçmeyen ya da
 *    girdide olmayan vaka ayrıntısı (rakam, başka marka/ilçe, tarih, kişi, adres, söz/vaat) içeren çıktı editöre dolmaz.
 *  - Bu dosya hiçbir şeyi kaydetmez ve yayınlamaz; çıktı yalnızca editöre taslak olarak dolar.
 */
import { z } from "zod";
import { slugFromTitle } from "./blog-publish.js";
import { BLOG_AUTHORIZED_SERVICE_CLAIM, BLOG_CONTROL_CHARS, BLOG_FORBIDDEN_TEXT, USTA_CATEGORY, blogBlockSchema, validateBlogPost, type BlogPostInput } from "./blog-schema.js";
import { BLOG_BRANDS, BLOG_DEVICES, BLOG_DISTRICTS, GENERAL_DEVICE, SMALL_APPLIANCE_DEVICE, defaultCaseDeviceName, derivedServiceFields } from "./blog-taxonomy.js";

/** Formda seçilebilen cihazlar: "Genel" bir vaka cihazı değildir. */
export const AI_CASE_DEVICES: string[] = BLOG_DEVICES.map(option => option.device).filter(device => device !== GENERAL_DEVICE);
export const AI_GOOGLE_BUSINESS_MAX = 1500;
export const AI_INSTAGRAM_MAX = 2200;
export const AI_NOTE_MAX = 1500;
const SOCIAL_MIN = 80;

const oneLine = (label: string, max: number) =>
  z
    .string({ error: `${label} zorunlu` })
    .transform(value => value.trim())
    .refine(value => value.length > 0, `${label} zorunlu`)
    .refine(value => value.length <= max, `${label} en fazla ${max} karakter olmalı`)
    .refine(value => !BLOG_CONTROL_CHARS.test(value), `${label} tek satır olmalı`);

/** Vaka girdi formu: konu, ilçe (+ isteğe bağlı mahalle), marka, cihaz, şikâyet, tespit, yapılan işlem, serbest not. */
export const aiCaseInputSchema = z
  .object({
    topic: oneLine("Konu", 160),
    district: z.enum(BLOG_DISTRICTS, { error: `İlçe şunlardan biri olmalı: ${BLOG_DISTRICTS.join(", ")}` }),
    neighborhood: z.string().transform(value => value.trim()).refine(value => value.length <= 60 && !BLOG_CONTROL_CHARS.test(value), "Mahalle tek satır ve en fazla 60 karakter olmalı").optional(),
    brand: z.string({ error: "Marka zorunlu" }).refine(value => BLOG_BRANDS.some(brand => brand.name === value), "Marka listeden seçilmeli"),
    device: z.string({ error: "Cihaz zorunlu" }).refine(value => AI_CASE_DEVICES.includes(value), "Cihaz listeden seçilmeli"),
    /** Yalnızca "Küçük Ev Aletleri" için: kayıtta görünen cihaz adı (ör. Airfryer). */
    deviceName: z.string().transform(value => value.trim()).refine(value => value.length <= 60 && !BLOG_CONTROL_CHARS.test(value), "Cihaz adı tek satır ve en fazla 60 karakter olmalı").optional(),
    complaint: oneLine("Şikâyet", 300),
    finding: oneLine("Tespit", 300),
    action: oneLine("Yapılan işlem", 300),
    note: z.string().transform(value => value.trim()).refine(value => value.length <= AI_NOTE_MAX, `Serbest not en fazla ${AI_NOTE_MAX} karakter olmalı`).optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.device === SMALL_APPLIANCE_DEVICE && !input.deviceName) ctx.addIssue({ code: "custom", path: ["deviceName"], message: "Küçük ev aletinde cihaz adı zorunlu (ör. Airfryer)" });
    const text = JSON.stringify(input);
    const forbidden = text.match(BLOG_FORBIDDEN_TEXT);
    if (forbidden) ctx.addIssue({ code: "custom", path: [], message: `Girdide yasak ifade var: "${forbidden[0]}" (hukuki konu, tazminat ve fiyat yazılmaz)` });
    const claim = text.match(BLOG_AUTHORIZED_SERVICE_CLAIM);
    if (claim) ctx.addIssue({ code: "custom", path: [], message: `Yetkili servis iddiası yapılamaz: "${claim[0]}"` });
  });

export type AiCaseInput = z.infer<typeof aiCaseInputSchema>;

const social = (label: string, max: number) =>
  z
    .string({ error: `${label} zorunlu` })
    .transform(value => value.trim())
    .refine(value => value.length >= SOCIAL_MIN, `${label} çok kısa (en az ${SOCIAL_MIN} karakter)`)
    .refine(value => value.length <= max, `${label} en fazla ${max} karakter olmalı`)
    .refine(value => !/[\u0000-\u0009\u000b-\u001f\u007f\u2028\u2029]/.test(value), `${label} denetim karakteri içeremez`);

/** Modelin yazabildiği alanların TAMAMI. `.strict()`: slug, adres, servis kaydı, kaynak gibi fazladan alan gelirse çıktı reddedilir. */
export const aiDraftOutputSchema = z
  .object({
    title: z.string({ error: "Başlık zorunlu" }),
    description: z.string({ error: "Açıklama zorunlu" }),
    excerpt: z.string({ error: "Özet zorunlu" }),
    blocks: z.array(blogBlockSchema).min(5, "Yazı en az 5 blok içermeli").max(24, "Yazı en fazla 24 blok içerebilir"),
    googleBusiness: social("Google İşletme metni", AI_GOOGLE_BUSINESS_MAX),
    instagram: social("Instagram metni", AI_INSTAGRAM_MAX),
  })
  .strict();

export type AiDraftOutput = z.infer<typeof aiDraftOutputSchema>;
export type AiDraft = { post: BlogPostInput; googleBusiness: string; instagram: string };
export type AiDraftCheck = { ok: true; draft: AiDraft } | { ok: false; errors: string[] };

const issues = (error: z.ZodError, root: string) => error.issues.map(item => `${item.path.length ? item.path.join(".") : root}: ${item.message}`);

export function validateAiCaseInput(data: unknown): { ok: true; input: AiCaseInput } | { ok: false; errors: string[] } {
  const result = aiCaseInputSchema.safeParse(data);
  return result.success ? { ok: true, input: result.data } : { ok: false, errors: issues(result.error, "girdi") };
}

/** Servis kaydı: girilen bilgi aynen, başka hiçbir şey. */
export function caseFileFromInput(input: AiCaseInput): NonNullable<BlogPostInput["caseFile"]> {
  return {
    district: input.neighborhood ? `${input.district} · ${input.neighborhood}` : input.district,
    brand: input.brand,
    device: input.device === SMALL_APPLIANCE_DEVICE ? (input.deviceName ?? "") : defaultCaseDeviceName(input.device),
    complaint: input.complaint,
    finding: input.finding,
    action: input.action,
  };
}

const lower = (value: string) => value.toLocaleLowerCase("tr-TR");
const inputText = (input: AiCaseInput) => [input.topic, input.district, input.neighborhood, input.brand, input.device, input.deviceName, input.complaint, input.finding, input.action, input.note].filter(Boolean).join("\n");
const outputText = (output: AiDraftOutput) =>
  [
    output.title, output.description, output.excerpt, output.googleBusiness, output.instagram,
    ...output.blocks.flatMap(block => (block.type === "p" || block.type === "h2" ? [block.text] : block.type === "list" ? block.items : block.type === "steps" ? block.items.flatMap(item => [item.title, item.text]) : [block.title, block.text])),
  ].join("\n");

const LETTER = "\\p{L}";
const word = (value: string) => new RegExp(`(?<!${LETTER})${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "u");

/**
 * Girdide geçmediği sürece çıktıda da geçemeyecek ifadeler (küçük harfe çevrilmiş metinde aranır).
 * Amaç: modelin vakaya tarih, kişi, adres ya da söz/vaat eklemesini yakalamak. Genel teknik açıklama bunlara ihtiyaç duymaz.
 */
const UNGROUNDED_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "tarih/zaman", pattern: /(?<!\p{L})(şubat|mart ayı|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim ayı|kasım|pazartesi|çarşamba|perşembe|cumartesi|dün|geçen (hafta|ay|yıl|gün)|bu sabah|hafta sonu|bayram)(?!\p{L})/u },
  { label: "süre/yaş (yazıyla sayı)", pattern: /(?<!\p{L})(yarım|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|yirmi|otuz|kırk|elli)\s+(gün|saat|dakika|hafta|ay|yıl|sene|yıllık|senelik|yaşında|kez|kere|defa)(?!\p{L})/u },
  { label: "kişi", pattern: /(?<!\p{L})(hanım|bey|teyze|amca|dede|nine|yaşındaki|emekli|öğretmen|öğrenci)(?!\p{L})/u },
  { label: "adres", pattern: /(?<!\p{L})(mahalle|sokak|sokağ|cadde|bulvar|apartman|sitesi)/u },
  { label: "söz/vaat", pattern: /(aynı gün|garantili|garanti veriyoruz|garantisi veriyoruz|ücretsiz|indirim|kampanya|en uygun|en ucuz|en iyi servis)/u },
  { label: "doğrulanamayan iddia", pattern: /(yıllık tecrübe|yıllık deneyim|binlerce|yüzlerce|müşteri memnuniyeti|en yaygın|şikâyetlerin çoğu)/u },
  { label: "bağlantı/iletişim", pattern: /(https?:|www\.|\.com|\.net|\.org|@)/u },
];

/**
 * Model çıktısında girdide bulunmayan vaka ayrıntılarını arar; boş dizi = sorun yok.
 *  - Rakam: çıktıdaki her sayı girdide de geçmelidir (model kodu, hata kodu, yaş, süre, tarih, derece, fiyat… uydurulamaz).
 *  - Marka / ilçe: girdide geçmeyen başka bir marka ya da hizmet bölgesi yazılamaz.
 *  - Tarih, kişi, adres, söz/vaat, bağlantı: girdide geçmiyorsa yazılamaz.
 *  - Şemanın yasakları (fiyat, hukuki konu, yetkili servis iddiası) sosyal metinlerde de geçerlidir.
 */
export function findUngroundedDetails(input: AiCaseInput, output: AiDraftOutput): string[] {
  const source = inputText(input);
  const text = outputText(output);
  const sourceLower = lower(source);
  const textLower = lower(text);
  const errors: string[] = [];

  const known = new Set(source.match(/\d+/g) ?? []);
  const invented = [...new Set(text.match(/\d+/g) ?? [])].filter(number => !known.has(number));
  if (invented.length) errors.push(`Girdide olmayan sayı: ${invented.slice(0, 6).join(", ")}`);

  for (const district of BLOG_DISTRICTS) if (district !== input.district && word(district).test(text) && !word(district).test(source)) errors.push(`Girdide olmayan ilçe: ${district}`);
  for (const brand of BLOG_BRANDS) if (brand.name !== input.brand && new RegExp(`${word(brand.name).source}(?!${LETTER})`, "u").test(text) && !source.includes(brand.name)) errors.push(`Girdide olmayan marka: ${brand.name}`);

  for (const { label, pattern } of UNGROUNDED_PATTERNS) {
    const found = textLower.match(pattern);
    if (!found) continue;
    if (label === "adres" && found[0] === "mahalle" && input.neighborhood) continue;
    if (!sourceLower.includes(found[0])) errors.push(`Girdide olmayan ayrıntı (${label}): "${found[0]}"`);
  }

  const forbidden = text.match(BLOG_FORBIDDEN_TEXT);
  if (forbidden) errors.push(`Yasak ifade: "${forbidden[0]}" (hukuki konu, tazminat ve fiyat yazılmaz)`);
  const claim = text.match(BLOG_AUTHORIZED_SERVICE_CLAIM);
  if (claim) errors.push(`Yetkili servis iddiası yapılamaz: "${claim[0]}"`);
  return errors;
}

/** Yazı kalıbı: ara başlık, kullanıcıya dönük liste/adımlar ve tek bir usta notu bulunmalı. */
function structureErrors(output: AiDraftOutput): string[] {
  const types = output.blocks.map(block => block.type);
  const errors: string[] = [];
  if (types[0] !== "p") errors.push("Yazı paragrafla başlamalı (giriş: şikâyet ve elenen basit ihtimaller)");
  if (!types.includes("h2")) errors.push("Yazıda en az bir ara başlık olmalı");
  if (!types.includes("list") && !types.includes("steps")) errors.push("Yazıda kullanıcıya dönük bir liste ya da adımlar olmalı");
  if (types.filter(type => type === "note").length !== 1) errors.push("Yazıda tam bir tane usta notu olmalı");
  return errors;
}

/**
 * Model çıktısını (ham JSON değeri) doğrular ve editöre dolacak taslağı kurar. Herhangi bir denetim tutmazsa taslak ÜRETİLMEZ.
 * `order` yalnızca şema denetimi içindir; editör kendi sırasını verir, kaydederken sunucu yeniden belirler.
 */
export function buildAiDraft(input: AiCaseInput, raw: unknown, today: string, order = 1): AiDraftCheck {
  const parsed = aiDraftOutputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: issues(parsed.error, "çıktı") };
  const output = parsed.data;

  const derived = derivedServiceFields({ device: input.device, brand: input.brand });
  const candidate = {
    slug: slugFromTitle(output.title),
    order,
    status: "draft" as const,
    category: USTA_CATEGORY,
    title: output.title.trim(),
    description: output.description.trim(),
    excerpt: output.excerpt.trim(),
    published: today,
    updated: today,
    device: input.device,
    servicePath: derived.servicePath,
    ...(derived.serviceLabel ? { serviceLabel: derived.serviceLabel } : {}),
    caseFile: caseFileFromInput(input),
    brandPath: derived.brandPath,
    blocks: output.blocks,
  };
  const validation = validateBlogPost(candidate);
  const errors = [...(validation.ok ? [] : validation.errors), ...structureErrors(output), ...findUngroundedDetails(input, output)];
  if (!validation.ok || errors.length) return { ok: false, errors };
  return { ok: true, draft: { post: validation.post, googleBusiness: output.googleBusiness, instagram: output.instagram } };
}

/**
 * Sunucudan gelen taslağı editöre yerleştirmeden önce istemcide yeniden denetler (şema + servis kaydı girdiyle aynı mı)
 * ve sırayı/adresi mevcut yazılarla çakışmayacak şekilde ayarlar. Denetim tutmazsa editöre hiçbir şey dolmaz.
 */
export function placeAiDraft(input: AiCaseInput, draft: unknown, existing: { slug: string; order: number }[], today: string): AiDraftCheck {
  const value = draft as Partial<AiDraft> | null;
  if (!value || typeof value !== "object" || typeof value.googleBusiness !== "string" || typeof value.instagram !== "string") return { ok: false, errors: ["Sunucudan gelen taslak eksik"] };
  const post = value.post as BlogPostInput | undefined;
  const rebuilt = buildAiDraft(input, { title: post?.title, description: post?.description, excerpt: post?.excerpt, blocks: post?.blocks, googleBusiness: value.googleBusiness, instagram: value.instagram }, today, existing.reduce((max, item) => Math.max(max, item.order), 0) + 10);
  if (!rebuilt.ok) return rebuilt;
  const taken = new Set(existing.map(item => item.slug));
  let slug = rebuilt.draft.post.slug;
  for (let n = 2; taken.has(slug); n++) slug = rebuilt.draft.post.slug.replace(/\/$/, `-${n}/`);
  return { ok: true, draft: { ...rebuilt.draft, post: { ...rebuilt.draft.post, slug } } };
}

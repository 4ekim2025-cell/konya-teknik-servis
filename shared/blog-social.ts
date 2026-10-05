/**
 * Paylaşım paketi (5. aşama) — Google İşletme ve Instagram metinleri, düğme türü, "paylaşıldı" durumu ve panel ayarları.
 * Aynı dosyayı sunucu (`server/admin/`) ve panel arayüzü (`client/src/admin/`) kullanır; saf fonksiyonlardır (ağ ve disk yok).
 *
 * Değişmez kurallar:
 *  - Paket `content/social/<ad>.json`, ayarlar `content/settings.json` dosyasında durur. İkisi de ziyaretçi sayfasına, prerender HTML'ine,
 *    sitemap'e, `llms.txt`'ye ve şemaya GİRMEZ: `scripts/build-content.ts` yalnızca `content/blog/` ve `content/redirects.json` okur.
 *    Bu dosyaları siteye okutan hiçbir kod yazılmaz.
 *  - Takip etiketli bağlantı (utm_*) YALNIZCA paylaşım paketinde ve Google'a gönderilen gönderide kullanılır; sitedeki canonical,
 *    sitemap ve iç bağlantılar etiketsiz kalır.
 *  - Sosyal metinler içerik kurallarına uyar: fiyat, hukuki konu, yetkili servis iddiası ve bağlantı/iletişim bilgisi içeremez.
 *  - Gizli değer bu dosyalara yazılmaz (Google anahtarları yalnızca Vercel ortam değişkenidir). Hesap ve konum kimliği anahtar değildir.
 */
import { z } from "zod";
import { SITE_URL } from "./blog-build.js";
import { AI_GOOGLE_BUSINESS_MAX, AI_INSTAGRAM_MAX } from "./blog-ai.js";
import { blogFileName, BLOG_AUTHORIZED_SERVICE_CLAIM, BLOG_FORBIDDEN_TEXT, BLOG_SLUG_PATTERN, isRealDate } from "./blog-schema.js";
import type { BlogPostInput } from "./blog-schema.js";

export const SOCIAL_DIR = "content/social";
export const SETTINGS_PATH = "content/settings.json";
/** Paylaşım paketi ve ayar commit'lerinin mesajına konan işaret: site dosyası değişmediyse `scripts/vercel-ignore-build.sh` derlemeyi atlar. */
export const SOCIAL_SKIP_MARKER = "[panel-paylasim]";

export const GOOGLE_TEXT_MAX = AI_GOOGLE_BUSINESS_MAX;
export const INSTAGRAM_TEXT_MAX = AI_INSTAGRAM_MAX;

/** Google gönderisindeki düğme: LEARN_MORE = "Daha fazla bilgi", CALL = "Hemen ara" (Google'ın CallToAction türleri). */
export const GOOGLE_BUTTONS = ["LEARN_MORE", "CALL"] as const;
export type GoogleButton = (typeof GOOGLE_BUTTONS)[number];
export const GOOGLE_BUTTON_LABELS: Record<GoogleButton, string> = { LEARN_MORE: "Daha fazla bilgi", CALL: "Hemen ara" };

export type SocialChannel = "google" | "instagram";

/** Takip etiketi: yalnızca paylaşım paketinde kullanılır. Sıra ve yazım sabittir (proje sahibinin belirlediği değerler). */
export const TRACKING: Record<SocialChannel, string> = {
  google: "utm_source=google&utm_medium=organic&utm_campaign=gbp-post",
  instagram: "utm_source=instagram&utm_medium=social&utm_campaign=blog-paylasim",
};

/** "/blog/ornek/" → "https://esliteknik.com/blog/ornek/?utm_source=google&…" */
export function trackedUrl(slug: string, channel: SocialChannel): string {
  return `${SITE_URL}${slug}?${TRACKING[channel]}`;
}

/** Yazı adresine etiket eklenmemiş, sitedeki gerçek adres. */
export const plainUrl = (slug: string): string => `${SITE_URL}${slug}`;

/** "/blog/ornek/" → "content/social/ornek.json" */
export const socialPath = (slug: string): string => `${SOCIAL_DIR}/${blogFileName(slug)}`;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CONTROL = /[\u0000-\u0009\u000b-\u001f\u007f\u2028\u2029]/;
/** Sosyal metinde bağlantı ve iletişim bilgisi olmaz: bağlantı düğmeden, telefon profilden gelir (yapay zeka denetimiyle aynı kural). */
const LINK_OR_CONTACT = /(https?:|www\.|\.com|\.net|\.org|@)/i;

/**
 * Elle düzenlenebilir sosyal metin. Boş olabilir (paket henüz yazılmadıysa); doluysa içerik kurallarına uymalıdır.
 * Yapay zekanın "girilmemiş ayrıntı" denetimi (`findUngroundedDetails`) üretim anında çalışır; sonradan elle yazılan metin proje sahibine aittir.
 */
const socialText = (label: string, max: number) =>
  z
    .string({ error: `${label} metin olmalı` })
    .transform(value => value.trim())
    .refine(value => value.length <= max, `${label} en fazla ${max} karakter olmalı`)
    .refine(value => !CONTROL.test(value), `${label} denetim karakteri içeremez`)
    .refine(value => !BLOG_FORBIDDEN_TEXT.test(value), `${label}: yasak ifade var (hukuki konu, tazminat ve fiyat yazılmaz)`)
    .refine(value => !BLOG_AUTHORIZED_SERVICE_CLAIM.test(value), `${label}: yetkili servis iddiası yapılamaz`)
    .refine(value => !LINK_OR_CONTACT.test(value), `${label}: bağlantı ya da iletişim bilgisi içeremez (bağlantı paketten, telefon profilden gelir)`);

const isoDate = (label: string) => z.string().regex(DATE, `${label} YYYY-AA-GG biçiminde olmalı`).refine(isRealDate, `${label} geçerli bir tarih olmalı`);

/** Google'ın döndürdüğü gönderi adı. Adrese yazılacağı için biçim sıkı denetlenir (depodaki dosya güvenilmez girdidir). */
export const GOOGLE_POST_NAME = /^accounts\/\d{1,30}\/locations\/\d{1,30}\/localPosts\/[A-Za-z0-9_-]{1,200}$/;

const googleShared = z
  .object({
    at: isoDate("Paylaşım tarihi"),
    via: z.enum(["manual", "api"], { error: "Paylaşım yolu manual ya da api olmalı" }),
    postName: z.string().regex(GOOGLE_POST_NAME, "Google gönderi adı geçersiz").optional(),
    /** API ile paylaşılan gönderinin düğmesi yazı silinince "Hemen ara"ya çevrildiyse tarih. */
    switchedToCallAt: isoDate("Düğme değişikliği tarihi").optional(),
  })
  .strict();

const instagramShared = z.object({ at: isoDate("Paylaşım tarihi") }).strict();

export const socialRecordSchema = z
  .object({
    slug: z.string().regex(BLOG_SLUG_PATTERN, "Adres /blog/ad/ biçiminde olmalı"),
    googleBusiness: socialText("Google İşletme metni", GOOGLE_TEXT_MAX),
    instagram: socialText("Instagram metni", INSTAGRAM_TEXT_MAX),
    button: z.enum(GOOGLE_BUTTONS, { error: "Düğme LEARN_MORE ya da CALL olmalı" }),
    shared: z.object({ google: googleShared.optional(), instagram: instagramShared.optional() }).strict(),
    updated: isoDate("Güncelleme tarihi"),
  })
  .strict();

export type SocialRecord = z.infer<typeof socialRecordSchema>;

const SOCIAL_ORDER = ["slug", "googleBusiness", "instagram", "button", "shared", "updated"];
const GOOGLE_SHARED_ORDER = ["at", "via", "postName", "switchedToCallAt"];

function ordered(value: Record<string, unknown>, order: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of order) if (value[key] !== undefined) out[key] = value[key];
  return out;
}

/** Dosyaya yazılacak metin: iki boşluk girintili JSON, sabit alan sırası ve son satır sonu (içerik dosyalarıyla aynı biçim). */
export function serializeSocial(record: SocialRecord): string {
  const shared: Record<string, unknown> = {};
  if (record.shared.google) shared.google = ordered(record.shared.google, GOOGLE_SHARED_ORDER);
  if (record.shared.instagram) shared.instagram = ordered(record.shared.instagram, ["at"]);
  return `${JSON.stringify({ ...ordered(record, SOCIAL_ORDER), shared }, null, 2)}\n`;
}

export type SocialValidation = { ok: true; record: SocialRecord } | { ok: false; errors: string[] };

export function validateSocialRecord(data: unknown): SocialValidation {
  const result = socialRecordSchema.safeParse(data);
  if (result.success) return { ok: true, record: result.data };
  return { ok: false, errors: result.error.issues.map(item => `${item.path.length ? item.path.join(".") : "paket"}: ${item.message}`) };
}

/** Depodaki dosya metnini okur; dosya adındaki adres kayıttaki adresle aynı olmalıdır. */
export function parseSocialFile(text: string, slug: string): SocialValidation {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["Geçerli JSON değil"] };
  }
  const result = validateSocialRecord(data);
  if (result.ok && result.record.slug !== slug) return { ok: false, errors: [`Dosya adı adresle uyuşmuyor, "${result.record.slug}" olmalı`] };
  return result;
}

/** Hiç kaydedilmemiş yazı için boş paket. */
export function emptySocialRecord(slug: string, today: string): SocialRecord {
  return { slug, googleBusiness: "", instagram: "", button: "LEARN_MORE", shared: {}, updated: today };
}

// ---------------------------------------------------------------------------------------------------------------------
// Ayarlar

const accountId = z
  .string()
  .transform(value => value.trim().replace(/^(accounts|locations)\//, ""))
  .refine(value => /^\d{1,30}$/.test(value), "Kimlik yalnızca rakamlardan oluşmalı (ör. 1234567890)");

/**
 * `content/settings.json`. Başlangıç: API yok. "API var" için hesap ve konum kimliği zorunludur; Google anahtarları (OAuth) Vercel ortam
 * değişkenindedir ve burada tutulmaz. `sendPhoto`: gönderiye kapak fotoğrafını ekler (Google'ın belgesi JPG/PNG sayar, panelin fotoğrafları
 * WebP'dir; ilk gerçek denemede kabul edilmezse kapalı bırakılır).
 */
export const settingsSchema = z
  .object({
    google: z
      .object({
        mode: z.enum(["none", "api"], { error: "Google modu none ya da api olmalı" }),
        accountId: accountId.optional(),
        locationId: accountId.optional(),
        sendPhoto: z.boolean({ error: "sendPhoto true ya da false olmalı" }),
      })
      .strict()
      .superRefine((google, ctx) => {
        if (google.mode !== "api") return;
        if (!google.accountId) ctx.addIssue({ code: "custom", path: ["accountId"], message: "API için hesap kimliği zorunlu" });
        if (!google.locationId) ctx.addIssue({ code: "custom", path: ["locationId"], message: "API için konum kimliği zorunlu" });
      }),
  })
  .strict();

export type PanelSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: PanelSettings = { google: { mode: "none", sendPhoto: false } };

export type SettingsValidation = { ok: true; settings: PanelSettings } | { ok: false; errors: string[] };

export function validateSettings(data: unknown): SettingsValidation {
  const result = settingsSchema.safeParse(data);
  if (result.success) return { ok: true, settings: result.data };
  return { ok: false, errors: result.error.issues.map(item => `${item.path.length ? item.path.join(".") : "ayarlar"}: ${item.message}`) };
}

export function serializeSettings(settings: PanelSettings): string {
  const google = settings.google;
  return `${JSON.stringify({ google: ordered(google, ["mode", "accountId", "locationId", "sendPhoto"]) }, null, 2)}\n`;
}

// ---------------------------------------------------------------------------------------------------------------------
// Google gönderisi (localPosts.create gövdesi)

export type GoogleLocalPost = {
  languageCode: "tr";
  summary: string;
  topicType: "STANDARD";
  callToAction: { actionType: GoogleButton; url?: string };
  media?: { mediaFormat: "PHOTO"; sourceUrl: string }[];
};

/**
 * Google'a gönderilecek gönderi. "Hemen ara" düğmesinde `url` BOŞ bırakılır (Google belgesi: CALL için url boş olmalı); "Daha fazla bilgi"
 * düğmesi takip etiketli bağlantıyı taşır. Fotoğraf yalnızca `sendPhoto` açıksa ve yazının kapağı varsa eklenir.
 */
export function buildGoogleLocalPost(post: Pick<BlogPostInput, "slug" | "cover">, record: Pick<SocialRecord, "googleBusiness" | "button">, sendPhoto: boolean): GoogleLocalPost {
  const body: GoogleLocalPost = {
    languageCode: "tr",
    summary: record.googleBusiness,
    topicType: "STANDARD",
    callToAction: record.button === "CALL" ? { actionType: "CALL" } : { actionType: "LEARN_MORE", url: trackedUrl(post.slug, "google") },
  };
  if (sendPhoto && post.cover) body.media = [{ mediaFormat: "PHOTO", sourceUrl: post.cover.src }];
  return body;
}

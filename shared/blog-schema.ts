/**
 * Blog yazısı şeması — içerik kurallarının tek kaynağı.
 * Aynı şemayı içerik derleyici (scripts/build-content.ts), testler ve (2. aşamada) panel editörü ile
 * `api/admin` aynen kullanır; böylece kurala aykırı yazı hiçbir yoldan yayınlanamaz.
 *
 * Kurallar CLAUDE.md → "Blog kuralları" bölümünden gelir:
 * kaynaklar yalnızca Türkçe, hukuki konu ve fiyat yok, yetkili servis iddiası yok,
 * "Ustanın Defterinden" yazısı servis kaydı (ilçe, marka) ve marka sayfası bağlantısı taşır.
 */
import { z } from "zod";
import { blogCategories, type BlogCategory, type BlogPost } from "./blog-meta.js";
import { BLOG_IMAGE_ALT_MAX, BLOG_IMAGE_HOST, BLOG_IMAGE_LARGE, BLOG_IMAGE_LIMIT_PER_POST, collectPostImages, isBlogImageUrl } from "./blog-images.js";
import { BLOG_BRANDS, BLOG_DEVICES, GENERAL_SERVICE_PATHS } from "./blog-taxonomy.js";

/** Yazı adresi: /blog/<küçük-harf-ve-tire>/ — sonda eğik çizgi (vercel.json trailingSlash); ad en çok 100 karakter (dosya adı olur). */
export const BLOG_SLUG_PATTERN = /^\/blog\/[a-z0-9-]{1,100}\/$/;
/** Markanın sitedeki servis sayfası: /<marka>-servisi-konya/ */
export const BLOG_BRAND_PATH_PATTERN = /^\/[a-z-]+-servisi-konya\/$/;
/** Hizmet sayfası ya da genel sayfa: /<ad>/ */
export const BLOG_SERVICE_PATH_PATTERN = /^\/[a-z0-9-]+\/$/;
/** Hizmet bölgeleri; usta vakasının ilçesi bunlardan biriyle başlar ("Selçuklu · Yazır" gibi). */
export const BLOG_DISTRICT_PATTERN = /^(Karatay|Meram|Selçuklu)/;
export const BLOG_DESCRIPTION_MAX = 160;
/** Hukuki konu, tazminat süreci ve fiyat yazılmaz. */
export const BLOG_FORBIDDEN_TEXT = /MEDAŞ|tazminat|hakem heyeti|mahkeme|₺|\bTL\b/i;
/** Eşli Teknik bağımsız servistir; yetkili servis iddiası yapılmaz. */
export const BLOG_AUTHORIZED_SERVICE_CLAIM = /yetkili servisiyiz|yetkili servisi olarak/i;
/** Yabancı kamu/kurum kaynakları kabul edilmez. */
export const BLOG_FOREIGN_SOURCE_URL = /\.gov\/|fda\.|cdc\.|usda\./i;
/** Kaynak adresi HTML özniteliğine yazılır; öznitelikten çıkabilecek karakterler adreste kabul edilmez. */
export const BLOG_UNSAFE_URL_CHARS = /["'<>`\\\s]/;
const TURKISH_LETTER = /[çğıöşüÇĞİÖŞÜ]/;

export const USTA_CATEGORY: BlogCategory = "Ustanın Defterinden";

export function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const filled = (field: string) => z.string().refine(value => value.trim().length > 0, `${field} boş olamaz`);
/** Satır sonu ve denetim karakterleri: tek satırlık alanlar llms.txt, başlık ve meta etiketlerine satır olarak yazılır. */
export const BLOG_CONTROL_CHARS = /[\u0000-\u001f\u007f\u2028\u2029]/;
const line = (field: string) => filled(field).refine(value => !BLOG_CONTROL_CHARS.test(value), `${field} tek satır olmalı (satır sonu içeremez)`);

/** Yazının bağlantı verebileceği sayfalar: sitede gerçekten var olan hizmet, marka ve iletişim sayfaları (shared/blog-taxonomy.ts). */
const KNOWN_BRAND_PATHS = new Set(BLOG_BRANDS.map(brand => brand.path));
const KNOWN_SERVICE_PATHS = new Set([...BLOG_DEVICES.flatMap(option => (option.servicePath ? [option.servicePath] : [])), ...KNOWN_BRAND_PATHS, ...GENERAL_SERVICE_PATHS.map(item => item.path)]);
const isoDate = (field: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${field} YYYY-AA-GG biçiminde olmalı`)
    .refine(isRealDate, `${field} geçerli bir tarih olmalı`);

const paragraphBlock = z.object({ type: z.literal("p"), text: filled("Paragraf") }).strict();
const headingBlock = z.object({ type: z.literal("h2"), text: line("Ara başlık") }).strict();
const listBlock = z.object({ type: z.literal("list"), items: z.array(filled("Liste maddesi")).min(1, "Liste en az bir madde içermeli") }).strict();
const stepsBlock = z
  .object({
    type: z.literal("steps"),
    items: z.array(z.object({ title: line("Adım başlığı"), text: filled("Adım metni") }).strict()).min(1, "Adımlar en az bir adım içermeli"),
  })
  .strict();
const noteBlock = z.object({ type: z.literal("note"), title: line("Not başlığı"), text: filled("Not metni") }).strict();

/**
 * Metin blokları. Yapay zeka taslağı yalnızca bunları kullanabilir (shared/blog-ai.ts): fotoğraf bloğu burada YOKTUR,
 * yani model fotoğraf bloğu ya da fotoğraf adresi üretemez.
 */
export const blogBlockSchema = z.discriminatedUnion("type", [paragraphBlock, headingBlock, listBlock, stepsBlock, noteBlock]);

/** Fotoğraf alanları: adres yalnızca `imageHost` alanından ve panelin verdiği biçimde olabilir; alt metin zorunludur. */
const imageShape = (imageHost: string) => ({
  src: z.string().refine(value => isBlogImageUrl(value, imageHost), "Fotoğraf adresi bu sitenin fotoğraf alanından (Vercel Blob) ve panelin verdiği biçimde olmalı"),
  alt: line("Alt metin").refine(value => value.length <= BLOG_IMAGE_ALT_MAX, `Alt metin en fazla ${BLOG_IMAGE_ALT_MAX} karakter olmalı`),
  width: z.number().int("Fotoğraf genişliği tam sayı olmalı").min(1, "Fotoğraf genişliği geçersiz").max(BLOG_IMAGE_LARGE, `Fotoğraf genişliği en çok ${BLOG_IMAGE_LARGE} px olmalı`),
  height: z.number().int("Fotoğraf yüksekliği tam sayı olmalı").min(1, "Fotoğraf yüksekliği geçersiz").max(BLOG_IMAGE_LARGE, `Fotoğraf yüksekliği en çok ${BLOG_IMAGE_LARGE} px olmalı`),
});

export const blogCaseFileSchema = z
  .object({
    district: line("İlçe"),
    brand: line("Marka"),
    device: line("Cihaz"),
    complaint: line("Şikâyet"),
    finding: line("Tespit"),
    action: line("Yapılan işlem"),
  })
  .strict();

export const blogSourceSchema = z
  .object({
    label: z
      .string()
      .refine(value => TURKISH_LETTER.test(value), "Kaynak adı Türkçe olmalı (yalnızca Türkçe kaynak kullanılır)")
      .refine(value => !BLOG_CONTROL_CHARS.test(value), "Kaynak adı tek satır olmalı (satır sonu içeremez)"),
    url: z
      .string()
      .refine(isHttpUrl, "Kaynak adresi geçerli bir bağlantı olmalı")
      .refine(value => !BLOG_UNSAFE_URL_CHARS.test(value), "Kaynak adresi tırnak, <, > ya da boşluk içeremez")
      .refine(value => !BLOG_FOREIGN_SOURCE_URL.test(value), "Yabancı kurum kaynağı kullanılamaz"),
  })
  .strict();

const blogCategorySchema = z.custom<BlogCategory>(
  value => typeof value === "string" && (blogCategories as string[]).includes(value),
  `Kategori şunlardan biri olmalı: ${blogCategories.join(", ")}`,
);

/** Yazı şeması. `imageHost`: fotoğraf adreslerinin geçebileceği tek alan (varsayılan: shared/blog-images.ts → BLOG_IMAGE_HOST). */
export const createBlogPostSchema = (imageHost: string) => {
  const postBlockSchema = z.discriminatedUnion("type", [paragraphBlock, headingBlock, listBlock, stepsBlock, noteBlock, z.object({ type: z.literal("image"), ...imageShape(imageHost) }).strict()]);
  return (
  z
    .object({
      slug: z.string().regex(BLOG_SLUG_PATTERN, "Adres /blog/kucuk-harf-ve-tire/ biçiminde olmalı"),
      /** Listelerde sıra (küçük olan önce). Araya yazı eklemek için 10'ar aralıkla verilir. Siteye gitmez. */
      order: z.number().int("Sıra tam sayı olmalı").positive("Sıra pozitif olmalı"),
      /** Yoksa yayında kabul edilir. Taslaklar siteye, sitemap'e ve llms.txt'ye alınmaz. Siteye gitmez. */
      status: z.enum(["published", "draft"]).optional(),
      category: blogCategorySchema,
      title: line("Başlık"),
      description: line("Açıklama").refine(value => value.length <= BLOG_DESCRIPTION_MAX, `Açıklama en fazla ${BLOG_DESCRIPTION_MAX} karakter olmalı`),
      excerpt: line("Özet"),
      /** İsteğe bağlı kapak fotoğrafı; paylaşım görseli (og:image) ve BlogPosting şemasına girer. */
      cover: z.object(imageShape(imageHost)).strict().optional(),
      published: isoDate("Yayın tarihi"),
      updated: isoDate("Güncelleme tarihi"),
      device: line("Cihaz"),
      servicePath: z.string().regex(BLOG_SERVICE_PATH_PATTERN, "Hizmet adresi /ad/ biçiminde olmalı"),
      caseFile: blogCaseFileSchema.optional(),
      brandPath: z.string().regex(BLOG_BRAND_PATH_PATTERN, "Marka adresi /marka-servisi-konya/ biçiminde olmalı").optional(),
      serviceLabel: line("Servis düğmesi metni").optional(),
      blocks: z.array(postBlockSchema).min(1, "Yazı en az bir blok içermeli"),
      sources: z.array(blogSourceSchema).optional(),
    })
    .strict()
    .superRefine((post, ctx) => {
      const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });

      if (post.published && post.updated && post.updated < post.published) issue(["updated"], "Güncelleme tarihi yayın tarihinden önce olamaz");

      if (post.category === USTA_CATEGORY) {
        if (!post.caseFile) issue(["caseFile"], "Ustanın Defterinden yazısında servis kaydı (ilçe, marka, cihaz, şikâyet, tespit, işlem) zorunlu");
        else if (!BLOG_DISTRICT_PATTERN.test(post.caseFile.district)) issue(["caseFile", "district"], "İlçe Karatay, Meram veya Selçuklu ile başlamalı");
        if (!post.brandPath) issue(["brandPath"], "Ustanın Defterinden yazısında markanın servis sayfası (brandPath) zorunlu");
      }

      // Biçimi doğru ama sitede olmayan sayfa ölü iç bağlantı (ve silmede 404'e yönlendirme) üretirdi.
      if (BLOG_SERVICE_PATH_PATTERN.test(post.servicePath) && !KNOWN_SERVICE_PATHS.has(post.servicePath)) issue(["servicePath"], "Hizmet adresi sitedeki bir hizmet, marka ya da iletişim sayfası olmalı");
      if (post.brandPath && BLOG_BRAND_PATH_PATTERN.test(post.brandPath) && !KNOWN_BRAND_PATHS.has(post.brandPath)) issue(["brandPath"], "Marka adresi sitedeki bir marka sayfası olmalı");

      if (collectPostImages(post).length > BLOG_IMAGE_LIMIT_PER_POST) issue(["blocks"], `Bir yazıda kapak dahil en çok ${BLOG_IMAGE_LIMIT_PER_POST} fotoğraf olabilir`);

      const text = JSON.stringify(post);
      const forbidden = text.match(BLOG_FORBIDDEN_TEXT);
      if (forbidden) issue([], `Yazıda yasak ifade var: "${forbidden[0]}" (hukuki konu, tazminat ve fiyat yazılmaz)`);
      const claim = text.match(BLOG_AUTHORIZED_SERVICE_CLAIM);
      if (claim) issue([], `Yetkili servis iddiası yapılamaz: "${claim[0]}"`);
    })
  );
};

export const blogPostSchema = createBlogPostSchema(BLOG_IMAGE_HOST);
const schemaByHost = new Map<string, typeof blogPostSchema>([[BLOG_IMAGE_HOST, blogPostSchema]]);

/** Dosyadaki ham hâliyle bir yazı (panel/derleyici girdisi). */
export type BlogPostInput = z.infer<typeof blogPostSchema>;

// Şema çıktısı sitedeki BlogPost türüyle uyumlu kalmalı; uyumsuzluk tsc'de hata verir.
type SchemaMatchesBlogPost = Omit<BlogPostInput, "order" | "status"> extends BlogPost ? true : never;
export const schemaMatchesBlogPost: SchemaMatchesBlogPost = true;

export type BlogValidation = { ok: true; post: BlogPostInput } | { ok: false; errors: string[] };

/** Tek yazıyı doğrular; hataları "alan: mesaj" biçiminde Türkçe döndürür. */
export function validateBlogPost(data: unknown, imageHost: string = BLOG_IMAGE_HOST): BlogValidation {
  let schema = schemaByHost.get(imageHost);
  if (!schema) {
    schema = createBlogPostSchema(imageHost);
    schemaByHost.set(imageHost, schema);
  }
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, post: result.data };
  return {
    ok: false,
    errors: result.error.issues.map(item => {
      const where = item.path.length ? item.path.join(".") : "yazı";
      return `${where}: ${item.message}`;
    }),
  };
}

/** Yazılar arası kurallar: adres, açıklama ve sıra benzersiz olmalı. */
export function validateBlogCollection(posts: BlogPostInput[]): string[] {
  const errors: string[] = [];
  const seen = (pick: (post: BlogPostInput) => string | number, label: string) => {
    const first = new Map<string | number, string>();
    for (const post of posts) {
      const key = pick(post);
      const other = first.get(key);
      if (other) errors.push(`${label} tekrar ediyor: ${String(key).slice(0, 60)} (${other} ve ${post.slug})`);
      else first.set(key, post.slug);
    }
  };
  seen(post => post.slug, "Adres");
  seen(post => post.description, "Açıklama");
  seen(post => post.order, "Sıra numarası");
  return errors;
}

/** "/blog/ornek-yazi/" → "ornek-yazi.json" */
export function blogFileName(slug: string): string {
  return `${slug.replace(/^\/blog\//, "").replace(/\/$/, "")}.json`;
}

/**
 * Blog fotoğrafları: adres kuralı, boyutlar ve sürüm adları. Saf ve bağımlılıksızdır; şema (shared/blog-schema.ts), panel API'si
 * (server/admin), editör, React ve prerender aynı kuralları buradan alır.
 *
 * Her fotoğraf Vercel Blob'a (herkese açık store) iki sürüm olarak yazılır; adlarını SUNUCU belirler:
 *   blog/<32 onaltılık karakter>-1600.webp   (en uzun kenar ≤ 1600 px, bilgisayar)
 *   blog/<aynı kimlik>-800.webp              (en uzun kenar ≤ 800 px, telefon)
 * Yazıda yalnızca 1600 sürümünün adresi, alt metni ve boyutu saklanır; 800 sürümü adresten türetilir.
 *
 * Yazıdaki fotoğraf adresi YALNIZCA bu projenin store alanından olabilir (BLOG_IMAGE_HOST). Alan boşken hiçbir adres geçmez.
 */

/**
 * Blob store'un herkese açık alanı, ör. "abc123xyz.public.blob.vercel-storage.com". Bu bir sır DEĞİLDİR (her fotoğraf adresinde görünür).
 * Store Vercel'de oluşturulduktan sonra buraya yazılır. Boşken şema hiçbir fotoğraf adresini kabul etmez (güvenli varsayılan).
 */
export const BLOG_IMAGE_HOST = "";

export const BLOG_IMAGE_PREFIX = "blog/";
export const BLOG_IMAGE_LARGE = 1600;
export const BLOG_IMAGE_SMALL = 800;
/** Alt metin: ekran okuyucu ve görsel arama için zorunlu; kısa ve tek satır. */
export const BLOG_IMAGE_ALT_MAX = 200;
/** Bir yazıdaki en çok fotoğraf (kapak dahil): Hobby Blob kotasını (aylık işlem, depolama) korur. */
export const BLOG_IMAGE_LIMIT_PER_POST = 10;
/** Sunucunun kabul ettiği en büyük dosya boyutları (bayt). İstemci küçültmesi bunların altında kalacak şekilde ayarlanır. */
export const BLOG_IMAGE_MAX_BYTES = { large: 500 * 1024, small: 200 * 1024 } as const;
/** Hobby planında Blob depolama kotası (1 GB). Vercel'in GB tanımı değişirse yalnızca göstergedeki yüzde kayar. */
export const BLOB_HOBBY_STORAGE_BYTES = 1024 ** 3;

export type BlogImageFields = { src: string; alt: string; width: number; height: number };

const ID_PATTERN = "[0-9a-f]{32}";
const LARGE_PATH = new RegExp(`^/blog/(${ID_PATTERN})-${BLOG_IMAGE_LARGE}\\.webp$`);
/** Blob içindeki yol (host olmadan): yalnızca panelin yazdığı biçim. Temizlik ve silme yalnızca bu kalıba uyan yollara dokunur. */
export const BLOG_IMAGE_BLOB_PATH = new RegExp(`^blog/(${ID_PATTERN})-(${BLOG_IMAGE_LARGE}|${BLOG_IMAGE_SMALL})\\.webp$`);

/** Adres tam olarak `https://<host>/blog/<kimlik>-1600.webp` biçiminde mi? Sorgu, parça, kullanıcı bilgisi, port ve büyük harf kabul edilmez. */
export function isBlogImageUrl(value: unknown, host: string = BLOG_IMAGE_HOST): boolean {
  if (typeof value !== "string" || !host || host !== host.toLowerCase()) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.host !== host || url.username || url.password || url.search || url.hash) return false;
  return LARGE_PATH.test(url.pathname) && value === `https://${host}${url.pathname}`;
}

/** Fotoğraf kimliği (32 onaltılık karakter); adres geçerli biçimde değilse null. */
export function blogImageId(src: string): string | null {
  try {
    return LARGE_PATH.exec(new URL(src).pathname)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** 1600 sürümünün adresinden 800 sürümünün adresi. */
export const blogImageSmallUrl = (src: string): string => src.replace(new RegExp(`-${BLOG_IMAGE_LARGE}\\.webp$`), `-${BLOG_IMAGE_SMALL}.webp`);

/** Blob içindeki iki sürümün yolu (silme için). Adres geçerli biçimde değilse boş. */
export function blogImageBlobPaths(src: string): string[] {
  const id = blogImageId(src);
  return id ? [`${BLOG_IMAGE_PREFIX}${id}-${BLOG_IMAGE_LARGE}.webp`, `${BLOG_IMAGE_PREFIX}${id}-${BLOG_IMAGE_SMALL}.webp`] : [];
}

/** En uzun kenarı `max` pikseli aşmayacak şekilde küçültülmüş boyut; büyütme yapılmaz. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** 800 sürümünün beklenen boyutu (1600 sürümünün boyutundan). */
export const blogImageSmallSize = (image: Pick<BlogImageFields, "width" | "height">) => fitWithin(image.width, image.height, BLOG_IMAGE_SMALL);

/** `srcset` değeri: telefon 800, bilgisayar 1600 sürümünü alır. */
export function blogImageSrcSet(image: BlogImageFields): string {
  return `${blogImageSmallUrl(image.src)} ${blogImageSmallSize(image).width}w, ${image.src} ${image.width}w`;
}

/** Fotoğraf `sizes` değeri: makale sütunu en çok 760 px. */
export const BLOG_IMAGE_SIZES = "(min-width: 1024px) 760px, 100vw";

type PostWithImages = { cover?: BlogImageFields; blocks: readonly { type: string }[] };

/** Yazıdaki tüm fotoğraflar: kapak ve görsel blokları (sıra: kapak önce). */
export function collectPostImages(post: PostWithImages): BlogImageFields[] {
  const images: BlogImageFields[] = post.cover ? [post.cover] : [];
  for (const block of post.blocks) if (block.type === "image") images.push(block as unknown as BlogImageFields);
  return images;
}

/** Yazıdaki fotoğrafların kimlikleri (tekrarsız). */
export function postImageIds(post: PostWithImages): Set<string> {
  const ids = new Set<string>();
  for (const image of collectPostImages(post)) {
    const id = blogImageId(image.src);
    if (id) ids.add(id);
  }
  return ids;
}

/** Blob yolundan ("blog/<kimlik>-1600.webp") kimlik; panelin yazdığı biçimde değilse null. */
export const blobPathImageId = (pathname: string): string | null => BLOG_IMAGE_BLOB_PATH.exec(pathname)?.[1] ?? null;

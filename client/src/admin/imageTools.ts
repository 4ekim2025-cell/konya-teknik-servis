/**
 * Tarayıcıda fotoğraf hazırlama: yönü düzeltir, 1600 ve 800 piksellik WebP sürümleri üretir.
 * Canvas'a çizilip yeniden kodlanan görüntü kaynak dosyadaki EXIF (konum, cihaz, tarih), XMP ve renk profilini TAŞIMAZ;
 * konum verisinin silinmesi bu yeniden kodlamayla sağlanır. Sunucu bunu ayrıca denetler: üst veri taşıyan dosya reddedilir (server/admin/images.ts).
 */
import { BLOG_IMAGE_LARGE, BLOG_IMAGE_MAX_BYTES, BLOG_IMAGE_SMALL, fitWithin } from "@shared/blog-images";

export const IMAGE_INPUT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_INPUT_MAX_BYTES = 30 * 1024 * 1024;
/** Dosya sınırına sığana kadar denenen WebP kaliteleri. */
export const WEBP_QUALITIES = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34] as const;

export class ImagePrepareError extends Error {}

/** Kaliteyi düşürerek `maxBytes` sınırına sığan ilk WebP'yi döndürür. Tarayıcı WebP üretemiyorsa (PNG'ye düşerse) anlaşılır hata verir. */
export async function encodeUnderLimit(encode: (quality: number) => Promise<Blob | null>, maxBytes: number): Promise<Blob> {
  for (const quality of WEBP_QUALITIES) {
    const blob = await encode(quality);
    if (!blob || blob.type !== "image/webp") throw new ImagePrepareError("Bu tarayıcı WebP üretemiyor; Chrome, Edge veya Firefox ile deneyin.");
    if (blob.size <= maxBytes) return blob;
  }
  throw new ImagePrepareError(`Fotoğraf ${Math.round(maxBytes / 1024)} KB sınırına küçültülemedi; daha sade bir fotoğraf deneyin.`);
}

export type PreparedImage = { large: Blob; small: Blob; width: number; height: number };

function canvasBlob(source: ImageBitmap, width: number, height: number): (quality: number) => Promise<Blob | null> {
  return quality =>
    new Promise(resolve => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return resolve(null);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(source, 0, 0, width, height);
      canvas.toBlob(resolve, "image/webp", quality);
    });
}

/** Seçilen dosyayı denetler, yönünü düzeltip iki WebP sürümüne çevirir. Dosyanın kendisi hiçbir zaman sunucuya gitmez. */
export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!(IMAGE_INPUT_TYPES as readonly string[]).includes(file.type)) throw new ImagePrepareError("Yalnızca JPEG, PNG veya WebP fotoğraf seçilebilir (iPhone HEIC ise önce JPEG olarak paylaşın).");
  if (file.size > IMAGE_INPUT_MAX_BYTES) throw new ImagePrepareError("Dosya 30 MB'tan büyük; daha küçük bir fotoğraf seçin.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImagePrepareError("Fotoğraf okunamadı; dosya bozuk olabilir.");
  }
  try {
    const large = fitWithin(bitmap.width, bitmap.height, BLOG_IMAGE_LARGE);
    const small = fitWithin(large.width, large.height, BLOG_IMAGE_SMALL);
    const largeBlob = await encodeUnderLimit(canvasBlob(bitmap, large.width, large.height), BLOG_IMAGE_MAX_BYTES.large);
    const smallBlob = await encodeUnderLimit(canvasBlob(bitmap, small.width, small.height), BLOG_IMAGE_MAX_BYTES.small);
    return { large: largeBlob, small: smallBlob, width: large.width, height: large.height };
  } finally {
    bitmap.close();
  }
}

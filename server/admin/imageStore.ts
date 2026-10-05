/**
 * Fotoğraf deposunun iş mantığı: yükleme, yazı silinince temizlik, kullanım ölçümü ve kullanılmayan fotoğrafları temizleme.
 * Blob erişimi `BlobClient` arayüzünden geçer (testlerde bellek içi taklit). Silme yalnızca panelin yazdığı ad kalıbına
 * (`blog/<kimlik>-1600|800.webp`) uyan dosyalara dokunur; istemciden gelen bir adres hiçbir zaman doğrudan silinmez.
 *
 * Hobby kotası (1 GB depolama, 2.000 gelişmiş işlem; aşılırsa Blob 30 gün kapanır) bu yüzden şöyle korunur:
 *  - bir yazıda en çok 10 fotoğraf, günlük yükleme sınırı (handler), dosya başına boyut sınırı (images.ts);
 *  - kullanım ölçümü `list()` ile yapılır ve her çağrı gelişmiş işlemdir: yalnızca "Kullanımı göster" düğmesiyle çalışır, otomatik değildir;
 *  - silme (`del`) ücretsizdir ama saniyede 15 işlem sınırı vardır: küçük gruplarla ve aralıklı silinir.
 */
import { randomBytes } from "node:crypto";
import { BLOB_HOBBY_STORAGE_BYTES, BLOG_IMAGE_LARGE, BLOG_IMAGE_PREFIX, BLOG_IMAGE_SMALL, blobPathImageId, blogImageSmallUrl, isBlogImageUrl } from "../../shared/blog-images.js";
import type { BlobClient, BlobObject } from "./blob.js";
import type { CheckedUpload } from "./images.js";

export class ImageStoreError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "ImageStoreError";
  }
}

/** Yazıya girmemiş fotoğraf, bu süreden yeni ise "kullanılmıyor" sayılmaz: editörde açık, henüz kaydedilmemiş yazının fotoğrafı olabilir. */
export const UNREFERENCED_GRACE_MS = 24 * 60 * 60 * 1000;
/** Kullanım ölçümünde en çok bu kadar sayfa (her sayfa en çok 1000 dosya ve bir gelişmiş işlem) okunur. */
const LIST_PAGES = 5;
const DELETE_CHUNK = 10;
const DELETE_PAUSE_MS = 700;
/** Tek temizlik isteğinde en çok bu kadar dosya silinir; kalan için düğmeye yeniden basılır. */
const CLEANUP_MAX_FILES = 40;

export type ImageUsage = {
  storageBytes: number;
  limitBytes: number;
  imageCount: number;
  referencedImages: number;
  unreferencedImages: number;
  unreferencedBytes: number;
  /** Okunan sayfa sınırına takıldıysa toplam eksik olabilir. */
  truncated: boolean;
  graceHours: number;
};

type Group = { bytes: number; newest: number; objects: BlobObject[] };

export function createImageStore(blob: BlobClient, imageHost: string, options: { sleep?: (ms: number) => Promise<void>; now?: () => number } = {}) {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;

  async function removeUrls(urls: string[]): Promise<void> {
    for (let index = 0; index < urls.length; index += DELETE_CHUNK) {
      if (index > 0) await sleep(DELETE_PAUSE_MS);
      await blob.del(urls.slice(index, index + DELETE_CHUNK));
    }
  }

  async function survey(referenced: ReadonlySet<string>) {
    const listing = await blob.list(BLOG_IMAGE_PREFIX, LIST_PAGES);
    const groups = new Map<string, Group>();
    let storageBytes = 0;
    for (const object of listing.objects) {
      storageBytes += object.size;
      const id = blobPathImageId(object.pathname);
      if (!id) continue;
      const group = groups.get(id) ?? { bytes: 0, newest: 0, objects: [] };
      group.bytes += object.size;
      group.newest = Math.max(group.newest, object.uploadedAt);
      group.objects.push(object);
      groups.set(id, group);
    }
    const cutoff = now() - UNREFERENCED_GRACE_MS;
    const unreferenced = [...groups.entries()].filter(([id, group]) => !referenced.has(id) && group.newest < cutoff);
    return { listing, groups, storageBytes, unreferenced };
  }

  return {
    /** Doğrulanmış iki sürümü Blob'a yazar; adı sunucu üretir. Yazılan adres beklenen alandan değilse yazılanlar geri silinir. */
    async upload(upload: CheckedUpload): Promise<{ src: string; width: number; height: number }> {
      if (!imageHost) throw new ImageStoreError(503, "image_host_not_configured", "Fotoğraf alanı ayarlanmamış (shared/blog-images.ts → BLOG_IMAGE_HOST). Blob store oluşturulduktan sonra adresi oraya yazılmalı.");
      const id = randomBytes(16).toString("hex");
      const large = await blob.put(`${BLOG_IMAGE_PREFIX}${id}-${BLOG_IMAGE_LARGE}.webp`, upload.large, "image/webp");
      let small: { url: string };
      try {
        small = await blob.put(`${BLOG_IMAGE_PREFIX}${id}-${BLOG_IMAGE_SMALL}.webp`, upload.small, "image/webp");
      } catch (error) {
        await blob.del([large.url]).catch(() => undefined);
        throw error;
      }
      if (!isBlogImageUrl(large.url, imageHost) || small.url !== blogImageSmallUrl(large.url)) {
        await blob.del([large.url, small.url]).catch(() => undefined);
        throw new ImageStoreError(502, "image_host_mismatch", "Blob store adresi ayarlı fotoğraf alanıyla uyuşmuyor; yüklenen dosyalar silindi. shared/blog-images.ts → BLOG_IMAGE_HOST değerini store adresiyle eşleştirin.");
      }
      return { src: large.url, width: upload.width, height: upload.height };
    },

    /** Verilen kimliklerin iki sürümünü siler (yazı silinirken). Dönüş: istenen dosya sayısı. */
    async removeImages(ids: readonly string[]): Promise<number> {
      if (ids.length === 0) return 0;
      if (!imageHost) throw new ImageStoreError(503, "image_host_not_configured", "Fotoğraf alanı ayarlanmamış.");
      const urls = ids.flatMap(id => [`https://${imageHost}/${BLOG_IMAGE_PREFIX}${id}-${BLOG_IMAGE_LARGE}.webp`, `https://${imageHost}/${BLOG_IMAGE_PREFIX}${id}-${BLOG_IMAGE_SMALL}.webp`]);
      await removeUrls(urls);
      return urls.length;
    },

    /** Depolama kullanımı ve hiçbir yazının kullanmadığı fotoğraflar. `referenced`: depodaki tüm yazıların (taslaklar dahil) fotoğraf kimlikleri. */
    async usage(referenced: ReadonlySet<string>): Promise<ImageUsage> {
      const { listing, groups, storageBytes, unreferenced } = await survey(referenced);
      return {
        storageBytes,
        limitBytes: BLOB_HOBBY_STORAGE_BYTES,
        imageCount: groups.size,
        referencedImages: [...groups.keys()].filter(id => referenced.has(id)).length,
        unreferencedImages: unreferenced.length,
        unreferencedBytes: unreferenced.reduce((sum, [, group]) => sum + group.bytes, 0),
        truncated: listing.truncated,
        graceHours: UNREFERENCED_GRACE_MS / 3_600_000,
      };
    },

    /** Kullanılmayan fotoğrafları siler (bir seferde en çok 40 dosya). Eksik listelemede (truncated) hiçbir şey silinmez. */
    async cleanup(referenced: ReadonlySet<string>): Promise<{ deletedFiles: number; freedBytes: number; remainingImages: number }> {
      const { listing, unreferenced } = await survey(referenced);
      if (listing.truncated) throw new ImageStoreError(409, "listing_incomplete", "Fotoğraf listesi eksik okundu; güvenli olmadığı için temizlik yapılmadı.");
      const objects: BlobObject[] = [];
      let done = 0;
      for (const [, group] of unreferenced) {
        if (objects.length + group.objects.length > CLEANUP_MAX_FILES && objects.length > 0) break;
        objects.push(...group.objects);
        done++;
      }
      await removeUrls(objects.map(object => object.url));
      return { deletedFiles: objects.length, freedBytes: objects.reduce((sum, object) => sum + object.size, 0), remainingImages: unreferenced.length - done };
    },
  };
}

export type ImageStore = ReturnType<typeof createImageStore>;

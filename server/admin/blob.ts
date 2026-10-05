/**
 * Vercel Blob erişimi (fotoğraflar). Panel koduna yalnızca bu dar arayüz görünür; testlerde bellek içi taklit kullanılır
 * (client/src/adminFakeBlob.ts), gerçek yükleme yapılmaz. `@vercel/blob` yalnızca çağrı anında içe aktarılır.
 *
 * Kimlik bilgisi: SDK ortam değişkenlerinden kendisi çözer (OIDC: BLOB_STORE_ID + VERCEL_OIDC_TOKEN; ya da uzun ömürlü
 * BLOB_READ_WRITE_TOKEN). Değerler hiçbir yanıta ya da günlüğe yazılmaz; hata günlüğüne yalnızca işlem ve hata türü adı girer.
 */
export type BlobObject = { url: string; pathname: string; size: number; uploadedAt: number };
export type BlobListing = { objects: BlobObject[]; truncated: boolean };

export interface BlobClient {
  /** Yeni bir dosya yazar; aynı yol varsa HATA verir (üzerine yazmaz). */
  put(pathname: string, bytes: Uint8Array, contentType: "image/webp"): Promise<{ url: string; pathname: string }>;
  /** Adresi verilen dosyaları siler (silme ücretsizdir). Olmayan dosya hata sayılmaz. */
  del(urls: string[]): Promise<void>;
  /** `prefix` altındaki dosyalar; en çok `maxPages` sayfa (her sayfa bir gelişmiş işlemdir), sayfalar bitmediyse `truncated`. */
  list(prefix: string, maxPages: number): Promise<BlobListing>;
}

export type BlobErrorKind = "auth" | "rate" | "quota" | "unavailable" | "exists";
export class BlobError extends Error {
  constructor(public kind: BlobErrorKind, public operation: string) {
    super(`blob ${operation} ${kind}`);
    this.name = "BlobError";
  }
}

/** Blob için kimlik bilgisi tanımlı mı? (Değerin kendisi okunmaz, yalnızca var olup olmadığına bakılır.) */
export function blobConfigured(env: Record<string, string | undefined>): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN?.trim() || env.BLOB_STORE_ID?.trim());
}

/** SDK hatasını türüne göre sınıflar; ileti okunmaz (ileti kimlik bilgisi içerebilir), yalnızca hata sınıfının adı. */
export function classifyBlobError(error: unknown, operation: string): BlobError {
  if (error instanceof BlobError) return error;
  const name = error instanceof Error ? error.name : "";
  console.error("admin: blob hatası", operation, name || "bilinmiyor");
  if (/Exists|Overwrite/i.test(name)) return new BlobError("exists", operation);
  if (/Access|Token|Unauthor|Forbidden/i.test(name)) return new BlobError("auth", operation);
  if (/RateLimit/i.test(name)) return new BlobError("rate", operation);
  if (/Suspended|StoreNotFound|Quota/i.test(name)) return new BlobError("quota", operation);
  return new BlobError("unavailable", operation);
}

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Gerçek istemci. Dosya adları değişmez (içerik adreslenmiş rastgele kimlik) olduğundan önbellek süresi bir yıldır. */
export function createBlobClient(): BlobClient {
  const sdk = () => import("@vercel/blob");
  return {
    async put(pathname, bytes, contentType) {
      try {
        const { put } = await sdk();
        const result = await put(pathname, Buffer.from(bytes), { access: "public", addRandomSuffix: false, allowOverwrite: false, contentType, cacheControlMaxAge: ONE_YEAR_SECONDS });
        return { url: result.url, pathname: result.pathname };
      } catch (error) {
        throw classifyBlobError(error, "put");
      }
    },
    async del(urls) {
      if (urls.length === 0) return;
      try {
        const { del } = await sdk();
        await del(urls);
      } catch (error) {
        throw classifyBlobError(error, "del");
      }
    },
    async list(prefix, maxPages) {
      try {
        const { list } = await sdk();
        const objects: BlobObject[] = [];
        let cursor: string | undefined;
        for (let page = 0; page < maxPages; page++) {
          const result = await list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
          for (const blob of result.blobs) objects.push({ url: blob.url, pathname: blob.pathname, size: blob.size, uploadedAt: new Date(blob.uploadedAt).getTime() });
          if (!result.hasMore || !result.cursor) return { objects, truncated: false };
          cursor = result.cursor;
        }
        return { objects, truncated: true };
      } catch (error) {
        throw classifyBlobError(error, "list");
      }
    },
  };
}

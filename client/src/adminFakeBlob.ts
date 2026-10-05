/**
 * Testler için Vercel Blob'un bellek içi taklidi ve WebP deneme dosyaları. Gerçek `createBlobClient` yerine bu verilir;
 * gerçek yükleme yapılmaz. Üretim koduna girmez.
 *
 * `FIXTURES`: libwebp ile (Pillow) üretilmiş gerçek 48x36 WebP dosyaları. Konum verisi (EXIF), XMP, renk profili ve animasyon
 * taşıyanlar sunucu denetiminin gerçek dosyalarla sınandığını gösterir. `syntheticWebp`: yalnızca başlığı geçerli, istenen
 * ölçüde dosya üretir (boyut kuralları için).
 */
import { BLOG_IMAGE_BLOB_PATH } from "../../shared/blog-images";
import { BlobError, type BlobClient, type BlobListing, type BlobObject } from "../../server/admin/blob";

export const FIXTURE_BASE64 = {
  clean: "UklGRqYAAABXRUJQVlA4IJoAAAAwBgCdASowACQAPpE+lEg3I6IhNVqqquASCWYArDPHfZAlWycmv++bLsDztOplPFsOGFMpRrOgs0IAAP77eO2Vs5wSS7sCXlFrHPCbwSdwJ8Z9GAOQnFPAxzHwefATOOwLLfFk9lFvS+is0HPX9blNcTjmZZL1KJ0JIOeeLPbMVqviyO79qHDwYGH20Hna/3JDa03+W9iHAAAA",
  exif: "UklGRlQBAABXRUJQVlA4WAoAAAAIAAAALwAAIwAAVlA4IJoAAAAwBgCdASowACQAPpE+lEg3I6IhNVqqquASCWYArDPHfZAlWycmv++bLsDztOplPFsOGFMpRrOgs0IAAP77eO2Vs5wSS7sCXlFrHPCbwSdwJ8Z9GAOQnFPAxzHwefATOOwLLfFk9lFvS+is0HPX9blNcTjmZZL1KJ0JIOeeLPbMVqviyO79qHDwYGH20Hna/3JDa03+W9iHAAAARVhJRpQAAABNTQAqAAAACAACAQ8AAgAAAAgAAAAmiCUABAAAAAEAAAAuAAAAAFRlc3RDYW0AAAQAAQACAAAAAk4AAAAAAgAFAAAAAwAAAGQAAwACAAAAAkUAAAAABAAFAAAAAwAAAHwAAAAAAAAAJQAAAAEAAAA0AAAAAQAAAAAAAAABAAAAIAAAAAEAAAAdAAAAAQAAAAAAAAAB",
  xmp: "UklGRgQBAABXRUJQVlA4WAoAAAAEAAAALwAAIwAAVlA4IJoAAAAwBgCdASowACQAPpE+lEg3I6IhNVqqquASCWYArDPHfZAlWycmv++bLsDztOplPFsOGFMpRrOgs0IAAP77eO2Vs5wSS7sCXlFrHPCbwSdwJ8Z9GAOQnFPAxzHwefATOOwLLfFk9lFvS+is0HPX9blNcTjmZZL1KJ0JIOeeLPbMVqviyO79qHDwYGH20Hna/3JDa03+W9iHAAAAWE1QIEQAAAA8eDp4bXBtZXRhIHhtbG5zOng9J2Fkb2JlOm5zOm1ldGEvJz48Z3BzPjM3LjgsMzIuNDwvZ3BzPjwveDp4bXBtZXRhPg==",
  icc: "UklGRkABAABXRUJQVlA4WAoAAAAgAAAALwAAIwAASUNDUIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFZQOCCaAAAAMAYAnQEqMAAkAD6RPpRINyOiITVaqqrgEglmAKwzx32QJVsnJr/vmy7A87TqZTxbDhhTKUazoLNCAAD++3jtlbOcEku7Al5Raxzwm8EncCfGfRgDkJxTwMcx8HnwEzjsCy3xZPZRb0vorNBz1/W5TXE45mWS9SidCSDnniz2zFar4sju/ahw8GBh9tB52v9yQ2tN/lvYhwAAAA==",
  animated: "UklGRgwCAABXRUJQVlA4WAoAAAACAAAALwAAIwAAQU5JTQYAAAAAAAAAAABBTk1G8AAAAAAAAAAAAC8AACMAAGQAAAJWUDgg2AAAALAGAJ0BKjAAJAA+aSaQRaQiIZqtVVRABoSzMwtSrC5wlC/AAUgB5vw3J78dx3wX5fLG5dnDI2EC63rX//+AAP7+T1EsPQm+WIe9H6obbiNaP5WBehq8qKxrWPAljsL006ZdUecu+1D1puAAcdPyTPmaIWjvVfPP/yU9l9//g7JtZa3wEcNxi94M4B6j6z0FT4y4JzQne+BuRN7f+8MGG1+HqE/ND7i1GL/pmMZHXyxM9Bkx9rv1ui83kIQCNSmitudLctyzPjhtZYbgBsd39a1rWDJNPSDAAEFOTUboAAAAAAAAAAAALwAAIwAAZAAAAFZQOCDQAAAAVAUAnQEqMAAkAD5dIotFg1QAALiWg966AxwhAGp4rb25ao/y/ItDEFliUZpmJTtP7+PAAP7qkftX/6KJ/wdX/+KDspyBdLFP5iUEVv/ueoav5yYnf4p4HsLTp/Nb69H+AASHCtZfcPiVe/DGNo7DtwJ3TfM4v2Fx/QKc3//olC//xOhG8+DANp9PdR7vP4VHW/WgAASsUgZhXsS/oAJbz8wL8tjQNZuCGLSgqXz4LgY7PHJQTQWfpHp6enpHbtFf+tRftQ/p6eoY2xXO8rIAAA==",
  alpha: "UklGRuAAAABXRUJQVlA4WAoAAAAQAAAALwAAIwAAQUxQSBMAAAABDzD/ERFCLJj4Sy+E3oj+p64AAFZQOCCmAAAA8AUAnQEqMAAkAD6RPpRINyOiITVaqqrgEglmLYATYB2YqANsCQFFCqxoIQr3HXTS6RpN2wN/vgAA/vH28L/TB8P/9hpnkpvTZHUlyQq01zZ6Pc5uLF2TPg8oC/bhmOn4sXZNzdaxEWFraix1KCJVXsAtv63Ka4nHMyxkkH2JKMCIQjZQybz2076xaN+1DR/aW6A9KD2oT88iBE5LFbavKx8lYkgAAA==",
} as const;

export const FIXTURES = Object.fromEntries(Object.entries(FIXTURE_BASE64).map(([name, value]) => [name, Uint8Array.from(Buffer.from(value, "base64"))])) as Record<keyof typeof FIXTURE_BASE64, Uint8Array>;
export const toBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64");

const le32 = (value: number) => [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255];
const ascii = (text: string) => text.split("").map(char => char.charCodeAt(0));

/** Başlığı geçerli (VP8L) WebP; görüntü verisi gerçek değildir. `padding` dosyayı büyütür (boyut sınırı denemeleri). */
export function syntheticWebp(width: number, height: number, padding = 0): Uint8Array {
  const bits = ((width - 1) | ((height - 1) << 14)) >>> 0;
  const payload = [0x2f, ...le32(bits), ...new Array(padding).fill(0)];
  const padded = payload.length % 2 ? [...payload, 0] : payload;
  const body = [...ascii("WEBP"), ...ascii("VP8L"), ...le32(payload.length), ...padded];
  return Uint8Array.from([...ascii("RIFF"), ...le32(body.length), ...body]);
}

type StoredObject = BlobObject & { bytes: Uint8Array };

/** Bellek içi Blob. Gerçeğe uygun davranır: aynı yola yazmak hata verir; olmayanı silmek hata değildir. */
export class FakeBlob implements BlobClient {
  readonly objects = new Map<string, StoredObject>();
  readonly calls: { put: string[]; del: string[][]; list: number } = { put: [], del: [], list: 0 };
  /** Sıradaki işlemde fırlatılacak hata (bir kez). */
  failNext: { put?: BlobError; del?: BlobError; list?: BlobError } = {};
  /** Bu sayıdan fazla `put` çağrısı hata verir (ikinci sürümün yazılamaması denemesi için). */
  failPutAfter: number | undefined;
  /** Dönen adreslerin alanı değiştirilebilir (alan uyuşmazlığı denemesi). */
  returnHost: string | undefined;
  clock = Date.parse("2026-10-02T09:00:00Z");

  constructor(public readonly host = "teststore123.public.blob.vercel-storage.com") {}

  async put(pathname: string, bytes: Uint8Array, contentType: "image/webp") {
    this.calls.put.push(pathname);
    if (this.failNext.put) {
      const error = this.failNext.put;
      this.failNext.put = undefined;
      throw error;
    }
    if (this.failPutAfter !== undefined && this.calls.put.length > this.failPutAfter) throw new BlobError("unavailable", "put");
    if (contentType !== "image/webp") throw new Error("yalnızca image/webp");
    if (this.objects.has(`https://${this.host}/${pathname}`)) throw new BlobError("exists", "put");
    const url = `https://${this.host}/${pathname}`;
    this.objects.set(url, { url, pathname, size: bytes.length, uploadedAt: this.clock, bytes: Uint8Array.from(bytes) });
    return { url: this.returnHost ? `https://${this.returnHost}/${pathname}` : url, pathname };
  }

  async del(urls: string[]) {
    this.calls.del.push([...urls]);
    if (this.failNext.del) {
      const error = this.failNext.del;
      this.failNext.del = undefined;
      throw error;
    }
    for (const url of urls) this.objects.delete(url);
  }

  async list(prefix: string, maxPages: number): Promise<BlobListing> {
    this.calls.list++;
    if (this.failNext.list) {
      const error = this.failNext.list;
      this.failNext.list = undefined;
      throw error;
    }
    const all = [...this.objects.values()].filter(object => object.pathname.startsWith(prefix)).sort((a, b) => a.pathname.localeCompare(b.pathname));
    const limit = maxPages * 1000;
    return { objects: all.slice(0, limit).map(({ bytes: _bytes, ...object }) => object), truncated: all.length > limit };
  }

  /** Panel dışından doğrudan dosya koyar; yaşı `ageMs` kadar eski sayılır. */
  seed(id: string, options: { ageMs?: number; sizes?: [number, number] } = {}): { large: string; small: string } {
    const [largeSize, smallSize] = options.sizes ?? [1000, 400];
    const make = (suffix: "1600" | "800", size: number) => {
      const pathname = `blog/${id}-${suffix}.webp`;
      const url = `https://${this.host}/${pathname}`;
      this.objects.set(url, { url, pathname, size, uploadedAt: this.clock - (options.ageMs ?? 0), bytes: new Uint8Array(size) });
      return url;
    };
    return { large: make("1600", largeSize), small: make("800", smallSize) };
  }

  paths(): string[] {
    return [...this.objects.values()].map(object => object.pathname).sort();
  }

  /** Taklitteki her dosya adının panelin yazdığı kalıba uyduğunu doğrular. */
  allPathsValid(): boolean {
    return this.paths().every(path => BLOG_IMAGE_BLOB_PATH.test(path));
  }
}

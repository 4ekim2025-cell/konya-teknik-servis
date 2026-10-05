/**
 * Yüklenen fotoğrafın sunucu denetimi. Dosya GÜVENİLMEZ girdidir: tarayıcı kodunun doğru çalıştığına güvenilmez.
 *
 * Kabul edilen: yalnızca WebP (RIFF yapısı baştan sona okunur). Tür, boyut ve piksel ölçüleri dosyanın kendisinden okunur,
 * istemcinin bildirdiği değer kullanılmaz. Konum verisi (EXIF, XMP) taşıyan ya da animasyonlu dosya reddedilir: tarayıcı
 * yeniden kodlaması bunları zaten atar; bu denetim, atılmadıysa dosyanın depolanmasını engeller.
 * Küçük bir renk profili (ICCP, en çok 4 KB) KABUL edilir: gerçek Chromium canvas çıktısı sRGB profili (≈456 bayt) taşır ve
 * profil konum bilgisi içermez; üst sınır, profil alanına veri sığdırmayı önler.
 * Dosya adını da sunucu üretir (shared/blog-images.ts kalıbı); istemci ad belirleyemez.
 */
import { BLOG_IMAGE_LARGE, BLOG_IMAGE_MAX_BYTES, BLOG_IMAGE_SMALL, fitWithin } from "../../shared/blog-images.js";

export type WebpInfo = { width: number; height: number };
export type WebpCheck = { ok: true; info: WebpInfo } | { ok: false; error: string };

/** İzin verilen parçalar: görüntü verisi (VP8, VP8L), genişletilmiş başlık (VP8X), saydamlık (ALPH) ve küçük renk profili (ICCP). Diğer her parça (EXIF, XMP, ANIM…) reddedilir. */
const ALLOWED_CHUNKS = new Set(["VP8 ", "VP8L", "VP8X", "ALPH", "ICCP"]);
const ICC_MAX_BYTES = 4096;
const VP8X_FORBIDDEN_FLAGS = { exif: 0x08, xmp: 0x04, animation: 0x02 } as const;

const u16 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u24 = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
const u32 = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const tag = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

/** WebP dosyasının yapısını denetler ve piksel ölçülerini döndürür. */
export function inspectWebp(bytes: Uint8Array): WebpCheck {
  const fail = (error: string): WebpCheck => ({ ok: false, error });
  if (bytes.length < 20) return fail("Dosya çok kısa; geçerli bir WebP değil");
  if (tag(bytes, 0) !== "RIFF" || tag(bytes, 8) !== "WEBP") return fail("Dosya WebP değil");
  if (u32(bytes, 4) + 8 !== bytes.length) return fail("WebP dosyası bozuk (boyut uyuşmuyor)");

  let offset = 12;
  let first = true;
  let canvas: WebpInfo | undefined;
  let bitstream: WebpInfo | undefined;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) return fail("WebP dosyası bozuk (parça başlığı eksik)");
    const id = tag(bytes, offset);
    const size = u32(bytes, offset + 4);
    const start = offset + 8;
    if (start + size > bytes.length) return fail("WebP dosyası bozuk (parça dosya sınırını aşıyor)");
    if (!ALLOWED_CHUNKS.has(id)) {
      const reason = id === "EXIF" || id === "XMP " ? "konum/üst veri (EXIF, XMP) taşıyor" : id === "ANIM" || id === "ANMF" ? "animasyonlu" : `beklenmeyen parça içeriyor (${id.trim() || "?"})`;
      return fail(`Fotoğraf reddedildi: ${reason}`);
    }

    if (id === "VP8X") {
      if (!first || size !== 10) return fail("WebP dosyası bozuk (genişletilmiş başlık geçersiz)");
      const flags = bytes[start];
      if (flags & VP8X_FORBIDDEN_FLAGS.exif || flags & VP8X_FORBIDDEN_FLAGS.xmp) return fail("Fotoğraf reddedildi: konum/üst veri (EXIF, XMP) taşıyor");
      if (flags & VP8X_FORBIDDEN_FLAGS.animation) return fail("Fotoğraf reddedildi: animasyonlu");
      canvas = { width: u24(bytes, start + 4) + 1, height: u24(bytes, start + 7) + 1 };
    } else if (id === "VP8 ") {
      if (bitstream || size < 10) return fail("WebP dosyası bozuk (görüntü verisi geçersiz)");
      if (bytes[start + 3] !== 0x9d || bytes[start + 4] !== 0x01 || bytes[start + 5] !== 0x2a) return fail("WebP dosyası bozuk (görüntü başlığı geçersiz)");
      bitstream = { width: u16(bytes, start + 6) & 0x3fff, height: u16(bytes, start + 8) & 0x3fff };
    } else if (id === "VP8L") {
      if (bitstream || size < 5 || bytes[start] !== 0x2f) return fail("WebP dosyası bozuk (görüntü verisi geçersiz)");
      const bits = u32(bytes, start + 1);
      bitstream = { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    } else if (id === "ICCP") {
      if (!canvas || bitstream || size > ICC_MAX_BYTES) return fail("Fotoğraf reddedildi: renk profili geçersiz ya da çok büyük");
    } else if (id === "ALPH" && (!canvas || bitstream)) {
      return fail("WebP dosyası bozuk (saydamlık parçası yanlış yerde)");
    }

    first = false;
    offset = start + size + (size & 1);
  }
  if (offset !== bytes.length) return fail("WebP dosyası bozuk (sonda artık veri)");
  if (!bitstream) return fail("WebP dosyasında görüntü verisi yok");
  if (canvas && (canvas.width !== bitstream.width || canvas.height !== bitstream.height)) return fail("WebP dosyası bozuk (ölçüler uyuşmuyor)");
  if (bitstream.width < 1 || bitstream.height < 1) return fail("WebP dosyası bozuk (ölçüler geçersiz)");
  return { ok: true, info: bitstream };
}

/** Base64 metnini baytlara çevirir; bozuk, boş ya da `maxBytes`'tan büyük girdi reddedilir. */
export function decodeBase64(value: unknown, maxBytes: number): { ok: true; bytes: Uint8Array } | { ok: false; error: string } {
  if (typeof value !== "string" || value.length === 0) return { ok: false, error: "Fotoğraf verisi eksik" };
  if (value.length > Math.ceil((maxBytes * 4) / 3) + 8) return { ok: false, error: "Fotoğraf çok büyük" };
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return { ok: false, error: "Fotoğraf verisi geçersiz" };
  const bytes = Uint8Array.from(Buffer.from(value, "base64"));
  if (bytes.length > maxBytes) return { ok: false, error: "Fotoğraf çok büyük" };
  return { ok: true, bytes };
}

export type CheckedUpload = { large: Uint8Array; small: Uint8Array; width: number; height: number };

/**
 * Yükleme isteğinin iki sürümünü (1600 ve 800) doğrular. Yazıda saklanacak boyut BÜYÜK sürümün dosyasından okunur;
 * küçük sürümün boyutu, büyüğünden beklenen boyutla (en çok 1 piksel yuvarlama farkıyla) uyuşmalıdır.
 */
export function checkUpload(input: { large?: unknown; small?: unknown }): { ok: true; upload: CheckedUpload } | { ok: false; error: string } {
  const large = decodeBase64(input.large, BLOG_IMAGE_MAX_BYTES.large);
  if (!large.ok) return { ok: false, error: `Büyük sürüm: ${large.error}` };
  const small = decodeBase64(input.small, BLOG_IMAGE_MAX_BYTES.small);
  if (!small.ok) return { ok: false, error: `Küçük sürüm: ${small.error}` };

  const largeInfo = inspectWebp(large.bytes);
  if (!largeInfo.ok) return { ok: false, error: `Büyük sürüm: ${largeInfo.error}` };
  const smallInfo = inspectWebp(small.bytes);
  if (!smallInfo.ok) return { ok: false, error: `Küçük sürüm: ${smallInfo.error}` };

  const { width, height } = largeInfo.info;
  if (Math.max(width, height) > BLOG_IMAGE_LARGE) return { ok: false, error: `Büyük sürümün en uzun kenarı ${BLOG_IMAGE_LARGE} pikseli aşamaz` };
  const expected = fitWithin(width, height, BLOG_IMAGE_SMALL);
  if (Math.abs(smallInfo.info.width - expected.width) > 1 || Math.abs(smallInfo.info.height - expected.height) > 1) return { ok: false, error: "Küçük sürümün ölçüleri büyük sürümle uyuşmuyor" };
  return { ok: true, upload: { large: large.bytes, small: small.bytes, width, height } };
}

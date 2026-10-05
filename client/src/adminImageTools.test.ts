import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { api } from "./admin/api";
import { checklist, emptyBlock, imageCount, newPost, TEXT_BLOCK_TYPES, toPayload } from "./admin/editorModel";
import { ImagePrepareError, WEBP_QUALITIES, encodeUnderLimit } from "./admin/imageTools";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");
const blobOf = (size: number, type = "image/webp") => new Blob([new Uint8Array(size)], { type });

describe("tarayıcıda WebP küçültme (encodeUnderLimit)", () => {
  it("ilk kalite sınıra sığıyorsa onu kullanır", async () => {
    const asked: number[] = [];
    const blob = await encodeUnderLimit(async quality => (asked.push(quality), blobOf(100)), 500);
    expect(blob.size).toBe(100);
    expect(asked).toEqual([WEBP_QUALITIES[0]]);
  });

  it("sığmayana kadar kaliteyi düşürür", async () => {
    const asked: number[] = [];
    const blob = await encodeUnderLimit(async quality => (asked.push(quality), blobOf(Math.round(quality * 1000))), 600);
    expect(blob.size).toBeLessThanOrEqual(600);
    expect(asked.at(-1)).toBeLessThanOrEqual(0.6);
    expect(asked).toEqual([...WEBP_QUALITIES].slice(0, asked.length));
  });

  it("hiçbir kalite sığmazsa anlaşılır hata verir", async () => {
    await expect(encodeUnderLimit(async () => blobOf(10_000), 500)).rejects.toThrow(ImagePrepareError);
  });

  it("tarayıcı WebP yerine PNG üretirse (ya da hiç üretemezse) yüklemeye geçmez", async () => {
    await expect(encodeUnderLimit(async () => blobOf(10, "image/png"), 500)).rejects.toThrow(/WebP/);
    await expect(encodeUnderLimit(async () => null, 500)).rejects.toThrow(/WebP/);
  });
});

describe("fotoğraf yükleme isteği (api.uploadImage)", () => {
  const original = globalThis.fetch;
  afterEach(() => { globalThis.fetch = original; });

  it("yalnızca küçültülmüş iki sürümü base64 olarak, CSRF başlığıyla image-upload eylemine gönderir", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ src: "https://x/blog/a-1600.webp", width: 4, height: 3, remaining: 19 }), { status: 200 });
    }) as typeof fetch;
    const large = new Blob([Uint8Array.from([1, 2, 3, 250, 251, 252])], { type: "image/webp" });
    const small = new Blob([Uint8Array.from([9, 8, 7])], { type: "image/webp" });
    const result = await api.uploadImage(large, small);
    expect(result).toEqual({ src: "https://x/blog/a-1600.webp", width: 4, height: 3, remaining: 19 });
    expect(seen!.url).toBe("/api/admin?action=image-upload");
    expect(seen!.init.method).toBe("POST");
    expect((seen!.init.headers as Record<string, string>)["x-admin-request"]).toBe("1");
    const body = JSON.parse(String(seen!.init.body));
    expect(Object.keys(body).sort()).toEqual(["large", "small"]);
    expect([...Buffer.from(body.large, "base64")]).toEqual([1, 2, 3, 250, 251, 252]);
    expect([...Buffer.from(body.small, "base64")]).toEqual([9, 8, 7]);
  });

  it("büyük dosyalar parça parça çevrilir (yığın taşmaz)", async () => {
    globalThis.fetch = (async (_url: string, init: RequestInit) => new Response(JSON.stringify({ size: JSON.parse(String(init.body)).large.length }), { status: 200 })) as typeof fetch;
    const big = new Blob([new Uint8Array(480 * 1024).fill(7)], { type: "image/webp" });
    const result = (await api.uploadImage(big, big)) as unknown as { size: number };
    expect(result.size).toBe(Math.ceil((480 * 1024) / 3) * 4);
  });
});

describe("editör modeli: fotoğraf", () => {
  it("fotoğraf bloğu elle boş eklenemez; yalnızca yükleme sonrası oluşur", () => {
    expect(TEXT_BLOCK_TYPES).toEqual(["p", "h2", "list", "steps", "note"]);
    TEXT_BLOCK_TYPES.forEach(type => expect(emptyBlock(type).type).toBe(type));
  });

  it("fotoğraf sayısı kapak ve görsel bloklarını sayar; kapaksız yazı yükü değişmez", () => {
    const post = newPost("2026-10-02", 1);
    expect(imageCount(post)).toBe(0);
    expect("cover" in toPayload(post)).toBe(false);
    const image = { src: "https://x/blog/a-1600.webp", alt: "a", width: 1, height: 1 };
    expect(imageCount({ ...post, cover: image, blocks: [...post.blocks, { type: "image", ...image }] })).toBe(2);
    expect(toPayload({ ...post, cover: image }).cover).toEqual(image);
  });

  it("fotoğrafı olmayan yazının kontrol listesi fotoğraf yüzünden hata vermez", () => {
    const post = { ...newPost("2026-10-02", 1), slug: "/blog/deneme/" };
    expect(checklist(post).errors.join("\n")).not.toMatch(/cover|image|fotoğraf/i);
  });
});

describe("kaynak metin denetimleri (istemci)", () => {
  it("tarayıcı yönü düzeltip canvas ile yeniden kodlar; ham dosya sunucuya gitmez", () => {
    const tools = read("client/src/admin/imageTools.ts");
    expect(tools).toContain('imageOrientation: "from-image"');
    expect(tools).toContain('canvas.toBlob(resolve, "image/webp", quality)');
    expect(tools).toContain("blob.type !== \"image/webp\"");
    const picker = read("client/src/admin/ImagePicker.tsx");
    expect(picker).toContain("api.uploadImage(prepared.large, prepared.small)");
    expect(picker).not.toMatch(/uploadImage\([^)]*\bfile\b/);
    expect(picker).toContain('accept={IMAGE_INPUT_TYPES.join(",")}');
  });

  it("alt metin alanı vardır ve gösterilir; kapak ve gövde fotoğrafı aynı bileşeni kullanır", () => {
    const picker = read("client/src/admin/ImagePicker.tsx");
    expect(picker).toContain("Alt metin");
    expect(picker).toContain("zorunlu");
    const editor = read("client/src/admin/EditorView.tsx");
    expect(editor).toContain('<ImageFields image={post.cover}');
    expect(editor).toContain('case "image":');
  });

  it("kullanım göstergesi otomatik değil, düğmeyle çalışır; temizlik ikinci onay ister", () => {
    const card = read("client/src/admin/ImageUsageCard.tsx");
    expect(card).not.toMatch(/useEffect/);
    expect(card).toContain("Kullanımı göster");
    expect(card).toContain("Emin misiniz?");
    expect(read("client/src/admin/InsightViews.tsx")).toContain("<ImageUsageCard />");
  });
});

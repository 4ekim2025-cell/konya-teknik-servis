/**
 * IndexNow bildirimi — Bing, Yandex ve IndexNow'u destekleyen diğer arama motorlarına
 * sitedeki sayfaların güncellendiğini haber verir. Bing dizini ChatGPT ve Copilot
 * aramalarını da beslediği için yeni içerik yapay zekâ aramalarına daha hızlı ulaşır.
 *
 * Yalnızca Vercel üretim (production) build'inde çalışır; önizleme build'leri bildirim göndermez.
 * Bildirim başarısız olsa bile build'i asla bozmaz.
 * Doğrulama anahtarı: client/public/<INDEXNOW_KEY>.txt
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const INDEXNOW_KEY = "f231771e5a09b6024aea2fa06919b21c";
export const SITE_HOST = "esliteknik.com";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export function shouldSubmit(env: Record<string, string | undefined>): boolean {
  return env.VERCEL_ENV === "production" || env.INDEXNOW_FORCE === "1";
}

export function extractSitemapUrls(sitemapXml: string): string[] {
  const urls = [...sitemapXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(match => match[1]);
  return [...new Set(urls)].filter(url => new URL(url).host === SITE_HOST);
}

export function buildPayload(urlList: string[]) {
  return { host: SITE_HOST, key: INDEXNOW_KEY, keyLocation: `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`, urlList };
}

async function main() {
  if (!shouldSubmit(process.env)) {
    console.log("IndexNow: üretim build'i değil, bildirim atlandı.");
    return;
  }
  try {
    const sitemapPath = path.join(process.cwd(), "dist", "public", "sitemap.xml");
    const urlList = extractSitemapUrls(fs.readFileSync(sitemapPath, "utf8"));
    if (urlList.length === 0) {
      console.warn("IndexNow: sitemap'te gönderilecek URL bulunamadı.");
      return;
    }
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(buildPayload(urlList)),
      signal: AbortSignal.timeout(10_000),
    });
    // 200 = alındı, 202 = alındı ve anahtar doğrulaması bekleniyor (ilk yayında normaldir).
    console.log(`IndexNow: ${urlList.length} URL gönderildi, yanıt ${response.status}.`);
  } catch (error) {
    console.warn(`IndexNow: bildirim gönderilemedi, build etkilenmedi. (${String(error)})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

/**
 * Silinen yazıların yönlendirmeleri (`content/redirects.json`).
 *
 * Panelden yayındaki bir yazı silinirken "adresi ilgili sayfaya yönlendir" seçilirse kayıt buraya eklenir.
 * Build sırasında `scripts/prerender.ts`, eski adres için anlık (0 sn) `meta refresh` + canonical içeren statik bir sayfa üretir.
 * Google, anlık meta yönlendirmeyi kalıcı yönlendirme olarak yorumlar (Search Central → Redirects).
 * Yönlendirme seçilmezse adres 404 verir.
 *
 * Kurallar: eski adres /blog/ad/ biçimindedir; hedef tek segmentli sitedeki bir sayfadır (/blog/ dahil), bu yüzden
 * yönlendirme zinciri ya da döngüsü oluşamaz. Hâlâ yayındaki bir yazının adresi yönlendirme kaynağı olamaz.
 */
import { z } from "zod";
import { BLOG_SERVICE_PATH_PATTERN, BLOG_SLUG_PATTERN, isRealDate } from "./blog-schema.js";

export const REDIRECTS_PATH = "content/redirects.json";

export const blogRedirectSchema = z
  .object({
    from: z.string().regex(BLOG_SLUG_PATTERN, "Eski adres /blog/ad/ biçiminde olmalı"),
    to: z.string().regex(BLOG_SERVICE_PATH_PATTERN, "Hedef adres /ad/ biçiminde olmalı"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG biçiminde olmalı").refine(isRealDate, "Tarih geçerli olmalı"),
  })
  .strict();

export type BlogRedirect = z.infer<typeof blogRedirectSchema>;

/** Dosya içeriğini (zaten JSON.parse edilmiş) doğrular. Boş/yok dosya geçerlidir ve boş liste döner. */
export function parseRedirects(data: unknown): { redirects: BlogRedirect[]; errors: string[] } {
  if (data === undefined || data === null) return { redirects: [], errors: [] };
  if (!Array.isArray(data)) return { redirects: [], errors: [`${REDIRECTS_PATH}: liste (dizi) olmalı`] };
  const redirects: BlogRedirect[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  data.forEach((item, index) => {
    const result = blogRedirectSchema.safeParse(item);
    if (!result.success) {
      errors.push(...result.error.issues.map(issue => `${REDIRECTS_PATH}[${index}].${issue.path.join(".") || "kayıt"}: ${issue.message}`));
      return;
    }
    if (seen.has(result.data.from)) errors.push(`${REDIRECTS_PATH}: ${result.data.from} adresi birden çok kez yönlendirilmiş`);
    seen.add(result.data.from);
    redirects.push(result.data);
  });
  return { redirects, errors };
}

/** Yayındaki bir yazının adresi aynı anda yönlendirme kaynağı olamaz. */
export function validateRedirectsAgainstPosts(redirects: BlogRedirect[], publishedSlugs: string[]): string[] {
  const live = new Set(publishedSlugs);
  return redirects.filter(item => live.has(item.from)).map(item => `${REDIRECTS_PATH}: ${item.from} adresi hâlâ yayında, yönlendirilemez`);
}

/** Aynı eski adres için kayıt varsa değiştirir; yoksa ekler. Eski adrese göre sıralı döner. */
export function upsertRedirect(list: BlogRedirect[], entry: BlogRedirect): BlogRedirect[] {
  return [...list.filter(item => item.from !== entry.from), entry].sort((a, b) => a.from.localeCompare(b.from));
}

/** Yeni yazı, yönlendirilen bir adresle yayınlanırsa o adresin yönlendirmesi kalkar. */
export function removeRedirectFrom(list: BlogRedirect[], from: string): BlogRedirect[] {
  return list.filter(item => item.from !== from);
}

export function renderRedirectsFile(list: BlogRedirect[]): string {
  return `${JSON.stringify(list, null, 2)}\n`;
}

/** Eski adresin yerine yazılan statik sayfa: anlık meta yönlendirme + canonical + betik ve bağlantı yedeği. */
export function redirectPageHtml(target: string, siteUrl: string): string {
  const absolute = `${siteUrl}${target}`;
  const script = JSON.stringify(target).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<title>Yönlendiriliyor | Eşli Teknik</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="canonical" href="${absolute}" />
<meta http-equiv="refresh" content="0; url=${absolute}" />
<script>location.replace(${script})</script>
</head>
<body>
<p>Bu sayfa taşındı. <a href="${target}">Devam etmek için tıklayın</a>.</p>
</body>
</html>
`;
}

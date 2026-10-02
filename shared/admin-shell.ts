/**
 * /yonetim/ (blog paneli) için statik kabuk. Arama motorlarına ve paylaşım önizlemelerine hiçbir bilgi vermez:
 * noindex, canonical yok, açıklama/og/JSON-LD yok, ana sayfa görseli önyüklenmez. Sitemap, llms.txt ve site içi bağlantılarda yer almaz.
 */
export const ADMIN_ROUTE = "/yonetim/";
export const ADMIN_ROBOTS = "noindex,nofollow,noarchive";

export function renderAdminShell(template: string): string {
  return template
    .replace(/<title>[\s\S]*?<\/title>/, "<title>Yönetim</title>")
    .replace(/\s*<meta (?:name|property)="(?:description|og:[^"]*|twitter:[^"]*)" content="[^"]*"\s*\/>/g, "")
    .replace(/<meta name="robots" content="[^"]*"\s*\/>/, `<meta name="robots" content="${ADMIN_ROBOTS}" />`)
    .replace(/\s*<link rel="canonical" href="[^"]*"\s*\/>/, "")
    .replace(/\s*<link rel="preload" as="image"[^>]*\/>/g, "")
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");
}

/**
 * Blog fotoğraflarının statik HTML'i (prerender): gövde fotoğrafı, kapak fotoğrafı ve kapağa bağlı <head> etiketleri.
 * Saf metin üretir; prerender bunu kullanır, testler doğrudan sınar. Fotoğrafı olmayan yazı bu işlevlere hiç girmez,
 * bu yüzden onların HTML'i fotoğraf özelliğinden etkilenmez.
 */
import { BLOG_IMAGE_SIZES, blogImageSmallSize, blogImageSmallUrl, blogImageSrcSet, type BlogImageFields } from "./blog-images.js";

const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Yazı fotoğrafı. Kapak sayfanın ilk görünür öğesidir: ertelenmez, öncelikli yüklenir (`fetchpriority="high"`).
 * Gövdedeki fotoğraflar `loading="lazy"` ile gelir. Boyutlar HTML'de açıktır, sayfa yüklenirken kayma olmaz.
 */
export function blogImageHtml(image: BlogImageFields, cover: boolean): string {
  const loading = cover ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
  return `<figure><img src="${esc(image.src)}" srcset="${esc(blogImageSrcSet(image))}" sizes="${BLOG_IMAGE_SIZES}" width="${image.width}" height="${image.height}" alt="${esc(image.alt)}" ${loading} /></figure>`;
}

/**
 * Blog listesindeki kart küçük resmi: yalnızca 800 piksellik sürüm, her zaman `loading="lazy"` (statik HTML'de sayfa çizimini bekletmez).
 * Kapak fotoğrafı olmayan yazı bu işleve girmez; onların liste satırı değişmez.
 */
export function blogCardImageHtml(cover: BlogImageFields): string {
  const size = blogImageSmallSize(cover);
  return `<img src="${esc(blogImageSmallUrl(cover.src))}" width="${size.width}" height="${size.height}" alt="${esc(cover.alt)}" loading="lazy" decoding="async" />`;
}

/** Kapak fotoğraflı yazının paylaşım etiketleri (og:image, twitter:image, boyut, alt) ve en büyük öğenin (LCP) önyüklemesi. */
export function withCoverHead(html: string, cover: BlogImageFields): string {
  const alt = esc(cover.alt);
  const set = (pattern: RegExp, tag: string) => {
    html = html.replace(pattern, () => tag);
  };
  set(/<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${esc(cover.src)}" />`);
  set(/<meta property="og:image:type" content="[^"]*"\s*\/>/, '<meta property="og:image:type" content="image/webp" />');
  set(/<meta property="og:image:width" content="[^"]*"\s*\/>/, `<meta property="og:image:width" content="${cover.width}" />`);
  set(/<meta property="og:image:height" content="[^"]*"\s*\/>/, `<meta property="og:image:height" content="${cover.height}" />`);
  set(/<meta property="og:image:alt" content="[^"]*"\s*\/>/, `<meta property="og:image:alt" content="${alt}" />`);
  set(/<meta name="twitter:card" content="[^"]*"\s*\/>/, '<meta name="twitter:card" content="summary_large_image" />');
  set(/<meta name="twitter:image" content="[^"]*"\s*\/>/, `<meta name="twitter:image" content="${esc(cover.src)}" />`);
  set(/<meta name="twitter:image:alt" content="[^"]*"\s*\/>/, `<meta name="twitter:image:alt" content="${alt}" />`);
  return html.replace("</head>", () => `<link rel="preload" as="image" href="${esc(blogImageSmallUrl(cover.src))}" imagesrcset="${esc(blogImageSrcSet(cover))}" imagesizes="${BLOG_IMAGE_SIZES}" fetchpriority="high" />\n  </head>`);
}

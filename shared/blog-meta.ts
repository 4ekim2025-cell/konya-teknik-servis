/**
 * Eşli Teknik blog — türler, yazar, kategoriler ve yazıdan bağımsız yardımcı fonksiyonlar.
 * Yazı verisinin kendisi `content/blog/*.json` dosyalarındadır; liste shared/blog-posts.ts'ten okunur.
 * Bu dosya veri içermez; böylece şema (shared/blog-schema.ts) ve içerik derleyici (scripts/build-content.ts)
 * üretilen veriye bağlı kalmadan çalışır.
 *
 * Kurallar: İnternetten alınan deneyimler kaynağıyla özetlenir, Eşli Teknik müşterisi gibi sunulmaz.
 * "Ustanın Defterinden" yazıları yalnızca Esad Eşli'nin anlattığı gerçek işlere dayanır; ayrıntı uydurulmaz.
 * Fiyat, hukuki konu, tazminat süreci ve doğrulanamayan istatistik yazılmaz.
 */

export type BlogCategory = "Ustanın Defterinden" | "Bakım Rehberi" | "Karar Rehberi" | "Tüketici Rehberi";
/** Blog fotoğrafı (shared/blog-images.ts kurallarıyla): 1600 sürümünün adresi, zorunlu alt metin ve boyutu. */
export type BlogImage = { src: string; alt: string; width: number; height: number };
export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "note"; title: string; text: string }
  | ({ type: "image" } & BlogImage);
export type BlogCaseFile = { district: string; brand: string; device: string; complaint: string; finding: string; action: string };
export type BlogSource = { label: string; url: string };
export type BlogPost = {
  slug: string;
  category: BlogCategory;
  title: string;
  description: string;
  excerpt: string;
  /** İsteğe bağlı kapak fotoğrafı; yoksa sayfa bugünkü görünümünü ve paylaşım görselini korur. */
  cover?: BlogImage;
  published: string;
  updated: string;
  device: string;
  servicePath: string;
  caseFile?: BlogCaseFile;
  /** Usta vakasında markanın sitedeki servis sayfası (iç bağlantı). */
  brandPath?: string;
  /** Cihazın kendi hizmet sayfası yoksa servis düğmesinin metni (ör. "Philips servisi"). */
  serviceLabel?: string;
  blocks: BlogBlock[];
  sources?: BlogSource[];
};

export const BLOG_AUTHOR = {
  name: "Esad Eşli",
  // Yazar kutusundaki daire fotoğraf (proje sahibinin yüklediği fotoğraf). Dosya client/public altındadır.
  photo: "/esad-esli-yazar.png",
  role: "Teknik servis ustası, Eşli Teknik",
  bio: "Esad Eşli, Eşli Teknik’in teknik servis ustasıdır. Bu yazılar, Karatay, Meram ve Selçuklu’da sahada karşılaştığı arızalardan ve müşterilerin en sık sorduğu sorulardan yola çıkarak hazırlanır.",
};

export const blogCategories: BlogCategory[] = ["Ustanın Defterinden", "Bakım Rehberi", "Karar Rehberi", "Tüketici Rehberi"];

export function blogWordCount(post: BlogPost): number {
  const text = post.blocks.map(block => block.type === "image" ? "" : block.type === "p" || block.type === "h2" ? block.text : block.type === "list" ? block.items.join(" ") : block.type === "steps" ? block.items.map(item => `${item.title} ${item.text}`).join(" ") : `${block.title} ${block.text}`).join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

export function blogReadingMinutes(post: BlogPost): number {
  return Math.max(2, Math.round(blogWordCount(post) / 180));
}

export function formatBlogDate(isoDate: string): string {
  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}

export function blogShareLinks(url: string, title: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://x.com/intent/post?text=${t}&url=${u}`,
  };
}


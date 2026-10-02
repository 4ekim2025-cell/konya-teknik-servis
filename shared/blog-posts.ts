/**
 * Eşli Teknik blog yazıları — blog listesi, yazı sayfaları (React) ve önceden render edilen SEO HTML'i
 * (scripts/prerender.ts) bu tek kaynaktan beslenir.
 *
 * Yazılar `content/blog/*.json` dosyalarında tutulur. `scripts/build-content.ts` (build'in ilk adımı, elle: `pnpm content`)
 * dosyaları doğrular, sıralar ve `shared/blog-content.generated.ts` dosyasını üretir; liste buradan okunur.
 * Türler, yazar, kategoriler ve yardımcı fonksiyonlar `shared/blog-meta.ts` içindedir ve buradan da dışa aktarılır.
 */

import { blogPostsData } from "./blog-content.generated";
import type { BlogPost } from "./blog-meta";

export * from "./blog-meta";

export const blogPosts: BlogPost[] = blogPostsData;

export function blogPostsForDevice(device: string): BlogPost[] {
  return blogPosts.filter(post => post.device === device);
}

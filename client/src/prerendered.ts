import { lazy, type ComponentType } from "react";

/**
 * Prerender HTML'i (scripts/prerender.ts) #root içine arama motorları için statik içerik yazar.
 * React başlarken bu içerik silinir; sayfa kodu (lazy chunk) yüklenemezse Google boş sayfa görür (soft 404).
 * Bu modül statik içeriği saklar: yükleme sürerken ve yükleme başarısız olursa aynı içerik gösterilir.
 */
let saved: { path: string; html: string } | null = null;

export function savePrerenderedHtml(root: HTMLElement) {
  const html = root.innerHTML.trim();
  if (html) saved = { path: window.location.pathname, html };
}

/** Yalnızca ilk açılan adresin statik içeriğini döndürür; başka bir rotada boş döner. */
export function prerenderedHtml(): string {
  if (!saved || typeof window === "undefined") return "";
  return saved.path === window.location.pathname ? saved.html : "";
}

/** Dinamik import başarısız olursa kısa bir beklemeden sonra bir kez daha dener. */
export function lazyWithRetry<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() => load().catch(() => new Promise(resolve => window.setTimeout(resolve, 1500)).then(load)));
}

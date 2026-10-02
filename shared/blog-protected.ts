/**
 * Kodda sabit bağlantıyla anılan blog yazıları (ana sayfadaki rehber kartları).
 * Bu yazılar panelden silinemez: silinirse ana sayfada ölü bağlantı kalırdı. Önce koddaki bağlantı kaldırılmalıdır.
 * Test (client/src/panelWiring.test.ts) kaynak dosyalardaki sabit blog adreslerini tarar; listede olmayan bir adres bulunursa kırılır.
 */
export const BLOG_SLUGS_LINKED_FROM_CODE: readonly string[] = [
  "/blog/bulasik-makinesi-suyu-bosaltmiyor/",
  "/blog/buzdolabi-sogutmuyor-konya/",
  "/blog/camasir-makinesi-su-almiyor-konya/",
  "/blog/firin-isitmiyor-konya/",
  "/blog/kurutma-makinesi-kurutmuyor/",
];

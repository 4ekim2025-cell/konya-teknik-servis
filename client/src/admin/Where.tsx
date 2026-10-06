/**
 * Alan etiketleri: editördeki her alanın NEREDE görüneceğini söyler (blog yazısı, Google arama sonucu, Google İşletme paylaşımı,
 * Instagram, paylaşım önizlemesi) ya da sitede hiç görünmeyip yalnızca yapay zekaya gittiğini belirtir. Yalnızca panelde görünür.
 */
export const PLACES = ["blog", "search", "gbp", "instagram", "share", "ai"] as const;
export type Place = (typeof PLACES)[number];
export const PLACE_LABELS: Record<Place, string> = { blog: "Blog", search: "Google arama", gbp: "Google İşletme", instagram: "Instagram", share: "Paylaşım görseli", ai: "Sitede görünmez" };
export const PLACE_HELP: Record<Place, string> = {
  blog: "Sitedeki blog yazısında görünür",
  search: "Google arama sonucunda görünür",
  gbp: "Google İşletme profilindeki paylaşımda görünür",
  instagram: "Instagram gönderisinde görünür",
  share: "Bağlantı paylaşılınca (WhatsApp, Facebook) çıkan görsel",
  ai: "Hiçbir yerde yayınlanmaz; yalnızca yapay zekaya bilgi olarak gider",
};

export function Where({ places }: { places: readonly Place[] }) {
  return <span className="admin-where">{places.map(place => <span key={place} className={`admin-tag is-${place}`} title={PLACE_HELP[place]}>{PLACE_LABELS[place]}</span>)}</span>;
}

/** Editörün başındaki açıklama satırı: etiketlerin ne anlama geldiği. */
export function WhereLegend() {
  return <p className="admin-where-legend"><span>Etiketler alanın nerede görüneceğini söyler:</span> <Where places={PLACES} /></p>;
}

/**
 * Site geneli bilgilendirme notu (proje sahibinin metni ve kararı, 2026-10-06). Tüm ziyaretçi sayfalarının alt bilgisinde (footer) küçük puntoyla
 * görünür; React alt bilgisi (SiteChrome) ve prerender HTML'i aynı metni kullanır. Metin sorumluluk bildirimidir; proje sahibine sormadan
 * değiştirme ya da kaldırma. Sayfa içeriğine ayrıca yazılmaz (aynı bilgi bir sayfada iki kez geçmez).
 */
export const SITE_DISCLAIMER = {
  title: "Bilgilendirme",
  text: "Bu site genelinde bulunan tüm bilgiler genel geçer bilgilerdir. Tavsiye niteliği taşımaz. Teknik sorunlar konunun uzmanı tarafından incelenmeli ve analiz edilerek gerekli güvenlik tedbirleri altında çözülmelidir. Bir arıza durumunda cihaza müdahale etmeyin. Cihazınızdaki bir sorun için yetkili servisten veya yetkin bir özel servisten uzman desteği alın.",
} as const;

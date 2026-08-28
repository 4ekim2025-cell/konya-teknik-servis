# SEO ve Kırık Link Denetimi Ara Notları

Tarih: 28 Ağustos 2026

## Proje bulguları

- Uygulama React + Vite + Wouter ile istemci tarafı yönlendirme kullanıyor.
- `client/src/App.tsx` içinde sayfa başlığı, description, canonical, alternate hreflang, Open Graph, Twitter ve JSON-LD runtime olarak üretiliyor.
- JSON-LD içinde ProfessionalService, WebSite, WebPage, BreadcrumbList; hizmet sayfalarında Service; `/sss/` ve `/online-servis-takibi/` için FAQPage bulunuyor.
- Googlebot için önemli içeriklerin önemli bölümü JavaScript çalıştıktan sonra oluşuyor. Bu nedenle yayın sonrası URL Inspection ve Rich Results Test ile doğrulama gerekli.
- `client/src/pages/ContentPage.tsx` içinde 19 marka listesine ek olarak `/grundig-servisi-konya/` rotası bulunuyor.
- `client/public/sitemap.xml` içinde Grundig URL’si de listelenmiş; bu, 19 markalık içerik stratejisiyle tutarsız ekstra bir crawl yüzeyi oluşturuyor.
- `client/src/pages/ContentPage.tsx` iletişim kartında görünen `0551 185 87 73` numarasına rağmen `tel:+905555555555` kullanılıyor. Bu somut bir kırık/yanlış telefon hedefidir.
- Footer yalnızca ilk dört hizmeti doğrudan listeliyor; 10 hizmet sayfasının kalan altısına site genelinden crawl derinliği daha zayıf.
- Legal sayfasındaki içerik, yayın öncesi işletme unvanı, adres, vergi/iletişim ve sorumlu kişi bilgilerinin tamamlanmasını istiyor.
- Dört Manus CDN görseli HTTP 200 ve `image/webp` döndürdü.

## Canlı link kontrolü

Önizleme kökü, temel bilgi sayfaları, 10 hizmet rotası, 3 ilçe rotası, 19 marka rotası ve Grundig rotası HTTP 200 döndürdü. Bu kontrol SPA rewrite nedeniyle sunucunun her yolu `index.html` ile cevaplayabildiğini gösterir; 200 sonucu tek başına rota bileşeninin doğru yüklendiğini kanıtlamaz.

Tarayıcı ile `/camasir-makinesi-tamiri-konya/`, `/tum-markalar/` ve `/iletisim/` sayfaları açıldı; başlık, içerik, global navigasyon ve footer render edildi. `/iletisim/` görsel ve metinsel olarak yükleniyor ancak telefon bağlantısı kaynakta yanlış hedefe işaret ediyor.

## Responsive görsel testleri

1440px masaüstü ve 390px mobil tam sayfa ekran görüntüleri alındı. Masaüstünde ana sayfa, hizmet detayı, marka dizini ve iletişim sayfası genel olarak düzenli; mobilde içerik tek kolona akıyor, marka kartları ve footer okunabilir. Mobilde header hamburger ile kompaktlaşıyor. Ayrıntılı responsive notları final raporunda öncelik seviyeleriyle verilecek.

## Birincil kaynak notları

Google SEO Starter Guide, yararlı ve people-first, özgün, güncel, iyi organize edilmiş içerik; anlamlı URL’ler; canonical/redirect yönetimi; sitemap ve Search Console doğrulamasını temel uygulamalar olarak vurguluyor.

Google’ın Generative AI optimizasyon rehberi, AI arama için ayrı bir özel schema veya ayrı bir yapay zekâ indeksi yerine temel SEO, açık teknik yapı, değerli ve emtia olmayan içerik, yerel işletme ayrıntıları ve Search Console ölçümünü öne çıkarıyor.

Google LocalBusiness structured data rehberi, yapılandırılmış verinin Rich Results Test ile doğrulanmasını, URL Inspection ile Google’ın gördüğü HTML’nin kontrolünü ve sitemap gönderimini öneriyor. İşletme bilgileri, çalışma saatleri ve yerel varlık tutarlılığı önem taşıyor.

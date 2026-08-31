# EŞLİ TEKNİK — Google ve Yapay Zekâ Arama Görünürlüğü Denetimi

**Tarih:** 30 Ağustos 2026  
**Kapsam:** Proje kaynakları, mevcut tarama/indeksleme varlıkları ve Google’ın güncel resmî rehberleri incelenmiştir. Bu rapor, sıralama garantisi vermez; görünürlük için kontrol edilebilir teknik ve işletme adımlarını önceliklendirir.

## Kısa sonuç

> Site; Türkçe dil bildirimi, mobil tasarım, hizmet/marka/ilçe odaklı URL’ler, iç bağlantılar, özgün 404 sayfası, sayfa bazlı başlık/açıklama üretimi ve `ProfessionalService`/`Service`/`BreadcrumbList` şeması yönünden iyi bir başlangıç seviyesindedir. Denetim sırasında saptanan eski Manus alan adı sorunu, sitemap ve robots dosyalarının **`https://esliteknik.com`** ile eşitlenmesiyle giderilmiştir. Bir sonraki teknik öncelik, önemli sayfalardaki meta ve yapılandırılmış veriyi önceden render edilmiş HTML’de sunmaktır.

Google, sitemap’te yer alan mutlak URL’leri tam olarak belirtilen haliyle taramaya çalışır; kanonik URL, sitemap ve yönlendirmelerin aynı tercih edilen alan adını işaret etmesi gerekir.[1] [2]

## Mevcut durum

| Alan | Mevcut uygulama | Değerlendirme |
|---|---|---|
| Tarama izni | `robots.txt` tüm botlara izin veriyor | Olumlu |
| Sitemap | 42 temel URL `https://esliteknik.com` alan adıyla listeleniyor | Güncellendi |
| URL yapısı | Cihaz, marka ve ilçe sayfaları ayrı, anlamlı URL’lerde | Olumlu |
| Meta veriler | Ana sayfada temel açıklama, Open Graph ve Twitter alanları mevcut | Olumlu |
| Kanonik URL | Uygulama çalıştıktan sonra tarayıcıda dinamik üretiliyor | P1: kaynak HTML / prerender ile güçlendirilmesi önerilir |
| Yapılandırılmış veri | `ProfessionalService`, `WebSite`, `WebPage`, `BreadcrumbList`; bazı sayfalarda `Service` ve `FAQPage` istemci tarafında ekleniyor | P1: sunulan HTML’de üretilecek şekilde güçlendirilmesi önerilir |
| Yerel güven sinyalleri | Telefon, çalışma saati ve üç ilçe mevcut; doğrulanmış açık adres/koordinat bulunmuyor | P0/P1: gerçek işletme verisi gerekli |
| İçerik | 10 cihaz, 19 marka ve 3 ilçe sayfası var; bazı açıklamalar şablon yapısından türetiliyor | P1: yüksek niyetli sayfalarda özgün derinlik artırılmalı |
| Performans | Görseller CDN’de, rota bölme var; en büyük temel React paketi yaklaşık 434 kB (gzip yaklaşık 130 kB) | P2: gerçek cihaz Core Web Vitals ölçümü önerilir |

## Öncelik 0 — Yayınlanmadan / yeniden indeksleme istenmeden önce

### 1. Tek bir kesin alan adı kullanın ve tüm SEO sinyallerini eşit tutun

Nihai alan adı **`https://esliteknik.com`** olarak belirlendi ve statik SEO dosyaları bu alan adıyla güncellendi. Aşağıdaki konumlarda yalnızca bu HTTPS alan adı kullanılmaya devam etmelidir:

| Konum | Yapılacak işlem |
|---|---|
| `client/public/robots.txt` | `Sitemap:` satırını yeni alan adınızla güncellemek |
| `client/public/sitemap.xml` | Tüm `<loc>` değerlerini yeni alan adına geçirmek |
| Kanonik URL | Her sayfanın kendi nihai HTTPS URL’sini işaret etmesini sağlamak |
| Vercel Domains | `www` / kök alan adı tercihini tekleştirmek, diğer varyantı 301 ile yönlendirmek |
| Google Search Console | Alan adı mülkünü doğrulamak ve yeni sitemap’i göndermek |

Sitemap, kanonik URL tercihi için zayıf; `rel="canonical"` ise güçlü bir sinyaldir. Sinyaller çelişirse Google farklı bir URL’yi seçebilir.[2] Bu nedenle Vercel’de `www.esliteknik.com` kullanılıyorsa, bu varyantın kök alan adına 301 ile yönlendiği de doğrulanmalıdır.

### 2. Google Search Console’u kurun ve indeksleme durumunu ölçün

Alan adı mülkünü doğruladıktan sonra `https://esliteknik.com/sitemap.xml` adresini Search Console’a ekleyin. Ardından ana sayfa, en önemli 10 cihaz sayfası, `tum-markalar`, `iletisim` ve üç ilçe sayfasını URL Denetimi ile kontrol edin. Yeni yayın veya alan adı taşınması sonrası tarama birkaç gün ile birkaç hafta sürebilir; tekrar tekrar istek göndermek süreci hızlandırmaz.[3]

### 3. Google İşletme Profili ile site verilerini birebir eşleştirin

Google’ın yerel sonuçları ağırlıklı olarak **alaka düzeyi, mesafe ve belirginlik** sinyallerini kullanır.[4] Bu nedenle aşağıdaki bilgiler, gerçek ve aynı biçimde hem Google İşletme Profili’nde hem sitede yer almalıdır:

* Ticari unvan: **EŞLİ TEKNİK**
* Telefon: **+90 551 185 87 73**
* Gerçek çalışma saatleri
* Hizmet alanı: Meram, Selçuklu, Karatay
* Gerçek işletme adresi veya Google’ın hizmet alanı işletmesi kurallarına uygun gizlenmiş adres ayarı
* Gerçek iş yeri/ekip/işlem fotoğrafları ve yalnızca gerçek müşteri yorumları

İşletme profili doğrulaması, güncel işletme bilgileri, gerçek müşteri yanıtları ve özgün fotoğraf/video eklenmesi Google tarafından açıkça önerilmektedir.[4] Yapay yorum, derecelendirme veya referans eklenmemelidir.

## Öncelik 1 — Organik ve AI destekli arama kapsamını güçlendirin

### 4. Önemli sayfaları prerender/SSR ile sunun

Mevcut site, React istemci kodu çalıştıktan sonra sayfa başlığı, açıklama, kanonik bağlantı, Open Graph ve JSON-LD şema oluşturuyor. Google JavaScript’i işleyebilir; fakat uygulama kabuğu yaklaşımında içerik önce işleme kuyruğuna gider. Google ayrıca sunucu tarafı veya önceden render edilmiş HTML’nin kullanıcılar ve tarayıcılar için daha hızlı olduğunu; tüm botların JavaScript çalıştırmadığını belirtir.[5]

**Öneri:** Ana sayfa, 10 cihaz sayfası, 19 marka sayfası, 3 ilçe sayfası, SSS ve iletişim için statik üretim (SSG/prerender) ya da SSR uygulayın. Her çıktı HTML’i şunları sayfa yüklenmeden önce içermelidir:

* Benzersiz `<title>` ve meta description
* Mutlak URL ile self-referential canonical
* O sayfaya özel Open Graph başlığı/açıklaması/görseli
* Görünür metinle tam uyumlu JSON-LD
* Asıl `h1`, hizmet kapsamı ve SSS metni

Bu değişiklik, özellikle sosyal paylaşım botları, yerel dizinler ve JavaScript’i sınırlı işleyen tarayıcılar için faydalıdır. Google tarafında da render bağımlılığını azaltır.[5]

### 5. Yerel işletme şemasını gerçek işletme verileriyle tamamlayın

Kodda `ProfessionalService` verisi vardır; ancak doğrulanmış `PostalAddress` ve `GeoCoordinates` yoktur. Google’ın LocalBusiness rehberi, işletme adı ve adresini gerekli alanlar arasında sayar; telefon, URL, çalışma saatleri, koordinat ve fiyat aralığı gibi bilgileri önerir.[6]

Gerçek adres ve konum koordinatı kullanıcı tarafından onaylanırsa, şema ile Google İşletme Profili eşitlenmelidir. Kamuya açık ziyaret adresi yoksa **uydurma adres veya koordinat eklemeyin**; service-area işletmesi ayarı için Google İşletme Profili kurallarına uyun.

### 6. Yüksek niyetli sayfaları şablondan uzman içeriğe taşıyın

Mevcut cihaz/marka/ilçe mimarisi arama niyetini iyi yakalıyor. Ancak marka sayfalarının önemli bölümü aynı yapının yalnızca marka adı ve cihaz kapsamı değişen türevleri. İlk aşamada en çok talep beklenen sayfalara (örneğin Çamaşır Makinesi, Buzdolabı, Bulaşık Makinesi, Arçelik, Bosch, Vestel ve üç ilçe) özgün bilgiler ekleyin:

| Sayfa öğesi | Özgün ve güvenli içerik örneği |
|---|---|
| Arıza belirtisi | Kullanıcının güvenle gözlemleyebileceği belirti ve acil servis eşiği |
| Servis akışı | Talep, randevu, inceleme, onay, onarım, takip adımları |
| Marka kapsamı | Hizmet verilen cihaz grupları ve bağımsız servis açıklaması |
| Yerel bağlam | Gerçek hizmet planlama açıklaması; uydurma mahalle/şube iddiası olmadan |
| Kanıt | Gerçek ekipman, işlem süreci, doğrulanabilir uzmanlık veya güncel yasal bilgiler |

Google’ın AI özellikleri için özel bir şema veya dosya gerekmez. Özgün, güvenilir, insan odaklı ve iyi yapılandırılmış içerik; temel SEO ile birlikte daha doğru yaklaşımdır.[7] Ayrı ayrı yüzlerce ince “marka × cihaz × ilçe” sayfası üretmek yerine, gerçek fayda sağlayan sayfaları derinleştirin.

### 7. SSS’leri gerçek müşteri sorularıyla geliştirin

SSS içeriği; servis süresi, aynı gün planlama koşulları, servis alanı, garanti/işlem onayı, takip linki, parça temini ve marka kapsamı gibi gerçek sorularla büyütülebilir. FAQ şeması görünür metinle tamamen eşleşmelidir. Şema, bilgi anlamını açıklamaya yardımcı olur; zengin sonuç görünümü veya sıralama garantisi değildir.[6]

## Öncelik 2 — Ölçüm, güven ve devamlılık

### 8. Gerçek kullanıcı verisiyle teknik deneyimi takip edin

Search Console’da mobil kullanılabilirlik, sayfa dizine eklenebilirlik, Core Web Vitals ve tarama hatalarını aylık izleyin. PageSpeed Insights ile ana sayfa ve üç yüksek niyetli hizmet URL’sini gerçek mobil koşullarda ölçün. Temel JavaScript paketi ve hero görseli, ilk yükleme deneyiminde incelenmesi gereken alanlardır.

### 9. Gerçek web varlıklarını ve yerel atıfları oluşturun

Google İşletme Profili dışındaki işletme dizinleri, sektör birlikleri veya yerel kaynaklarda yalnızca gerçek NAP bilgisiyle yer alın. Tanınmış ve alakalı sitelerde doğal, editoryal bağlantılar; yapay bağlantı paketlerinden daha değerlidir. İşletmenin kendi fotoğrafları, gerçek işlem açıklamaları ve düzenli hizmet güncellemeleri belirginlik sinyalini destekler.[4]

### 10. AI görünürlüğünde yanlış önceliklerden kaçının

Google; AI Overviews/AI Mode için `llms.txt`, özel “AI SEO” işaretlemesi, yapay mention veya içerikleri yalnızca anahtar kelime varyasyonları için çoğaltmayı gerekli görmez. Bu tür özel dosyalar Google görünürlüğünü artırmaz; önemli olan indekslenebilirlik, açık sayfa yapısı, metin içeriği, görsel destek, doğru yapılandırılmış veri ve gerçek işletme bilgileridir.[7] [8]

## Önerilen 30 günlük uygulama sırası

| Zaman | İş | Sorumlu | Başarı ölçütü |
|---|---|---|---|
| 1–3 gün | Nihai Vercel alan adını bildirin; sitemap/robots/canonical kaynak alanını değiştirin | Site sahibi + geliştirici | Sitemap yalnızca nihai HTTPS URL’leri içerir |
| 1–7 gün | Search Console mülk doğrulaması, sitemap gönderimi, URL Denetimi | Site sahibi | İndeksleme engeli ve sitemap hatası yok |
| 1–7 gün | Google İşletme Profili’ni doğrulayıp NAP, saat ve hizmet alanını eşitleyin | Site sahibi | Profil ve site tutarlı |
| 2–3 hafta | En yüksek 6–10 sayfayı gerçek, ayrıntılı içerikle zenginleştirin | Site sahibi + içerik sorumlusu | Sayfalar birbirinden anlamlı biçimde ayrışır |
| 3–4 hafta | Prerender/SSR teknik iyileştirmesi ve Rich Results/URL Denetimi | Geliştirici | Kaynak HTML’de sayfa başlığı, canonical ve şema görünür |
| Her ay | Search Console, GBP performansı ve gerçek kullanıcı sorularıyla içerik güncellemesi | Site sahibi | Gösterim, tıklama, arama sorgusu ve dönüşüm trendleri izlenir |

## Bir sonraki teknik iş için gerekli bilgi

Sitemap, robots, kanonik URL ve Open Graph `og:url` etiketlerini doğru biçimde değiştirmek için **Vercel’de yayındaki kesin alan adı** gereklidir. Alan adını paylaştığınızda, bu P0 düzenlemeler tek bir güvenli güncellemede uygulanabilir.

## Kaynaklar

[1]: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap "Google Search Central — Build and submit a sitemap"
[2]: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls "Google Search Central — Canonical URL guidance"
[3]: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl "Google Search Central — Ask Google to recrawl your URLs"
[4]: https://support.google.com/business/answer/7091?hl=tr "Google İşletme Profili — Yerel sıralamayı yükseltme ipuçları"
[5]: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics "Google Search Central — JavaScript SEO basics"
[6]: https://developers.google.com/search/docs/appearance/structured-data/local-business "Google Search Central — LocalBusiness structured data"
[7]: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide "Google Search Central — Generative AI features optimization guide"
[8]: https://developers.google.com/search/docs/appearance/ai-features "Google Search Central — AI features and your website"

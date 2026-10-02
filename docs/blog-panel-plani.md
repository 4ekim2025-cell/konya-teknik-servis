# Blog Yönetim Paneli — Proje Planı

Bu dosya panel projesinin tek doğruluk kaynağıdır. Her aşama **yeni bir sohbette** yapılır; sohbet bu dosyayı ve `CLAUDE.md`'yi okuyarak başlar. Aşama bitince aşağıdaki durum tablosunu güncelle ve `CLAUDE.md`'ye gerekli notları ekle.

Plan tarihi: 2026-10-02. Proje sahibi: Esad Eşli.

## Durum

| # | Aşama | Durum |
|---|---|---|
| 1 | İçeriği koddan ayırma | Bekliyor |
| 2 | Panel (giriş, liste, editör, ekle/düzenle/sil, özet) | Bekliyor |
| 3 | Yapay zeka taslağı, Google İşletme ve Instagram metinleri | Bekliyor |
| 4 | Fotoğraflar (Vercel Blob) | Bekliyor |
| 5 | Google İşletme (API yok / API var) | Bekliyor |
| 6 | Zamanlama ve istatistik | Bekliyor |

## Amaç

Blog yazıları bugün `shared/blog-posts.ts` içinde kodla ekleniyor; her yazıda ayrıca `sitemap.xml`, `llms.txt` ve test dosyası elle güncelleniyor. Hedef: `esliteknik.com/yonetim/` adresinde, kod yazmadan yazı ekleme, düzenleme ve silme yapılan bir panel.

## Kesinleşen kararlar

- **Yaklaşım:** Siteye özel panel. Hazır CMS veya veritabanı kullanılmaz.
- **İçerik kaynağı GitHub deposudur.** Panel yazıyı commit olarak `main`'e yazar, Vercel siteyi yeniden derler. Canlı site her zaman prerender edilmiş statik HTML'dir. İçerik anlık olarak veritabanından çekilmez.
- **Kullanıcı:** Yalnızca proje sahibi. Tek şifreli giriş.
- **Cihaz:** Masaüstü öncelikli tasarım (solda editör, sağda canlı önizleme). Telefonda da çalışmalı ama öncelik değil.
- **Yayın:** Doğrudan canlıya. Önizleme onayı beklenmez. Kod değişiklikleri için "ayrı branch + PR" kuralı aynen sürer; yalnızca panelin içerik commit'leri doğrudan `main`'e gider.
- **Fotoğraflar:** Vercel Blob (Hobby). Depoya fotoğraf eklenmez.
- **Yapay zeka:** İlk tercih Google Gemini API ücretsiz katmanı; yedek Groq. Ücretli servis kullanılmaz.
- **Silme:** Panelden silme vardır. Varsayılan: yazı siteden, sitemap'ten, `llms.txt`'den ve iç bağlantılardan kalkar (adres 404 verir). İsteğe bağlı kutucuk: adresi ilgili hizmet/marka sayfasına yönlendir. `CLAUDE.md`'deki "mevcut URL silinmez" kuralına, proje sahibinin panelden bilinçli silmesi istisna olarak eklenir.
- **Google İşletme:** İki yol birlikte kurulur; ayarlarda "API yok / API var" seçimi bulunur. Başlangıç durumu "API yok".
- **Maliyet:** GitHub ve Vercel ücretsiz paketlerinin dışına çıkılmaz.

## Değişmeyen kurallar

- `CLAUDE.md`'deki "arama görünürlüğü asla geriletilmez" kuralı bu projede de en üsttedir.
- Yayındaki yazının adresi (slug) değiştirilemez; panelde kilitlidir.
- `/yonetim/` ve `/api/admin/` aramada görünmez: `noindex` başlığı, `robots.txt` engeli; sitemap'e ve `llms.txt`'ye girmez, sitede bağlantı verilmez.
- Panel kodu ayrı chunk olarak yüklenir; ziyaretçinin indirdiği paket büyümez.
- Gizli anahtarlar (panel şifresi özeti, oturum anahtarı, GitHub, Gemini, Blob, Google) yalnızca Vercel ortam değişkenlerinde durur. `VITE_` önekiyle kullanılmaz, depoya ve tarayıcıya gitmez.
- İçerik kuralları (`CLAUDE.md` → Blog kuralları) editörde ve API'de aynı ortak şemayla denetlenir.

## Mimari

| Parça | Yeri | Görevi |
|---|---|---|
| İçerik dosyaları | `content/blog/<slug>.json` | Yazı başına bir dosya |
| Ortak şema | `shared/blog-schema.ts` (Zod) | Tek kural seti: editör, API ve testler |
| İçerik derleyici | `scripts/build-content.ts` | JSON dosyalarından yazı listesini, sitemap'i ve `llms.txt` blog bölümünü üretir |
| Panel arayüzü | `client/src/admin/` | Lazy yüklenen ayrı bölüm |
| Panel API'si | `api/admin/*` | Giriş, listeleme, kaydetme, yayınlama, silme, derleme durumu |
| Ayarlar | `content/settings.json` | Gizli olmayan ayarlar (ör. Google İşletme API var/yok) |

Yayın akışı: giriş → editörde yaz ve önizle → "Yayınla" → API kuralları sunucuda tekrar denetler → GitHub'a tek commit → Vercel derler (içerik derleyici, prerender, IndexNow) → panel derleme durumunu gösterir. Derleme hata verirse Vercel eski sürümü yayında tutar.

Taslaklar yazı dosyasında `status: "draft"` olarak saklanır; derleyici taslakları siteye, sitemap'e ve `llms.txt`'ye almaz. Taslak commit'lerinin gereksiz derleme başlatmaması için Vercel'in commit mesajı atlama işareti kullanılır (2. aşamada doğrulanacak).

## Aşama 1 — İçeriği koddan ayırma

Ziyaretçi için hiçbir şey değişmez.

Kapsam:
- `shared/blog-posts.ts` içindeki 21 yazıyı `content/blog/*.json` dosyalarına taşı. Türler, `BLOG_AUTHOR`, kategoriler ve yardımcı fonksiyonlar kalır; `blogPosts` dizisi üretilen veriden beslenir. React ve `scripts/prerender.ts` aynı kaynağı kullanmaya devam eder.
- `shared/blog-schema.ts`: mevcut testlerdeki kuralları Zod şemasına taşı (slug kalıbı, açıklama ≤ 160 karakter ve benzersiz, kategori, `updated >= published`, usta vakasında `caseFile` + ilçe Karatay/Meram/Selçuklu + `brandPath`, yasaklı ifadeler, yalnızca Türkçe kaynak).
- `scripts/build-content.ts`: build'in ilk adımı. Yazıları doğrular, sıralar, `sitemap.xml` blog girişlerini ve `llms.txt` blog bölümünü üretir. Blog dışındaki sitemap ve `llms.txt` içeriği aynen korunur.
- Testleri yeni kaynağa bağla. Sabit sayı bekleyen testleri (ör. "Meram'da en az 4 vaka", "Philips en az 5") silmeye izin verecek şekilde gevşet; kural denetimleri kalır.

Kabul ölçütü:
- Taşıma öncesi ve sonrası `dist/public` dosya dosya karşılaştırılır: tüm HTML'ler, `sitemap.xml` (66 adres) ve `llms.txt` aynıdır. Fark varsa birleştirme yapılmaz.
- `pnpm check`, `pnpm test`, `pnpm build` temiz.
- Bağımsız bir inceleme (Opus) çıktı karşılaştırmasını doğrular.

## Aşama 2 — Panel

Kapsam:
- **Giriş:** tek kullanıcı; şifre özeti ortam değişkeninde; imzalı, HttpOnly oturum çerezi (30 gün); hatalı denemede bekleme; `/api/admin/` için istek sınırı.
- **GitHub yazımı:** dar kapsamlı anahtar (yalnızca bu depo, içerik yazma). API yalnızca `content/` altına yazabilir.
- **Yazılar ekranı:** tüm yazılar (mevcut 21 dahil), başlık, kategori, tarih, durum; arama ve kategori filtresi.
- **Editör:** kategori; servis kaydı formu (ilçe, marka, cihaz listeden seçilir; `brandPath` ve `servicePath` otomatik kurulur); başlık, açıklama (160 sayaç), özet; slug (başlıktan üretilir, yayından sonra kilitli); bloklar (paragraf, ara başlık, liste, adımlar, usta notu; ekle, sil, sürükle); kaynaklar; canlı önizleme (sitedeki bileşenin aynısı); yayın öncesi kontrol listesi.
- **Düzenleme:** `updated` tarihi otomatik yenilenir.
- **Silme:** taslak doğrudan silinir. Yayındaki yazıda onay penceresi + isteğe bağlı yönlendirme kutucuğu + "Google İşletme'deki düğmeyi Hemen ara'ya çevir" hatırlatması.
- **Yayın durumu:** son derlemelerin durumu, hata açıklaması, önceki sürüme dönme.
- **Özet görünümü:** ilçe, marka, cihaz ve kategori bazında yazı sayıları; boş kalan konular.
- `CLAUDE.md`'ye silme istisnasını ve panel notlarını ekle.

Kabul ölçütü:
- Panelden yazılan deneme yazısı Vercel önizleme ortamında yayınlanır; statik HTML'i ve şeması mevcut yazılarla aynı yapıdadır.
- Kurala aykırı yazı ne editörden ne doğrudan API çağrısıyla yayınlanabilir.
- Oturumsuz hiçbir `/api/admin/` isteği veri döndürmez veya yazmaz.
- Giriş ve GitHub yazım kodu bağımsız bir incelemeden (Opus) geçer.

## Aşama 3 — Yapay zeka

Kapsam:
- Girdi formu: konu, ilçe, marka, cihaz, şikâyet, tespit, yapılan işlem, serbest not.
- Çıktı: editörün blok yapısında yazı taslağı (başlık, açıklama, özet, bloklar, usta notu) + Google İşletme özet metni + Instagram metni. Çıktı ortak şemayla doğrulanır; proje sahibi düzenleyip onaylamadan yayınlanmaz.
- Prompt, mevcut usta vakalarının kalıbına göre yazılır ve örnek olarak 2–3 mevcut yazı içerir. Kalıp: başlık "İlçe'de [belirti] [marka] [cihaz]: [bulgu]" → giriş (şikâyet, elenen basit ihtimaller) → tespit bölümü → parçanın ne işe yaradığı → kullanıcıya dönük liste/adımlar → ustanın notu.
- Kural: vaka ayrıntısı yalnızca girilen bilgiden gelir, uydurulmaz. Model yalnızca genel teknik açıklamayı ekler. Fiyat, hukuki konu, yetkili servis iddiası, yabancı kaynak yok.
- Aşama başında Gemini ücretsiz katman limitlerini resmi sayfadan doğrula (planlama sırasında doğrulanamadı). Yetersizse Groq.

Kabul ölçütü: üç farklı vaka girdisiyle üretilen taslaklar şemadan geçer ve girilmemiş vaka ayrıntısı içermez.

## Aşama 4 — Fotoğraflar

Vercel Blob Hobby kotası (aylık): 1 GB depolama, 10 GB veri aktarımı, 2.000 gelişmiş işlem (yükleme), 10.000 basit işlem (önbellek dışı okuma). Kota aşılırsa Blob 30 gün kapanır; ücret kesilmez.

Kapsam:
- Yazı modeline `cover` ve `image` bloğu ekle (adres, alt metin zorunlu, genişlik/yükseklik).
- Tarayıcıda yükleme öncesi küçültme ve WebP'ye çevirme (1600 px ve 800 px); EXIF ve konum verisi silinir.
- Blob'a istemci yüklemesi (public store). Silinen yazının fotoğrafları Blob'dan da silinir.
- Kapak fotoğrafı BlogPosting şemasına ve `og:image`'e girer. Fotoğrafsız yazılar bugünkü görseli kullanmaya devam eder.
- Yazı sayfasında ve prerender HTML'inde fotoğraf görünümü (`loading="lazy"`, boyutlar belirtilmiş).
- Panelde Blob kullanım göstergesi.
- Mevcut yazılara fotoğraf eklemek isteğe bağlıdır; ek geliştirme gerektirmez.

Kabul ölçütü: yüklenen fotoğrafta konum verisi kalmaz; fotoğraflı yazının PageSpeed puanı fotoğrafsız haline göre belirgin düşmez.

## Aşama 5 — Google İşletme

Bulgular (2026-10-02): profil "Eşli Teknik - Konya Beyaz Eşya Servisi" doğrulanmış. 9 paylaşım var; 3'ü "Daha fazla bilgi edinin" düğmesiyle blog yazısına bağlanıyor, 6'sı "Hemen ara" düğmeli. Google, API erişimi için profilin en az 60 gündür doğrulanmış ve aktif olmasını ve bir web sitesi bulunmasını istiyor; başvuruyu proje sahibi kendi hesabıyla yapar. Profil yeni olduğu için başlangıç "API yok".

Kapsam:
- **API yok:** yazı yayınlanınca "Google İşletme paketi": özet metni (kopyala), takip etiketli bağlantı, düğme türü seçimi (Daha fazla bilgi / Hemen ara), fotoğrafları indir, "paylaşıldı" kutusu. Aynı pakette Instagram metni.
- **API var:** ayarlarda hesap ve konum kimliği alanları, "bağlantıyı sına" düğmesi. Paylaşım oluşturma (`localPosts.create`, fotoğraf Blob adresinden `sourceUrl` ile), yazı silinince düğmeyi "Hemen ara"ya çevirme, "paylaşıldı" durumunu otomatik işaretleme.
- Takip etiketi: `utm_source=google&utm_medium=organic&utm_campaign=gbp-post` (Instagram için ayrı kaynak).

Not: API kodu onay gelene kadar gerçek hesapla sınanamaz; belgeye göre yazılır, ilk gerçek deneme onaydan sonra yapılır.

## Aşama 6 — Zamanlama ve istatistik

- **Zamanlama:** yazıya ileri tarih verilir. Hobby pakette cron günde bir kez ve yaklaşık bir saat sapmayla çalışır; "şu gün yayınla" desteklenir, saat hassasiyeti yoktur. Günlük cron, tarihi gelen yazı varsa derlemeyi tetikler.
- **İstatistik:** yazı başına görüntülenme, `whatsapp_click` ve `phone_click` sayıları (GA4 Data API, salt okunur servis hesabı). Sayılar yalnızca çerezi kabul eden ziyaretçileri içerir; eğilim göstergesidir.

## Proje sahibinden gerekenler

- Aşama 2: dar kapsamlı GitHub anahtarı; Vercel'de panel şifresi özeti, oturum anahtarı ve GitHub anahtarı ortam değişkenleri.
- Aşama 3: Gemini API anahtarı.
- Aşama 4: Vercel'de Blob store oluşturma onayı.
- Aşama 5: profil 60 günü doldurunca Google İşletme API başvurusu.
- Aşama 6: GA4'e salt okunur servis hesabı tanımlama.

## Çalışma düzeni

- Her aşama yeni sohbette, ayrı branch ve PR ile yapılır. Varsayılan model Sonnet; 1. aşamanın çıktı karşılaştırması ve 2. aşamanın giriş/GitHub yazım kodu Opus ile bağımsız incelenir.
- Doğrulama ekran görüntüsüyle değil test, build ve dosya karşılaştırmasıyla yapılır.
- Aşama bitince bu dosyadaki durum tablosunu ve `CLAUDE.md`'yi güncelle.

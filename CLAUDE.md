# CLAUDE.md — EŞLİ TEKNİK (Konya Teknik Servis)

Bu dosya, Claude'un bu projede her oturumda bilmesi gerekenleri özetler. Proje sahibiyle **Türkçe** konuş; commit mesajları, kod içi metinler ve test açıklamaları da Türkçedir.

## Proje nedir?

Konya'da (Karatay, Meram, Selçuklu) beyaz eşya ve küçük ev aletleri servisi veren **EŞLİ TEKNİK** için mobil öncelikli tanıtım sitesi. Canlı adres: **https://esliteknik.com** (Vercel).

Sitenin amacı ziyaretçiyi üç eyleme yönlendirmektir: **WhatsApp'tan servis talebi**, **telefonla arama** ve **online servis takibi** sayfası. Google'da yerel aramalarda görünürlük (SEO) en önemli iş hedefidir.

## KESİN KURAL: Arama görünürlüğü asla geriletilmez

> "Bu site içerisinde yapılacak hiçbir düzenleme Google veya yapay zeka aramalarında sitenin geri gitmesine sebep olmamalı. Bu çok önemli." — Esad Eşli

Bu kural diğer tüm isteklerden önce gelir. Her değişiklikten önce şunları kontrol et:
- Mevcut URL'ler silinmez, taşınmaz, yönlendirilmez; `sitemap.xml`'den sayfa çıkarılmaz. **Tek istisna:** proje sahibinin blog panelinden bilerek yaptığı yazı silme (bkz. "Blog paneli"); panel yayındaki yazıyı yalnızca onay penceresiyle siler, isteğe bağlı yönlendirme önerir. Kod/Claude tarafından blog yazısı silinmez.
- Bir sayfanın başlığı (`title`, `h1`), meta açıklaması, canonical'ı ve JSON-LD şeması kaldırılmaz; değişirse eşdeğer veya daha güçlü olmalıdır.
- Prerender HTML'indeki statik içerik azaltılmaz (içerik yalnızca JavaScript'e taşınmaz); iç bağlantılar kaldırılmaz.
- `noindex`, `robots.txt` engeli, doğrulama dosyası/etiketi silme, NAP (ad-adres-telefon) değişikliği yapılmaz (tek istisna: yalnızca yönetim yolları `/yonetim/` ve `/api/admin`, bilerek noindex/Disallow'dur).
- `llms.txt` ve yapay zeka aramalarının okuduğu yapılandırılmış bilgiler korunur.
- Bir değişikliğin sıralamayı düşürme ihtimali varsa, yapmadan önce proje sahibine riskini açıkça söyle ve onay al.

## Teknoloji

React 19 + TypeScript + Vite 7, Tailwind CSS 4 + özel CSS (`client/src/index.css`), shadcn/ui, Wouter, Lucide ikonları, Vitest. Paket yöneticisi **pnpm**.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `pnpm install` | Bağımlılıkları kurar |
| `pnpm dev` | Geliştirme sunucusu (port 3000) |
| `pnpm check` | TypeScript tür denetimi |
| `pnpm test` | Vitest testleri |
| `pnpm content` | `content/blog/*.json` yazılarını doğrular; `shared/blog-content.generated.ts`, `sitemap.xml` blog satırları ve `llms.txt` blog bölümünü üretir (`--check`: yazmadan denetler) |
| `pnpm admin:hash "parola"` | Panel parolasının scrypt özetini (`ADMIN_PASSWORD_HASH`) ve oturum anahtarını (`ADMIN_SESSION_SECRET`) üretir; Vercel ortam değişkenlerine yapıştırılır |
| `pnpm build` | İçerik derleyici (`scripts/build-content.ts`) → Vite build → `scripts/prerender.ts` ile statik SEO HTML'leri → sunucu paketi |

Bir değişikliği bitmiş saymadan önce `pnpm check`, `pnpm test` ve `pnpm build` çalıştır. Ortam npm'e erişemiyorsa bunu açıkça söyle ve doğrulamayı PR'ın Vercel önizleme build'ine bırak.

## Klasör yapısı

```text
client/
  index.html            # Statik meta etiketleri, varsayılan JSON-LD
  public/               # robots.txt, sitemap.xml, llms.txt, favicon, görseller
  src/
    App.tsx             # Rota seçimi + istemci tarafı meta/canonical/JSON-LD üretimi
    pages/Home.tsx      # Ana sayfa
    pages/ContentPage.tsx  # "/" dışındaki TÜM sayfalar (hizmet, marka, ilçe, blog, SSS, yasal...)
    components/SiteChrome.tsx  # Header, footer, mobil eylem çubuğu, iletişim sabitleri
    brandContent.ts, brandSeo.ts, deviceCare.ts  # Marka ve cihaz içerikleri
    siteConfig.ts       # Telefon ve WhatsApp bağlantıları (tek kaynak)
    *.test.ts           # Vitest testleri
shared/
  device-faults.ts      # 10 cihazın arıza rehberi, süre-ücret ve acil durum notları, sayfa açıklamaları (React + prerender ortak)
  brand-guides.ts       # 22 markanın özgün içeriği: açıklama, giriş, markaya özel notlar, SSS (React + prerender ortak)
  district-guides.ts    # Karatay/Selçuklu/Meram özgün içeriği: açıklama, giriş, sahadan notlar, SSS (React + prerender ortak; bilgi uydurulmaz)
  blog-posts.ts         # Blog yazı listesi (blog-content.generated.ts'ten okunur) + cihaza göre filtre; blog-meta.ts'i de dışa aktarır (React + prerender ortak)
  blog-meta.ts          # Blog türleri, yazar (Esad Eşli), kategoriler, okuma süresi/tarih/paylaşım yardımcıları (veri içermez)
  blog-schema.ts        # Blog yazısı Zod şeması: içerik kurallarının tek kaynağı (derleyici, testler, ileride panel)
  blog-content.generated.ts  # ÜRETİLİR, elle düzenleme: content/blog/*.json'dan scripts/build-content.ts üretir
  business-contact.ts   # Google İşletme profili bağlantısı
  seo-content.ts        # İlçe mahalleleri, ilçe ve hizmet SSS'leri
  legal-pages.ts        # KVKK, Gizlilik ve Çerez Politikası metinleri (React + prerender ortak)
content/blog/*.json     # Blog yazıları: yazı başına bir dosya (dosya adı = adres: /blog/<ad>/ → <ad>.json)
scripts/build-content.ts  # Build'in ilk adımı: yazıları doğrular, sıralar, sitemap/llms.txt blog bölümünü ve üretilen veri dosyasını yazar
scripts/prerender.ts    # Build sonrası her rota için başlık/açıklama/canonical/JSON-LD ve statik içerik yazar
server/, api/           # Instagram akışı (/api/instagram-feed) ve blog paneli API'si (/api/admin → server/admin/)
docs/                   # Vercel rehberi, SEO denetimleri, geliştirme notları
```

## Önemli kurallar

### SEO bilgisi birden fazla yerde tekrar ediyor, hepsini birlikte güncelle
Bir sayfa, marka, hizmet veya işletme bilgisi eklenirken ya da değiştirilirken şu dosyaların hepsini kontrol et:
- `scripts/prerender.ts`: rotalar, başlıklar, açıklamalar, statik içerik ve JSON-LD
- `client/src/App.tsx`: `brandNamesByPath`, istemci tarafı JSON-LD (adres, koordinat, saatler, hizmet listesi)
- `client/src/pages/ContentPage.tsx` ve ilgili içerik dosyaları (`brandContent.ts`, `brandSeo.ts`, `deviceCare.ts`, `shared/seo-content.ts`)
- `client/public/sitemap.xml` (tüm URL'ler `https://esliteknik.com` ile ve sonda `/` olacak şekilde)
- `client/index.html`: varsayılan meta ve JSON-LD

### Testler kaynak metne bakar
Testlerin çoğu dosyaları `readFileSync` ile okuyup belirli metinlerin varlığını (`toContain`) kontrol eder. Bir metni, sınıf adını veya yapıyı değiştirirsen ilgili test kırılabilir. Değişiklik bilinçliyse testi de aynı PR'da güncelle, testi silme. Yeni bir davranış eklerken aynı tarzda kısa bir test eklemek bu projenin alışkanlığıdır.

### İşletme bilgileri (NAP)
- Telefon/WhatsApp: `client/src/siteConfig.ts` → `0551 185 87 73`
- Adres: Gaziosmanpaşa Mah. Menzil Cad. No:70, Karatay / Konya 42020
- Çalışma saatleri: her gün 08:00–22:00
- Bu bilgiler Google İşletme profiliyle birebir aynı kalmalıdır. Değişirse tüm tekrarlandığı yerleri güncelle.

### İçerik dürüstlüğü
- **Resmî yetkili servis** iddiası yapılmaz; site bağımsız teknik servis olarak konumlanır.
- Sahte müşteri yorumu, puan, memnuniyet oranı, servis sayısı veya tecrübe yılı eklenmez.
- Hizmet kapsamı yalnızca beyaz eşya ve küçük ev aletleridir; klima ve kombi kapsam dışıdır.
- "Aynı gün servis" kesin söz olarak değil, planlamaya bağlı bir hedef olarak ifade edilir.

### URL ve teknik
- Tüm rotalar sonda `/` ile biter (`vercel.json` → `trailingSlash: true`).
- Yeni hizmet sayfası kalıbı: `/<cihaz>-tamiri-konya/`, marka sayfası kalıbı: `/<marka>-servisi-konya/`.
- Instagram erişim anahtarları yalnızca sunucu tarafındadır (`INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`). Asla `VITE_` önekiyle kullanma ve Git'e ekleme.
- Google Analytics 4 (`G-CBLYCZBBY0`): `client/src/analytics.ts` + `components/CookieConsent.tsx`. Betik yalnızca çerez şeridinde "Kabul et" sonrası ve yalnızca `esliteknik.com`'da yüklenir; `index.html`'e GA etiketi ekleme. WhatsApp/telefon tıklamaları `whatsapp_click` / `phone_click` olayı olarak `placement` ve `page_path` ile gönderilir; ön bilgi formu (`on_bilgi_formu`) ve ana sayfa arıza formu (`ariza_formu`) WhatsApp yönlendirmesinden önce `trackContact` çağırır. WhatsApp hazır mesajına sayfa bilgisi eklenmez (proje sahibinin kararı).
- IndexNow: `scripts/indexnow.ts` üretim build'inin sonunda sitemap'teki URL'leri Bing/Yandex'e bildirir. Anahtar dosyası `client/public/<anahtar>.txt`; anahtarı değiştirirsen dosyanın adını ve içeriğini de değiştir. Yeni sayfa sitemap'e eklenince otomatik bildirilir.
- Vercel projesi `esli3` ekibindedir (`konya-teknik-servis`). Önizleme linkleri Vercel girişi ister.
- Arama motoru doğrulama dosyalarını silme: `client/public/googlee436d634b952fabd.html` (Search Console), `index.html` içindeki `google-site-verification` ve `msvalidate.01` etiketleri. Silinirse mülk erişimi kaybolur.
- `/manus-storage/...` gibi göreli, geçici görsel yollarını üretim koduna ekleme.
- `vite.config.ts` içindeki Manus eklentileri (debug collector, storage proxy, runtime) önceki geliştirme ortamından kalmadır ve üretimde etkisizdir. Kaldırılması ayrı bir iş olarak ele alınmalıdır.

### İçerik tekrarı yasak
- Bir sayfada her bilgi yalnızca bir kez geçer. Cihaz sayfalarında belirti/kontroller yalnızca arıza bölümünde, süre-ücret-acil durumlar tek bölümde; SSS sayfada başka yerde cevaplanmayan sorulardan oluşur.
- Marka sayfalarında "bağımsız servisiz / yetkili servis değiliz" açıklaması içerik dosyasına yazılmaz; `BrandNotes` bileşeni ve prerender tek ortak satır olarak gösterir.
- Markalar arasında marka adını değiştirip aynı cümleyi kullanma. Genel sorular (servis kim, ücret, hata kodu) marka SSS'sine konmaz.
- Doğrulanamayan pazar/istatistik iddiası yazma ("Konya'da en yaygın", "şikâyetlerin çoğu" gibi).

### Kod stili
Mevcut dosyaların stilini koru. `App.tsx` ve `ContentPage.tsx` sıkıştırılmış, tek satırlık bir stille yazılmıştır. Küçük değişikliklerde dosyanın tamamını yeniden biçimlendirme, çünkü bu diff'i okunmaz hale getirir.

### Blog kuralları
- Yazar: **Esad Eşli**. Her yazı `content/blog/<ad>.json` dosyasında tanımlanır (dosya adı adresle aynıdır). Liste, yazı sayfası, prerender HTML'i, BlogPosting şeması, sitemap ve `llms.txt` bu kaynaktan beslenir. **Yeni yazı eklemek için yalnızca JSON dosyası eklenir**; `pnpm content` (build'de otomatik) `shared/blog-content.generated.ts` dosyasını ve `sitemap.xml` / `llms.txt` blog satırlarını eşitler. Üretilen üç dosyayı elle düzenleme; JSON'u değiştirdikten sonra `pnpm content` çalıştırıp çıktıyı birlikte commit et (`pnpm content --check` ve testler güncel olup olmadığını denetler).
- Kurallar `shared/blog-schema.ts` Zod şemasındadır (slug kalıbı, açıklama ≤ 160 karakter ve benzersiz, kategori, `updated >= published`, usta vakasında `caseFile` + ilçe Karatay/Meram/Selçuklu + `brandPath`, yasaklı ifadeler, yalnızca Türkçe kaynak, tek satırlık alanlarda satır sonu yok, `servicePath`/`brandPath` yalnızca `shared/blog-taxonomy.ts`'teki gerçek sayfalar). Kurala aykırı yazı build'i durdurur. Yeni hizmet ya da marka sayfası eklersen taxonomy listesine de ekle.
- Alanlar: `order` listelerdeki sırayı belirler (küçük olan önce; araya yazı eklemek için 10'ar aralık bırakılmıştır, benzersiz olmalı, siteye gitmez). `status: "draft"` olan yazı siteye, sitemap'e ve `llms.txt`'ye alınmaz. Yayındaki yazının adresi (slug) değiştirilmez. Sitemap'te rehber yazıları (Bakım/Karar Rehberi) 0.7, diğerleri 0.6 öncelik alır; `lastmod` yazının `updated` tarihidir.
- Kategoriler: Ustanın Defterinden (yalnızca Esad Eşli'nin anlattığı gerçek işler; ayrıntı uydurulmaz), Bakım Rehberi, Karar Rehberi, Tüketici Rehberi.
- İnternetten alınan deneyimler kaynağıyla özetlenir, Eşli Teknik müşterisi gibi sunulmaz, metin kopyalanmaz.
- **Kaynaklar yalnızca Türkçe olur.** Okuyucu kitlesi Konya'daki ev kullanıcılarıdır; İngilizce veya yabancı dilde kaynak bağlantısı verilmez.
- **Hukuki konular kapsam dışıdır** (MEDAŞ, tazminat, hakem heyeti, dava vb. yazılmaz). Fiyat yazılmaz.
- Blog yazısı cihaz sayfasındaki cümleyi tekrar etmez: cihaz sayfası "neden olur, ne kontrol edilir", blog "nasıl yapılır / sahada ne oldu / nasıl karar verilir" sorusunu cevaplar.

### Blog paneli (`/yonetim/`, `api/admin.ts`)
- Kurulum ve ortam değişkenleri: `docs/blog-paneli-kurulum.md`. Plan: `docs/blog-panel-plani.md`.
- Kod: sunucu `server/admin/` (`auth.ts` giriş/oturum, `github.ts` GitHub yazma, `service.ts` iş kuralları, `handler.ts` HTTP), ortak kurallar `shared/blog-*.ts` (şema, `blog-publish.ts` kaydetme kuralları, `blog-build.ts` üretilen dosyalar, `blog-taxonomy.ts` ilçe/marka/cihaz listeleri, `blog-redirects.ts`), arayüz `client/src/admin/` (App'te lazy ayrı parça).
- Panel yazıyı **tek commit** olarak `content/` altına ve üretilen üç dosyaya yazar (GitHub anahtarı yazma izni kod tarafında da yalnızca bunlarla sınırlıdır). Taslak commit'i mesajında `[panel-taslak]` taşır; `scripts/vercel-ignore-build.sh` bu commit'lerde, son yayından beri `content/blog/` dışında dosya değişmediyse build'i atlar.
- Yayındaki yazının adresi (slug) değişmez; yayın taslağa geri çevrilmez. Ana sayfadan sabit bağlantı verilen yazılar (`shared/blog-protected.ts`) panelden silinemez; yeni sabit blog bağlantısı eklersen bu listeye de ekle (test kırılır).
- Silinen yayın yazısı için panel `content/redirects.json` kaydı ekleyebilir; `scripts/prerender.ts` bunları anında yönlendiren statik sayfa olarak yazar. Yönlendirme yoksa adres 404 verir.
- `/yonetim/` ve `/api/admin` **noindex** kalır: `X-Robots-Tag` başlığı (`vercel.json`), `robots.txt` Disallow, sitemap/`llms.txt`/site içi bağlantılarda yer almaz, prerender kabuğu (`shared/admin-shell.ts`) canonical/JSON-LD içermez. Bu kuralları gevşetme.
- Sırlar (`ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`, `GITHUB_CONTENT_TOKEN`) yalnızca Vercel ortam değişkenleridir; `VITE_` öneki yok, günlüğe/yanıta yazılmaz. Giriş ve GitHub yazma kodunda değişiklik yapılırsa bağımsız (Opus) incelemeden geçmelidir.
- Yeni npm bağımlılığı eklenmedi (scrypt/HMAC/fetch yerel); tek istisna fotoğraflar için `@vercel/blob` (aşama 4, yalnızca `server/admin/blob.ts` içinde dinamik içe aktarılır). Panel testleri GitHub'ı bellek içi taklitle (`client/src/adminFakeGithub.ts`) sınar.
- **Yapay zeka taslağı** (`/api/admin?action=ai-draft`, `server/admin/ai.ts`, `shared/blog-ai.ts`, `client/src/admin/AiDraftBox.tsx`): vaka formundan "Ustanın Defterinden" taslağı + Google İşletme + Instagram metni üretir. Yeni Vercel fonksiyonu açılmaz (Hobby'de 12 sınırı); eylem oturum, CSRF, istek sınırı ve günlük sınırdan (`AI_DAILY_LIMIT`, varsayılan 20) geçer. Sağlayıcı Gemini ücretsiz katmanı (`GEMINI_API_KEY`), isteğe bağlı yedek Groq (`GROQ_API_KEY`); ücretli servis kullanılmaz. Anahtarlar yalnızca Vercel ortam değişkenidir.
- Yapay zeka kuralları: model yalnızca başlık, açıklama, özet, bloklar ve iki sosyal metni yazar. Servis kaydı formdan aynen kopyalanır, servis/marka adresleri `shared/blog-taxonomy.ts`'ten türetilir. Model çıktısı güvenilmez girdidir: şemadan, içerik kurallarından ve `findUngroundedDetails` denetiminden (girdide olmayan sayı, marka, ilçe, tarih, kişi, adres, vaat, bağlantı) geçmezse editöre dolmaz. Taslak yalnızca editöre dolar; kaydetme ve yayın proje sahibinin düğmeleriyle olur. Bu kuralları gevşetme; sağlayıcı testlerde bellek içi taklittir (`client/src/adminFakeAi.ts`), testlerde gerçek API çağrısı yapılmaz.
- **Olası nedenler** (`/api/admin?action=ai-suggest`, `buildAiSuggestions`, `generateAiSuggestions`): proje sahibi şikâyet, tespit ve işlemi elle yazmak yerine arızayı yazar; model genel bilgiden 3–5 olası neden/çözüm seçeneği sunar ve **sahada gerçekten yapılanı proje sahibi seçer** (tek seçenek çıksa da seçmek zorundadır; "hiçbiri değil, kendim yazacağım" her zaman vardır). Seçilen satırlar servis kaydına dolar, düzeltilebilir ve ancak o zaman vaka bilgisi sayılır. Kurallar: seçenek kendiliğinden kayda ya da yazıya GİRMEZ (otomatik seçim ekleme); modele yalnızca belirti, marka ve cihaz gider; seçenekler rakam, başka marka, ilçe, tarih, kişi, söz, bağlantı, fiyat, hukuk ve yetkili servis iddiası taşıyamaz (taşıyan seçenek atılır); sunucu ve editör aynı denetimi çalıştırır. Günlük hak taslakla ortaktır (bir yazı = öneri + yazı = iki hak). Canlı internet araması yapılmaz. Bu kuralları gevşetme.
- **Fotoğraflar** (aşama 4; `shared/blog-images.ts`, `server/admin/{images,blob,imageStore}.ts`, `client/src/admin/{imageTools,ImagePicker,ImageUsageCard}`): yazı modelinde `cover` ve `image` bloğu (adres, zorunlu alt metin, genişlik, yükseklik; en çok 10/yazı). Fotoğraflar Vercel Blob'da (herkese açık store) durur, depoya konmaz. Kurallar:
  - Fotoğraf adresi yalnızca `BLOG_IMAGE_HOST` alanından ve `blog/<32 hex>-1600.webp` kalıbında olabilir; şema (`blog-schema.ts`) denetler, alan boşken hiçbir adres geçmez. Bu kuralı gevşetme.
  - Yükleme `/api/admin?action=image-upload` ile sunucudan geçer (oturum, CSRF, istek sınırı, günlük sınır `BLOB_DAILY_UPLOAD_LIMIT`); yeni Vercel fonksiyonu açılmaz. Sunucu dosyayı güvenilmez girdi sayar: yalnızca WebP, EXIF/XMP/ICCP/animasyon varsa reddeder, dosya adını kendisi üretir. Büyük gövde sınırı yalnızca oturumlu `image-upload` içindir.
  - Blob anahtarı yalnızca Vercel ortam değişkenidir (`VITE_` yok, yanıta/günlüğe yazılmaz). Önizleme ve canlı AYNI store'u paylaşır: fotoğraf silme ve "kullanılmayanları temizle" yalnızca `main` dalındaki panelde çalışır; temizlik içerik hatasızken, 24 saatten eski, hiçbir yazıda (taslak dahil) kullanılmayan ve panel kalıbına uyan dosyalara dokunur.
  - Yapay zeka fotoğraf üretmez: AI çıktı şeması metin bloklarıyla sınırlıdır (`blogBlockSchema`), `cover` yoktur. Bunu değiştirme.
  - Ziyaretçi tarafı: kapak `fetchpriority="high"` (ertelenmez), gövde `loading="lazy"`, tüm `<img>`'de `width`/`height`; paylaşım etiketleri ve BlogPosting `image` yalnızca kapaklı yazıda değişir (`shared/blog-image-html.ts`). Fotoğrafsız sayfaların prerender HTML'i değişmemelidir; değişiklikten önce/sonra `dist/public` karşılaştırması yap.
  - Hobby kotası (1 GB, ayda 2.000 gelişmiş işlem; aşılırsa Blob 30 gün kapanır): kullanım ölçümü otomatik değil, düğmeyledir. Kurulum: `docs/blog-paneli-kurulum.md` bölüm 3c.
- **Paylaşım paketi ve Google İşletme** (aşama 5; `shared/blog-social.ts`, `server/admin/google.ts`, `client/src/admin/{SocialPackage,SettingsView}.tsx`): yazı başına `content/social/<ad>.json` (Google + Instagram metni, düğme türü, "paylaşıldı" durumu) ve `content/settings.json` (Google modu: varsayılan "API yok"). Kurallar:
  - Bunlar ziyaretçi sayfasına, prerender HTML'ine, sitemap'e, `llms.txt`'ye ve şemaya GİRMEZ; yazı JSON'una ve `blog-schema.ts`'e dokunulmaz. `scripts/prerender.ts`, `scripts/build-content.ts`, `App.tsx` bu dosyaları okumaz; bağlama (test kırılır).
  - Takip etiketli bağlantı (`trackedUrl`) yalnızca panel paketinde kullanılır; canonical, sitemap ve iç bağlantılar etiketsiz kalır.
  - Paket/ayar commit'leri `[panel-paylasim]` taşır; `scripts/vercel-ignore-build.sh` bu commit'lerde, son yayından beri `content/blog`, `content/social`, `content/settings.json` dışında dosya değişmediyse build'i atlar. Yeni bir panel verisi klasörü eklersen script'teki `:(exclude)` listesine de ekle.
  - Yeni Vercel fonksiyonu yok; eylemler `/api/admin` içindedir (`settings`, `settings-save`, `social-get`, `social-save`, `social-mark`, `google-test`, `google-share`). GitHub anahtarının izni değişmedi.
  - Google anahtarları (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`) yalnızca Vercel ortam değişkenidir (Production), `VITE_` yok, yanıta/günlüğe yazılmaz. `server/admin/google.ts` belgeye göre yazıldı, **gerçek hesapla denenmedi** (API erişimi bekleniyor); Google testleri bellek içi taklittir (`client/src/adminFakeGoogle.ts`). Giriş/GitHub yazma gibi bu istemci de sır taşır: değişiklikleri bağımsız incelemeden geçir.
  - Fotoğraf gönderimi (`sendPhoto`) varsayılan kapalıdır (WebP kabulü doğrulanmadı). Yazı silinince API ile paylaşılmış Google gönderisinin düğmesi "Hemen ara"ya çevrilir; sonuç silme yanıtında `google` alanıdır.
  - Sosyal metinler içerik kurallarına uyar (fiyat, hukuk, yetkili servis iddiası, uydurma ayrıntı, bağlantı yok). Kurulum: `docs/blog-paneli-kurulum.md` bölüm 3d.
- **Editör düzeni** (`client/src/admin/EditorView.tsx`): yapışkan üst çubuk (kaydet/yayınla) ve sabit gruplar. Yeni yazı "Ustanın Defterinden" olarak açılır ve EN ÜSTTE "Yapay zeka ile yazdır" grubu durur (arıza/konu → cihaz, ilçe, marka → "Olası nedenleri getir" ve seçim → seçimle dolan şikâyet/tespit/işlem → not → "Yapay zeka ile yazıyı yaz"); çünkü en sık kullanılan yol budur (proje sahibinin kararı). Altında yazı türü (dört kutu tek sırada), sonra yazı (başlık ve tanıtım, kapak, metin). Diğer türlerde ilk grup "Yazı türü ve cihaz"dır. Ana gruplar açılıp kapanmaz; yalnızca "Kaynaklar" ve "Önceki sürümler" açılır. Eksikler ait olduğu yerde gösterilir (`errorsBySection`, `editorModel.ts`). Yapay zeka girdisi servis kaydından kurulur (`aiInputFromPost`); kurallar ve denetimler aynıdır.
- Yapay zeka yönergesi (üslup, yazı kalıbı, giriş cümlesi) `server/admin/ai.ts` içindeki `RULES` metnidir. Giriş kalıbı proje sahibinin kararıdır: "[ilçe] ilçesinden [marka] marka [cihaz]ının [şikâyet] yönünde şikâyet aldık. Adrese ulaştık."; sormadan değiştirme. Gemini 5xx dönerse yeniden denenir ve yedek Flash modellerine (`GEMINI_FALLBACK_MODELS`) geçilir; hata nedeni için Vercel günlüğünde `admin: yapay zeka hatası <sağlayıcı> <tür> <durum kodu>` satırına bak.

## Git akışı

- `main` doğrudan canlı siteye yayınlanır. Değişiklikleri **ayrı bir branch'te** yap ve **pull request** aç. Vercel her PR için bir önizleme linki üretir.
- Commit önekleri: `fix:` (düzeltme, küçük metin/stil) ve `feat:` (yeni özellik veya görsel/davranış eklemesi). Mesajlar kısa ve İngilizce ya da Türkçe olabilir; mevcut geçmiş çoğunlukla İngilizcedir.
- PR'ı proje sahibi önizlemeyi kontrol ettikten sonra birleştirir.

## Bilinen noktalar

- `client/src/prerendered.ts`: React başlamadan önce `#root` içindeki prerender HTML'i saklanır; sayfa kodu yüklenemezse (Googlebot'ta chunk hatası = soft 404) `ErrorBoundary` bu statik içeriği gösterir; yüklenirken ziyaretçiye iskelet (`RouteFallback`) gösterilir. `index.html`'deki `js-app` sınıfı statik içeriği JavaScript çalışan tarayıcıda React gelene kadar gizler (yenilemede "başka sayfa" görünmesini önler; 5 sn güvenlik süresi). `main.tsx`, `App.tsx` (`lazyWithRetry`), `ErrorBoundary` ve bu gizleme kuralı birlikte çalışır; kaldırma.
- Yasal sayfaların (KVKK, gizlilik, çerez) metni `shared/legal-pages.ts` içindedir; React sayfası ve prerender HTML'i buradan beslenir. Metin hukuki içeriktir, proje sahibinin onayı olmadan değiştirme.
- Ana sayfa arka plan görseli `srcset` ile telefonda 800px (`-800.webp`), bilgisayarda 1600px sürümüyle yüklenir; `preload` etiketi yalnızca `/` rotasında kalır, prerender diğer sayfalardan kaldırır.
- Hız (27.09.2026, PageSpeed mobil): ana sayfa 80, SEO 100. Kalan tek büyük kalem 66 KB'lık CSS'in çizimi engellemesi; kritik CSS ayırma işine **girilmedi** (proje sahibinin kararı, tasarım riski). Yeniden önermeden önce proje sahibine sor.
- `teslim-notlari.md` eski bir teslim notudur (örnek telefon numarası vb. içerir). Güncel bilgi için kodu ve `siteConfig.ts` dosyasını esas al.
- Açık SEO önerileri için bkz. `docs/google-ai-search-visibility-audit-2026-08-30.md` ve `SEO-AUDIT-RAPORU.md`.

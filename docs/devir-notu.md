# Devir Notu — EŞLİ TEKNİK (esliteknik.com)

Bu not, projeyi ilk kez gören bir yapay zeka aracının ya da geliştiricinin en kısa yoldan işe başlaması için yazıldı. Durum tarihi: **2026-10-06**.

> **Yeni araca ilk talimat:** Önce bu dosyayı, sonra depo kökündeki `CLAUDE.md` dosyasını baştan sona oku. `CLAUDE.md` projenin bağlayıcı kural kitabıdır (adı bir araca özel görünse de kurallar araçtan bağımsızdır). Bu not özet ve yol haritasıdır; ikisi çelişirse `CLAUDE.md` ve kodun kendisi geçerlidir.

## 1. Proje ve sahibi

- **İşletme:** EŞLİ TEKNİK. Konya'da (Karatay, Meram, Selçuklu) beyaz eşya ve küçük ev aletleri için bağımsız teknik servis. Klima ve kombi kapsam dışıdır.
- **Proje sahibi:** Esad Eşli. Yazılımcı değildir; **Türkçe** ve sade konuşulur, teknik terim gerekiyorsa açıklanır. Kararları kendisi verir, PR'ları kendisi birleştirir.
- **Site:** https://esliteknik.com — mobil öncelikli tanıtım sitesi + blog + blog yönetim paneli.
- **Amaç:** Ziyaretçiyi WhatsApp'tan servis talebine, telefonla aramaya ve online servis takibine yönlendirmek. En önemli iş hedefi Google'da yerel aramalarda görünürlüktür.
- **İşletme bilgileri (Google İşletme profiliyle birebir aynı kalmalı):** Telefon/WhatsApp 0551 185 87 73 · Gaziosmanpaşa Mah. Menzil Cad. No:70, Karatay / Konya 42020 · Her gün 08:00–22:00.

## 2. Değişmez kural: arama görünürlüğü geriletilmez

Proje sahibinin sözü: "Bu site içerisinde yapılacak hiçbir düzenleme Google veya yapay zeka aramalarında sitenin geri gitmesine sebep olmamalı."

Bu kural diğer her istekten önce gelir. Kısaca: mevcut adresler silinmez/taşınmaz, başlık–açıklama–canonical–JSON-LD kaldırılmaz, statik (prerender) içerik azaltılmaz, `noindex`/robots engeli eklenmez, doğrulama dosyaları silinmez, işletme bilgileri değişmez. Sıralamayı düşürme ihtimali olan her değişiklikte önce risk söylenir, onay alınır. Ayrıntı: `CLAUDE.md` → "KESİN KURAL".

**Her ziyaretçi sayfası değişikliğinde kanıt gösterilir:** değişiklik öncesi (`main`) ve sonrası için `scripts/prerender.ts` çıktısı (`dist/public`) karşılaştırılır ve fark PR açıklamasına yazılır.

## 3. Hesaplar ve servisler (depo dışında kalan her şey)

| Ne | Nerede | Not |
|---|---|---|
| Kod | GitHub: `4ekim2025-cell/konya-teknik-servis`, dal `main` | `main` doğrudan canlıya çıkar |
| Yayın | Vercel, `esli3` ekibi, proje `konya-teknik-servis`, **Hobby (ücretsiz) paket** | En çok 12 sunucu fonksiyonu; şu an 2 var (`api/admin.ts`, `api/instagram-feed.ts`). Yeni fonksiyon açılmaz |
| Alan adı | esliteknik.com (Vercel'e bağlı) | |
| Blog fotoğrafları | Vercel Blob (herkese açık store) | 1 GB, ayda 2.000 gelişmiş işlem; aşılırsa 30 gün kapanır |
| Yapay zeka | Google Gemini ücretsiz katman; isteğe bağlı yedek Groq | Ücretli servis kullanılmaz |
| Ölçüm | Google Analytics 4 `G-CBLYCZBBY0` | Yalnızca çerez onayından sonra yüklenir |
| Arama | Google Search Console, Bing (doğrulama dosyaları/etiketleri depoda), IndexNow | Doğrulama dosyaları silinmez |
| Google İşletme | Profil var; API bağlantısı **kurulmadı** | Bkz. bölüm 7 |
| Instagram | Ana sayfada gönderi akışı (Graph API) | |

**Ortam değişkenleri** (yalnızca Vercel'de durur; değerleri depoda, yanıtlarda ve günlüklerde yer almaz; hiçbiri `VITE_` öneki taşımaz; tam açıklama `.env.example`):

- Instagram: `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`
- Panel girişi: `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`
- Panelin GitHub'a yazması: `GITHUB_CONTENT_TOKEN` (yalnızca bu depoda içerik yazma izni), isteğe bağlı `GITHUB_REPO`, `GITHUB_BRANCH`
- Yapay zeka: `GEMINI_API_KEY`, isteğe bağlı `GEMINI_MODEL`, `GROQ_API_KEY`, `GROQ_MODEL`, `AI_DAILY_LIMIT`
- Fotoğraflar: `BLOB_READ_WRITE_TOKEN`, isteğe bağlı `BLOB_DAILY_UPLOAD_LIMIT`
- Google İşletme API (henüz girilmedi): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`

Sır değerleri proje sahibinden istenmez; hangi değişkenin hangi ortama (Production / Preview) girileceği adım adım anlatılır, kendisi girer.

**Başka bir yayın platformuna taşınırsa** bunlar yeniden kurulmalıdır: tüm ortam değişkenleri; `vercel.json` içindeki başlıklar (yönetim yollarında `X-Robots-Tag: noindex`), `trailingSlash: true` ve kalıcı yönlendirmeler; `scripts/vercel-ignore-build.sh` (taslak kayıtlarında build atlama); `api/` altındaki iki sunucu fonksiyonu; Vercel Blob'daki fotoğraflar (adresleri yazıların içinde kayıtlıdır, alan adı `BLOG_IMAGE_HOST` ile denetlenir). Alan adı taşınırken adreslerin hiçbiri değişmemelidir.

## 4. Teknik yapı

- **Yığın:** React 19, TypeScript, Vite 7, Tailwind CSS 4 + özel CSS (`client/src/index.css`), Wouter, Zod, Vitest. Paket yöneticisi **pnpm** (10.x).
- **Komutlar:** `pnpm dev` · `pnpm check` (tür denetimi) · `pnpm test` · `pnpm content` (blog içeriğini doğrular ve üretilen dosyaları yazar) · `pnpm build`.
- **Build sırası:** içerik derleyici (`scripts/build-content.ts`) → Vite → `scripts/prerender.ts` (her adres için arama motorlarının okuduğu statik HTML, başlık, açıklama, canonical, JSON-LD) → sunucu paketi → `scripts/indexnow.ts` (Bing/Yandex bildirimi).
- **Sayfalar:** 68 adres sitemap'te. Ana sayfa `client/src/pages/Home.tsx`; diğer tüm sayfalar (cihaz, marka, ilçe, blog, SSS, yasal) `client/src/pages/ContentPage.tsx`. Üst/alt bilgi `client/src/components/SiteChrome.tsx`.
- **Ortak içerik** (`shared/`): hem React hem prerender aynı kaynaktan okur — cihaz arıza rehberleri, 22 marka, 3 ilçe, blog, yasal metinler, site geneli bilgilendirme notu.
- **Aynı bilgi birden çok yerde tekrar eder.** Sayfa, marka ya da işletme bilgisi değişince `scripts/prerender.ts`, `client/src/App.tsx`, `ContentPage.tsx`, `sitemap.xml` ve `client/index.html` birlikte güncellenir.
- **Testler kaynak metne bakar** (`readFileSync` + `toContain`). Metin ya da yapı değişince ilgili test aynı PR'da güncellenir; test silinmez.
- **Kod stili:** `App.tsx` ve `ContentPage.tsx` sıkıştırılmış tek satır stilindedir; yeniden biçimlendirilmez.

## 5. Blog ve yönetim paneli

- **Yazılar:** `content/blog/<ad>.json` (şu an 23 yazı). Dosya adı = adres (`/blog/<ad>/`). Kurallar `shared/blog-schema.ts` içindedir; kurala aykırı yazı build'i durdurur. Üretilen üç dosya (`shared/blog-content.generated.ts`, `sitemap.xml` blog satırları, `llms.txt` blog bölümü) elle düzenlenmez.
- **Yazar:** Esad Eşli. Kategoriler: Ustanın Defterinden (yalnızca gerçek işler, ayrıntı uydurulmaz), Bakım Rehberi, Karar Rehberi, Tüketici Rehberi.
- **Panel:** `https://esliteknik.com/yonetim/` (arama motorlarına kapalı). Tek sunucu fonksiyonu `/api/admin?action=…`; kod `server/admin/`, arayüz `client/src/admin/`. Panel yazıları GitHub'a commit olarak yazar; yayın Vercel build'iyle gerçekleşir.
- **Panelin yaptıkları:** yazı ekleme/düzenleme/silme (silinen adres için isteğe bağlı yönlendirme), yapay zeka ile taslak ("olası nedenler" önerilir, sahada gerçekten yapılanı proje sahibi seçer), fotoğraf yükleme, Google İşletme ve Instagram için paylaşım paketi.
- **Yapay zeka çıktısı güvenilmez girdidir:** şemadan ve "uydurma ayrıntı" denetiminden geçmeyen metin editöre dolmaz; yayın her zaman proje sahibinin düğmesiyledir.
- **Kurulum ve plan belgeleri:** `docs/blog-paneli-kurulum.md`, `docs/blog-panel-plani.md`.

## 6. İçerik kuralları (özet)

- Resmî yetkili servis iddiası yok; sahte yorum, puan, servis sayısı, tecrübe yılı yok.
- Fiyat yazılmaz; hukuki konular yazılmaz; kaynaklar yalnızca Türkçe olur.
- "Aynı gün servis" kesin söz değil, planlamaya bağlı hedeftir.
- Bir sayfada her bilgi yalnızca bir kez geçer; markalar arasında aynı cümle marka adı değiştirilerek kullanılmaz.
- Doğrulanamayan istatistik/pazar iddiası yazılmaz.
- Yapay zeka üslubu: tutanak gibi değil, ustanın anlattığı gibi ("baktık, söktük, gördük"); genel bilgi kişiyi hedef almadan genel tespit olarak yazılır.
- Site geneli bilgilendirme notu tüm sayfaların alt bilgisindedir; metni proje sahibine aittir, sormadan değiştirilmez.

## 7. Durum

**Tamamlanan:** tanıtım sitesi; blog; blog paneli aşama 1–5 (içeriği koddan ayırma, panel, yapay zeka taslağı, fotoğraflar, paylaşım paketi). Aşama 6 (zamanlama ve istatistik) proje sahibinin kararıyla **yapılmayacak**; yeniden önerilmez.

**Açık kalanlar (hepsi isteğe bağlı):**

1. **Google İşletme'ye panelden tek tıkla gönderme.** Kod yazıldı (`server/admin/google.ts`) ama gerçek hesapla hiç denenmedi. Sıra: Google hesabında 2 adımlı doğrulamayı proje sahibi açar → Google Cloud projesi, API'ler, OAuth ekranı → Google'ın API erişim onayı → üç `GOOGLE_*` değişkeni Vercel Production'a → gerçek hesapla ilk deneme. Elle paylaşım yolu ("API yok") şu an çalışıyor.
2. **Yazar fotoğrafı** (`client/public/esad-esli-yazar.png`) 50×51 piksel; telefonda hafif bulanık. En az 200×200 kare bir sürümle aynı adla değiştirilebilir.
3. **Kritik CSS ayırma** (hız iyileştirmesi) proje sahibinin kararıyla yapılmadı; sormadan önerilmez.
4. Açık SEO önerileri: `docs/google-ai-search-visibility-audit-2026-08-30.md`, `SEO-AUDIT-RAPORU.md`.

**Bilinen özel durum:** `/blog/karatayda-eksik-kahve-yapan-electrolux-kahve-makinesi-nodul-sorunu/` adresi yanlış marka içerdiği için `…-philips-…` adresine kalıcı yönlendirilir (`vercel.json` → `redirects`). Bu yönlendirme silinmez.

## 8. Çalışma düzeni

- Her değişiklik **ayrı dalda** yapılır, **pull request** açılır; `main`'e doğrudan yazılmaz. PR'ı proje sahibi önizlemeyi görüp birleştirir.
- Commit önekleri `fix:` / `feat:` / `docs:`; mesajlar, kod içi metinler ve test açıklamaları Türkçedir.
- Bitmiş saymadan önce `pnpm check`, `pnpm test`, `pnpm build` çalıştırılır. Çalıştırılamıyorsa bu açıkça söylenir ve doğrulama PR'ın Vercel önizleme build'ine bırakılır.
- Yeni npm bağımlılığı, yeni sunucu fonksiyonu ya da GitHub anahtarının izinlerini genişletme gerekiyorsa **önce** proje sahibine gerekçesiyle söylenir.
- Giriş, GitHub yazma ve Google istemcisi gibi sır taşıyan kodda değişiklik bağımsız bir incelemeden geçirilir.
- Testlerde gerçek servis çağrısı yapılmaz; GitHub, yapay zeka, Blob ve Google bellek içi taklitlerle sınanır (`client/src/adminFake*.ts`).
- Görsel değişikliklerde proje sahibine masaüstü ve telefon görüntüsü gösterilir; tasarımı ekran görüntüsü üzerinden yönlendirir.
- Her PR'da `CLAUDE.md` güncel tutulur: yeni karar, yeni kural ya da istisna oraya yazılır. Bu not yalnızca durum değiştiğinde (bölüm 3 ve 7) güncellenir.

## 9. Nereden okunur

| Konu | Dosya |
|---|---|
| Bağlayıcı kurallar, klasör yapısı, tüm ayrıntılar | `CLAUDE.md` |
| Panel kurulumu, ortam değişkenleri, kotalar | `docs/blog-paneli-kurulum.md` |
| Panel planı ve aşama notları | `docs/blog-panel-plani.md` |
| Vercel yayın ayarları | `docs/vercel-deployment.md`, `vercel.json` |
| Ortam değişkeni listesi | `.env.example` |
| Sayfa başlık/açıklama listesi | `docs/seo-metadata-listesi.md` |
| SEO denetimleri | `docs/google-ai-search-visibility-audit-2026-08-30.md`, `SEO-AUDIT-RAPORU.md` |

Depo kökündeki `teslim-notlari.md` ve diğer `*-notes.md` dosyaları eski geliştirme ortamından kalmadır (örnek telefon numarası gibi güncel olmayan bilgiler içerir); güncel bilgi için kod ve `client/src/siteConfig.ts` esas alınır.

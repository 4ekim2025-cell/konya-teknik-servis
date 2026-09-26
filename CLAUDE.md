# CLAUDE.md — EŞLİ TEKNİK (Konya Teknik Servis)

Bu dosya, Claude'un bu projede her oturumda bilmesi gerekenleri özetler. Proje sahibiyle **Türkçe** konuş; commit mesajları, kod içi metinler ve test açıklamaları da Türkçedir.

## Proje nedir?

Konya'da (Karatay, Meram, Selçuklu) beyaz eşya ve küçük ev aletleri servisi veren **EŞLİ TEKNİK** için mobil öncelikli tanıtım sitesi. Canlı adres: **https://esliteknik.com** (Vercel).

Sitenin amacı ziyaretçiyi üç eyleme yönlendirmektir: **WhatsApp'tan servis talebi**, **telefonla arama** ve **online servis takibi** sayfası. Google'da yerel aramalarda görünürlük (SEO) en önemli iş hedefidir.

## Teknoloji

React 19 + TypeScript + Vite 7, Tailwind CSS 4 + özel CSS (`client/src/index.css`), shadcn/ui, Wouter, Lucide ikonları, Vitest. Paket yöneticisi **pnpm**.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `pnpm install` | Bağımlılıkları kurar |
| `pnpm dev` | Geliştirme sunucusu (port 3000) |
| `pnpm check` | TypeScript tür denetimi |
| `pnpm test` | Vitest testleri |
| `pnpm build` | Vite build → `scripts/prerender.ts` ile statik SEO HTML'leri → sunucu paketi |

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
  business-contact.ts   # Google İşletme profili bağlantısı
  seo-content.ts        # İlçe mahalleleri, ilçe ve hizmet SSS'leri
scripts/prerender.ts    # Build sonrası her rota için başlık/açıklama/canonical/JSON-LD ve statik içerik yazar
server/, api/           # Instagram akışı uç noktası (/api/instagram-feed)
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
- `/manus-storage/...` gibi göreli, geçici görsel yollarını üretim koduna ekleme.
- `vite.config.ts` içindeki Manus eklentileri (debug collector, storage proxy, runtime) önceki geliştirme ortamından kalmadır ve üretimde etkisizdir. Kaldırılması ayrı bir iş olarak ele alınmalıdır.

### Kod stili
Mevcut dosyaların stilini koru. `App.tsx` ve `ContentPage.tsx` sıkıştırılmış, tek satırlık bir stille yazılmıştır. Küçük değişikliklerde dosyanın tamamını yeniden biçimlendirme, çünkü bu diff'i okunmaz hale getirir.

## Git akışı

- `main` doğrudan canlı siteye yayınlanır. Değişiklikleri **ayrı bir branch'te** yap ve **pull request** aç. Vercel her PR için bir önizleme linki üretir.
- Commit önekleri: `fix:` (düzeltme, küçük metin/stil) ve `feat:` (yeni özellik veya görsel/davranış eklemesi). Mesajlar kısa ve İngilizce ya da Türkçe olabilir; mevcut geçmiş çoğunlukla İngilizcedir.
- PR'ı proje sahibi önizlemeyi kontrol ettikten sonra birleştirir.

## Bilinen noktalar

- `regal` markası `scripts/prerender.ts` içinde var, ancak `App.tsx` → `brandNamesByPath` listesinde yok.
- `teslim-notlari.md` eski bir teslim notudur (örnek telefon numarası vb. içerir). Güncel bilgi için kodu ve `siteConfig.ts` dosyasını esas al.
- Açık SEO önerileri için bkz. `docs/google-ai-search-visibility-audit-2026-08-30.md` ve `SEO-AUDIT-RAPORU.md`.

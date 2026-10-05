# Blog paneli kurulumu

Panel `https://esliteknik.com/yonetim/` adresindedir (arama motorlarına kapalıdır). Aşağıdaki adımlar bir kez yapılır. Sırları sohbete, depoya ya da `VITE_` önekli değişkene yazmayın.

## 1. Parola özeti ve oturum anahtarı

Kendi bilgisayarınızda (depoda `pnpm install` yapıldıktan sonra):

```bash
pnpm admin:hash "en az 12 karakterlik parolanız"
```

Çıktıdaki iki satırı kopyalayın: `ADMIN_PASSWORD_HASH=...` ve `ADMIN_SESSION_SECRET=...`. Parolanın kendisi hiçbir yere kaydedilmez.

Parolayı değiştirmek için aynı komutu yeni parolayla çalıştırıp iki değeri de Vercel'de güncelleyin ve yeniden dağıtın. `ADMIN_PASSWORD_HASH` ya da `ADMIN_SESSION_SECRET` değiştiğinde açık olan tüm oturumlar kapanır; bir cihazın çalındığından ya da oturumun ele geçtiğinden şüphelenirseniz yapılacak iş budur.

## 2. GitHub anahtarı

GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate:

- Repository access: **Only select repositories** → `4ekim2025-cell/konya-teknik-servis`
- Permissions: **Contents: Read and write** (başka izin gerekmez; Metadata otomatik gelir). Commit durumunu okumak için ek izin gerekmez.
- Süre: en çok 1 yıl; bitmeden yenileyin.

Panel kodu bu anahtarla yalnızca `content/` altına ve üretilen üç dosyaya (`shared/blog-content.generated.ts`, `client/public/sitemap.xml`, `client/public/llms.txt`) yazar; `main` dalını zorla değiştirmez.

## 3. Vercel ortam değişkenleri

Vercel → `esli3/konya-teknik-servis` → Settings → Environment Variables (Production **ve** Preview):

| Ad | Değer |
|---|---|
| `ADMIN_PASSWORD_HASH` | 1. adımın çıktısı |
| `ADMIN_SESSION_SECRET` | 1. adımın çıktısı (en az 32 karakter) |
| `GITHUB_CONTENT_TOKEN` | 2. adımdaki anahtar (Sensitive olarak işaretleyin) |
| `GITHUB_REPO` | (isteğe bağlı) varsayılan `4ekim2025-cell/konya-teknik-servis` |
| `GITHUB_BRANCH` | (isteğe bağlı) varsayılan: üretimde `main`, önizlemede önizlemenin kendi dalı |

Değişkenleri ekledikten sonra yeniden dağıtım (redeploy) gerekir.

## 3b. Yapay zeka taslağı (isteğe bağlı)

Editördeki "Yapay zeka ile taslak oluştur" formu için Google Gemini anahtarı gerekir. Anahtar girilmezse panelin geri kalanı aynen çalışır; form "anahtar tanımlı değil" der.

1. https://aistudio.google.com/apikey adresine Google hesabınızla girin, **Create API key** ile anahtar oluşturun. Faturalandırma (billing) açmayın; proje ücretsiz katmanda kalmalı.
2. Aynı yerde **Rate limit** ekranından Flash modelinin günlük istek sınırına bakın (Google bu sayıyı artık belgelerinde yazmıyor, yalnızca burada gösteriyor).
3. Vercel → Settings → Environment Variables: ad `GEMINI_API_KEY`, ortam **Production** (önizlemede de denemek için **Preview**), "Sensitive" işaretli. `VITE_` öneki kullanmayın.
4. Yeniden dağıtın.

| Ad | Değer |
|---|---|
| `GEMINI_API_KEY` | AI Studio anahtarı (zorunlu) |
| `GEMINI_MODEL` | (isteğe bağlı) varsayılan `gemini-flash-latest`. Model yanıt vermezse sırayla `gemini-3.5-flash` ve `gemini-3.5-flash-lite` denenir |
| `GROQ_API_KEY` | (isteğe bağlı) yedek sağlayıcı; https://console.groq.com/keys. Gemini kotası dolunca ya da ulaşılamayınca kullanılır |
| `GROQ_MODEL` | (isteğe bağlı) varsayılan `llama-3.3-70b-versatile` |
| `AI_DAILY_LIMIT` | (isteğe bağlı) panelin günlük taslak sınırı, varsayılan 20 |

Bilinmesi gerekenler:

- Ücretsiz katmanda gönderilen metin Google tarafından ürün geliştirmede kullanılabilir. Forma müşteri adı, telefon, açık adres yazmayın.
- Yapay zeka hiçbir şeyi kaydetmez ve yayınlamaz; taslak editöre dolar, siz okuyup düzelttikten sonra kaydedersiniz. Google İşletme ve Instagram metinleri kaydedilmez; sayfadan ayrılmadan kopyalayın.
- Girdide olmayan sayı, başka marka/ilçe, tarih, kişi, adres, fiyat, vaat ya da bağlantı içeren çıktı editöre aktarılmaz; "içerik kurallarından geçmedi" uyarısı çıkar. Tekrar deneyin ya da eksik bilgiyi "Serbest not"a yazın.
- Günlük sınır sunucu örneği başına sayılır; kesin tavan Google'ın ücretsiz kotasıdır (faturalandırma kapalıyken aşımda ücret oluşmaz, istek reddedilir).

## 3c. Fotoğraflar — Vercel Blob (isteğe bağlı, aşama 4)

Fotoğraf yüklemek için Vercel'de bir Blob deposu (store) gerekir. Oluşturmazsanız panelin geri kalanı aynen çalışır; fotoğraf düğmeleri "henüz açılmadı" der. **Fotoğraflar depoya (GitHub) konmaz, Blob'da durur.**

Hobby kotası (aylık): 1 GB depolama, 10 GB veri aktarımı, 2.000 gelişmiş işlem, 10.000 basit işlem. Kota aşılırsa Blob 30 gün kapanır (ücret kesilmez, fotoğraflar görünmez olur). Bu yüzden: bir yazıda en çok 10 fotoğraf, günde en çok 20 yükleme (her yükleme 2 gelişmiş işlemdir), fotoğraflar 1600 px / ≈500 KB'a küçültülür ve Genel bakış sekmesinde kullanım göstergesi vardır.

Adım adım (Vercel panelinde, yalnızca siz yaparsınız):

1. Vercel → `esli3` ekibi → `konya-teknik-servis` projesi → **Storage** sekmesi → **Create Database/Store** → **Blob**.
2. Erişim: **Public** seçin (herkese açık; blog fotoğrafları zaten herkese açıktır). Public/Private ve bölge sonradan değiştirilemez. Bölge olarak Türkiye'ye yakın bir Avrupa bölgesi (örn. Frankfurt) seçin.
3. Projeye bağlayın (**Connect Project**) ve ortam olarak **Production** ile **Preview**'u işaretleyin. Vercel değişkenleri kendisi ekler: `BLOB_READ_WRITE_TOKEN` (ve ürün sürümüne göre `BLOB_STORE_ID`, `VERCEL_OIDC_TOKEN`, `BLOB_WEBHOOK_PUBLIC_KEY`). Bunları elle girmeyin, `VITE_` öneki kullanmayın, kimseyle paylaşmayın.
4. Store sayfasında deponun **herkese açık adresi**ni (`<kimlik>.public.blob.vercel-storage.com`) not edin; bu adres bir sır değildir (her fotoğraf adresinde görünür). **`shared/blog-images.ts` içindeki `BLOG_IMAGE_HOST` sabitine yazılması gerekir** (bunu geliştirici yapar; adres yazılana kadar şema hiçbir fotoğraf adresini kabul etmez, yani yanlış yere işaret eden fotoğraf eklenemez).
5. Yeniden dağıtın.

Önizleme ve canlı **aynı** Blob deposunu paylaşır. Bu yüzden önizleme panelinde yazı silmek fotoğrafı silmez, "kullanılmayanları temizle" de çalışmaz; ikisi yalnızca canlı (`main`) panelde çalışır. Önizlemede yüklenen ama yayınlanmayan fotoğraflar Blob'da kalır; canlı panelden temizlenir.

| Ad | Değer |
|---|---|
| `BLOB_DAILY_UPLOAD_LIMIT` | (isteğe bağlı) günlük fotoğraf yükleme sınırı, 1–200, varsayılan 20 |

Bilinmesi gerekenler:

- Fotoğraf tarayıcıda küçültülür ve yeniden kodlanır; EXIF (konum, cihaz, tarih) bu sırada silinir. Sunucu ayrıca konum/üst veri taşıyan, WebP olmayan ya da animasyonlu dosyayı reddeder.
- Alt metin zorunludur (ekran okuyucu ve görsel arama için).
- Kapak fotoğrafı yazının üstünde görünür ve paylaşım önizlemesinde (`og:image`) kullanılır. Kapaksız yazılar bugünkü logoyu kullanmaya devam eder.
- "Kullanımı göster" Blob'dan gelişmiş işlem harcar; yalnızca gerektiğinde basın. Dashboard'da Blob'a göz atmak da işlem sayılır.
- Yazıdan çıkardığınız ya da yüklenip kaydedilmeyen fotoğraf Blob'da kalır; Genel bakış → Fotoğraf depolama → "Kullanılmayanları temizle" ile alınır (son 24 saatte yüklenenlere dokunmaz).

## 4. Önizlemede deneme (canlıya geçmeden)

Önizleme ortamında panel, önizlemenin kendi dalına yazar; `main` etkilenmez. Önizleme linki Vercel girişi ister. Deneme listesi:

1. `/yonetim/` açılır, parola ile giriş yapılır; yanlış parola beklemeyle reddedilir.
2. Yeni yazı oluşturup yayınlayın; önizleme dalında tek commit oluşur ve Vercel o dalı derler.
3. Derlenen önizlemede yazının sayfası, `/blog/` listesi, `sitemap.xml` ve `llms.txt` satırları mevcut yazılarla aynı yapıdadır.
4. Giriş yapmadan `/api/admin?action=posts` adresi 401 verir.
5. `/yonetim/` kaynağında `noindex` vardır; `robots.txt` ve yanıt başlıklarında engel görünür.

## Doğrulanmamış varsayımlar (önizlemede teyit edin)

- **Taslak commit'inde build atlama**: `vercel.json` içindeki `ignoreCommand`, commit mesajında `[panel-taslak]` görürse build'i atlar. Vercel bazı durumlarda bu komutu çalıştırmayabilir; sonuç yalnızca fazladan bir build olur, site etkilenmez.
- **Derleme durumu**: Yayın durumu sekmesi, Vercel'in GitHub commit durumu olarak bildirdiği sonucu okur. Vercel durum bildirmiyorsa satır "Bilinmiyor" görünür.
- **`/api/admin` adresi**: `trailingSlash: true` ayarıyla birlikte fonksiyonun `/api/admin?action=...` biçiminde çalıştığı önizlemede görülmelidir (Instagram uç noktası aynı biçimde çalışıyor).

- **Fotoğraf yükleme (aşama 4)**: Blob SDK'sının (`@vercel/blob`) çağrı biçimi (`put`, `del`, `list`, hata sınıfı adları) bu depoda gerçek hesapla denenmedi; önizlemede bir fotoğraf yükleyip silerek teyit edin. Canvas'ın WebP üretmesi tarayıcıya bağlıdır (Chrome, Edge, Firefox çalışır; Safari'de denenmedi).

## Sorun giderme

- "Panel henüz kurulmadı": `ADMIN_PASSWORD_HASH` ya da `ADMIN_SESSION_SECRET` (en az 32 karakter) eksik.
- "Yapay zeka anahtarı tanımlı değil": `GEMINI_API_KEY` eksik ya da değişken eklendikten sonra yeniden dağıtım yapılmadı.
- "Yapay zeka servisi şu an yanıt vermiyor": Google tarafında geçici hata. Panel kendiliğinden yeniden dener ve yedek modele geçer; yine olmazsa birkaç dakika sonra deneyin. Neden, Vercel → Logs içinde `admin: yapay zeka hatası` satırındaki durum kodundan okunur.
- "Yapay zeka servisinin ücretsiz kullanım sınırına ulaşıldı": Google kotası doldu; bir süre sonra deneyin ya da `GROQ_API_KEY` ekleyin.
- "GitHub anahtarı geçersiz": anahtarın süresi bitmiş ya da bu depoda Contents: Read and write izni yok.
- Başka biri/başka yerden commit yapıldıysa kaydetme "başka yerde değişti" uyarısı verir; listeyi yenileyip tekrar deneyin.
- Yanlış yayınlanan yazı: yazıyı açın → "Önceki sürümler" → eski sürümü yükleyin → yeniden yayınlayın. Yazıyı silmek yerine bunu tercih edin; silinen yazının adresi 404 verir (yönlendirme seçilmediyse).
- "Fotoğraf deposu tanımlı değil": Blob store bu projeye bağlı değil ya da bağlandıktan sonra yeniden dağıtım yapılmadı.
- "Fotoğraf alanı ayarlanmamış": `shared/blog-images.ts` → `BLOG_IMAGE_HOST` boş ya da store adresiyle uyuşmuyor ("alan uyuşmuyor" hatasında yüklenen dosyalar otomatik silinir).
- "Fotoğraf reddedildi: konum/üst veri taşıyor": dosya panel dışında üretilmiş; panelden seçerek yükleyin.
- "Fotoğraf deposu kullanılamıyor (kota)": Hobby kotası dolmuş olabilir; Vercel → Storage ekranına bakın, kullanılmayanları temizleyin.

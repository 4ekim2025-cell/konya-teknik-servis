# Blog paneli kurulumu

Panel `https://esliteknik.com/yonetim/` adresindedir (arama motorlarına kapalıdır). Aşağıdaki adımlar bir kez yapılır. Sırları sohbete, depoya ya da `VITE_` önekli değişkene yazmayın.

## 1. Parola özeti ve oturum anahtarı

Kendi bilgisayarınızda (depoda `pnpm install` yapıldıktan sonra):

```bash
pnpm admin:hash "en az 12 karakterlik parolanız"
```

Çıktıdaki iki satırı kopyalayın: `ADMIN_PASSWORD_HASH=...` ve `ADMIN_SESSION_SECRET=...`. Parolanın kendisi hiçbir yere kaydedilmez.

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

## Sorun giderme

- "Panel henüz kurulmadı": `ADMIN_PASSWORD_HASH` ya da `ADMIN_SESSION_SECRET` (en az 32 karakter) eksik.
- "GitHub anahtarı geçersiz": anahtarın süresi bitmiş ya da bu depoda Contents: Read and write izni yok.
- Başka biri/başka yerden commit yapıldıysa kaydetme "başka yerde değişti" uyarısı verir; listeyi yenileyip tekrar deneyin.
- Yanlış yayınlanan yazı: yazıyı açın → "Önceki sürümler" → eski sürümü yükleyin → yeniden yayınlayın. Yazıyı silmek yerine bunu tercih edin; silinen yazının adresi 404 verir (yönlendirme seçilmediyse).

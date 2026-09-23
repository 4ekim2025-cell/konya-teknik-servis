# Vercel Dağıtım Rehberi

Bu rehber, **EŞLİ TEKNİK — Konya Teknik Servis** projesini GitHub üzerinden Vercel’e dağıtmak için hazırlanmıştır. Proje React, TypeScript ve Vite tabanlıdır. Üretim derlemesi cihaz, marka ve içerik rotalarını ayrı `index.html` dosyaları olarak hazırlar; Vercel bu dosyaları doğrudan sunar. `/api/instagram-feed` ise Vercel Function olarak çalışır. [1]

## 1. Yayına hazırlık

Dağıtımdan önce yerel ortamda aşağıdaki üç komutu çalıştırın. Her biri başarıyla tamamlanmalıdır.

```bash
pnpm test
pnpm run check
pnpm build
```

| Varlık | Kontrol |
|---|---|
| `vercel.json` | Vite üretim komutu, `dist/public` çıktı dizini, statik varlık önbelleği ve temel güvenlik başlıklarını içerir. |
| `pnpm-lock.yaml` | Bağımlılıkların sabit sürümlerle kurulmasını sağlar. |
| `client/public/robots.txt` | Tarama yönergelerini ve site haritasını içerir. |
| `client/public/sitemap.xml` | Hizmet ve marka URL’lerini listeler. |

> **Durum:** Aktif logo ve görsel referansları kalıcı HTTPS CDN adreslerine dönüştürülmüştür. Vercel dağıtımında göreli `/manus-storage/...` görsel bağlantısı beklenmez.

## 2. GitHub deposunu güncelleme

Proje deposu: [4ekim2025-cell/konya-teknik-servis](https://github.com/4ekim2025-cell/konya-teknik-servis).

Yapılandırma ve rehberi depoya göndermek için aşağıdaki akışı kullanın:

```bash
git checkout main
git pull origin main
git add vercel.json docs/vercel-deployment.md README.md
git commit -m "chore: add Vercel deployment configuration"
git push origin main
```

## 3. Vercel’de projeyi içe aktarma

Vercel hesabınızda **Add New → Project** adımını açın ve GitHub hesabınıza erişim izni verin. Ardından `4ekim2025-cell/konya-teknik-servis` deposunu seçip **Import** ile devam edin. Git’e bağlı projelerde Vercel, yeni commit’lerden dağıtım oluşturur ve Pull Request’ler için ayrı önizleme bağlantıları sağlar. [2]

Yapılandırma ekranında aşağıdaki değerleri kontrol edin. `vercel.json` bunları kaynak denetiminde tuttuğu için panelde farklı bir değer girmeyin.

| Vercel ayarı | Kullanılacak değer |
|---|---|
| Framework Preset | `Vite` |
| Root Directory | Depo kökü (`.`) |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm build` |
| Output Directory | `dist/public` |

## 4. Instagram ortam değişkenleri ve analitik

Instagram gönderilerinin ana sayfada görünmesi için Vercel projesinin **Settings → Environment Variables** bölümüne aşağıdaki iki sunucu değişkenini ekleyin. Değişkenleri en az `Production` ortamında tanımlayın; önizleme dağıtımlarında kontrol etmek istiyorsanız `Preview` ortamını da seçin.

| Değişken | Açıklama |
|---|---|
| `INSTAGRAM_ACCESS_TOKEN` | Instagram Graph API erişim anahtarı |
| `INSTAGRAM_USER_ID` | Gönderileri okunacak Instagram profesyonel hesap kimliği |

Bu değerler tarayıcıya gönderilmez ve `VITE_` öneki kullanılmaz. Projedeki `.env.example` yalnızca gereken değişken adlarını gösterir; gerçek anahtarlar Git’e eklenmemelidir. Değişkenleri ekledikten veya yeniledikten sonra yeni bir dağıtım oluşturun. API doğru yapılandırılmadığında ana sayfa çalışmaya devam eder ve Instagram bölümü gizlenir.

WhatsApp bağlantısı ve form yönlendirmesi için ayrıca ortam değişkeni gerekmez. Vite ile tarayıcıya aktarılacak gelecekteki değişkenlerde yalnızca açık olmasında sakınca olmayan değerler `VITE_` önekiyle tanımlanmalıdır. [1]

Manus’a özgü geliştirme değişkenlerini veya gizli anahtarları Vercel’e kopyalamayın. Bir API, form işleme veya gerçek servis takip verisi eklendiğinde; gizli anahtarları yalnızca Vercel ortam değişkenlerinde tutun ve bunları istemci koduna `VITE_` önekiyle açmayın.

## 5. İlk dağıtım ve rota testi

**Deploy** düğmesine bastıktan sonra Vercel, bağımlılıkları kurar, `pnpm build` çalıştırır ve `dist/public` içeriğini yayınlar. Dağıtım ayrıntılarında başarılı build çıktısını kontrol edin. Vite projeleri için otomatik algılama kullanılabilir; bu projede yapılandırma ayrıca `vercel.json` ile açıkça sabitlenmiştir. [1]

İlk dağıtımdan sonra yalnızca ana sayfayı değil aşağıdaki doğrudan URL’leri de yeni Vercel alan adında açın:

```text
/bulasik-makinesi-tamiri-konya/
/arcelik-servisi-konya/
/online-servis-takibi/
/tum-markalar/
```

Bu test, prerender edilmiş sayfaların doğrudan sunulduğunu doğrular. Ayrıca aşağıdaki uç noktayı açın:

```text
/api/instagram-feed
```

Doğru yapılandırmada JSON içindeki `data` alanı en fazla altı gönderi içerir. `instagram_not_configured` yanıtı görülürse iki Instagram ortam değişkenini ve yeni dağıtımın bu değişkenleri içerdiğini kontrol edin.

## 6. Özel alan adı ve üretime geçiş

Önizleme bağlantısı doğrulandıktan sonra **Project Settings → Domains** bölümünden alan adınızı ekleyin. Vercel paneli, alan adı sağlayıcınızda uygulanması gereken DNS kayıtlarını gösterir. DNS doğrulaması tamamlandıktan sonra alan adını **Production** dağıtımına bağlayın. Ardından `client/public/robots.txt` ve `client/public/sitemap.xml` dosyalarındaki eski alan adını, yeni üretim alan adıyla birlikte tek bir güncellemede değiştirin.

Üretim sonrası şu akışı kullanın: özellik dalı oluşturun, Pull Request açın, Vercel önizleme URL’sinde form/WhatsApp/doğrudan rota testlerini yapın ve ardından `main` dalına birleştirin. Pull Request başına ayrı önizleme dağıtımı Vercel’in Git tabanlı çalışma modelinde otomatik olarak sağlanır. [2]

## Yayın öncesi son kontrol

- [x] Aktif görseller kalıcı HTTPS CDN URL’leriyle güncellendi.
- [ ] Vercel build kaydı `pnpm build` için başarılı.
- [ ] Ana sayfa, Ön Bilgi Formu ve WhatsApp bağlantısı test edildi.
- [ ] Hizmet, marka ve online takip derin bağlantıları doğrudan açıldı.
- [ ] Vercel üretim alan adı belirlendikten sonra `robots.txt` ve `sitemap.xml` güncellendi.
- [ ] Özel alan adı bağlandıktan sonra canonical ve Open Graph URL'leri üretim alanında kontrol edildi.

## Kaynaklar

[1] [Vercel — Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)

[2] [Vercel — Deploying React with Vercel](https://vercel.com/kb/guide/deploying-react-with-vercel)

[3] [Vercel — Rewrites](https://vercel.com/docs/routing/rewrites)

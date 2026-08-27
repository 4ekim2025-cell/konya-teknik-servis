# Vercel Dağıtım Rehberi

Bu rehber, **EŞLİ TEKNİK — Konya Teknik Servis** projesini GitHub üzerinden Vercel’e dağıtmak için hazırlanmıştır. Proje React, TypeScript ve Vite tabanlı bir tek sayfa uygulamasıdır. `vercel.json` içindeki yönlendirme kuralı, cihaz ve marka detay URL’lerinin doğrudan açıldığında Vercel tarafından `index.html` dosyasına yönlendirilmesini sağlar; böylece istemci tarafındaki Wouter yönlendirmesi ilgili sayfayı oluşturur. [1]

## 1. Yayına hazırlık

Dağıtımdan önce yerel ortamda aşağıdaki iki komutu çalıştırın. Her ikisi de başarıyla tamamlanmalıdır.

```bash
pnpm check
pnpm build
```

| Varlık | Kontrol |
|---|---|
| `vercel.json` | Vite üretim komutu, `dist/public` çıktı dizini ve SPA yönlendirme kuralını içerir. |
| `pnpm-lock.yaml` | Bağımlılıkların sabit sürümlerle kurulmasını sağlar. |
| `client/public/robots.txt` | Tarama yönergelerini ve site haritasını içerir. |
| `client/public/sitemap.xml` | Hizmet ve marka URL’lerini listeler. |

> **Önemli:** Projede geçen `/manus-storage/...` görsel bağlantıları, Manus geliştirme ortamına bağlıdır. Vercel yayını öncesinde bu görselleri kalıcı, herkese açık bir görsel depolama alanına taşıyın ve kodda yeni HTTPS URL’lerini kullanın. Aksi halde Vercel üzerinde görseller yüklenmeyebilir.

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

## 4. Ortam değişkenleri ve analitik

Bu sürüm statik bir site olarak çalışır; WhatsApp bağlantısı ve form yönlendirmesi için Vercel ortam değişkeni gerekmez. Ancak analitik komut dosyasını kullanmak isterseniz Vercel panelindeki **Project Settings → Environment Variables** bölümüne uygun `VITE_` önekli değerleri ekleyin. Vite, tarayıcıda kullanılacak ortam değişkenleri için bu öneki gerektirir. [1]

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

Bu test, SPA yönlendirme kuralının çalıştığını doğrular. Vercel rewrites, ziyaretçinin gördüğü URL’yi değiştirmeden isteği `index.html` dosyasına yönlendirir. [3]

## 6. Özel alan adı ve üretime geçiş

Önizleme bağlantısı doğrulandıktan sonra **Project Settings → Domains** bölümünden alan adınızı ekleyin. Vercel paneli, alan adı sağlayıcınızda uygulanması gereken DNS kayıtlarını gösterir. DNS doğrulaması tamamlandıktan sonra alan adını **Production** dağıtımına bağlayın.

Üretim sonrası şu akışı kullanın: özellik dalı oluşturun, Pull Request açın, Vercel önizleme URL’sinde form/WhatsApp/doğrudan rota testlerini yapın ve ardından `main` dalına birleştirin. Pull Request başına ayrı önizleme dağıtımı Vercel’in Git tabanlı çalışma modelinde otomatik olarak sağlanır. [2]

## Yayın öncesi son kontrol

- [ ] `/manus-storage/...` görselleri kalıcı HTTPS URL’leriyle değiştirildi.
- [ ] Vercel build kaydı `pnpm build` için başarılı.
- [ ] Ana sayfa, Ön Bilgi Formu ve WhatsApp bağlantısı test edildi.
- [ ] Hizmet, marka ve online takip derin bağlantıları doğrudan açıldı.
- [ ] `robots.txt` içindeki site haritası alan adıyla uyumlu hale getirildi.
- [ ] Özel alan adı kullanılacaksa canonical URL ve Open Graph URL’leri üretim alan adıyla tekrar kontrol edildi.

## Kaynaklar

[1] [Vercel — Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)

[2] [Vercel — Deploying React with Vercel](https://vercel.com/kb/guide/deploying-react-with-vercel)

[3] [Vercel — Rewrites](https://vercel.com/docs/routing/rewrites)

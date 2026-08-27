# EŞLİ TEKNİK — Konya Teknik Servis

Konya’da beyaz eşya ve küçük ev aletleri için **WhatsApp servis talebi**, **Ön Bilgi Formu** ve **online cihaz takip** akışını öne çıkaran mobil öncelikli tanıtım sitesidir.

## GitHub deposu

Proje kaynak kodu: [github.com/4ekim2025-cell/konya-teknik-servis](https://github.com/4ekim2025-cell/konya-teknik-servis)

## Teknoloji

| Alan | Teknoloji |
|---|---|
| Arayüz | React 19, TypeScript ve Vite |
| Stil | Tailwind CSS 4, özel CSS ve shadcn/ui |
| Yönlendirme | Wouter |
| Bildirimler | Sonner |
| İkonlar | Lucide React |

## Yerel kurulum

Projeyi klonladıktan sonra bağımlılıkları yükleyin ve geliştirme sunucusunu başlatın:

```bash
pnpm install
pnpm dev
```

Uygulama varsayılan olarak Vite tarafından sağlanan yerel adreste çalışır.

## Komutlar

| Komut | Açıklama |
|---|---|
| `pnpm dev` | Geliştirme sunucusunu başlatır. |
| `pnpm check` | TypeScript tür denetimini çalıştırır. |
| `pnpm build` | Üretim paketini oluşturur. |
| `pnpm preview` | Üretim paketini yerelde önizler. |
| `pnpm format` | Kod biçimlendirmesini uygular. |

## Klasör yapısı

```text
client/
  src/
    components/    # Ortak arayüz bileşenleri
    pages/         # Ana sayfa ve içerik sayfaları
    index.css      # Tasarım sistemi ve responsive kurallar
    App.tsx        # Rotalar, meta etiketleri ve yapılandırılmış veriler
  public/          # robots.txt ve sitemap.xml
server/            # Şablon uyumluluğu için hafif sunucu girişi
```

> Görsel dosyaları proje içine taşımayın. Mevcut `/manus-storage/...` görsel bağlantılarını koruyun; bunlar yayın ortamındaki varlık yönetimi için kullanılır.

## Git ve GitHub akışı

Her değişiklikten önce güncel dalı alın, ardından denetim ve üretim paketini çalıştırın:

```bash
git pull origin main
pnpm check
pnpm build
git status
```

Yeni bir çalışma için ayrı dal kullanın:

```bash
git checkout -b feature/ozellik-adi
git add .
git commit -m "feat: açıklayıcı değişiklik özeti"
git push -u origin feature/ozellik-adi
```

Değişiklikler gözden geçirildikten sonra GitHub üzerinde bir **Pull Request** açarak `main` dalına birleştirin. Küçük metin düzeltmeleri için `fix:`, görsel veya davranış eklemeleri için `feat:` öneki kullanın.

## Yayın öncesi kontrol

- [ ] `pnpm check` başarılı.
- [ ] `pnpm build` başarılı.
- [ ] Ana sayfa, mobil menü, Ön Bilgi Formu ve WhatsApp yönlendirmesi test edildi.
- [ ] Hizmet, marka ve online takip rotaları kontrol edildi.
- [ ] `sitemap.xml` ve `robots.txt` güncel.

# GitHub Bağlantı Bilgileri

## Repository

```text
https://github.com/4ekim2025-cell/konya-teknik-servis.git
```

## Branch

```text
main
```

## GitHub kullanıcı adı

```text
4ekim2025-cell
```

## Projeyi klonlama

```bash
git clone https://github.com/4ekim2025-cell/konya-teknik-servis.git
cd konya-teknik-servis
```

## Mevcut proje bilgilerini kontrol etme

```bash
git remote -v
git branch --show-current
git status
git log -1 --oneline
```

Beklenen uzak depo adresi:

```text
origin  https://github.com/4ekim2025-cell/konya-teknik-servis.git
```

Beklenen aktif branch:

```text
main
```

## Güncel değişiklikleri GitHub’dan çekme

```bash
git pull origin main
```

## Değişiklikleri GitHub’a gönderme

```bash
git add .
git commit -m "Değişiklik açıklaması"
git push origin main
```

## GitHub CLI ile giriş

GitHub hesabı henüz bağlı değilse:

```bash
gh auth login
```

Bağlantıyı kontrol etmek için:

```bash
gh auth status
```

## Son bilinen commit

```text
8ac6362 Archive completed todo history
```

## Güvenlik notu

GitHub şifrenizi, Personal Access Token’ınızı veya SSH private key’inizi başka bir yapay zekâya ya da üçüncü taraf araca göndermeyin. Özel depo erişimi gerekiyorsa kendi çalışma ortamınızda GitHub CLI ile giriş yapın veya güvenli bir Git kimlik doğrulama yöntemi kullanın.

Kimlik doğrulama gerektiğinde token değerini komut satırına, sohbet mesajına veya proje dosyalarına yazmayın.

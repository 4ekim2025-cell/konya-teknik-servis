# Konya Teknik Servis — Tasarım Yönü

## Seçilen yaklaşım: Koyu Teknik Servis Komuta Merkezi

Sağlanan canlı referansın koyu, kırmızı vurgulu teknik servis dili bu projenin temel görsel şartnamesidir. Uygulama, referanstaki kompakt beyaz navigasyon, siyah hero, kırmızı eylem düğmeleri, sol hizalı güçlü başlık ve sağdaki koyu bilgi panellerini Konya Teknik Servis içeriğine uyarlayacaktır. Hizmet odağı yalnızca beyaz eşya ve küçük ev aletleri olacak; WhatsApp ve online iş takip sistemi referans akışın yerini alan birincil dönüşüm noktalarıdır.

### Tasarım hareketi

Yüksek kontrastlı **endüstriyel servis editoryali**. Arayüz, telefon üzerinden hızlı karar vermeyi kolaylaştıran kırmızı-siyah eylem dili ile yerel ustalık hissini birleştirir.

### Temel ilkeler

1. Beyaz navigasyon ile koyu içerik blokları arasında kesin görsel ayrım kurulacaktır.
2. Kırmızı yalnızca önemli eylemler, durum göstergeleri ve sayısal vurgular için kullanılacaktır.
3. Hero, sol taraftaki değer önerisi ile sağ taraftaki fayda göstergelerini asimetrik biçimde dengeleyecektir.
4. Her bölüm aynı kart düzenini tekrar etmeyecek; takip akışı, cihaz hizmetleri, bölge kapsaması ve iletişim farklı ritimlerde sunulacaktır.

### Renk felsefesi

Neredeyse siyah zemin işin ciddiyetini ve teknik odağı taşır. Kırmızı, aciliyet ve doğrudan yardım hissi veren imza renktir; açık kırık beyaz içerik alanları ise uzun metinleri okunaklı kılar. Görsel ton, referanstaki koyu ve yüksek kontrastlı karakteri korur; mor-mavi degrade veya neon görünüm kullanılmaz.

### Yerleşim paradigması

Masaüstünde hero alanı iki eşit olmayan kütleden oluşur: solda mesaj ve CTA zinciri, ortada üst üste binen teknisyen görseli, sağda metrik/vaat panelleri. Mobilde CTA'lar öncelik sırasıyla üstte kalır; hizmetler yatay kayan seçimler ve dikey içerik dizileri hâlinde sunulur.

### İmza öğeleri

1. Kırmızı servis noktası ve çizgi motifleri.
2. İnce çerçeveli koyu bilgi panelleri içinde kırmızı yuvarlak ikon diskleri.
3. Online takip sürecini bir teslimat izleme hattı gibi bağlayan numaralı kırmızı ilerleme çizgisi.

### Etkileşim felsefesi

Telefon ve WhatsApp birincil işlemlerdir; ziyaretçi bir form duvarına yönlendirilmez. Kategori seçimi, SSS açılması ve mobil menü kısa, doğrudan ve odaklı davranır. İletişim düğmeleri tıklanınca gerçek `tel:` veya WhatsApp bağlantısını kullanır.

### Animasyon

Yüksek frekanslı öğelerde 160–220 ms arası kısa geçişler kullanılacaktır. Hero panelleri sayfa açılışında yumuşak opaklık/konum geçişiyle belirir; hareket azaltma tercihi olan ziyaretçilerde bu efektler kapatılır. Dönen bir yükleme göstergesi yalnızca gerçek bir bekleme hali varsa kullanılacaktır.

### Tipografi sistemi

Başlıklar için geometrik ve güçlü **Manrope**, gövde metinleri için dengeli **DM Sans** kullanılacaktır. Büyük başlıklarda 800 ağırlık, gezinmede 700 ağırlık ve açıklama metinlerinde 400–500 ağırlık hiyerarşisi uygulanacaktır.

### Marka özü

**Konya Teknik Servis, Konya'da beyaz eşya onarımını WhatsApp'tan kolay ulaşım ve canlı iş takibiyle görünür kılan yerel teknik servisidir.** Kişilik: doğrudan, güven veren, çevik.

### Marka sesi

Başlıklar kısa, somut ve sorun odaklıdır; CTA'lar ne olacağını açıkça söyler. Örnekler: “Cihazınızın tamiri gözünüzün önünde ilerlesin.” ve “WhatsApp'tan yazın, servis kaydınızı açalım.” Genel geçer selamlamalar ve boş övgüler kullanılmaz.

### Wordmark ve logo

Logo, kırmızı bir servis kutusu/cihaz kapağı silüeti içine yerleşen beyaz kontrol işaretinden oluşur. Wordmark, iki satırda, sıkı harf aralıklı büyük harfli “KONYA TEKNİK / SERVİS” düzeniyle işaretin yanında konumlanır.

### İmza marka rengi

**Servis Kırmızısı — `#ef1b23`**. Bu renk, tüm kritik aksiyonların ve canlı durum vurgularının tekil işaretidir.

## Style Decisions

- Referanstaki koyu hero, beyaz üst çubuk ve kırmızı aksiyon dili korunacak; özgün metin, marka işareti ve Konya'ya ait servis kapsamı kullanılacak.
- Görünür hiçbir müşteri yorumu, puan, sayaç veya doğrulanmamış işletme iddiası eklenmeyecek.
- Hero görseli düşük anahtarlı, arka plandan görünen teknisyen kompozisyonu olacak; metin okunurluğu için siyah katmanlı arka planla kullanılacak.

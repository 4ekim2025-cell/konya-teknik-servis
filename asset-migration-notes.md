# Görsel Varlık Geçiş Notu

Vercel dağıtımı için `/manus-storage/` yoluna bağlı görseller kalıcı HTTPS CDN bağlantılarıyla değiştirilecektir. Bu geçişte her görsel, kullanım amacına uygun boyutta WebP biçimine dönüştürülerek kaynak ağırlığı azaltılacaktır.

Görsel kaynak incelemesinde, yüksek çözünürlüklü beyaz eşya/teknik müdahale fotoğrafları tanımlandı. Büyük hero görseli 1600 px genişlik, içerik görselleri 960 px genişlik hedefiyle optimize edilecek; hero görseli öncelikli, sayfa içi görseller ise gecikmeli yüklenecektir. Teknik servis dışı veya marka işareti içeren görseller kullanılmayacaktır.

Seçilen içerik yaklaşımı, beyaz eşya cihazlarını gösteren nötr teknik fotoğrafları hero ve takip alanlarında; elektronik onarım ayrıntısını gösteren yakın plan fotoğrafları ise ikincil bilgi alanlarında kullanmaktır. Her görsel, WebP olarak ayrı boyutta hazırlanacak ve mutlak HTTPS CDN bağlantısıyla çağrılacaktır.

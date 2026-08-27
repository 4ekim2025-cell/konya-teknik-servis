# Güncel Uygulama Bulguları

- Akıllı Ön Bilgi alanı cihaz, belirti, ilçe ve marka/model bilgisini WhatsApp mesajına aktaracak şekilde yapılandırılmıştır; serbest “Diğer” girişleri bu akışa eklenecektir.
- İkincil çubuktaki açıklama metni, önceki geniş sol kenar boşluğu nedeniyle Hizmetler tetikleyicisinden uzakta görünmektedir.
- Yapılandırılmış veri ile kullanıcıya görünen marka metinleri EŞLİ TEKNİK adına güncellenecektir.

Akıllı Ön Bilgi alanı şu anda cihaz, belirti, ilçe ve marka/model bilgisini taşımaktadır. Bu akışa, Diğer cihaz ve Diğer arıza için şartlı serbest metin alanları eklenerek WhatsApp mesajında kullanıcının kendi tanımının yer alması sağlanacaktır. Ana sayfada bu alan, Online Servis Takibi bölümünden hemen sonra konumlandırılacaktır.

Üst navigasyondaki arama alanı ayrı bir form olarak tanımlanmıştır ve kaldırılacaktır. Menü yazıları, boş 300×100px logo alanıyla daha dengeli bir hiyerarşi oluşturacak biçimde büyütülecektir. Hizmet verilen markalar, bağımsız bir marka listesinde kullanıcı tarafından sağlanan güncel adlarla sunulacaktır.

Ön Bilgi Formu, ana sayfada takip alanından sonra görünmektedir. Mobil görünümde cihaz seçici iki sütuna, form alanları tek sütuna indirgenmelidir; yatay sıkışmayı önlemek için metinler ve durum özeti tam genişlikte akmalıdır. Marka listesi hem ana sayfadaki hizmet şeridinden hem de hizmet detay sayfalarından ilgili marka sayfasına bağlanmalıdır.

Uygulama sonrasında form bağlantısı; masaüstü ikincil menüde, mobil menüde, mobil sabit aksiyon çubuğunda, hizmet hero alanında, hizmet yan panelinde ve footer’da bulunmaktadır. Hizmet detaylarında 19 marka yalnızca anlamlı bir kapsam bloğunda kullanılır; cihaz kapsam etiketleri merkez marka sayfasında korunur.

Telefon görünümünde ilk denetimde Ön Bilgi Formu ana ızgarasının yatay genişliği aşabildiği görülmüştür. Son mobil katmanda ana bölüm ve panel, minimum genişliği sıfır olan tek kolona zorlanarak taşma riski kaldırılmıştır.

Hash içeren Ön Bilgi Formu bağlantılarında, uygulamanın başlangıçtaki üst konuma kaydırma davranışı hedef kaydırmayı geçersiz kılabiliyordu. Uygulama yönlendirme katmanında çift kare çağrısı ile form hedefi render sonrasında görünür konuma getirilmektedir.

SEO iyileştirmesinde her sayfa için özgün başlık ve açıklama, canonical URL, Open Graph/Twitter paylaşım verileri, WebSite/WebPage/BreadcrumbList ve görünür içeriği yansıtan Service/FAQ yapılandırılmış verileri kullanılmalıdır. İşletmenin doğrulanmış açık adresi paylaşılmadığından adres zorunluluğu bulunan LocalBusiness işaretlemesi eklenmeyecek; robots.txt tüm taramaya izin verir ve site haritasını bildirir.

Resmi SEO referansları: Google başlık bağlantısı yönergeleri https://developers.google.com/search/docs/appearance/title-link ; site haritası yönergeleri https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview ; yerel işletme yapılandırılmış verisi https://developers.google.com/search/docs/appearance/structured-data/local-business ; desteklenen meta etiketleri https://developers.google.com/search/docs/crawling-indexing/special-tags . Bu kaynaklar özgün başlık/açıklama, iç bağlantı, geçerli sitemap ve doğrulanabilir yapılandırılmış veri ilkelerini destekler.

Doğrulamada, çamaşır makinesi hizmet sayfasındaki hero form aksiyonu ana sayfadaki Ön Bilgi Formu bölümüne ulaştı. Masaüstünde form hedefi görünür konuma kaydırıldı; telefon görünümünde form, tek kolonlu alanlar ve altındaki seçim özetiyle yatay taşma olmadan görüntülendi.

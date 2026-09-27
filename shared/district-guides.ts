/**
 * İlçe sayfalarının özgün içeriği — React sayfası (ContentPage) ve prerender HTML'i bu kaynaktan beslenir.
 * Yalnızca Esad Eşli'nin sahada gözlemlediği ve doğruladığı bilgiler yazılır; ilçeye özgü bir durum
 * yoksa (Meram gibi) bilgi uydurulmaz, sayfa kısa kalır. Son işler blog-posts.ts'teki usta vakalarından gelir.
 */

export type DistrictNote = { title: string; text: string };
export type DistrictGuide = {
  description: string;
  hero: string;
  intro: string;
  notes: DistrictNote[];
  faqs: [string, string][];
};

export const districtGuides: Record<string, DistrictGuide> = {
  Karatay: {
    description: "Atölyemiz Karatay Gaziosmanpaşa’da. Karatay’da beyaz eşya servisi; sahadan son işlerimiz, elektrik dalgalanması ve su basıncı notları.",
    hero: "Atölyemiz Karatay’da. Çamaşır makinesinden buzdolabına, ev cihazlarınız için WhatsApp’tan servis talebi oluşturun.",
    intro: "Eşli Teknik’in atölyesi Karatay’da, Gaziosmanpaşa Mahallesi Menzil Caddesi’nde bulunuyor. Şu ana kadar işlerimizin önemli bir kısmı da bu ilçeden geliyor. Karatay’da sahada karşılaştığımız iki durum, cihazlarınızı etkileyebildiği için aşağıda ayrıca anlatılıyor.",
    notes: [
      { title: "Elektrik dalgalanmaları ve kontrol kartları", text: "Karatay’da sahada elektrik dalgalanmalarıyla sık karşılaşıyoruz. Gerilimdeki ani değişimler, çamaşır ve bulaşık makinelerinin programlarını yöneten elektronik kartlara zarar verebiliyor. Bu ilçede kontrol kartı yanmış bir bulaşık makinesinde neler yaptığımızı ve alınabilecek önlemleri Regal bulaşık makinesi yazımızda anlattık." },
      { title: "Su basıncı düşüşleri ve hidrofor", text: "Karatay’da şebeke su basıncı zaman zaman düşebiliyor; bu durumda binadaki hidrofor devreye girmek zorunda kalıyor. Basınç düştüğünde çamaşır ve bulaşık makineleri su almakta zorlanabilir, program uzayabilir ya da makine su alamadığına dair uyarı verebilir. Makineniz su almıyor gibi görünüyorsa önce evdeki diğer musluklarda suyun normal akıp akmadığına bakın. Basınç herkes için düşükse sorun makinenizde değil, şebekede veya bina tesisatındadır; hidroforla ilgili konularda bina yönetiminize başvurun." },
    ],
    faqs: [
      ["Su basıncı düşükken çamaşır makinesi çalıştırmak cihaza zarar verir mi?", "Genellikle kalıcı bir zarar vermez; ancak makine yeterli su alamadığı için programı durdurabilir veya uyarı verebilir. Basınç normale döndüğünde programı yeniden başlatın. Basınç normal olduğu hâlde makine su almamaya devam ediyorsa su giriş tarafının incelenmesi gerekir."],
      ["Elektrik gidip geldikten sonra cihazım çalışmıyorsa ne yapmalıyım?", "Önce sigortayı ve prizi kontrol edin, ardından cihazı birkaç dakika fişten çekip yeniden takın. Ekranda bir uyarı varsa not alın. Cihaz hâlâ tepki vermiyorsa elektronik kart etkilenmiş olabilir. Kartı kendiniz açmaya çalışmayın; servis talebinizde elektriğin ne zaman gidip geldiğini ve cihazın garanti durumunu belirtin."],
    ],
  },
  Selçuklu: {
    description: "Selçuklu’da beyaz eşya ve ankastre cihaz servisi. Yeni binalardaki ankastre setler, kireç ve Yazır’dan gerçek servis örnekleri.",
    hero: "Selçuklu’da çamaşır, bulaşık ve ankastre mutfak cihazlarınız için WhatsApp’tan servis talebi oluşturun.",
    intro: "Selçuklu’ya atölyemizden planlı olarak servis veriyoruz. Bu ilçede sahada gördüklerimizi ve son işlerimizi aşağıda bulabilirsiniz.",
    notes: [
      { title: "Yeni binalarda ankastre setler", text: "Sahada gördüğümüz kadarıyla Konya genelinde yeni binaların neredeyse tamamında fırın, ocak ve davlumbaz ankastre set olarak geliyor. Dolaba gömülü bir fırının arkasındaki bağlantılara ulaşmak için cihazı yerinden sökmek gerekebiliyor. Servis talebi oluştururken cihazın ankastre olduğunu belirtmeniz, ziyaretin buna göre planlanmasını sağlar. Setteki fırın ve ocak aynı anda çalışmıyorsa sorun çoğu zaman ortak elektrik hattındadır; önce sigortaya bakın." },
      { title: "Kireç", text: "Yazır’da suyu ısıtmayan bir çamaşır makinesinde arızanın kaynağı kireçti. Makineyi nasıl incelediğimizi ve kireçlenmeye karşı alınabilecek önlemleri, son işlerimiz arasındaki Arçelik yazısında anlattık." },
    ],
    faqs: [
      ["Ankastre fırın veya ocak için servis çağırırken nelere dikkat etmeliyim?", "Cihazın ankastre olduğunu, setteki diğer cihazların çalışıp çalışmadığını ve mümkünse model etiketinin fotoğrafını paylaşın. Cihazı kendiniz dolaptan çıkarmaya çalışmayın; montaj parçaları, bağlantılar ve dolap zarar görebilir."],
      ["Yeni taşındığım dairedeki ankastre setin kullanım kılavuzu yok, ne yapabilirim?", "Cihazın model etiketindeki ürün kodunu not edin; birçok üretici kullanım kılavuzlarını internet sitesinde model koduyla paylaşır. Servis talebinizde bu kodu yazmanız, doğru parçanın önceden belirlenmesini de kolaylaştırır."],
    ],
  },
  Meram: {
    description: "Meram’da beyaz eşya servisi: Bosch, Vestel, Profilo ve Altus cihazlarda sahadan son işlerimiz, hizmet verdiğimiz mahalleler ve servis talebi.",
    hero: "Meram’daki evinizde arızalanan beyaz eşya ve küçük ev aletleri için WhatsApp’tan servis talebi oluşturun.",
    intro: "Meram’a atölyemizden planlı olarak servis veriyoruz. Bu ilçedeki son işlerimiz dört farklı cihazdan geliyor: titreyen bir çamaşır makinesi, kapağından su sızdıran bir bulaşık makinesi, buzlanma yüzünden ses yapan bir buzdolabı ve programı bitirmeyen bir kurutma makinesi. Her birinde ne bulduğumuzu ve ne yaptığımızı aşağıdaki servis kayıtlarında anlattık.",
    notes: [],
    faqs: [
      ["Bulaşık makinesi suyu boşaltmıyorsa ne yapmalıyım?", "Öncelikle makineyi kapatıp fişini çekin. Filtre bölümünde su veya yemek artığı birikmiş olup olmadığını kontrol edin. Gider hortumunda kıvrılma ya da tıkanıklık da suyun boşalmasını engelleyebilir. Sorun devam ediyorsa tahliye pompası veya gider sistemi kontrol edilmelidir."],
      ["Buzdolabım yeterince soğutmuyorsa ne yapmalıyım?", "Öncelikle sıcaklık ayarını ve kapının tam kapanıp kapanmadığını kontrol edin. Buzdolabının hava kanallarının yiyeceklerle kapatılmaması gerekir. Cihaz uzun süre çalışmasına rağmen yeterli soğutma yapmıyorsa fan, sensör veya soğutma sistemiyle ilgili bir arıza olabilir. Bu durumda servis tarafından kontrol edilmesi gerekir."],
    ],
  },
};

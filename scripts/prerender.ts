import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputDir = path.join(root, "dist", "public");
const indexPath = path.join(outputDir, "index.html");
const siteUrl = "https://esliteknik.com";
const siteName = "EŞLİ TEKNİK";
const defaultDescription = "Konya’da Meram, Selçuklu ve Karatay ilçelerinde tüm marka ve model beyaz eşyalar ile küçük ev aletleri için Eşli Teknik servis desteği sunar. WhatsApp’tan ulaşın, servis sürecini online takip edin.";

const services: Record<string, [string, string]> = {
  "/camasir-makinesi-tamiri-konya/": ["Konya Çamaşır Makinesi Tamiri | Eşli Teknik", "Konya’da çamaşır makinesi tamiri için Eşli Teknik’e WhatsApp’tan ulaşın. Arıza bilgisi, servis planı ve online iş takibiyle destek alın."],
  "/bulasik-makinesi-tamiri-konya/": ["Konya Bulaşık Makinesi Tamiri | Eşli Teknik", "Konya’da bulaşık makinesi tamiri için Eşli Teknik’e WhatsApp’tan ulaşın. Arıza bilgisi, servis planı ve online iş takibiyle destek alın."],
  "/kurutma-makinesi-tamiri-konya/": ["Konya Kurutma Makinesi Tamiri | Eşli Teknik", "Konya’da kurutma makinesi tamiri için Eşli Teknik’e WhatsApp’tan ulaşın. Arıza bilgisi, servis planı ve online iş takibiyle destek alın."],
  "/firin-tamiri-konya/": ["Konya Fırın Tamiri | Eşli Teknik", "Konya’da fırın tamiri için Eşli Teknik’e WhatsApp’tan ulaşın. Arıza bilgisi, servis planı ve online iş takibiyle destek alın."],
  "/ocak-tamiri-konya/": ["Konya Ocak Tamiri | Eşli Teknik", "Konya’da ocak tamiri için Eşli Teknik’e WhatsApp’tan ulaşın. Arıza bilgisi, servis planı ve online iş takibiyle destek alın."],
  "/buzdolabi-tamiri-konya/": ["Konya Buzdolabı Tamiri | Eşli Teknik", "Konya’da buzdolabı tamiri için Eşli Teknik’e WhatsApp’tan ulaşın. Arıza bilgisi, servis planı ve online iş takibiyle destek alın."],
  "/elektrikli-supurge-tamiri-konya/": ["Konya Elektrikli Süpürge Tamiri | Eşli Teknik", "Konya’da elektrikli süpürge tamiri için Eşli Teknik’e WhatsApp’tan ulaşın. Arıza bilgisi, servis planı ve online iş takibiyle destek alın."],
  "/davlumbaz-tamiri-konya/": ["Konya Davlumbaz Tamiri | Eşli Teknik", "Konya’da davlumbaz tamiri için Eşli Teknik’e WhatsApp’tan ulaşın. Arıza bilgisi, servis planı ve online iş takibiyle destek alın."],
  "/derin-dondurucu-tamiri-konya/": ["Konya Derin Dondurucu Tamiri | Eşli Teknik", "Konya’da derin dondurucu tamiri için Eşli Teknik’e WhatsApp’tan ulaşın. Arıza bilgisi, servis planı ve online iş takibiyle destek alın."],
  "/su-sebili-tamiri-konya/": ["Konya Su Sebili Tamiri | Eşli Teknik", "Konya’da su sebili tamiri için Eşli Teknik’e WhatsApp’tan ulaşın. Arıza bilgisi, servis planı ve online iş takibiyle destek alın."],
};

const serviceFaqs: Record<string, [string, string][]> = {
  "/camasir-makinesi-tamiri-konya/": [["Çamaşır makinesi su almıyorsa ne kontrol edilir?", "Su vanası, giriş hortumu ve görünür filtre tıkanıklığı güvenli biçimde kontrol edilebilir; sorun sürerse servis isteyin."], ["Çamaşır makinesi neden sıkma yapmaz?", "Dengesiz yük, tahliye problemi, kapak kilidi veya motor grubu etkilenmiş olabilir."], ["Parça değişimi öncesi bilgi verilir mi?", "İnceleme sonrası işlem ve parça ihtiyacı açıklanır; onayınız alınmadan değişim yapılmaz."]],
  "/bulasik-makinesi-tamiri-konya/": [["Bulaşık makinesinin içinde su kalıyorsa ne yapılır?", "Filtre ve tahliye hortumu kılavuza uygun kontrol edilebilir; su kalmaya devam ederse pompa için servis isteyin."], ["Bulaşık makinesi neden temiz yıkamaz?", "Filtre, püskürtme kolları, su sıcaklığı, deterjan veya rezistans etkili olabilir."], ["Aynı gün planlama yapılır mı?", "Ekip uygunluğuna ve günlük plana göre aynı gün hedeflenebilir; net zaman talep sırasında paylaşılır."]],
  "/buzdolabi-tamiri-konya/": [["Buzdolabı soğutmuyorsa ne kontrol edilir?", "Kapı, conta, sıcaklık ayarı ve hava dolaşımı gözlemlenebilir; soğutma sistemini açmadan servis desteği alın."], ["Buzlanma arıza mıdır?", "Conta, hava kanalı, sensör veya defrost sistemi etkilenmiş olabilir; buzu kesici aletle kazımayın."], ["Buzdolabı tamiri ne kadar sürer?", "Basit conta veya ayar işlemleri hızlı tamamlanabilir; parça ve soğutma sistemi işlemleri modele göre değişir."]],
  "/firin-tamiri-konya/": [["Fırın ısıtmıyorsa ne kontrol edilir?", "Enerji, saat/program ve sıcaklık seçimi kontrol edilebilir; rezistans veya termostatı sökmeyin."], ["Fırın aynı gün tamamlanır mı?", "Basit ayar veya uygun parça işlemleri aynı ziyarette olabilir; özel parça gereken durumlarda süre değişir."], ["Gaz kokusunda ne yapılmalı?", "Gaz vanasını kapatın, ortamı havalandırın ve düğmelere dokunmadan yetkili destek alın."]],
  "/ocak-tamiri-konya/": [["Ocak ateşlemiyorsa ne kontrol edilir?", "Gaz vanası, elektrik bağlantısı ve düğme konumu gözlemlenebilir; ateşleme sistemini sökmeyin."], ["Sarı alev neden olur?", "Hava-gaz karışımı, enjektör veya yanma sistemiyle ilgili sorun olabilir; cihazı kullanmayı bırakın."], ["Ocak camı çatladıysa kullanılabilir mi?", "Hayır. Cam çatlağı güvenlik riski oluşturabilir; cihazı kullanmadan servis isteyin."]],
  "/kurutma-makinesi-tamiri-konya/": [["Kurutma makinesi ısıtmıyorsa ne yapılır?", "Filtre, hazne ve program seçimi kılavuza göre kontrol edilebilir; rezistans veya termik gruba müdahale etmeyin."], ["Kurutma makinesi neden uzun sürer?", "Aşırı yük, tıkalı filtre, hava akışı, nem sensörü veya ısıtma sistemi etkili olabilir."], ["Parça değişimi nasıl belirlenir?", "Model ve arıza tespitinden sonra parça, işlem kapsamı ve süre açıklanır; onayınız alınmadan değişim yapılmaz."]],
};
const relatedServiceLinks: Record<string, [string, string][]> = {
  "/camasir-makinesi-tamiri-konya/": [["Kurutma Makinesi Tamiri", "/kurutma-makinesi-tamiri-konya/"], ["Bulaşık Makinesi Tamiri", "/bulasik-makinesi-tamiri-konya/"], ["Buzdolabı Tamiri", "/buzdolabi-tamiri-konya/"]],
  "/bulasik-makinesi-tamiri-konya/": [["Çamaşır Makinesi Tamiri", "/camasir-makinesi-tamiri-konya/"], ["Buzdolabı Tamiri", "/buzdolabi-tamiri-konya/"], ["Fırın Tamiri", "/firin-tamiri-konya/"]],
  "/kurutma-makinesi-tamiri-konya/": [["Çamaşır Makinesi Tamiri", "/camasir-makinesi-tamiri-konya/"], ["Buzdolabı Tamiri", "/buzdolabi-tamiri-konya/"], ["Elektrikli Süpürge Tamiri", "/elektrikli-supurge-tamiri-konya/"]],
  "/buzdolabi-tamiri-konya/": [["Derin Dondurucu Tamiri", "/derin-dondurucu-tamiri-konya/"], ["Su Sebili Tamiri", "/su-sebili-tamiri-konya/"], ["Bulaşık Makinesi Tamiri", "/bulasik-makinesi-tamiri-konya/"]],
  "/firin-tamiri-konya/": [["Ocak Tamiri", "/ocak-tamiri-konya/"], ["Davlumbaz Tamiri", "/davlumbaz-tamiri-konya/"], ["Bulaşık Makinesi Tamiri", "/bulasik-makinesi-tamiri-konya/"]],
  "/ocak-tamiri-konya/": [["Fırın Tamiri", "/firin-tamiri-konya/"], ["Davlumbaz Tamiri", "/davlumbaz-tamiri-konya/"], ["Buzdolabı Tamiri", "/buzdolabi-tamiri-konya/"]],
};

const districts: Record<string, string> = {
  "/karatay/": "Karatay Beyaz Eşya Servisi | Eşli Teknik Konya",
  "/meram/": "Meram Beyaz Eşya Servisi | Eşli Teknik Konya",
  "/selcuklu/": "Selçuklu Beyaz Eşya Servisi | Eşli Teknik Konya",
};

const districtDetails: Record<string, { intro: string; guide: string; services: string; safety: string; faqs: [string,string][] }> = {
  Karatay: { intro: "Karatay’da çamaşır makinesi, buzdolabı, bulaşık makinesi ve diğer ev cihazlarınız için servis talebinizi WhatsApp’tan iletebilirsiniz.", guide: "Cihazın markasını, modelini ve yaşadığınız sorunu yazmanız ilk yönlendirme için yeterlidir. Karatay’daki açık adresinizi ve uygun olduğunuz zaman aralığını da paylaşırsanız servis planı daha kolay netleşir.", services: "Çamaşır makinesi, bulaşık makinesi, buzdolabı, derin dondurucu, fırın, ocak, davlumbaz ve su sebili için ilgili cihaz rehberlerini inceleyebilirsiniz.", safety: "Yanık kokusu, su kaçağı veya sigorta attırma varsa cihazı kullanmayın ve gövdesini açmayın.", faqs: [["Karatay’da servis talebi oluşturmak için ne yazmalıyım?", "Cihaz türü, marka-model, arıza belirtisi, varsa hata kodu ve Karatay’daki açık adres bilgisi yeterlidir."], ["Karatay’da aynı gün servis yapılır mı?", "Aynı gün uygunluğu ekip planına ve adrese göre kontrol edilir. Uygun zaman servis talebi sırasında paylaşılır."]] },
  Meram: { intro: "Meram’da evinizdeki beyaz eşya veya küçük ev aleti için arıza bilgilerinizi paylaşarak servis planlaması hakkında bilgi alabilirsiniz.", guide: "Cihazın hangi belirtiyi gösterdiğini, modelini ve bulunduğunuz mahalleyi yazın. Fotoğraf veya hata kodu varsa mesajınıza ekleyebilirsiniz.", services: "Çamaşır, kurutma ve bulaşık makineleri; buzdolabı, derin dondurucu, fırın, ocak ve davlumbaz için cihaz türüne özel servis sayfalarından bilgi alabilirsiniz.", safety: "Su kaçağı, duman, yanık kokusu veya elektrik riski fark ederseniz cihazı kullanmayı bırakın.", faqs: [["Meram’da servis için mahalle bilgisi gerekli mi?", "Evet. Mahalle ve açık adres bilgisi, servis uygunluğunun kontrol edilmesi için gereklidir."], ["Meram’da servis süresi nasıl belirlenir?", "Cihazın arızası, gerekli işlem ve ekip uygunluğu değerlendirildikten sonra uygun zaman bilgisi paylaşılır."]] },
  Selçuklu: { intro: "Selçuklu’da beyaz eşya ve ankastre cihaz arızaları için cihaz bilgilerinizi göndererek servis sürecini başlatabilirsiniz.", guide: "Cihaz türünü, marka-model bilgisini, arızanın ne zaman başladığını ve açık adresinizi belirtin. Bu bilgiler talebinizin doğru cihaz rehberine yönlendirilmesini sağlar.", services: "Çamaşır ve kurutma makineleri, bulaşık makineleri, buzdolapları, derin dondurucular, fırınlar, ocaklar ve davlumbazlar için ilgili servis sayfalarını inceleyebilirsiniz.", safety: "Gaz, elektrik, su veya soğutma sistemine kendi başınıza müdahale etmeyin.", faqs: [["Selçuklu’da servis kaydı nasıl açılır?", "WhatsApp’tan cihaz türünü, marka-model bilgisini, arıza belirtisini ve Selçuklu’daki açık adresinizi göndererek kayıt başlatabilirsiniz."], ["Selçuklu’da servis kaydını takip edebilir miyim?", "Evet. Kayıt açıldığında gönderilen özel takip bağlantısı üzerinden işlem durumunu görüntüleyebilirsiniz."]] },
};

const districtNeighborhoods: Record<string, string[]> = {"Karatay":["Acıdort","Ağsaklı","Akabe","Akbaş","Akörenkışla","Araplar","Aziziye","Bakırtolu","Başak","Başgötüren","Beşağıl","Büyükburnak","Çatalhöyük","Çengilti","Çimenlik","Divanlar","Emirgazi","Erenler","Erler","Esentepe","Fetih","Fevziçakmak","Gaziosmanpaşa","Göçü","HacıVeyiszade","Hamzaoğlu","Hayıroğlu","İpekler","İsmil","İstiklal","İşgalaman","Kalenderhane","Karaaslan","Karadona","Karakaya","Katrancı","Keçeciler","Kızören","Köseali","Kumköprü","Mengene","Nakipoğlu","Obruk","Ortakonak","Ovakavağı","Sakyatan","Saraçoğlu","Sarıyakup","Sedirler","Selimsultan","Sultan Mesud","Sürüç","Şatır","Şemsi Tebrizi","Tatlıcak","Ulubatlıhasan","Yağlıbayat","Yarma","Yavşankuyu","Yediler","Yenice","Yenikent","Zincirli"],"Meram":["Alakova","Alavardı","Ali Ulvi Kurucu","Alpaslan","Aşkan","Ateşbaz Veli","Ayanbey","Aydoğdu","Aymanas","Bahçeşehir","Bayat","Boruktolu","Botsa","Boyalı","Çarıklar","Çaybaşı","Çayırbağı","Çomaklar","Çomaklı","Çukurçimen","Dere","Durunday","Erenkaya","Evliyatekke","Gödene","Hadimi","Harmancık","Hasanşeyh","Hatıp","Hatunsaray","Havzan","İkipınar","İnlice","Karaağaç","Karadiğin","Karadiğinderesi","Karahüyük","Kaşınhanı","Kavak","Kayadibi","Kayalı","Kayıhüyük","Kızılören","Kilistra","Konevi","Kovanağzı","Kozağaç","Köyceğiz","Kumralı","Lalebahçe","Melikşah","Osmangazi","Pamukçu","Pirebi","Sadıklar","Sağlık","Sahibata","Sarıkız","Sefaköy","Uluğbey","Uluırmak","Uzunharmanlar","Yaka","Yatağan","Yaylapınar","Yenibahçe","Yenişehir","Yeşildere","Yeşiltekke"],"Selçuklu":["Akademi","Akıncılar","Akpınar","Akşemsettin","Ardıçlı","Aşağıpınarbaşı","Aydınlık Evler","Bağrıkurt","Başarakavak","Bedir","Beyhekim","Biçer","Bilecik","Binkonutlar","Bosnahersek","Buhara","Büyükkayacık","Cumhuriyet","Çaldere","Çaltı","Çandır","Dağdere","Dokuz","Dumlupınar","Eğribayat","Erenköy","Esenler","Fatih","Ferhuniye","Feritpaşa","Güvenç","Hacıkaymak","Hanaybaşı","Hocacihan","Horozluhan","Hüsamettin Çelebi","Işıklar","İhsaniye","Kaleköy","Karaömerler","Kervan","Kılınçarslan","Kınık","Kızılcakuyu","Kosova","Küçükmuhsine","Malazgirt","Mehmet Akif","Meydanköy","Musalla Bağları","Nişantaş","Parsana","Sakarya","Sancak","Sarayköy","Sarıcalar","Selahaddini Eyyubi","Selahattin","Selçuk","Sızma","Sille","Sille Ak","Sulutas","Şeker","Şeyh Şamil","Tatköy","Tepekent","Tömek","Ulumuhsine","Yazıbelen","Yazır","Yukarıpınarbaşı"]};

const brands = [
  ["altus", "Altus"], ["arcelik", "Arçelik"], ["arnica", "Arnica"], ["beko", "Beko"], ["bosch", "Bosch"],
  ["electrolux", "Electrolux"], ["franke", "Franke"], ["hoover", "Hoover"], ["kumtel", "Kumtel"], ["philips", "Philips"],
  ["profilo", "Profilo"], ["regal", "Regal"], ["rowenta", "Rowenta"], ["samsung", "Samsung"], ["siemens", "Siemens"], ["silverline", "Silverline"],
  ["senocak", "Şenocak"], ["teka", "Teka"], ["ugur-sogutma", "Uğur Soğutma"], ["vestel", "Vestel"],
] as const;

const brandDeviceLinks: Record<string, [string,string][]> = {
  Vestel: [["Vestel Çamaşır Makinesi Servisi", "/camasir-makinesi-tamiri-konya/"], ["Vestel Bulaşık Makinesi Servisi", "/bulasik-makinesi-tamiri-konya/"], ["Vestel Buzdolabı Servisi", "/buzdolabi-tamiri-konya/"], ["Vestel Kurutma Makinesi Servisi", "/kurutma-makinesi-tamiri-konya/"]],
  Regal: [["Regal Çamaşır Makinesi Servisi", "/camasir-makinesi-tamiri-konya/"], ["Regal Bulaşık Makinesi Servisi", "/bulasik-makinesi-tamiri-konya/"], ["Regal Buzdolabı Servisi", "/buzdolabi-tamiri-konya/"], ["Regal Kurutma Makinesi Servisi", "/kurutma-makinesi-tamiri-konya/"]],
  Altus: [["Altus Çamaşır Makinesi Servisi", "/camasir-makinesi-tamiri-konya/"], ["Altus Bulaşık Makinesi Servisi", "/bulasik-makinesi-tamiri-konya/"], ["Altus Buzdolabı Servisi", "/buzdolabi-tamiri-konya/"]],
};

for (const [slug, name] of brands) {
  const title = `${name} Servisi Konya | Eşli Teknik`;
  services[`/${slug}-servisi-konya/`] = [title, `Konya’da ${name} servisi için Eşli Teknik’e WhatsApp’tan ulaşın. Beyaz eşya ve küçük ev aletleri için servis planlaması ve online iş takibi.`];
}

const extra: Record<string, [string, string]> = {
  "/": ["EŞLİ TEKNİK | Konya Beyaz Eşya Teknik Servisi", defaultDescription],
  "/online-servis-takibi/": ["Online Servis Takibi | Eşli Teknik Konya", "Eşli Teknik servis kaydınızın durumunu online takip edin. Size iletilen takip bağlantısı üzerinden servis sürecini görüntüleyebilirsiniz."],
  "/tum-markalar/": ["Konya Beyaz Eşya Servis Markaları | Eşli Teknik", "Eşli Teknik, Konya’da birçok beyaz eşya ve küçük ev aleti markası için teknik servis desteği sunar."],
  "/sss/": ["Sık Sorulan Sorular | Eşli Teknik Konya", "Eşli Teknik beyaz eşya servisi hakkında sık sorulan sorular, servis süreci, iletişim ve online takip bilgileri."],
  "/iletisim/": ["İletişim | Eşli Teknik Konya", "Eşli Teknik Konya beyaz eşya teknik servisine WhatsApp veya telefon üzerinden ulaşın."],
  "/hakkimizda/": ["Hakkımızda | Eşli Teknik Konya", "Eşli Teknik hakkında bilgi alın. Konya’da beyaz eşya ve küçük ev aletleri için teknik servis desteği."],
  "/kvkk/": ["KVKK | Eşli Teknik", "Eşli Teknik kişisel verilerin korunması ve işlenmesine ilişkin bilgilendirme metni."],
  "/gizlilik-politikasi/": ["Gizlilik Politikası | Eşli Teknik", "Eşli Teknik web sitesi gizlilik politikası ve kişisel verilerin işlenmesine ilişkin bilgiler."],
  "/cerez-politikasi/": ["Çerez Politikası | Eşli Teknik", "Eşli Teknik web sitesinde kullanılan çerezler ve tercihlerin yönetimi hakkında bilgiler."],
};

const routes: Record<string, [string, string]> = {
  ...extra,
  ...services,
  ...Object.fromEntries(Object.entries(districts).map(([route, title]) => [route, [title, `${title.replace(" | Eşli Teknik Konya", "")} bölgesinde beyaz eşya tamiri ve teknik servis için Eşli Teknik’e ulaşın.`]])),
};

function esc(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function jsonLd(title: string, description: string, url: string, route: string) {
  const graph: Record<string, unknown>[] = [
    { "@type": "ProfessionalService", "@id": `${siteUrl}/#business`, name: siteName, url: siteUrl, telephone: "+905511858773", description: defaultDescription, image: `${siteUrl}/favicon.png`, priceRange: "₺", address: { "@type": "PostalAddress", streetAddress: "Gaziosmanpaşa Mahallesi Menzil Caddesi No:70", addressLocality: "Karatay", addressRegion: "Konya", postalCode: "42000", addressCountry: "TR" }, geo: { "@type": "GeoCoordinates", latitude: 37.85447056912225, longitude: 32.53236665751531 }, openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "08:00", closes: "22:00" }], areaServed: ["Karatay, Konya", "Meram, Konya", "Selçuklu, Konya"] },
    { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: siteName, inLanguage: "tr-TR" },
    { "@type": "WebPage", "@id": `${url}#webpage`, url, name: title, description, inLanguage: "tr-TR", isPartOf: { "@id": `${siteUrl}/#website` }, about: { "@id": `${siteUrl}/#business` } },
    { "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: route === "/" ? [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: siteUrl }] : [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: siteUrl }, { "@type": "ListItem", position: 2, name: title.replace(" | Eşli Teknik", ""), item: url }] },
  ];

  const brand = brands.find(([slug]) => route === `/${slug}-servisi-konya/`);
  if (brand) {
    const [, brandName] = brand;
    graph.push({ "@type": "Brand", "@id": `${url}#brand`, name: brandName, url });
    graph.push({ "@type": "Service", "@id": `${url}#service`, name: title, description, serviceType: `${brandName} cihaz teknik servisi`, areaServed: ["Karatay", "Meram", "Selçuklu"], provider: { "@id": `${siteUrl}/#business` } });
  } else if (services[route]) {
    graph.push({ "@type": "Service", "@id": `${url}#service`, name: title, description, serviceType: title.replace("Konya ", "").replace(" | Eşli Teknik", ""), areaServed: ["Karatay", "Meram", "Selçuklu"], provider: { "@id": `${siteUrl}/#business` } });
  }

  if (route === "/sss/") {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: [
        { "@type": "Question", name: "Eşli Teknik hangi bölgelerde hizmet veriyor?", acceptedAnswer: { "@type": "Answer", text: "Eşli Teknik Konya’da Karatay, Meram ve Selçuklu ilçelerinde beyaz eşya ve küçük ev aletleri için teknik servis desteği sunar." } },
        { "@type": "Question", name: "Servis kaydımı nasıl takip ederim?", acceptedAnswer: { "@type": "Answer", text: "Servis kaydı oluşturulduktan sonra size iletilen takip bağlantısı üzerinden servis sürecini online görüntüleyebilirsiniz." } },
        { "@type": "Question", name: "Eşli Teknik ile nasıl iletişime geçebilirim?", acceptedAnswer: { "@type": "Answer", text: "WhatsApp veya telefon üzerinden Eşli Teknik’e ulaşarak servis talebinizi iletebilirsiniz." } },
      ],
    });
  }
  if (serviceFaqs[route]) {
    graph.push({ "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: serviceFaqs[route].map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) });
  }

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replaceAll("</", "<\\/");
}

const deviceStaticContent: Record<string, {intro:string; symptoms:string; parts:string; urgent:string}> = {
  "Çamaşır Makinesi": {intro:"Çamaşır makinesinin su almaması, suyu boşaltmaması, sıkma yapmaması veya tamburdan ses gelmesi farklı arıza gruplarına işaret edebilir.", symptoms:"Su alma ve tahliye hattı, kapak kilidi, yük dengesi, pompa ve motor belirtileri birlikte değerlendirilir. Filtre ve tahliye hortumu kontrollerini yalnızca kullanım kılavuzuna uygun ve cihaz güvenli durumdayken yapın.", parts:"Pompa, kapak kilidi, amortisör, rezistans, motor ve elektronik kartın durumu model ile arıza belirtisine göre incelenir.", urgent:"Su kaçağı, yanık kokusu, prizde ısınma veya cihazın sigorta attırması varsa makineyi çalıştırmayın."},
  "Bulaşık Makinesi": {intro:"Bulaşıkların kirli çıkması, makinenin içinde su kalması, programın uzaması veya tabanda su birikmesi bulaşık makinesine özgü servis belirtileridir.", symptoms:"Filtreler, püskürtme kolları, su alma valfi, tahliye hattı, pompa ve ısıtma sistemi değerlendirilir. Alt kapağı veya pompayı sökmeden, kılavuza uygun görünür kontrollerle yetinin.", parts:"Pompa, tahliye hortumu, su alma valfi, rezistans, püskürtme grubu ve kontrol kartı model bazında incelenir.", urgent:"Su zemine taşıyorsa, elektrik kokusu varsa veya sigorta atıyorsa cihazı kullanmayın ve su vanasını kapatın."},
  "Buzdolabı": {intro:"Buzdolabının soğutmaması, aşırı buzlanması, motorun sürekli çalışması, su biriktirmesi veya alışılmadık ses çıkarması soğutma sisteminin değerlendirilmesini gerektirir.", symptoms:"Kapı contası, hava dolaşımı, fan, sıcaklık sensörü, defrost sistemi ve kompresör davranışı gözlemlenir. Buzu kesici aletle kazımayın ve soğutma devresine müdahale etmeyin.", parts:"Conta, fan motoru, termostat veya sensör, defrost grubu, elektronik kart ve kompresör model ile belirtiye göre incelenir.", urgent:"Yanık kokusu, elektrik attırma, yoğun su kaçağı veya gıdaların hızla ısınması varsa cihazı zorlamayın."},
  "Fırın": {intro:"Fırının ısıtmaması, geç ısınması, sıcaklığı koruyamaması, fanının çalışmaması veya ekranda hata kodu göstermesi fırın servisinin başlıca belirtileridir.", symptoms:"Enerji bağlantısı, saat/program ayarı ve sıcaklık seçimi güvenli biçimde kontrol edilebilir; rezistans, fan, termostat veya paneli sökmeyin.", parts:"Rezistans, fan motoru, termostat, sıcaklık sensörü, kapak contası ve kontrol kartı model ile hata belirtisine göre değerlendirilir.", urgent:"Gaz kokusu, duman, yanık kokusu, elektrik çarpması veya cam hasarı varsa fırını kullanmayın ve gaz vanasını kapatın."},
  "Ocak": {intro:"Ocağın ateşlememesi, alevin düzensiz yanması, elektrikli gözün ısınmaması veya düğmenin takılması ocak türüne göre farklı kontroller gerektirir.", symptoms:"Gazlı veya elektrikli model, arızalı göz ve güvenlik belirtisi netleştirilmelidir. Gaz bağlantısı, enjektör, ateşleme modülü veya cam yüzey üzerinde sökme işlemi yapmayın.", parts:"Ateşleme bujisi, düğme, göz grubu, kablo, kontrol modülü ve gaz güvenlik bileşenleri model bazında incelenir.", urgent:"Gaz kokusu, sarı alev, sürekli kıvılcım, cam çatlağı veya elektrik çarpması varsa ocağı kullanmayın."},
  "Kurutma Makinesi": {intro:"Kurutma makinesinin ısıtmaması, çamaşırları nemli bırakması, tamburun dönmemesi veya programın uzaması hava akışı ve ısıtma grubunun incelenmesini gerektirir.", symptoms:"Tiftik filtresi, su haznesi, hava kanalı, nem sensörü ve program seçimi kılavuza göre kontrol edilebilir. Gövdeyi açmadan önce cihazın fişini çekin.", parts:"Rezistans, termik, nem sensörü, kayış, motor, yoğuşma grubu ve elektronik kart model ile belirtiye göre değerlendirilir.", urgent:"Aşırı ısınma, yanık kokusu, tamburun sıkışması veya sigorta attırma varsa makineyi çalıştırmayın."},
};

function staticContent(title: string, description: string, route: string) {
  const brand = brands.find(([slug]) => route === `/${slug}-servisi-konya/`);
  const service = services[route];
  const heading = route === "/" ? "Konya Beyaz Eşya Teknik Servisi" : title.replace(" | Eşli Teknik", "");
  let sections = `<h2>Konya’da Teknik Servis Desteği</h2><p>EŞLİ TEKNİK, Konya’da Karatay, Meram ve Selçuklu ilçelerinde beyaz eşya ve küçük ev aletleri için teknik servis desteği sunar. Servis talebinizi WhatsApp veya telefon üzerinden iletebilir, servis sürecini online takip edebilirsiniz.</p>`;
  if (route === "/hakkimizda/") {
    sections = `<h2>Konya’da teknik servis desteği</h2><p>EŞLİ TEKNİK; Karatay, Meram ve Selçuklu başta olmak üzere Konya’da beyaz eşya ve küçük ev aletleri için teknik servis desteği sunar. Servis talebinizi WhatsApp veya telefon üzerinden iletebilir, cihaz ve arıza bilgilerinizi paylaşarak doğru yönlendirmeyi alabilirsiniz.</p><h2>Şeffaf ve planlı servis süreci</h2><p>Amacımız yalnızca cihazı onarmak değil; servis planını, inceleme kapsamını ve işlem sonrasını anlaşılır biçimde paylaşmaktır. Uygunluk bilgisi adres ve ekip planına göre netleştirilir.</p><h2>Hizmet bölgemiz</h2><p>Karatay, Meram ve Selçuklu ilçelerinde servis planlaması yapılır. Talebinizde cihazın bulunduğu mahalleyi, marka-model bilgisini ve arıza belirtisini paylaşmanız yönlendirme sürecini hızlandırır.</p><p><a href="/iletisim/">İletişim sayfasına geçin</a> · <a href="/camasir-makinesi-tamiri-konya/">Cihaz servis rehberlerini inceleyin</a></p>`;
  } else if (route === "/") {
    sections += `<nav aria-label="Hızlı servis erişimi"><h2>Hizmet ve servis rehberleri</h2><p><strong>Hizmetlerimiz:</strong> <a href="/camasir-makinesi-tamiri-konya/">Çamaşır Makinesi Tamiri</a> · <a href="/bulasik-makinesi-tamiri-konya/">Bulaşık Makinesi Tamiri</a> · <a href="/buzdolabi-tamiri-konya/">Buzdolabı Tamiri</a> · <a href="/firin-tamiri-konya/">Fırın Tamiri</a> · <a href="/ocak-tamiri-konya/">Ocak Tamiri</a> · <a href="/kurutma-makinesi-tamiri-konya/">Kurutma Makinesi Tamiri</a></p><p><strong>Hizmet bölgelerimiz:</strong> <a href="/karatay/">Karatay</a> · <a href="/meram/">Meram</a> · <a href="/selcuklu/">Selçuklu</a></p><p><strong>Popüler markalar:</strong> <a href="/altus-servisi-konya/">Altus Servisi</a> · <a href="/regal-servisi-konya/">Regal Servisi</a> · <a href="/arcelik-servisi-konya/">Arçelik Servisi</a> · <a href="/beko-servisi-konya/">Beko Servisi</a> · <a href="/bosch-servisi-konya/">Bosch Servisi</a> · <a href="/vestel-servisi-konya/">Vestel Servisi</a></p></nav>`;
  }

  if (service && !brand) {
    const guide = serviceFaqs[route] ?? [[`${heading} için nasıl servis kaydı açabilirim?`, "Cihazın marka-modelini, arıza belirtisini ve bulunduğunuz ilçeyi WhatsApp üzerinden paylaşmanız ilk yönlendirme için yeterlidir."]];
    const deviceName = heading.replace("Konya ", "").replace(" Tamiri", "");
    const safety = deviceName === "Ocak" || deviceName === "Fırın" ? "Gaz kokusu, elektrik kaçağı, yanık kokusu veya cam hasarı varsa cihazı kullanmayın; gaz ve elektrik aksamını sökmeyin." : "Fişi çekmeden cihazın gövdesini veya elektrik aksamını açmayın; kaçak, yanık kokusu veya sigorta attırma varsa cihazı çalıştırmayın.";
    const device = deviceStaticContent[deviceName];
    sections = `<h2>${esc(heading)} Hizmeti</h2><p>${esc(device?.intro ?? description)} Model, arıza belirtisi, varsa hata kodu ve bulunduğunuz ilçe bilgisi ilk değerlendirmeyi kolaylaştırır.</p><h2>Yaygın belirtiler ve güvenli ilk kontroller</h2><p>${esc(device?.symptoms ?? description)} ${esc(safety)}</p><h2>Servis incelemesinde değerlendirilen başlıklar</h2><p>${esc(device?.parts ?? "Cihazın modeline ve arıza belirtisine göre ilgili parçalar incelenir.")} İşlem kapsamı ve parça ihtiyacı, inceleme sonrasında onayınıza sunulur.</p><h2>Ne zaman servis çağırmalı?</h2><p>${esc(device?.urgent ?? safety)} Konya’da Karatay, Meram ve Selçuklu için cihaz bilgisiyle WhatsApp’tan servis talebi iletebilir, kayıt açıldığında işlem aşamalarını online takip edebilirsiniz.</p><h2>Sık sorulan sorular</h2>${guide.map(([question, answer]) => `<h3>${esc(question)}</h3><p>${esc(answer)}</p>`).join("")}`;
  } else if (brand) {
    const [, brandName] = brand;
    const deviceLinks = brandDeviceLinks[brandName] ?? []; sections = `<h2>${esc(brandName)} Servisi Konya</h2><p>EŞLİ TEKNİK, ${esc(brandName)} marka cihazlarda doğru yönlendirme için önce cihaz türü, model ve belirti bilgisini netleştirir. Aynı belirti farklı cihazlarda farklı nedenlerden kaynaklanabileceği için aşağıdaki cihaz rehberlerinden uygun olanı seçin.</p><nav aria-label="Marka cihaz rehberleri"><h2>${esc(brandName)} Cihaz Rehberleri</h2><p>${deviceLinks.map(([label, href]) => `<a href="${href}">${esc(label)}</a>`).join(" · ")}</p></nav><p>Cihaz türü netleşmeden parça veya teknik müdahale önerilmez. Yanık kokusu, su/gaz kaçağı veya sigorta attırma varsa cihazı kullanmayın ve servis desteği alın.</p>`;
  } else if (route === "/tum-markalar/") {
    sections = `<h2>Konya’da Servis Verilen Markalar</h2><p>Eşli Teknik; ${brands.map(([, name]) => esc(name)).join(", ")} ve listede yer alan diğer marka ve model cihazlar için teknik servis desteği sunar.</p><h2>Servis Talebi</h2><p>Cihaz markası, modeli ve arıza bilgisini WhatsApp üzerinden paylaşarak servis süreci hakkında bilgi alabilirsiniz.</p>`;
  } else if (districts[route]) {
    const district = title.split(" Beyaz Eşya")[0];
    const detail = districtDetails[district];
    const neighborhoods = districtNeighborhoods[district] ?? [];
    sections = `<h2>${esc(district)} Beyaz Eşya Servisi</h2><p>${esc(detail.intro)}</p><h2>${esc(district)} için hizmet rehberleri</h2><p>${esc(detail.services)}</p><h2>Servis öncesi güvenlik</h2><p>${esc(detail.safety)}</p><section aria-labelledby="district-neighborhoods-title"><h2 id="district-neighborhoods-title">Hizmet Verdiğimiz Mahalleler</h2><p>${neighborhoods.map((neighborhood, index) => `<span>${String(index + 1).padStart(2, "0")} ${esc(neighborhood)}</span>${index < neighborhoods.length - 1 ? " · " : ""}`).join("")}</p></section><h2>${esc(district)} hakkında sık sorulanlar</h2>${detail.faqs.map(([q,a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}`;
  } else if (route === "/online-servis-takibi/") {
    sections = `<h2>Servis Kaydı Nasıl Takip Edilir?</h2><p>Servis kaydı açıldıktan sonra size iletilen özel takip bağlantısını kullanarak servis sürecinizin durumunu online görüntüleyebilirsiniz.</p><h2>Takip Bağlantınız Yoksa</h2><p>WhatsApp üzerinden Eşli Teknik ile iletişime geçerek servis kaydınızın kontrol edilmesini isteyebilirsiniz.</p>`;
  } else if (route === "/iletisim/") {
    sections = `<h2>Eşli Teknik İletişim</h2><p>Konya beyaz eşya teknik servis talebiniz için WhatsApp veya telefon üzerinden Eşli Teknik’e ulaşabilirsiniz.</p><h2>Adres ve Hizmet Bölgesi</h2><p>Adres: Gaziosmanpaşa Mah. Menzil Cad. No:70, Karatay / Konya.</p><p>Karatay, Meram ve Selçuklu başta olmak üzere Konya’da servis planlaması yapılmaktadır.</p>`;
  } else if (route === "/sss/") {
    sections = `<h2>Sık Sorulan Sorular</h2><h3>Hangi bölgelerde hizmet veriyorsunuz?</h3><p>Karatay, Meram ve Selçuklu ilçelerinde beyaz eşya ve küçük ev aletleri için teknik servis desteği sunulmaktadır.</p><h3>Servis kaydımı nasıl takip ederim?</h3><p>Size iletilen özel takip bağlantısı üzerinden servis sürecini online görüntüleyebilirsiniz.</p><h3>Nasıl iletişime geçebilirim?</h3><p>WhatsApp veya telefon üzerinden Eşli Teknik’e ulaşabilirsiniz.</p>`;
  }

  if (relatedServiceLinks[route]) sections += `<nav aria-label="İlgili hizmet rehberleri"><h2>İlgili hizmetler</h2><p>${relatedServiceLinks[route].map(([name, href]) => `<a href="${href}">${esc(name)}</a>`).join(" · ")}</p></nav>`;
  if (route === "/camasir-makinesi-tamiri-konya/") sections += `<nav aria-label="Çamaşır makinesi servis markaları"><h2>Çamaşır Makinesi İçin Hizmet Verdiğimiz Markalar</h2><p><a href="/altus-servisi-konya/">Altus Servisi</a> · <a href="/regal-servisi-konya/">Regal Servisi</a> · <a href="/arcelik-servisi-konya/">Arçelik Servisi</a> · <a href="/beko-servisi-konya/">Beko Servisi</a> · <a href="/bosch-servisi-konya/">Bosch Servisi</a></p></nav>`;
  if (districts[route]) sections += `<nav aria-label="İlçedeki hizmet rehberleri"><h2>${esc(title.split(" Beyaz Eşya")[0])} için hizmetler</h2><p><a href="/camasir-makinesi-tamiri-konya/">Çamaşır Makinesi Tamiri</a> · <a href="/buzdolabi-tamiri-konya/">Buzdolabı Tamiri</a> · <a href="/bulasik-makinesi-tamiri-konya/">Bulaşık Makinesi Tamiri</a></p></nav>`;
  const staticHero = route === "/" ? `<img class="seo-hero-image" src="/esli-teknik-konya-hero-background.webp" width="1920" height="1080" alt="Konya Eşli Teknik beyaz eşya servis hizmeti" fetchpriority="high" decoding="async" />` : service ? `<img class="seo-hero-image" src="/esli-teknik-konya-hero-background.webp" width="1920" height="1080" alt="${esc(heading)}" loading="lazy" decoding="async" />` : brand ? `<img class="seo-hero-image" src="/esli-teknik-konya-hero-background.webp" width="1920" height="1080" alt="${esc(heading)}" loading="lazy" decoding="async" />` : districts[route] ? `<img class="seo-hero-image" src="/esli-teknik-konya-hero-background.webp" width="1920" height="1080" alt="${esc(heading)}" loading="lazy" decoding="async" />` : "";
  const staticContact = `<section class="static-business-contact" aria-labelledby="static-business-contact-title"><div><span class="section-kicker">EŞLİ TEKNİK İLETİŞİM</span><h2 id="static-business-contact-title">Konya’da servis desteği için<br/><em>doğrudan ulaşın.</em></h2><p>Karatay, Meram ve Selçuklu başta olmak üzere Konya’da beyaz eşya ve küçük ev aletleri teknik servis desteği sunuyoruz.</p></div><address><p><strong>Adres</strong><br/>Gaziosmanpaşa Mahallesi Menzil Caddesi No:70, Karatay / Konya</p><p><strong>Telefon</strong><br/><a href="tel:+905511858773">0551 185 87 73</a></p><p><strong>Çalışma saatleri</strong><br/>Her gün 08:00–22:00</p><a class="static-business-map" href="https://www.google.com/maps/search/?api=1&query=37.85447056912225,32.53236665751531">Adresi haritada açın</a></address></section>`;
  return `<main id="seo-prerender" lang="tr">${staticHero}<h1>${esc(heading)}</h1><p>${esc(description)}</p>${sections}${staticContact}</main>`;
}

if (!fs.existsSync(indexPath)) throw new Error(`Build output not found: ${indexPath}`);
const template = fs.readFileSync(indexPath, "utf8");

for (const [route, [title, description]] of Object.entries(routes)) {
  const url = `${siteUrl}${route}`;
  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${esc(description)}" />`);
  html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${esc(title)}" />`);
  html = html.replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${esc(description)}" />`);
  html = html.replace(/<meta name="twitter:title" content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${esc(title)}" />`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${esc(description)}" />`);
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${url}" />`);
  html = html.replace(/<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${siteUrl}/esli-teknik-konya-hero-background.webp" />`);
  html = html.replace(/<meta name="twitter:image" content="[^"]*"\s*\/>/, `<meta name="twitter:image" content="${siteUrl}/esli-teknik-konya-hero-background.webp" />`);
  html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${url}" />`);
  if (!html.includes('property="og:url"')) html = html.replace("</head>", `<meta property="og:url" content="${url}" />\n  </head>`);
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${jsonLd(title, description, url, route)}</script>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${staticContent(title, description, route)}</div>`);

  const targetDir = route === "/" ? outputDir : path.join(outputDir, route.replace(/^\//, "").replace(/\/$/, ""));
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "index.html"), html, "utf8");
}

console.log(`SEO prerender complete: ${Object.keys(routes).length} routes`);

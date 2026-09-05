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

const brands = [
  ["altus", "Altus"], ["arcelik", "Arçelik"], ["arnica", "Arnica"], ["beko", "Beko"], ["bosch", "Bosch"],
  ["electrolux", "Electrolux"], ["franke", "Franke"], ["hoover", "Hoover"], ["kumtel", "Kumtel"], ["philips", "Philips"],
  ["profilo", "Profilo"], ["regal", "Regal"], ["rowenta", "Rowenta"], ["samsung", "Samsung"], ["siemens", "Siemens"], ["silverline", "Silverline"],
  ["senocak", "Şenocak"], ["teka", "Teka"], ["ugur-sogutma", "Uğur Soğutma"], ["vestel", "Vestel"],
] as const;

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

function staticContent(title: string, description: string, route: string) {
  const brand = brands.find(([slug]) => route === `/${slug}-servisi-konya/`);
  const service = services[route];
  const heading = route === "/" ? "Konya Beyaz Eşya Teknik Servisi" : title.replace(" | Eşli Teknik", "");
  let sections = `<h2>Konya’da Teknik Servis Desteği</h2><p>EŞLİ TEKNİK, Konya’da Karatay, Meram ve Selçuklu ilçelerinde beyaz eşya ve küçük ev aletleri için teknik servis desteği sunar. Servis talebinizi WhatsApp veya telefon üzerinden iletebilir, servis sürecini online takip edebilirsiniz.</p>`;
  if (route === "/") {
    sections += `<nav aria-label="Hızlı servis erişimi"><h2>Hizmet ve servis rehberleri</h2><p><strong>Hizmetlerimiz:</strong> <a href="/camasir-makinesi-tamiri-konya/">Çamaşır Makinesi Tamiri</a> · <a href="/bulasik-makinesi-tamiri-konya/">Bulaşık Makinesi Tamiri</a> · <a href="/buzdolabi-tamiri-konya/">Buzdolabı Tamiri</a> · <a href="/firin-tamiri-konya/">Fırın Tamiri</a> · <a href="/ocak-tamiri-konya/">Ocak Tamiri</a> · <a href="/kurutma-makinesi-tamiri-konya/">Kurutma Makinesi Tamiri</a></p><p><strong>Hizmet bölgelerimiz:</strong> <a href="/karatay/">Karatay</a> · <a href="/meram/">Meram</a> · <a href="/selcuklu/">Selçuklu</a></p><p><strong>Popüler markalar:</strong> <a href="/altus-servisi-konya/">Altus Servisi</a> · <a href="/regal-servisi-konya/">Regal Servisi</a> · <a href="/arcelik-servisi-konya/">Arçelik Servisi</a> · <a href="/beko-servisi-konya/">Beko Servisi</a> · <a href="/bosch-servisi-konya/">Bosch Servisi</a> · <a href="/vestel-servisi-konya/">Vestel Servisi</a></p></nav>`;
  }

  if (service && !brand) {
    const guide = serviceFaqs[route] ?? [[`${heading} için nasıl servis kaydı açabilirim?`, "Cihazın marka-modelini, arıza belirtisini ve bulunduğunuz ilçeyi WhatsApp üzerinden paylaşmanız ilk yönlendirme için yeterlidir."]];
    const deviceName = heading.replace("Konya ", "").replace(" Tamiri", "");
    const safety = deviceName === "Ocak" || deviceName === "Fırın" ? "Gaz kokusu, elektrik kaçağı, yanık kokusu veya cam hasarı varsa cihazı kullanmayın; gaz ve elektrik aksamını sökmeyin." : "Fişi çekmeden cihazın gövdesini veya elektrik aksamını açmayın; kaçak, yanık kokusu veya sigorta attırma varsa cihazı çalıştırmayın.";
    sections = `<h2>${esc(heading)} Hizmeti</h2><p>${esc(description)} ${esc(deviceName)} arızalarında model, belirti, hata kodu ve bulunduğunuz ilçe bilgisi servis ön değerlendirmesini kolaylaştırır.</p><h2>Yaygın belirtiler ve ilk kontroller</h2><p>${esc(deviceName)} cihazlarda performans kaybı, alışılmadık ses, ısıtma/soğutma sorunu veya programın yarıda kalması farklı parça ve bağlantı gruplarının incelenmesini gerektirebilir. Kullanım kılavuzundaki güvenli filtre, hazne, hortum veya ayar kontrollerini uygulayabilirsiniz. ${esc(safety)}</p><h2>Servis süresi ve fiyatlandırma</h2><p>Basit temizlik, ayar veya bağlantı işlemleri aynı ziyarette tamamlanabilir. Pompa, rezistans, motor, sensör, kart veya soğutma grubu gibi parçalarda süre model ve parça teminine göre değişir. Fiyat; arıza tespiti, işçilik ve gerekiyorsa parça ihtiyacı açıklanarak onayınıza sunulur.</p><h2>Ne zaman servis çağırmalı?</h2><p>Aynı arızanın tekrarlaması, cihazın sigorta attırması, su veya gaz kaçağı, yanık kokusu ve güvenli çalışmama belirtileri bekletilmemelidir. Karatay, Meram ve Selçuklu için WhatsApp’tan servis talebi iletebilir, kayıt açıldığında işlem aşamalarını online takip edebilirsiniz.</p><h2>Sık sorulan sorular</h2>${guide.map(([question, answer]) => `<h3>${esc(question)}</h3><p>${esc(answer)}</p>`).join("")}`;
  } else if (brand) {
    const [, brandName] = brand;
    sections = `<h2>${esc(brandName)} Servisi Konya</h2><p>EŞLİ TEKNİK, Konya’da ${esc(brandName)} marka cihazlar için teknik servis desteği sunar. Arıza bilgilerinizi WhatsApp üzerinden ileterek servis planlaması hakkında bilgi alabilirsiniz.</p><h2>${esc(brandName)} Cihazlarda Servis</h2><p>Çamaşır makinesi, bulaşık makinesi, buzdolabı, fırın ve diğer uygun cihaz gruplarında arıza tespiti ve teknik servis desteği için Eşli Teknik’e ulaşabilirsiniz.</p>`;
  } else if (route === "/tum-markalar/") {
    sections = `<h2>Konya’da Servis Verilen Markalar</h2><p>Eşli Teknik; ${brands.map(([, name]) => esc(name)).join(", ")} ve listede yer alan diğer marka ve model cihazlar için teknik servis desteği sunar.</p><h2>Servis Talebi</h2><p>Cihaz markası, modeli ve arıza bilgisini WhatsApp üzerinden paylaşarak servis süreci hakkında bilgi alabilirsiniz.</p>`;
  } else if (districts[route]) {
    const district = title.split(" Beyaz Eşya")[0];
    sections = `<h2>${esc(district)} Beyaz Eşya Servisi</h2><p>Eşli Teknik, ${esc(district)} ve Konya genelinde beyaz eşya ve küçük ev aletleri için teknik servis desteği sunar.</p><h2>Hizmet Bölgeleri</h2><p>Karatay, Meram ve Selçuklu ilçelerinde servis planlaması için Eşli Teknik ile iletişime geçebilirsiniz.</p>`;
  } else if (route === "/online-servis-takibi/") {
    sections = `<h2>Servis Kaydı Nasıl Takip Edilir?</h2><p>Servis kaydı açıldıktan sonra size iletilen özel takip bağlantısını kullanarak servis sürecinizin durumunu online görüntüleyebilirsiniz.</p><h2>Takip Bağlantınız Yoksa</h2><p>WhatsApp üzerinden Eşli Teknik ile iletişime geçerek servis kaydınızın kontrol edilmesini isteyebilirsiniz.</p>`;
  } else if (route === "/iletisim/") {
    sections = `<h2>Eşli Teknik İletişim</h2><p>Konya beyaz eşya teknik servis talebiniz için WhatsApp veya telefon üzerinden Eşli Teknik’e ulaşabilirsiniz.</p><h2>Hizmet Bölgesi</h2><p>Karatay, Meram ve Selçuklu başta olmak üzere Konya’da servis planlaması yapılmaktadır.</p>`;
  } else if (route === "/sss/") {
    sections = `<h2>Sık Sorulan Sorular</h2><h3>Hangi bölgelerde hizmet veriyorsunuz?</h3><p>Karatay, Meram ve Selçuklu ilçelerinde beyaz eşya ve küçük ev aletleri için teknik servis desteği sunulmaktadır.</p><h3>Servis kaydımı nasıl takip ederim?</h3><p>Size iletilen özel takip bağlantısı üzerinden servis sürecini online görüntüleyebilirsiniz.</p><h3>Nasıl iletişime geçebilirim?</h3><p>WhatsApp veya telefon üzerinden Eşli Teknik’e ulaşabilirsiniz.</p>`;
  }

  if (relatedServiceLinks[route]) sections += `<nav aria-label="İlgili hizmet rehberleri"><h2>İlgili hizmetler</h2><p>${relatedServiceLinks[route].map(([name, href]) => `<a href="${href}">${esc(name)}</a>`).join(" · ")}</p></nav>`;
  if (route === "/camasir-makinesi-tamiri-konya/") sections += `<nav aria-label="Çamaşır makinesi servis markaları"><h2>Çamaşır Makinesi İçin Hizmet Verdiğimiz Markalar</h2><p><a href="/altus-servisi-konya/">Altus Servisi</a> · <a href="/regal-servisi-konya/">Regal Servisi</a> · <a href="/arcelik-servisi-konya/">Arçelik Servisi</a> · <a href="/beko-servisi-konya/">Beko Servisi</a> · <a href="/bosch-servisi-konya/">Bosch Servisi</a></p></nav>`;
  if (districts[route]) sections += `<nav aria-label="İlçedeki hizmet rehberleri"><h2>${esc(title.split(" Beyaz Eşya")[0])} için hizmetler</h2><p><a href="/camasir-makinesi-tamiri-konya/">Çamaşır Makinesi Tamiri</a> · <a href="/buzdolabi-tamiri-konya/">Buzdolabı Tamiri</a> · <a href="/bulasik-makinesi-tamiri-konya/">Bulaşık Makinesi Tamiri</a></p></nav>`;
  const staticHero = route === "/" ? `<img class="seo-hero-image" src="/esli-teknik-konya-hero-background.webp" width="1920" height="1080" alt="Konya Eşli Teknik beyaz eşya servis hizmeti" fetchpriority="high" decoding="async" />` : service ? `<img class="seo-hero-image" src="/esli-teknik-konya-hero-background.webp" width="1920" height="1080" alt="${esc(heading)}" loading="lazy" decoding="async" />` : brand ? `<img class="seo-hero-image" src="/esli-teknik-konya-hero-background.webp" width="1920" height="1080" alt="${esc(heading)}" loading="lazy" decoding="async" />` : districts[route] ? `<img class="seo-hero-image" src="/esli-teknik-konya-hero-background.webp" width="1920" height="1080" alt="${esc(heading)}" loading="lazy" decoding="async" />` : "";
  return `<main id="seo-prerender" lang="tr">${staticHero}<h1>${esc(heading)}</h1><p>${esc(description)}</p>${sections}</main>`;
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

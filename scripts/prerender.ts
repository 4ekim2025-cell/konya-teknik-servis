import fs from "node:fs";
import path from "node:path";
import { districtNeighborhoods, serviceFaqs } from "../shared/seo-content";
import { districtGuides } from "../shared/district-guides";
import { GOOGLE_BUSINESS_URL } from "../shared/business-contact";
import { deviceFaultGuides } from "../shared/device-faults";
import { brandGuides } from "../shared/brand-guides";
import { BLOG_AUTHOR, blogPosts, blogPostsForDevice, blogShareLinks, formatBlogDate, type BlogBlock, type BlogPost } from "../shared/blog-posts";

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
  ["electrolux", "Electrolux"], ["franke", "Franke"], ["grundig", "Grundig"], ["hoover", "Hoover"], ["kumtel", "Kumtel"], ["philips", "Philips"],
  ["profilo", "Profilo"], ["regal", "Regal"], ["rowenta", "Rowenta"], ["samsung", "Samsung"], ["siemens", "Siemens"], ["silverline", "Silverline"], ["sinbo", "Sinbo"],
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

// Arıza rehberi olan cihazlarda sayfaya özel açıklama kullanılır (shared/device-faults.ts).
for (const [route, [title]] of Object.entries(services)) {
  const guide = deviceFaultGuides[title.replace("Konya ", "").replace(" Tamiri | Eşli Teknik", "")];
  if (guide) services[route] = [title, guide.description];
}
for (const [slug, name] of brands) {
  const guide = brandGuides[name];
  const route = `/${slug}-servisi-konya/`;
  if (guide && services[route]) services[route] = [services[route][0], guide.description];
}

const extra: Record<string, [string, string]> = {
  "/": ["EŞLİ TEKNİK | Konya Beyaz Eşya Teknik Servisi", defaultDescription],
  "/online-servis-takibi/": ["Online Servis Takibi | Eşli Teknik Konya", "Eşli Teknik servis kaydınızın durumunu online takip edin. Size iletilen takip bağlantısı üzerinden servis sürecini görüntüleyebilirsiniz."],
  "/blog/": ["Blog | Eşli Teknik Konya", "Konya’da sahada karşılaştığımız gerçek beyaz eşya arızaları, bakım rehberleri ve servis sürecinde bilmeniz gerekenler. Yazar: Esad Eşli."],
  "/tum-markalar/": ["Konya Beyaz Eşya Servis Markaları | Eşli Teknik", "Eşli Teknik, Konya’da birçok beyaz eşya ve küçük ev aleti markası için teknik servis desteği sunar."],
  "/sss/": ["Sık Sorulan Sorular | Eşli Teknik Konya", "Eşli Teknik beyaz eşya servisi hakkında sık sorulan sorular, servis süreci, iletişim ve online takip bilgileri."],
  "/iletisim/": ["İletişim | Eşli Teknik Konya", "Eşli Teknik Konya beyaz eşya teknik servisine WhatsApp veya telefon üzerinden ulaşın."],
  "/hakkimizda/": ["Hakkımızda | Eşli Teknik Konya", "Eşli Teknik hakkında bilgi alın. Konya’da beyaz eşya ve küçük ev aletleri için teknik servis desteği."],
  "/kvkk/": ["KVKK | Eşli Teknik", "Eşli Teknik kişisel verilerin korunması ve işlenmesine ilişkin bilgilendirme metni."],
  "/gizlilik-politikasi/": ["Gizlilik Politikası | Eşli Teknik", "Eşli Teknik web sitesi gizlilik politikası ve kişisel verilerin işlenmesine ilişkin bilgiler."],
  "/cerez-politikasi/": ["Çerez Politikası | Eşli Teknik", "Eşli Teknik web sitesinde kullanılan çerezler ve tercihlerin yönetimi hakkında bilgiler."],
};

for (const post of blogPosts) extra[post.slug] = [`${post.title} | Eşli Teknik Blog`, post.description];

const routes: Record<string, [string, string]> = {
  ...extra,
  ...services,
  ...Object.fromEntries(Object.entries(districts).map(([route, title]) => [route, [title, districtGuides[title.split(" Beyaz Eşya")[0]].description]])),
};

function esc(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function jsonLd(title: string, description: string, url: string, route: string) {
  const graph: Record<string, unknown>[] = [
    { "@type": "ProfessionalService", "@id": `${siteUrl}/#business`, name: siteName, url: siteUrl, sameAs: [GOOGLE_BUSINESS_URL], hasMap: GOOGLE_BUSINESS_URL, telephone: "+905511858773", description: defaultDescription, image: `${siteUrl}/favicon.png?v=share-logo-1`, logo: `${siteUrl}/favicon.png?v=share-logo-1`, priceRange: "₺", address: { "@type": "PostalAddress", streetAddress: "Gaziosmanpaşa Mahallesi Menzil Caddesi No:70", addressLocality: "Karatay", addressRegion: "Konya", postalCode: "42020", addressCountry: "TR" }, geo: { "@type": "GeoCoordinates", latitude: 37.85442, longitude: 32.532554 }, openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: "08:00", closes: "22:00" }], areaServed: ["Karatay, Konya", "Meram, Konya", "Selçuklu, Konya"] },
    { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: siteName, inLanguage: "tr-TR" },
    { "@type": "WebPage", "@id": `${url}#webpage`, url, name: title, description, inLanguage: "tr-TR", isPartOf: { "@id": `${siteUrl}/#website` }, about: { "@id": `${siteUrl}/#business` } },
    { "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`, itemListElement: route === "/" ? [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: siteUrl }] : (() => { const post = blogPosts.find(item => item.slug === route); return post ? [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Blog", item: `${siteUrl}/blog/` }, { "@type": "ListItem", position: 3, name: post.title, item: url }] : [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: siteUrl }, { "@type": "ListItem", position: 2, name: route === "/blog/" ? "Blog" : title.replace(" | Eşli Teknik", ""), item: url }]; })() },
  ];

  const brand = brands.find(([slug]) => route === `/${slug}-servisi-konya/`);
  if (brand) {
    const [, brandName] = brand;
    const brandGuide = brandGuides[brandName];
    if (brandGuide) graph.push({ "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: brandGuide.faqs.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) });
    graph.push({ "@type": "Brand", "@id": `${url}#brand`, name: brandName, url });
    graph.push({ "@type": "Service", "@id": `${url}#service`, name: title, description, serviceType: `${brandName} cihaz teknik servisi`, areaServed: ["Karatay", "Meram", "Selçuklu"], provider: { "@id": `${siteUrl}/#business` } });
  } else if (services[route]) {
    graph.push({ "@type": "Service", "@id": `${url}#service`, name: title, description, serviceType: title.replace("Konya ", "").replace(" | Eşli Teknik", ""), areaServed: ["Karatay", "Meram", "Selçuklu"], provider: { "@id": `${siteUrl}/#business` } });
  }

  const blogPost = blogPosts.find(post => post.slug === route);
  if (route === "/blog/") {
    graph.push({ "@type": "Blog", "@id": `${url}#blog`, name: "Eşli Teknik Blog", description, inLanguage: "tr-TR", publisher: { "@id": `${siteUrl}/#business` }, blogPost: blogPosts.map(post => ({ "@type": "BlogPosting", headline: post.title, url: `${siteUrl}${post.slug}`, datePublished: post.published, dateModified: post.updated, author: { "@type": "Person", name: BLOG_AUTHOR.name } })) });
  } else if (blogPost) {
    graph.push({ "@type": "BlogPosting", "@id": `${url}#article`, headline: blogPost.title, description: blogPost.description, articleSection: blogPost.category, image: `${siteUrl}/esli-teknik-konya-hero-background.webp`, datePublished: blogPost.published, dateModified: blogPost.updated, inLanguage: "tr-TR", mainEntityOfPage: { "@id": `${url}#webpage` }, isPartOf: { "@id": `${siteUrl}/blog/#blog` }, author: { "@type": "Person", name: BLOG_AUTHOR.name, jobTitle: "Teknik servis ustası", worksFor: { "@id": `${siteUrl}/#business` } }, publisher: { "@id": `${siteUrl}/#business` } });
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
  const routeServiceFaqs = route.startsWith("/blog/") ? undefined : Object.entries(serviceFaqs).find(([deviceName]) => title.includes(deviceName))?.[1];
  if (routeServiceFaqs) {
    graph.push({ "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: routeServiceFaqs.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) });
  }

  const districtGuide = districts[route] ? districtGuides[districts[route].split(" Beyaz Eşya")[0]] : undefined;
  if (districtGuide?.faqs.length) graph.push({ "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: districtGuide.faqs.map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })) });

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

function faultsHtml(deviceName: string) {
  const guide = deviceFaultGuides[deviceName];
  if (!guide) return "";
  return `<h2>${esc(deviceName)} arızaları: neden olur, ne kontrol edilir?</h2>${guide.faults.map(fault => `<h3>${esc(fault.title)}</h3><p><strong>Olası nedenler:</strong> ${esc(fault.causes)}</p><p><strong>Güvenle kontrol edebilecekleriniz:</strong> ${esc(fault.check)}</p>`).join("")}`;
}

function blogBlockHtml(block: BlogBlock) {
  if (block.type === "h2") return `<h2>${esc(block.text)}</h2>`;
  if (block.type === "p") return `<p>${esc(block.text)}</p>`;
  if (block.type === "list") return `<ul>${block.items.map(item => `<li>${esc(item)}</li>`).join("")}</ul>`;
  if (block.type === "steps") return `<ol>${block.items.map(item => `<li><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></li>`).join("")}</ol>`;
  return `<aside><strong>${esc(block.title)}</strong><p>${esc(block.text)}</p></aside>`;
}

function blogMetaHtml(post: BlogPost) {
  return `<p>Yazar: ${esc(BLOG_AUTHOR.name)} · Yayın: <time datetime="${post.published}">${formatBlogDate(post.published)}</time>${post.updated !== post.published ? ` · Güncelleme: <time datetime="${post.updated}">${formatBlogDate(post.updated)}</time>` : ""}</p>`;
}

function blogIndexHtml() {
  return `<p>Konya’da sahada karşılaştığımız gerçek arızalar, bakım rehberleri ve servis sürecinde bilmeniz gerekenler. Yazılar ${esc(BLOG_AUTHOR.name)} tarafından hazırlanır.</p>${blogPosts.map(post => `<article><p>${esc(post.category)}${post.caseFile ? ` · ${esc(post.caseFile.district)} · ${esc(post.caseFile.brand)}` : ""}</p><h2><a href="${post.slug}">${esc(post.title)}</a></h2><p>${esc(post.excerpt)}</p>${blogMetaHtml(post)}</article>`).join("")}`;
}

function blogPostHtml(post: BlogPost) {
  const url = `${siteUrl}${post.slug}`;
  const share = blogShareLinks(url, post.title);
  const caseFile = post.caseFile ? `<dl><dt>Bölge</dt><dd>${esc(post.caseFile.district)}</dd><dt>Cihaz</dt><dd>${esc(post.caseFile.brand)} ${esc(post.caseFile.device.toLocaleLowerCase("tr-TR"))}</dd><dt>Şikâyet</dt><dd>${esc(post.caseFile.complaint)}</dd><dt>Tespit</dt><dd>${esc(post.caseFile.finding)}</dd><dt>Yapılan işlem</dt><dd>${esc(post.caseFile.action)}</dd></dl>${post.brandPath ? `<p><a href="${post.brandPath}">Konya ${esc(post.caseFile.brand)} servisi</a></p>` : ""}` : "";
  const sources = post.sources ? `<h2>Kaynaklar</h2><ul>${post.sources.map(source => `<li><a href="${source.url}" rel="nofollow">${esc(source.label)}</a></li>`).join("")}</ul>` : "";
  return `<nav aria-label="İçerik yolu"><a href="/">Ana Sayfa</a> › <a href="/blog/">Blog</a> › ${esc(post.category)}</nav>${blogMetaHtml(post)}<article>${caseFile}${post.blocks.map(blogBlockHtml).join("")}${sources}<p>Paylaşın: <a href="${share.whatsapp}">WhatsApp</a> · <a href="${share.facebook}">Facebook</a> · <a href="${share.x}">X</a></p><p><strong>${esc(BLOG_AUTHOR.name)}</strong> — ${esc(BLOG_AUTHOR.bio)}</p><p><a href="${post.servicePath}">${post.device === "Genel" ? "Eşli Teknik iletişim" : `Konya ${esc(post.device)} servisi`}</a></p></article>`;
}

function deviceBlogLinksHtml(deviceName: string) {
  const posts = blogPostsForDevice(deviceName);
  return posts.length ? `<nav aria-label="Blogdan ilgili yazılar"><h2>Sahadan notlar ve rehberler</h2><ul>${posts.map(post => `<li><a href="${post.slug}">${esc(post.title)}</a></li>`).join("")}</ul></nav>` : "";
}

function staticContent(title: string, description: string, route: string) {
  const brand = brands.find(([slug]) => route === `/${slug}-servisi-konya/`);
  const service = services[route];
  const blogPost = blogPosts.find(post => post.slug === route);
  const heading = route === "/" ? "Konya Beyaz Eşya Teknik Servisi" : blogPost ? blogPost.title : route === "/blog/" ? "Eşli Teknik Blog" : title.replace(" | Eşli Teknik", "");
  let sections = `<h2>Konya’da Teknik Servis Desteği</h2><p>EŞLİ TEKNİK, Konya’da Karatay, Meram ve Selçuklu ilçelerinde beyaz eşya ve küçük ev aletleri için teknik servis desteği sunar. Servis talebinizi WhatsApp veya telefon üzerinden iletebilir, servis sürecini online takip edebilirsiniz.</p>`;
  if (route === "/hakkimizda/") {
    sections = `<h2>Konya’da teknik servis desteği</h2><p>EŞLİ TEKNİK; Karatay, Meram ve Selçuklu başta olmak üzere Konya’da beyaz eşya ve küçük ev aletleri için teknik servis desteği sunar. Servis talebinizi WhatsApp veya telefon üzerinden iletebilir, cihaz ve arıza bilgilerinizi paylaşarak doğru yönlendirmeyi alabilirsiniz.</p><h2>Şeffaf ve planlı servis süreci</h2><p>Amacımız yalnızca cihazı onarmak değil; servis planını, inceleme kapsamını ve işlem sonrasını anlaşılır biçimde paylaşmaktır. Uygunluk bilgisi adres ve ekip planına göre netleştirilir.</p><h2>Hizmet bölgemiz</h2><p>Karatay, Meram ve Selçuklu ilçelerinde servis planlaması yapılır. Talebinizde cihazın bulunduğu mahalleyi, marka-model bilgisini ve arıza belirtisini paylaşmanız yönlendirme sürecini hızlandırır.</p><p><a href="/iletisim/">İletişim sayfasına geçin</a> · <a href="/camasir-makinesi-tamiri-konya/">Cihaz servis rehberlerini inceleyin</a></p>`;
  } else if (route === "/") {
    sections += `<nav aria-label="Hızlı servis erişimi"><h2>Hizmet ve servis rehberleri</h2><p><strong>Hizmetlerimiz:</strong> <a href="/camasir-makinesi-tamiri-konya/">Çamaşır Makinesi Tamiri</a> · <a href="/bulasik-makinesi-tamiri-konya/">Bulaşık Makinesi Tamiri</a> · <a href="/buzdolabi-tamiri-konya/">Buzdolabı Tamiri</a> · <a href="/firin-tamiri-konya/">Fırın Tamiri</a> · <a href="/ocak-tamiri-konya/">Ocak Tamiri</a> · <a href="/kurutma-makinesi-tamiri-konya/">Kurutma Makinesi Tamiri</a></p><p><strong>Hizmet bölgelerimiz:</strong> <a href="/karatay/">Karatay</a> · <a href="/meram/">Meram</a> · <a href="/selcuklu/">Selçuklu</a></p><p><strong>Popüler markalar:</strong> <a href="/altus-servisi-konya/">Altus Servisi</a> · <a href="/regal-servisi-konya/">Regal Servisi</a> · <a href="/arcelik-servisi-konya/">Arçelik Servisi</a> · <a href="/beko-servisi-konya/">Beko Servisi</a> · <a href="/bosch-servisi-konya/">Bosch Servisi</a> · <a href="/vestel-servisi-konya/">Vestel Servisi</a></p></nav>`;
  }

  if (service && !brand) {
    const guide = Object.entries(serviceFaqs).find(([deviceName]) => heading.includes(deviceName))?.[1] ?? [[`${heading} için nasıl servis kaydı açabilirim?`, "Cihazın marka-modelini, arıza belirtisini ve bulunduğunuz ilçeyi WhatsApp üzerinden paylaşmanız ilk yönlendirme için yeterlidir."]];
    const deviceName = heading.replace("Konya ", "").replace(" Tamiri", "");
    const safety = deviceName === "Ocak" || deviceName === "Fırın" ? "Gaz kokusu, elektrik kaçağı, yanık kokusu veya cam hasarı varsa cihazı kullanmayın; gaz ve elektrik aksamını sökmeyin." : "Fişi çekmeden cihazın gövdesini veya elektrik aksamını açmayın; kaçak, yanık kokusu veya sigorta attırma varsa cihazı çalıştırmayın.";
    const device = deviceStaticContent[deviceName];
    const faultGuide = deviceFaultGuides[deviceName];
    sections = faultGuide
      ? `${faultsHtml(deviceName)}<h2>İnceleme, süre ve ücret</h2><p>${esc(faultGuide.service)}</p><h2>Beklemeden servis isteyin</h2><p>${esc(faultGuide.urgent)}</p>${deviceBlogLinksHtml(deviceName)}<h2>Sık sorulan sorular</h2>${guide.map(([question, answer]) => `<h3>${esc(question)}</h3><p>${esc(answer)}</p>`).join("")}`
      : `<h2>${esc(heading)} Hizmeti</h2><p>${esc(device?.intro ?? description)} Model, arıza belirtisi, varsa hata kodu ve bulunduğunuz ilçe bilgisi ilk değerlendirmeyi kolaylaştırır.</p><h2>Yaygın belirtiler ve güvenli ilk kontroller</h2><p>${esc(device?.symptoms ?? description)} ${esc(safety)}</p><h2>Servis incelemesinde değerlendirilen başlıklar</h2><p>${esc(device?.parts ?? "Cihazın modeline ve arıza belirtisine göre ilgili parçalar incelenir.")} İşlem kapsamı ve parça ihtiyacı, inceleme sonrasında onayınıza sunulur.</p><h2>Ne zaman servis çağırmalı?</h2><p>${esc(device?.urgent ?? safety)} Konya’da Karatay, Meram ve Selçuklu için cihaz bilgisiyle WhatsApp’tan servis talebi iletebilir, kayıt açıldığında işlem aşamalarını online takip edebilirsiniz.</p><h2>Sık sorulan sorular</h2>${guide.map(([question, answer]) => `<h3>${esc(question)}</h3><p>${esc(answer)}</p>`).join("")}`;
  } else if (brand) {
    const [, brandName] = brand;
    const deviceLinks = brandDeviceLinks[brandName] ?? []; const brandGuide = brandGuides[brandName]; sections = brandGuide ? `<h2>${esc(brandName)} Servisi Konya</h2><p>${esc(brandGuide.intro)}</p><h2>${esc(brandName)} cihazlarında bilmeniz gerekenler</h2>${brandGuide.notes.map(note => `<h3>${esc(note.title)}</h3><p>${esc(note.text)}</p>`).join("")}${deviceLinks.length ? `<nav aria-label="Marka cihaz rehberleri"><h2>${esc(brandName)} Cihaz Rehberleri</h2><p>${deviceLinks.map(([label, href]) => `<a href="${href}">${esc(label)}</a>`).join(" · ")}</p></nav>` : ""}<h2>Sık sorulan sorular</h2>${brandGuide.faqs.map(([question, answer]) => `<h3>${esc(question)}</h3><p>${esc(answer)}</p>`).join("")}<p>EŞLİ TEKNİK bağımsız bir teknik servistir; üreticilerin resmî yetkili servisi değildir. Üretici garantisi devam eden cihazlarınız için üreticinin kendi servis ağına da başvurabilirsiniz.</p>` : `<h2>${esc(brandName)} Servisi Konya</h2><p>EŞLİ TEKNİK, ${esc(brandName)} marka cihazlarda doğru yönlendirme için önce cihaz türü, model ve belirti bilgisini netleştirir. Aynı belirti farklı cihazlarda farklı nedenlerden kaynaklanabileceği için aşağıdaki cihaz rehberlerinden uygun olanı seçin.</p><nav aria-label="Marka cihaz rehberleri"><h2>${esc(brandName)} Cihaz Rehberleri</h2><p>${deviceLinks.map(([label, href]) => `<a href="${href}">${esc(label)}</a>`).join(" · ")}</p></nav><p>Cihaz türü netleşmeden parça veya teknik müdahale önerilmez. Yanık kokusu, su/gaz kaçağı veya sigorta attırma varsa cihazı kullanmayın ve servis desteği alın.</p>`;
  } else if (route === "/tum-markalar/") {
    sections = `<h2>Konya’da Servis Verilen Markalar</h2><p>Eşli Teknik; ${brands.map(([, name]) => esc(name)).join(", ")} ve listede yer alan diğer marka ve model cihazlar için teknik servis desteği sunar.</p><h2>Servis Talebi</h2><p>Cihaz markası, modeli ve arıza bilgisini WhatsApp üzerinden paylaşarak servis süreci hakkında bilgi alabilirsiniz.</p>`;
  } else if (districts[route]) {
    const district = title.split(" Beyaz Eşya")[0];
    const guide = districtGuides[district];
    const neighborhoods = districtNeighborhoods[district] ?? [];
    const cases = blogPosts.filter(post => post.caseFile?.district.startsWith(district));
    sections = `<p>${esc(guide.intro)}</p>${guide.notes.length ? `<h2>${esc(district)}’da karşılaştığımız durumlar</h2>${guide.notes.map(note => `<h3>${esc(note.title)}</h3><p>${esc(note.text)}</p>`).join("")}` : ""}${cases.length ? `<h2>${esc(district)}’dan son işlerimiz</h2><ul>${cases.map(post => `<li><a href="${post.slug}">${esc(post.title)}</a></li>`).join("")}</ul>` : ""}<section aria-labelledby="district-neighborhoods-title"><h2 id="district-neighborhoods-title">Hizmet Verdiğimiz Mahalleler</h2><p>${neighborhoods.map((neighborhood, index) => `<span>${String(index + 1).padStart(2, "0")} ${esc(neighborhood)}</span>${index < neighborhoods.length - 1 ? " · " : ""}`).join("")}</p></section>${guide.faqs.length ? `<h2>${esc(district)} hakkında sık sorulanlar</h2>${guide.faqs.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}` : ""}`;
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
  if (route === "/blog/") sections = blogIndexHtml();
  else if (blogPost) sections = blogPostHtml(blogPost);
  const staticHero = route === "/" ? `<img class="seo-hero-image" src="/esli-teknik-konya-hero-background.webp" width="1920" height="1080" alt="Konya Eşli Teknik beyaz eşya servis hizmeti" fetchpriority="high" decoding="async" />` : service ? `<img class="seo-hero-image" src="/esli-teknik-konya-hero-background.webp" width="1920" height="1080" alt="${esc(heading)}" loading="lazy" decoding="async" />` : brand ? `<img class="seo-hero-image" src="/esli-teknik-konya-hero-background.webp" width="1920" height="1080" alt="${esc(heading)}" loading="lazy" decoding="async" />` : districts[route] ? `<img class="seo-hero-image" src="/esli-teknik-konya-hero-background.webp" width="1920" height="1080" alt="${esc(heading)}" loading="lazy" decoding="async" />` : "";
  const staticContact = `<section class="static-business-contact" aria-labelledby="static-business-contact-title"><div><span class="section-kicker">EŞLİ TEKNİK İLETİŞİM</span><h2 id="static-business-contact-title">Konya’da servis desteği için<br/><em>doğrudan ulaşın.</em></h2><p>Karatay, Meram ve Selçuklu başta olmak üzere Konya’da beyaz eşya ve küçük ev aletleri teknik servis desteği sunuyoruz.</p></div><address><p><strong>Adres</strong><br/>Gaziosmanpaşa Mahallesi Menzil Caddesi No:70, Karatay / Konya</p><p><strong>Telefon</strong><br/><a href="tel:+905511858773">0551 185 87 73</a></p><p><strong>Çalışma saatleri</strong><br/>Her gün 08:00–22:00</p><a class="static-business-map" href="${GOOGLE_BUSINESS_URL}">Adresi haritada açın</a></address></section>`;
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
  html = html.replace(/<meta property="og:image" content="[^"]*"\s*\/>/, `<meta property="og:image" content="${siteUrl}/favicon.png?v=share-logo-1" />`);
  html = html.replace(/<meta name="twitter:image" content="[^"]*"\s*\/>/, `<meta name="twitter:image" content="${siteUrl}/favicon.png?v=share-logo-1" />`);
  html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${url}" />`);
  if (route.startsWith("/blog/") && route !== "/blog/") html = html.replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="article" />');
  if (!html.includes('property="og:url"')) html = html.replace("</head>", `<meta property="og:url" content="${url}" />\n  </head>`);
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${jsonLd(title, description, url, route)}</script>`);
  html = html.replace('<div id="root"></div>', `<div id="root">${staticContent(title, description, route)}</div>`);

  const targetDir = route === "/" ? outputDir : path.join(outputDir, route.replace(/^\//, "").replace(/\/$/, ""));
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, "index.html"), html, "utf8");
}

console.log(`SEO prerender complete: ${Object.keys(routes).length} routes`);

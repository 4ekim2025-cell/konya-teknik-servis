export type BrandContent = {
  heading: string;
  intro: string;
  focus: string;
  faq: [string, string];
};

/**
 * Marka sayfalarında ortak şablonun ötesine geçen, modelden modele değişebilen
 * özellikler hakkında temkinli ve servis talebine dönük özgün içerikler.
 */
export const brandContent: Record<string, BrandContent> = {
  Altus: {
    heading: "Altus cihazlarda pratik arıza ön değerlendirmesi",
    intro: "Altus çamaşır makinesi, bulaşık makinesi ve buzdolabı servis taleplerinde cihazın tam modeliyle birlikte arızanın ne zaman başladığı önemlidir. Su alma, programın yarıda kalması, soğutma performansının düşmesi veya alışılmadık ses gibi belirtiler ilk değerlendirmeye yön verir.",
    focus: "Altus cihazınız için servis planlarken kullanım alışkanlığını, son bakım zamanını ve varsa ekrandaki uyarıyı paylaşın; modelden modele değişebilen parça ve işlem seçenekleri inceleme sonrasında netleştirilir.",
    faq: ["Altus cihazımda hangi bilgileri paylaşmalıyım?", "Cihazın tam modelini, görülen belirtiyi, arızanın ne zamandır devam ettiğini ve Konya’daki ilçenizi yazmanız ön değerlendirme için yeterlidir."]
  },
  "Arçelik": {
    heading: "Arçelik servis talebinde model ve belirti birlikte değerlendiriliyor",
    intro: "Arçelik beyaz eşya servisinde aynı belirti farklı model serilerinde farklı nedenlerle ortaya çıkabilir. Bu nedenle çamaşır, bulaşık ve kurutma makinelerinde program davranışı; buzdolabında soğutma, ses ve buzlanma durumu; fırın veya ocakta ısıtma ve ateşleme belirtisi birlikte ele alınır.",
    focus: "Arçelik cihazınızın panelindeki hata kodunu silmeden önce not edin. Fotoğraf, kısa video ve model etiketi bilgisi servis görüşmesini daha anlaşılır hale getirir.",
    faq: ["Arçelik cihazımın hata kodunu paylaşmalı mıyım?", "Evet. Hata kodunu, hangi programda çıktığını ve cihazın çalışmaya devam edip etmediğini yazmanız doğru servis yönlendirmesine yardımcı olur."]
  },
  Arnica: {
    heading: "Arnica süpürge servisinde çekiş ve motor belirtileri",
    intro: "Arnica servis sayfasında özellikle elektrikli süpürgelerde çekiş azalması, motor sesinin değişmesi, koku ve çalışma kesintisi gibi belirtilere odaklanıyoruz. Sorunun filtre, hazne, hortum, başlık veya elektrik aksamıyla ilişkisi model incelemesiyle ayrıştırılır.",
    focus: "Arnica süpürgenizde filtre ve toz haznesi temiz olduğu halde performans düşüyorsa cihazı zorlamadan model bilgisini paylaşın; ısınma veya yanık kokusu varsa kullanıma ara verin.",
    faq: ["Arnica süpürgem çekmiyorsa önce neyi kontrol etmeliyim?", "Filtreyi, toz haznesini, hortumu ve başlıkta tıkanıklık olup olmadığını kullanım kılavuzuna uygun şekilde kontrol edin. Sorun sürerse model bilgisiyle servis talebi oluşturun."]
  },
  Beko: {
    heading: "Beko beyaz eşya arızalarında cihaz grubuna göre servis planı",
    intro: "Beko çamaşır, bulaşık, buzdolabı ve fırın-ocak cihazlarında servis ihtiyacını cihaz grubuna göre ele alıyoruz. Su boşaltmama, yıkama performansı, soğutmama, ısıtmama ve ateşleme sorunlarında belirtiyle birlikte program veya kullanım koşulunun yazılması önem taşır.",
    focus: "Beko cihazınızda arıza tekrarlıyorsa yalnızca hata kodunu değil, arızanın hangi aşamada oluştuğunu da belirtin. Böylece servis kaydı daha sonra takip edilebilir bir teknik özet haline gelir.",
    faq: ["Beko cihazım programı tamamlamıyorsa ne yazmalıyım?", "Program adı veya süresi, cihazın hangi adımda kaldığı, içeride su ya da ısı durumu ve varsa hata kodunu paylaşın."]
  },
  Bosch: {
    heading: "Bosch cihazlarda program, sensör ve performans belirtileri",
    intro: "Bosch servis taleplerinde cihazın programı hangi aşamada durdurduğu, ekranda uyarı bulunup bulunmadığı ve performans değişiminin ne zaman başladığı önemli ipuçlarıdır. Çamaşır, bulaşık, kurutma ve buzdolabı grubunda bu bilgiler farklı kontrol noktalarının önceliklendirilmesine yardımcı olur.",
    focus: "Bosch model etiketi üzerindeki bilgileri okunaklı bir fotoğrafla paylaşın. Parça uyumluluğu ve işlem kapsamı, yalnızca marka adına göre değil, cihazın tam modeline göre değerlendirilir.",
    faq: ["Bosch servisinde model numarası neden gerekli?", "Aynı ürün grubunda farklı model serileri farklı parça ve kontrol düzenlerine sahip olabilir. Model numarası doğru ön değerlendirme için gereklidir."]
  },
  Electrolux: {
    heading: "Electrolux cihazlarda kullanım programı ve arıza geçmişi",
    intro: "Electrolux çamaşır, bulaşık, kurutma ve buzdolabı cihazlarında servis planı yapılırken seçilen program, yük miktarı, sıcaklık davranışı ve arızanın tekrarlanma biçimi dikkate alınır. Performans kaybı ile birlikte ses, su ve ısı belirtileri ayrı ayrı not edilir.",
    focus: "Electrolux cihazınızın arızası belirli bir programda ortaya çıkıyorsa program adını yazın. Bu ayrıntı, genel bir çalışmama şikâyetinden daha açıklayıcı bir servis kaydı oluşturur.",
    faq: ["Electrolux cihazım yalnızca bir programda sorun çıkarıyorsa servis gerekir mi?", "Sorun tekrarlanıyorsa program adını ve belirtiyi paylaşmanız gerekir. Model ve kullanım koşulları incelenerek servis gereksinimi değerlendirilir."]
  },
  Franke: {
    heading: "Franke ankastre cihazlarda ısıtma ve davlumbaz kontrolü",
    intro: "Franke servis sayfasında ankastre fırın, ocak ve davlumbaz cihazlarında ısıtma, ateşleme, düğme, fan, çekiş ve aydınlatma belirtilerini ayrı başlıklarda ele alıyoruz. Ankastre ürünlerde cihazın montaj şekli ve erişim koşulları servis planlamasında ayrıca önem taşıyabilir.",
    focus: "Franke cihazınız için talep oluştururken ürünün fırın, ocak veya davlumbaz olduğunu; elektrik, gaz, ısıtma ya da çekiş belirtisinin hangisi olduğunu açıkça belirtin.",
    faq: ["Franke ankastre cihazlarda servis öncesi ne hazırlamalıyım?", "Cihazın modelini, arızanın türünü ve montajın erişilebilir olup olmadığını paylaşın. Gazla ilgili bir belirti varsa güvenlik için cihazı kullanmaya devam etmeyin."]
  },
  Hoover: {
    heading: "Hoover çamaşır ve kurutma makinelerinde program davranışı",
    intro: "Hoover servis taleplerinde tamburun dönmesi, ısıtma süresi, çamaşırların nemli kalması, su alma-boşaltma ve panel uyarıları birlikte değerlendirilir. Aynı belirti farklı cihaz serilerinde farklı kontrol adımları gerektirebileceği için tam model bilgisi önemlidir.",
    focus: "Hoover kurutma veya çamaşır makinesinde filtre ve hazne uyarısı varsa bakım adımlarını kılavuza göre uygulayın; uyarı devam ederse arıza belirtisini ve son temizlik zamanını paylaşın.",
    faq: ["Hoover kurutma makinem uzun çalışıyor ama çamaşırlar nemli kalıyor, ne yapmalıyım?", "Filtre ve hava akışını kılavuza uygun kontrol edin. Sorun devam ederse programı, yükü, model bilgisini ve ısıtma belirtisini servis talebine ekleyin."]
  },
  Kumtel: {
    heading: "Kumtel fırın, ocak ve davlumbaz için belirti odaklı servis",
    intro: "Kumtel servis taleplerinde fırın ve ocakta ısıtma, termostat, düğme ve ateşleme; davlumbazda ise motor, filtre, çekiş ve aydınlatma belirtileri öne çıkar. Ankastre veya set üstü kullanım bilgisi, servis planının doğru kurulmasına yardımcı olur.",
    focus: "Kumtel cihazınızda gaz kokusu, kıvılcımın kesilmemesi veya kablo ısınması gibi güvenlik belirtisi varsa cihazı kapatın ve güvenli koşullarda destek isteyin; arızayı zorlayarak test etmeyin.",
    faq: ["Kumtel ocakta ateşleme sürekli devam ediyorsa kullanmalı mıyım?", "Hayır. Güvenlik için cihazı kapatın, gaz ve elektrik koşullarını kontrol edin ve belirtiyi model bilgisiyle birlikte servis talebine yazın."]
  },
  Philips: {
    heading: "Philips küçük ev aletlerinde motor, filtre ve güç sorunları",
    intro: "Philips servis sayfasında elektrikli süpürge ve küçük ev aletlerinde çekiş, motor sesi, güç kaybı, şarj, batarya, filtre ve aşırı ısınma belirtilerini ayırarak ele alıyoruz. Ürünün kablolu, kablosuz veya şarjlı olması ilk servis değerlendirmesini etkileyebilir.",
    focus: "Philips ürününüzün seri veya model bilgisini, kullanım süresini ve sorunun şarjdan sonra mı yoksa çalışma sırasında mı oluştuğunu paylaşın.",
    faq: ["Philips şarjlı süpürgem çalışmıyorsa hangi bilgileri göndermeliyim?", "Modeli, şarj göstergesinin davranışını, adaptörün tepki verip vermediğini ve bataryanın kullanım süresindeki değişimi yazın."]
  },
  Profilo: {
    heading: "Profilo beyaz eşya servisinde su, program ve soğutma belirtileri",
    intro: "Profilo çamaşır, bulaşık ve buzdolabı servis taleplerinde su alma-boşaltma, programın tamamlanmaması, yıkama performansı, soğutma ve buzlanma belirtileri üzerinden ilerliyoruz. Cihazın yaşı ve son görülen değişiklikler de ön değerlendirmeye katkı sağlar.",
    focus: "Profilo cihazınızda arıza başlamadan önce taşınma, elektrik kesintisi, temizlik veya program değişikliği olduysa bunu servis kaydında belirtin.",
    faq: ["Profilo buzdolabım ses yapıyor ama soğutuyor, servis çağırmalı mıyım?", "Sesin sürekli mi aralıklı mı olduğunu, ne zaman başladığını ve soğutma performansında değişiklik bulunup bulunmadığını paylaşın. Değerlendirme bu bilgilerle yapılır."]
  },
  Rowenta: {
    heading: "Rowenta süpürgelerde çekiş, başlık ve güç akışı",
    intro: "Rowenta servis taleplerinde süpürgenin çekiş gücü, başlıkta tıkanma, motor sesi, kablo veya şarj davranışı ve ısınma belirtileri ayrı ayrı değerlendirilir. Dikey, robot veya kablolu ürün tipini belirtmek servis yönlendirmesini kolaylaştırır.",
    focus: "Rowenta cihazınızda filtre temizliğinden sonra da çekiş düzelmiyorsa ürünü uzun süre zorlamayın. Model ve başlık türünü paylaşarak uygun teknik inceleme talep edin.",
    faq: ["Rowenta süpürgemin başlığı dönmüyorsa sorun nerede olabilir?", "Başlıkta tıkanıklık, fırça çevresinde birikinti ve bağlantı noktalarını kılavuza uygun kontrol edin. Sorun devam ederse model ve başlık bilgisiyle servis kaydı açın."]
  },
  Samsung: {
    heading: "Samsung beyaz eşya servisinde ekran uyarıları ve program takibi",
    intro: "Samsung çamaşır, bulaşık ve buzdolabı cihazlarında ekran uyarıları, programın hangi aşamada durduğu, sıcaklık veya soğutma değişimi ve normal dışı sesler birlikte incelenir. Akıllı özellik bulunan modellerde uygulamadaki uyarı metni de servis kaydına eklenebilir.",
    focus: "Samsung cihazınızın ekranındaki kodu veya simgeyi fotoğraflayın; cihazın model koduyla birlikte paylaşmanız, genel bir arıza tanımı yerine izlenebilir bir teknik kayıt oluşturur.",
    faq: ["Samsung cihazımda ekranda bir kod görünüyor, fotoğraf yeterli olur mu?", "Fotoğraf yararlıdır; ayrıca kodun ne zaman çıktığını, cihazın hangi programda olduğunu ve çalışmaya devam edip etmediğini yazın."]
  },
  Siemens: {
    heading: "Siemens cihazlarda model koduna göre parça ve işlem değerlendirmesi",
    intro: "Siemens çamaşır, bulaşık ve buzdolabı servis sayfasında cihazın model kodu, program aşaması, su davranışı, yıkama veya soğutma performansı ve hata uyarıları birlikte ele alınır. Teknik değerlendirme, marka adına göre varsayım yapmak yerine cihazın belirtilerine göre ilerler.",
    focus: "Siemens cihazınız için model etiketi, hata ekranı ve arızanın tekrar koşulunu paylaşın. Parça ihtiyacı ve onarım kapsamı yerinde inceleme sonrasında netleştirilir.",
    faq: ["Siemens cihazımda hata kodu kaybolduysa yine de paylaşmalı mıyım?", "Evet. Kodu hatırlıyorsanız, ne zaman çıktığını ve hangi işlemden sonra kaybolduğunu yazın; mevcut belirtilerle birlikte değerlendirilir."]
  },
  Silverline: {
    heading: "Silverline ankastre ürünlerde davlumbaz ve ısıtma desteği",
    intro: "Silverline servis taleplerinde davlumbazın çekişi, motor sesi, filtre ve aydınlatma; fırın ve ocakta ise ısıtma, fan, ateşleme ve düğme belirtileri öne çıkar. Ankastre ürünün montaj konumu ve ürün tipinin doğru yazılması planlamayı kolaylaştırır.",
    focus: "Silverline davlumbazda çekiş azalması varsa filtre temizliğinin ne zaman yapıldığını ve koku tahliyesinin nasıl kurulduğunu belirtin; fırın veya ocakta ısı ve elektrik belirtilerini ayrı yazın.",
    faq: ["Silverline davlumbazım çalışıyor ama çekmiyor, hangi bilgileri göndereyim?", "Modeli, çekişin ne zaman azaldığını, filtre durumunu, motor sesini ve dışarı atış bağlantısının mevcut olup olmadığını paylaşın."]
  },
  "Şenocak": {
    heading: "Şenocak soğutma cihazlarında sıcaklık ve buzlanma takibi",
    intro: "Şenocak servis sayfasında derin dondurucu ve su sebili cihazlarında soğutma, dondurma, su akışı, sıcaklık değişimi, buzlanma ve motor sesi belirtilerini ayrı ayrı ele alıyoruz. Cihazın ne kadar süredir çalıştığı ve sıcaklık değişiminin ne zaman başladığı önemlidir.",
    focus: "Şenocak derin dondurucuda gıdalar çözülmeye başladıysa kapağı gereksiz açmayın; cihazın iç sıcaklığı, buzlanma durumu ve motor sesini not ederek servis talebine ekleyin.",
    faq: ["Şenocak derin dondurucum dondurmuyorsa cihazı boşaltmalı mıyım?", "Gıdaların güvenliği için uygun koşulları değerlendirin; cihazı zorlayarak çalıştırmayın. Sıcaklık, buzlanma ve ses belirtilerini model bilgisiyle paylaşın."]
  },
  Teka: {
    heading: "Teka ankastre fırın ve ocaklarda güvenli arıza bildirimi",
    intro: "Teka servis taleplerinde fırının ısıtma ve fan davranışı, ocakta ateşleme ve düğme tepkisi, davlumbazda motor ve çekiş performansı değerlendirilir. Ankastre ürünlerde model ve montaj bilgisi, servis öncesi hazırlığın doğru yapılmasına yardım eder.",
    focus: "Teka fırın veya ocakta ısıtma ve ateşleme sorunu varsa cihazı art arda denemek yerine belirtiyi, ürün tipini ve varsa hata ekranını paylaşın.",
    faq: ["Teka fırınım ısınıyor fakat eşit pişirmiyor, ne yazmalıyım?", "Kullanılan programı, sıcaklık ayarını, fanın çalışıp çalışmadığını ve sorunun hangi yiyeceklerde belirginleştiğini yazın."]
  },
  "Uğur Soğutma": {
    heading: "Uğur Soğutma cihazlarında dondurma ve sıcaklık belirtileri",
    intro: "Uğur Soğutma servis sayfasında derin dondurucu ve su sebili cihazlarında hedef sıcaklığa ulaşma, dondurma performansı, buzlanma, su akışı ve motor sesi gibi belirtiler üzerinden ilerliyoruz. Cihazın kullanım ortamı ve yük durumu da değerlendirmeye yardımcı olur.",
    focus: "Uğur Soğutma cihazınızda sıcaklık yükselmesi varsa kapak contası, havalandırma alanı ve ses değişikliğini gözlemleyin; cihazı aşırı yüklemeden model bilgisiyle başvurun.",
    faq: ["Uğur Soğutma derin dondurucum çok buzlanıyor, bu normal mi?", "Buzlanmanın yerini ve ne kadar sürede oluştuğunu, kapağın kapanma durumunu ve soğutma performansını paylaşın. Model bilgisiyle teknik değerlendirme yapılır."]
  },
  Vestel: {
    heading: "Vestel cihazlarda ekran kodu ve program aşaması takibi",
    intro: "Vestel çamaşır, bulaşık, kurutma ve buzdolabı servis taleplerinde ekran uyarıları, programın durduğu aşama, su ve ısı davranışı, kurutma performansı ve soğutma değişimleri birlikte ele alınır. Belirtinin hangi kullanım sonrasında ortaya çıktığı servis planı için değerlidir.",
    focus: "Vestel cihazınızın model etiketini, hata kodunu ve arızanın tekrar edip etmediğini paylaşın. Gerekli işlem ve parça değerlendirmesi yerinde inceleme sonrasında netleştirilir.",
    faq: ["Vestel cihazımda program yarıda kalıyor; servis talebine ne eklemeliyim?", "Programın adını, hangi aşamada durduğunu, içeride su veya ısı bulunup bulunmadığını ve varsa hata kodunu yazın."]
  }
};

/**
 * Eşli Teknik blog yazıları — blog listesi, yazı sayfaları (React) ve önceden render edilen SEO HTML'i
 * (scripts/prerender.ts) bu tek kaynaktan beslenir.
 *
 * Kurallar: İnternetten alınan deneyimler kaynağıyla özetlenir, Eşli Teknik müşterisi gibi sunulmaz.
 * "Ustanın Defterinden" yazıları yalnızca Esad Eşli'nin anlattığı gerçek işlere dayanır; ayrıntı uydurulmaz.
 * Fiyat, hukuki konu, tazminat süreci ve doğrulanamayan istatistik yazılmaz.
 */

export type BlogCategory = "Ustanın Defterinden" | "Bakım Rehberi" | "Karar Rehberi" | "Tüketici Rehberi";
export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: { title: string; text: string }[] }
  | { type: "note"; title: string; text: string };
export type BlogCaseFile = { district: string; brand: string; device: string; complaint: string; finding: string; action: string };
export type BlogSource = { label: string; url: string };
export type BlogPost = {
  slug: string;
  category: BlogCategory;
  title: string;
  description: string;
  excerpt: string;
  published: string;
  updated: string;
  device: string;
  servicePath: string;
  caseFile?: BlogCaseFile;
  /** Usta vakasında markanın sitedeki servis sayfası (iç bağlantı). */
  brandPath?: string;
  blocks: BlogBlock[];
  sources?: BlogSource[];
};

export const BLOG_AUTHOR = {
  name: "Esad Eşli",
  role: "Teknik servis ustası, Eşli Teknik",
  bio: "Esad Eşli, Eşli Teknik’in teknik servis ustasıdır. Bu yazılar, Karatay, Meram ve Selçuklu’da sahada karşılaştığı arızalardan ve müşterilerin en sık sorduğu sorulardan yola çıkarak hazırlanır.",
};

export const blogCategories: BlogCategory[] = ["Ustanın Defterinden", "Bakım Rehberi", "Karar Rehberi", "Tüketici Rehberi"];

export const blogPosts: BlogPost[] = [
  {
    slug: "/blog/camasir-makinesi-kirli-yikiyor-rezistans-kirec/",
    category: "Ustanın Defterinden",
    title: "Yazır’da kirli yıkayan Arçelik çamaşır makinesi: sorun deterjanda değil, kireçte çıktı",
    description: "Selçuklu Yazır’da çamaşırları kirli yıkayan Arçelik makinede suyun ısınmadığını, nedeninin kireç tutmuş rezistans olduğunu anlatıyoruz.",
    excerpt: "Şikâyet kirli yıkamaydı; inceleme sonunda makinenin suyu hiç ısıtmadığı, rezistansın ise kireç yüzünden yandığı ortaya çıktı.",
    published: "2026-09-27",
    updated: "2026-09-27",
    device: "Çamaşır Makinesi",
    servicePath: "/camasir-makinesi-tamiri-konya/",
    caseFile: { district: "Selçuklu · Yazır", brand: "Arçelik", device: "Çamaşır makinesi", complaint: "Çamaşırlar kirli çıkıyor", finding: "Su ısınmıyor; ısıtıcı rezistans kireç tutmuş ve yanmış", action: "Rezistans değiştirildi" },
    brandPath: "/arcelik-servisi-konya/",
    blocks: [
      { type: "p", text: "Yazır’daki müşterimiz, Arçelik çamaşır makinesinin çamaşırları eskisi gibi temiz yıkamadığını söyleyerek bize ulaştı. Böyle bir şikâyette akla ilk gelen deterjan, program seçimi ya da makinenin fazla doldurulmasıdır. Bu yüzden inceleme her zaman en basit ihtimallerden başlar." },
      { type: "h2", text: "İnceleme: makine suyu hiç ısıtmıyordu" },
      { type: "p", text: "Yıkama sırasında yaptığımız kontrolde makinenin su alıp tamburu döndürdüğünü, ancak suyu ısıtmadığını gördük. Yüksek sıcaklıklı bir program seçilse bile su soğuk kalıyordu. Deterjanlar ve özellikle yağlı lekeler belirli bir sıcaklığın altında yeterince çözülmediği için çamaşırlar kirli çıkıyordu." },
      { type: "p", text: "Isıtıcı rezistansı kontrol ettiğimizde yüzeyinin kalın bir kireç tabakasıyla kaplandığını ve rezistansın yandığını tespit ettik. Rezistans değiştirildi ve makine suyu yeniden ısıtmaya başladı." },
      { type: "h2", text: "Kireç rezistansı neden yakar?" },
      { type: "p", text: "Rezistans, ürettiği ısıyı çevresindeki suya aktararak soğur. Kireç tabakası rezistansın üzerini bir yalıtım katmanı gibi kaplar; ısı suya geçemez ve rezistans kendi ısısında aşırı ısınır. Bir süre sonra rezistans yanar. Konya şebeke suyu üzerine yapılan akademik çalışmalarda sertlik değerleri genellikle 30–45 °F (Fransız sertliği) aralığında ölçülüyor; bu, sert su sınıfına girer. Bu yüzden sahada rezistans ve su giriş süzgeçlerinde kireç birikimiyle sık karşılaşıyoruz." },
      { type: "h2", text: "Bu arızayı önceden fark etmek mümkün mü?" },
      { type: "list", items: ["Beyazlar giderek grileşiyor, sıcak programda bile lekeler çıkmıyorsa", "Aynı programın süresi belirgin biçimde uzamışsa", "Tamburun içinde, kazanın dibinde beyaz kireç parçacıkları görülüyorsa"] },
      { type: "p", text: "Bu belirtiler her zaman rezistans arızası anlamına gelmez; ancak su ısıtma tarafının kontrol edilmesi gerektiğini gösterir." },
      { type: "h2", text: "Kireçli suda makineyi korumak için" },
      { type: "list", items: ["Kullanım kılavuzunda önerilen tambur temizleme veya kireç çözme programını düzenli çalıştırın.", "Kireç önleyici ürün kullanıyorsanız dozunu üreticinin tavsiyesine göre ayarlayın.", "Deterjanı fazla koymayın; artan köpük ve kalıntı da tortu birikimini artırır."] },
      { type: "note", title: "Ustanın notu", text: "Kirli yıkama şikâyetinde deterjanı değiştirmeden önce suyun ısınıp ısınmadığına bakmak gerekir. Isıtma yoksa sorun deterjanda değil, makinededir." },
    ],
  },
  {
    slug: "/blog/beko-camasir-makinesi-su-almiyor-basinc-anahtari/",
    category: "Ustanın Defterinden",
    title: "Karatay’da su almayan Beko çamaşır makinesi: arıza basınç anahtarındaydı",
    description: "Karatay’da su almayan Beko çamaşır makinesinde arızanın basınç anahtarında çıkmasını ve bu parçanın ne işe yaradığını anlatıyoruz.",
    excerpt: "Musluk açık, hortum sağlamdı; makine yine de su almıyordu. Sorun, tamburdaki su seviyesini algılayan basınç anahtarındaydı.",
    published: "2026-09-27",
    updated: "2026-09-27",
    device: "Çamaşır Makinesi",
    servicePath: "/camasir-makinesi-tamiri-konya/",
    caseFile: { district: "Karatay", brand: "Beko", device: "Çamaşır makinesi", complaint: "Makine su almıyor", finding: "Basınç anahtarı arızalı", action: "Basınç anahtarı değiştirildi" },
    brandPath: "/beko-servisi-konya/",
    blocks: [
      { type: "p", text: "Karatay’dan gelen servis talebinde Beko çamaşır makinesinin program başlatıldığında su almadığı belirtiliyordu. Bu belirtide önce kullanıcı tarafındaki basit nedenler elenir: musluk açık mı, giriş hortumu kıvrılmış mı, hortumdaki süzgeç kireçle tıkanmış mı?" },
      { type: "h2", text: "Tespit: basınç anahtarı" },
      { type: "p", text: "Su girişi tarafında bir sorun olmadığını gördükten sonra makinenin su seviyesini algılayan basınç anahtarını kontrol ettik ve arızalı olduğunu tespit ettik. Basınç anahtarı değiştirildi, makine yeniden su almaya başladı." },
      { type: "h2", text: "Basınç anahtarı ne işe yarar?" },
      { type: "p", text: "Basınç anahtarı, kazanın altından gelen ince bir hortumdaki hava basıncını ölçerek tamburda ne kadar su olduğunu makineye bildirir. Makine su almayı, ısıtmaya geçmeyi ve suyu boşaltmayı bu bilgiye göre yönetir. Anahtar yanlış bilgi verdiğinde makine tamburun zaten dolu olduğunu sanabilir ve su almaz; tersi durumda ise sürekli su almaya devam edebilir." },
      { type: "h2", text: "Servis çağırmadan önce kontrol edebilecekleriniz" },
      { type: "steps", items: [
        { title: "Musluğu kontrol edin", text: "Musluğun sonuna kadar açık olduğundan ve evin diğer musluklarında su bulunduğundan emin olun." },
        { title: "Hortumu gözden geçirin", text: "Giriş hortumunun makinenin arkasında ezilmediğini ve kıvrılmadığını kontrol edin." },
        { title: "Kapağı yeniden kapatın", text: "Kapak kilidi kapalı olduğunu algılamazsa makine su almaz; kapağı sıkıca kapatıp programı yeniden başlatın." },
      ] },
      { type: "p", text: "Bu kontroller sorunu çözmüyorsa arıza su giriş ventili, basınç anahtarı veya kontrol kartı gibi parçalarda olabilir. Bu parçaların teşhisi için makinenin açılması gerektiğinden kullanıcı müdahalesi önerilmez." },
      { type: "note", title: "Ustanın notu", text: "Aynı belirti çok farklı parçalardan kaynaklanabilir. Parça değiştirmeden önce hangisinin arızalı olduğunu ölçerek bulmak, gereksiz masrafın önüne geçer." },
    ],
  },
  {
    slug: "/blog/bosch-bulasik-makinesi-kirli-yikiyor-puskurtme-kollari/",
    category: "Ustanın Defterinden",
    title: "Selçuklu’da kirli yıkayan Bosch bulaşık makinesi: parça değil, temizlik yetti",
    description: "Selçuklu’da kirli yıkayan Bosch bulaşık makinesinde tıkalı püskürtme kolları ve gider filtresinin temizlenmesiyle sorunun nasıl çözüldüğünü anlatıyoruz.",
    excerpt: "Bulaşıklar kirli çıkıyordu ama hiçbir parça arızalı değildi. Püskürtme kollarındaki tıkalı delikler yeterli suyun ulaşmasını engelliyordu.",
    published: "2026-09-27",
    updated: "2026-09-27",
    device: "Bulaşık Makinesi",
    servicePath: "/bulasik-makinesi-tamiri-konya/",
    caseFile: { district: "Selçuklu", brand: "Bosch", device: "Bulaşık makinesi", complaint: "Bulaşıklar temiz yıkanmıyor", finding: "Püskürtme kollarının bazı delikleri yemek artığıyla tıkalı", action: "Püskürtme kolları ve gider filtresi temizlendi; parça değişmedi" },
    brandPath: "/bosch-servisi-konya/",
    blocks: [
      { type: "p", text: "Selçuklu’daki müşterimizin Bosch bulaşık makinesi bulaşıkları kirli bırakıyordu. Bu şikâyetle gittiğimizde pompadan rezistansa kadar birçok ihtimali değerlendiririz; ancak bu evde sorunun kaynağı çok daha basitti." },
      { type: "h2", text: "Tespit: püskürtme kollarındaki tıkalı delikler" },
      { type: "p", text: "Püskürtme kollarının üzerindeki deliklerin bir kısmı yemek artıklarıyla tıkanmıştı. Kollar dönmeye devam etse de tıkalı deliklerden su çıkmadığı için bulaşıkların bir bölümüne yeterli su ulaşmıyordu. Püskürtme kollarını çıkarıp deliklerini açtık, ayrıca gider filtresini temizledik. Makine herhangi bir parça değişmeden yeniden temiz yıkamaya başladı." },
      { type: "h2", text: "Püskürtme kollarını evde nasıl kontrol edersiniz?" },
      { type: "steps", items: [
        { title: "Makineyi kapatın", text: "Program bitmiş ve makine soğumuş olsun; fişi çekin ya da makineyi kapatın." },
        { title: "Kolları çıkarın", text: "Alt ve üst püskürtme kollarını kullanım kılavuzunda gösterildiği şekilde çıkarın. Çoğu modelde kollar yukarı çekilerek ya da vidası çevrilerek sökülür." },
        { title: "Delikleri açın", text: "Kolları musluk altında yıkayın; tıkalı delikleri kürdan gibi ince bir uçla nazikçe açın. Deliği genişletecek sivri ve sert aletler kullanmayın." },
        { title: "Filtreyi temizleyin", text: "Makinenin tabanındaki filtreyi çıkarıp akan su altında fırçayla temizleyin ve yerine tam oturtun." },
        { title: "Serbest dönüşü kontrol edin", text: "Kolları yerine taktıktan sonra elle çevirin; hiçbir tabağa veya tencere sapına takılmadan dönmeleri gerekir." },
      ] },
      { type: "h2", text: "Tıkanmayı önlemek için" },
      { type: "list", items: ["Bulaşıkları makineye koymadan önce kemik, çekirdek ve büyük yemek artıklarını sıyırın.", "Filtreyi kullanım yoğunluğunuza göre düzenli aralıklarla temizleyin.", "Büyük tencere ve tepsileri kolların dönüşünü engellemeyecek şekilde yerleştirin."] },
      { type: "note", title: "Ustanın notu", text: "Her kirli yıkama şikâyeti parça değişimi gerektirmez. Önce temizlik ve yerleşim kontrol edilir; parça ancak bunlar sorunu çözmediğinde gündeme gelir." },
    ],
  },
  {
    slug: "/blog/regal-bulasik-makinesi-calismiyor-kontrol-karti/",
    category: "Ustanın Defterinden",
    title: "Karatay’da çalışmayan Regal bulaşık makinesi: neden hiç dokunmadan yetkili servise yönlendirdik?",
    description: "Karatay’da elektrik dalgalanmasıyla kontrol kartı yanan Regal bulaşık makinesine, garantisi sürdüğü için neden hiç müdahale etmediğimizi anlatıyoruz.",
    excerpt: "Arıza kontrol kartındaydı ve cihaz hâlâ garanti süresindeydi. Böyle bir durumda doğru olan, cihazı açmadan müşteriyi üreticinin servisine yönlendirmekti.",
    published: "2026-09-27",
    updated: "2026-09-27",
    device: "Bulaşık Makinesi",
    servicePath: "/bulasik-makinesi-tamiri-konya/",
    caseFile: { district: "Karatay", brand: "Regal", device: "Bulaşık makinesi", complaint: "Makine hiç çalışmıyor", finding: "Elektrik dalgalanması sonucu kontrol kartı yanmış; cihaz garanti süresinde", action: "Müdahale edilmedi, müşteri üreticinin yetkili servisine yönlendirildi" },
    brandPath: "/regal-servisi-konya/",
    blocks: [
      { type: "p", text: "Karatay’daki müşterimizin Regal bulaşık makinesi hiç çalışmıyordu. Yaptığımız kontrolde makinenin kontrol kartının yandığını tespit ettik. Karatay’da elektrik dalgalanmalarıyla sahada sık karşılaşıyoruz ve bu karttaki hasar da dalgalanmadan kaynaklanıyordu. Ancak cihazın hâlâ garanti süresinde olduğunu öğrendik." },
      { type: "h2", text: "Neden müdahale etmedik?" },
      { type: "p", text: "Garanti süresindeki bir cihazın üretici servisi dışında açılması, garanti hakkınızı riske atabilir. Kontrol kartı gibi bir parçanın değişimi de garanti kapsamında üreticinin servisi tarafından yapılabilecek bir işlemdir. Bu nedenle makineye hiçbir müdahalede bulunmadık ve müşterimizi markanın yetkili servisine yönlendirdik. Kontrol kartı değiştirildiğinde makinenin yeniden çalışması beklenir." },
      { type: "p", text: "Eşli Teknik bağımsız bir teknik servistir. Bir cihazı tamir etmek bizim işimiz; ama bazen müşteri için en doğru çözüm başka bir servise gitmektir. Garantisi süren cihazlarda bunu açıkça söylemeyi doğru buluyoruz." },
      { type: "h2", text: "Kontrol kartları neden arızalanır?" },
      { type: "p", text: "Kontrol kartı, makinenin programlarını, su alma ve boşaltmayı, ısıtmayı yöneten elektronik devredir. Elektrik dalgalanmaları, nem ve bağlı parçalardan birinde oluşan kısa devre kart arızalarının sık görülen nedenleri arasındadır." },
      { type: "h2", text: "Kartı korumak için neler yapılabilir?" },
      { type: "list", items: ["Makineyi uzatma kablosu yerine doğrudan topraklı bir prize bağlayın.", "Gerilim dalgalanmalarına karşı akım korumalı priz veya uygun bir koruma cihazı kullanmayı değerlendirin.", "Elektrik kesilip geri geldiğinde makine çalışıyorsa programı iptal edip bir süre bekledikten sonra yeniden başlatın."] },
      { type: "note", title: "Garantili cihazınız mı arızalandı?", text: "Servis çağırmadan önce cihazın faturasına veya garanti belgesine bakın. Garanti süresi devam ediyorsa önce üreticinin servisine başvurmanız sizin için daha doğru olur." },
    ],
  },
  {
    slug: "/blog/altus-kurutma-makinesi-cok-uzun-calisiyor-nem-sensoru/",
    category: "Ustanın Defterinden",
    title: "Meram’da hiç durmayan Altus kurutma makinesi: çamaşırlar kurumuştu, makine bilmiyordu",
    description: "Meram’da çok uzun süre çalışan Altus kurutma makinesinde arızanın nem sensöründe çıkmasını ve sensörün nasıl çalıştığını anlatıyoruz.",
    excerpt: "Kurutma programı saatlerce sürüyordu. Çamaşırlar aslında kurumuştu; ama arızalı sensör bunu makineye bildiremiyordu.",
    published: "2026-09-27",
    updated: "2026-09-27",
    device: "Kurutma Makinesi",
    servicePath: "/kurutma-makinesi-tamiri-konya/",
    caseFile: { district: "Meram", brand: "Altus", device: "Kurutma makinesi", complaint: "Makine çok uzun süre çalışıyor", finding: "Nem sensörü arızası", action: "Sensör değiştirildi" },
    brandPath: "/altus-servisi-konya/",
    blocks: [
      { type: "p", text: "Meram’daki müşterimizin Altus kurutma makinesi, programı bitirmek bilmiyordu. Kurutma süreleri olağandan çok daha uzundu. İncelemede arızanın, çamaşırların kuruyup kurumadığını algılayan sensörde olduğunu tespit ettik. Sensör değiştirildi ve makine yeniden normal sürede programı tamamlamaya başladı." },
      { type: "h2", text: "Makine çamaşırın kuruduğunu nasıl anlar?" },
      { type: "p", text: "Sensörlü kurutma programlarında makine, süreyi baştan belirlemek yerine çamaşırdaki nemi ölçer. Tamburun içinde çamaşıra temas eden sensör, ıslak çamaşırla kuru çamaşır arasındaki farkı algılar ve istenen kuruluk seviyesine ulaşıldığında programı bitirir. Sensör arızalandığında makine çamaşırın kuruduğunu anlayamaz ve çalışmaya devam eder." },
      { type: "h2", text: "Her uzun kurutma sensör arızası mıdır?" },
      { type: "p", text: "Hayır. Uzun kurutmanın en yaygın nedenleri tıkalı filtreler, aşırı yük ve iyi sıkılmamış çamaşırdır. Sensör yüzeyinin yumuşatıcı kalıntısıyla kaplanması da algılamayı zayıflatabilir. Bu nedenle benzer bir şikâyette önce filtreler ve sensör yüzeyinin temizliği kontrol edilir. Bu cihazda ise sensörün kendisi arızalıydı." },
      { type: "h2", text: "Servis çağırmadan önce" },
      { type: "list", items: ["Tiftik filtresini ve varsa alt filtreyi temizleyin.", "Tamburu yarısından fazla doldurmayın.", "Sırılsıklam çamaşır sensörlü programı uzatır; kurutmadan önce çamaşırların iyi sıkıldığını kontrol edin.", "Sensör yüzeyinin nasıl temizleneceğini kullanım kılavuzundan kontrol edin."] },
      { type: "note", title: "Ustanın notu", text: "Makine çamaşırlar kuruduğu hâlde uzun süre çalışıyorsa bu, gereksiz enerji tüketimi ve kumaşların yıpranması demektir. Sorun sürüyorsa kontrol ettirmek gerekir." },
    ],
  },
  {
    slug: "/blog/bosch-camasir-makinesi-titriyor-rulman/",
    category: "Ustanın Defterinden",
    title: "Meram’da titreyip gürültüyle çalışan Bosch çamaşır makinesi: arıza rulmandaydı",
    description: "Meram’da ciddi titreyen ve çok sesli çalışan Bosch çamaşır makinesinde arızanın rulmanda çıkmasını ve rulman sesinin evde nasıl ayırt edileceğini anlatıyoruz.",
    excerpt: "Makine ciddi biçimde titriyor ve çok sesli çalışıyordu. Sorunun kaynağı, tamburun dönüşünü taşıyan rulmandı.",
    published: "2026-09-27",
    updated: "2026-09-27",
    device: "Çamaşır Makinesi",
    servicePath: "/camasir-makinesi-tamiri-konya/",
    caseFile: { district: "Meram", brand: "Bosch", device: "Çamaşır makinesi", complaint: "Makine ciddi biçimde titriyor ve çok sesli çalışıyor", finding: "Rulman arızası", action: "Rulman değiştirildi" },
    brandPath: "/bosch-servisi-konya/",
    blocks: [
      { type: "p", text: "Meram’daki müşterimizin Bosch çamaşır makinesi çalışırken ciddi biçimde titriyor ve normalden çok daha yüksek sesle çalışıyordu. Titreme şikâyetinde ilk bakılan şeyler makinenin dengesi ve içindeki yüktür; ancak bu makinede sesin kaynağı daha içerideydi." },
      { type: "h2", text: "Tespit: aşınmış rulman" },
      { type: "p", text: "İncelemede arızanın rulmanda olduğunu tespit ettik ve rulmanı değiştirdik. Değişimden sonra makine yeniden dengeli ve sessiz çalışmaya başladı." },
      { type: "h2", text: "Rulman ne işe yarar, aşınınca ne olur?" },
      { type: "p", text: "Rulman, tamburun bağlı olduğu mili taşıyan ve dönüşün pürüzsüz olmasını sağlayan parçadır. Aşındığında tambur milin etrafında boşluk yapmaya başlar. Bu boşluk dönüş sırasında uğultuya, devir arttıkça da titreşime dönüşür; ses ve sarsıntı en belirgin hâlini yüksek devirli sıkmada alır." },
      { type: "h2", text: "Rulman sesini evde nasıl ayırt edersiniz?" },
      { type: "steps", items: [
        { title: "Makineyi kapatın", text: "Makine boşken fişini çekin; aşağıdaki kontroller makine çalışırken yapılmaz." },
        { title: "Tamburu elle çevirin", text: "Tamburu elinizle yavaşça döndürün. Sağlam rulmanda dönüş sessizdir; aşınmış rulmanda hışırtı ya da taneli bir sürtünme sesi duyulur." },
        { title: "Tamburu yukarı aşağı oynatın", text: "Tamburun üst kenarından tutup yukarı aşağı hareket ettirin. Belirgin bir boşluk ve takırtı hissediyorsanız rulmanın kontrol edilmesi gerekir." },
        { title: "Boş makineyi dinleyin", text: "Tambur boşken kısa bir sıkma programı çalıştırın. Boş makinede de artan bir uğultu varsa sorun yükten değil, makinenin kendisindendir." },
      ] },
      { type: "p", text: "Tambur sessiz ve boşluksuz dönüyor, ses yalnızca dolu makinede duyuluyorsa önce yükün dağılımına ve makinenin zemine oturmasına bakılır; bu kontrolleri çamaşır makinesi arıza rehberimizde bulabilirsiniz." },
      { type: "note", title: "Ustanın notu", text: "Rulman sesi kendiliğinden geçmez, zamanla artar. Aşınmış rulmanla çalışmaya devam etmek mile ve tamburu taşıyan diğer parçalara da zarar verebilir. Ses başladığında kontrol ettirmek, onarımı büyümeden yapmayı sağlar." },
    ],
  },
  {
    slug: "/blog/vestel-bulasik-makinesi-kapaktan-su-sizdiriyor/",
    category: "Ustanın Defterinden",
    title: "Meram’da kapağından su sızdıran Vestel bulaşık makinesi: kapak yayları ve iç panel",
    description: "Meram’da kapağından su sızdıran Vestel bulaşık makinesinde kapak yayları ve iç kapak panelinin değişimini, kapağın evde nasıl kontrol edileceğini anlatıyoruz.",
    excerpt: "Su, makinenin altından değil kapağın kenarından geliyordu. Kapak yayları ve iç kapak paneli değiştirildiğinde sızıntı durdu.",
    published: "2026-09-27",
    updated: "2026-09-27",
    device: "Bulaşık Makinesi",
    servicePath: "/bulasik-makinesi-tamiri-konya/",
    caseFile: { district: "Meram", brand: "Vestel", device: "Bulaşık makinesi", complaint: "Yıkama sırasında kapaktan su sızıyor", finding: "Sızıntı kapaktan; kapak yayları ve iç kapak paneli kaynaklı", action: "Kapak yayları ve iç kapak paneli değiştirildi" },
    brandPath: "/vestel-servisi-konya/",
    blocks: [
      { type: "p", text: "Meram’daki müşterimizin Vestel bulaşık makinesi yıkama sırasında kapağından su sızdırıyordu. Bulaşık makinesinde su kaçağı şikâyetinde ilk iş suyun nereden geldiğini bulmaktır; çünkü hortum bağlantısından gelen bir kaçakla kapaktan gelen bir sızıntının çözümü tamamen farklıdır." },
      { type: "h2", text: "Tespit ve yapılan işlem" },
      { type: "p", text: "Bu makinede sızıntı kapaktan geliyordu. Kapak yaylarını ve iç kapak panelini değiştirdik; makine yeniden su sızdırmadan yıkamaya başladı." },
      { type: "h2", text: "Kapak yayları ne işe yarar?" },
      { type: "p", text: "Bulaşık makinesinin kapağı, yanlarındaki yaylar sayesinde açılırken yavaşça iner, kapanırken de gövdeye dengeli biçimde oturur. Yaylar esnekliğini yitirdiğinde ya da biri koptuğunda kapak bir tarafa yüklenir ve gövdeye her noktada aynı baskıyı yapamaz. Kapakla gövde arasında kalan küçük bir aralık bile, yıkama sırasında püskürtülen suyun dışarı yol bulmasına yeter." },
      { type: "p", text: "İç kapak paneli ise kapağın makinenin içine bakan yüzüdür ve yıkama suyuyla doğrudan temas eder. Bu panelde oluşan eğilme veya çatlak, suyun kapağın içine ve oradan dışarıya sızmasına neden olabilir." },
      { type: "h2", text: "Kapağı evde nasıl kontrol edersiniz?" },
      { type: "steps", items: [
        { title: "Kapağı yarıya kadar açın", text: "Kapağı yarı açık konumda bırakın. Sağlam yaylarla kapak olduğu yerde durur ya da yavaşça iner; kendi ağırlığıyla hızla düşüyorsa yaylar zayıflamış olabilir." },
        { title: "İki yanı karşılaştırın", text: "Kapağı açıp kapatırken bir tarafın diğerinden ağır hareket edip etmediğine, kapanışta bir köşenin geride kalıp kalmadığına bakın." },
        { title: "İç yüzeyi inceleyin", text: "Kapağın iç yüzeyinde eğilme, çatlak veya kenarlarda açılma olup olmadığını kontrol edin." },
        { title: "Sızıntının yerini not edin", text: "Su kapağın alt kenarından mı, köşelerinden mi geliyor? Servis talebinde bunu belirtmeniz teşhisi hızlandırır." },
      ] },
      { type: "note", title: "Ustanın notu", text: "Kapaktan gelen sızıntıda akla ilk conta gelir. Ancak kapak gövdeye eşit oturmuyorsa yeni conta da sızıntıyı durdurmaz; bu yüzden önce kapağın nasıl kapandığına bakmak gerekir." },
    ],
  },
  {
    slug: "/blog/profilo-buzdolabi-ses-yapiyor-buzlanma/",
    category: "Ustanın Defterinden",
    title: "Meram’da ses yapan Profilo buzdolabı: kaynağı biriken buzdu",
    description: "Meram’da ses yapan Profilo buzdolabında defrost arızasına bağlı buzlanmayı ve yaklaşık 24 saatlik buz çözme işleminin adım adım nasıl yapılacağını anlatıyoruz.",
    excerpt: "Buzdolabından gelen ses, defrost sisteminin eritemediği buzdan kaynaklanıyordu. Parça değiştirmeden, buzun tamamen erimesiyle sorun çözüldü.",
    published: "2026-09-27",
    updated: "2026-09-27",
    device: "Buzdolabı",
    servicePath: "/buzdolabi-tamiri-konya/",
    caseFile: { district: "Meram", brand: "Profilo", device: "Buzdolabı", complaint: "Buzdolabından ses geliyor", finding: "Defrost sistemi arızasına bağlı buzlanma", action: "Cihazın yaklaşık 24 saat kapalı tutularak buzun tamamen eritilmesi önerildi; sorun çözüldü" },
    brandPath: "/profilo-servisi-konya/",
    blocks: [
      { type: "p", text: "Meram’daki müşterimiz, Profilo buzdolabından gelen sesten şikâyet ederek bize ulaştı. İncelemede sesin kaynağının, defrost sistemindeki arıza nedeniyle cihazın içinde biriken buz olduğunu tespit ettik." },
      { type: "h2", text: "Biriken buz neden ses yapar?" },
      { type: "p", text: "Defrost sistemi, soğutucu yüzeylerde oluşan buzu belirli aralıklarla eriterek temizler. Sistem bu görevi yapamadığında buz katman katman büyür. No-frost modellerde büyüyen buz, soğuk havayı dolaba dağıtan fanın pervanesine değmeye başlayabilir; bu durumda buzdolabından tıkırtı, sürtünme ya da uğultu sesi gelir." },
      { type: "h2", text: "Önerimiz: buzu tamamen eritmek" },
      { type: "p", text: "Bu cihazda müşterimize, buzdolabını yaklaşık 24 saat kapalı tutarak biriken buzun tamamen erimesini sağlamasını önerdik. Buz eridikten sonra cihaz yeniden çalıştırıldı ve sorun çözüldü; herhangi bir parça değiştirilmedi." },
      { type: "h2", text: "Buz çözme işlemi adım adım" },
      { type: "steps", items: [
        { title: "Gıdaları boşaltın", text: "Dolaptaki ve dondurucudaki gıdaları çıkarın; dondurulmuş ürünleri serin bir yerde, mümkünse soğutucu çantada bekletin." },
        { title: "Fişi çekin", text: "Buzdolabını yalnızca ayar düğmesinden kapatmakla yetinmeyin; fişini prizden çekin." },
        { title: "Kapakları açık bırakın", text: "Dolap ve dondurucu kapaklarını açık bırakın. Eriyen suyun yere yayılmaması için alta ve rafların önüne havlu serin, ıslanan havluları değiştirin." },
        { title: "Süreyi kısaltmayın", text: "Buzun tamamen erimesi için yaklaşık 24 saat bekleyin. Arka panelin içindeki görünmeyen bölümde de buz olabileceğinden, görünen buz erimiş olsa bile süreyi kısaltmayın." },
        { title: "Kurulayıp çalıştırın", text: "İç yüzeyleri kurulayın, cihazı çalıştırın ve iç sıcaklık düştükten sonra gıdaları yerleştirin." },
      ] },
      { type: "h2", text: "Buz çözerken yapılmaması gerekenler" },
      { type: "list", items: ["Buzu bıçak, tornavida gibi sivri aletlerle kazımayın; soğutucu yüzey delinebilir.", "Saç kurutma makinesi veya ısıtıcıyla erimeyi hızlandırmaya çalışmayın; plastik parçalar şekil değiştirebilir.", "Dolabın içine kaynar su dökmeyin."] },
      { type: "note", title: "Ustanın notu", text: "Buz çözme, birikmiş buzu temizler. Buzlanma kısa süre içinde yeniden başlarsa bu kez defrost sisteminin kendisinin incelenmesi gerekir." },
    ],
  },
  {
    slug: "/blog/bulasik-makinesi-suyu-bosaltmiyor/",
    category: "Bakım Rehberi",
    title: "Bulaşık makinesi suyu boşaltmıyor: dipteki suyu boşaltma ve filtre temizliği adım adım",
    description: "Bulaşık makinesinin dibinde su kaldıysa suyu güvenle boşaltma, filtreyi temizleme ve tahliye hattını kontrol etme adımlarını anlatıyoruz.",
    excerpt: "Makinenin dibinde su kaldığında panik yapmadan, doğru sırayla ne yapacağınızı ve nerede durmanız gerektiğini adım adım anlatıyoruz.",
    published: "2026-09-11",
    updated: "2026-09-27",
    device: "Bulaşık Makinesi",
    servicePath: "/bulasik-makinesi-tamiri-konya/",
    blocks: [
      { type: "p", text: "Program bittiğinde makinenin dibinde su görmek can sıkıcıdır; ancak sorunun büyük kısmı makinenin tabanındaki filtre ve tahliye hattıyla ilgilidir. Aşağıdaki adımlar, üreticilerin kullanım kılavuzlarında önerdiği temel kontrollerle uyumludur. Kendi modelinizin kılavuzunu mutlaka birlikte kontrol edin." },
      { type: "h2", text: "Başlamadan önce hazırlık" },
      { type: "list", items: ["Birkaç havlu ve düz, geniş bir kap", "Sünger veya küçük bir kupa", "Filtreyi temizlemek için yumuşak bir fırça", "Keskin cam veya metal parçalara karşı eldiven"] },
      { type: "h2", text: "Adım adım" },
      { type: "steps", items: [
        { title: "Makineyi kapatın", text: "Programı iptal edin, makineyi kapatın ve fişini çekin. İçerideki su sıcak olabilir; soğumasını bekleyin." },
        { title: "Alt sepeti çıkarın", text: "Tabana rahatça ulaşabilmek için alt sepeti tamamen dışarı alın ve zemine havlu serin." },
        { title: "Suyu alın", text: "Dipteki suyu sünger veya kupa yardımıyla kaba alın. Suyun tamamını almak zorunda değilsiniz; filtreye ulaşabilecek kadar azaltmanız yeterli." },
        { title: "Filtreyi çıkarıp temizleyin", text: "Çoğu modelde filtre saat yönünün tersine çevrilerek çıkarılır. Filtre parçalarını akan su altında fırçayla temizleyin; yuvasında kalan artıkları da alın." },
        { title: "Yerine tam oturtun", text: "Filtreyi yerine takıp kilitlenene kadar çevirin. Yarım takılmış filtre hem tahliyeyi hem yıkama kalitesini bozar." },
        { title: "Tahliye hortumunu kontrol edin", text: "Hortumu lavabo dolabının içinden takip edin: arada bir ezilme veya sert bir büküm olmamalı. Hortum yakın zamanda yeni bir sifona bağlandıysa, sifondaki bağlantı ağzının kapalı plastik kapağının açıldığından emin olun." },
        { title: "Kısa bir programla deneyin", text: "Makineyi boş olarak kısa bir programda çalıştırın ve sonunda dipte su kalıp kalmadığına bakın." },
      ] },
      { type: "h2", text: "Nerede durmalısınız?" },
      { type: "p", text: "Filtre temiz ve hortum açık olduğu hâlde su kalmaya devam ediyorsa arıza büyük olasılıkla tahliye pompası veya kontrol tarafındadır. Tahliye sırasında hiç ses gelmiyorsa pompa çalışmıyor olabilir; uğultu gelip su çıkmıyorsa pompada sıkışan bir parça olabilir. Bu noktadan sonra makinenin alt kısmını açmak kullanıcı işi değildir." },
      { type: "note", title: "Sahadan", text: "Filtre yalnızca tahliyeyi değil, yıkama kalitesini de etkiler. Bir müşterimizin bulaşık makinesinde kirli yıkama şikâyeti, filtre ve püskürtme kollarının temizlenmesiyle parça değişmeden giderildi. Bu işi “Ustanın Defterinden” bölümünde anlattık." },
    ],
    sources: [
      { label: "Bosch — Bulaşık makinesi su boşaltmama sorunu", url: "https://www.bosch-home.com.tr/musteri-hizmetleri/yardim-destek/bulasik-makinesi-hakkinda/suyu-bosaltmiyor" },
      { label: "Arçelik — Bulaşık makinesi suyu boşaltmıyor", url: "https://www.arcelik.com.tr/destek/bulasik-makinesi/bulasik-makinesi-suyu-bosaltmiyor" },
      { label: "Beko — Bulaşık makinesi suyu boşaltmıyor", url: "https://www.beko.com.tr/blog/bulasik-makinesi-suyu-bosaltmiyor-bulasik-makinesi" },
    ],
  },
  {
    slug: "/blog/camasir-makinesi-su-almiyor-konya/",
    category: "Bakım Rehberi",
    title: "Çamaşır makinesi su almıyor: kireçli suda giriş süzgeci temizliği adım adım",
    description: "Kireçli Konya suyunda çamaşır makinesinin su giriş süzgeci neden tıkanır, nasıl temizlenir ve temizlik işe yaramazsa ne yapılmalı?",
    excerpt: "Konya’nın kireçli suyu, çamaşır makinesinin su giriş süzgecini zamanla tıkayabilir. Süzgeci temizlemek çoğu zaman beş dakikalık bir iştir.",
    published: "2026-09-11",
    updated: "2026-09-27",
    device: "Çamaşır Makinesi",
    servicePath: "/camasir-makinesi-tamiri-konya/",
    blocks: [
      { type: "p", text: "Çamaşır makinesinin su giriş hortumunda, şebekeden gelen kum ve tortunun makineye girmesini önleyen küçük bir süzgeç bulunur. Konya’nın şebeke suyu sert sular arasındadır (yaklaşık 30–45 °F); bu tür suyun kullanıldığı evlerde süzgeç zamanla kireç ve tortuyla tıkanabilir, makine su almaz ya da çok yavaş su alır. Kireç yalnızca süzgeci değil, makinenin ısıtıcı rezistansını da etkiler; Yazır’daki bir işimizde çamaşır makinesinin rezistansı bu yüzden yanmıştı." },
      { type: "h2", text: "Süzgeç tıkalı mı, nasıl anlarsınız?" },
      { type: "list", items: ["Makine program başında uzun süre bekliyor ve su alma sesi çok zayıf geliyorsa", "Su almadığına dair hata veya uyarı veriyorsa", "Aynı evdeki diğer musluklarda su basıncı normalse"] },
      { type: "h2", text: "Adım adım süzgeç temizliği" },
      { type: "steps", items: [
        { title: "Musluğu kapatın, fişi çekin", text: "Makinenin bağlı olduğu musluğu tamamen kapatın ve makinenin fişini çekin." },
        { title: "Hortumu sökün", text: "Giriş hortumunu makinenin arkasındaki bağlantıdan elle çevirerek sökün. Hortumda kalan az miktarda su için altına bir kap veya havlu koyun. Bazı modellerde süzgeç, hortumun musluk tarafındaki ucundadır." },
        { title: "Süzgeci bulun", text: "Bağlantı ağzının içinde küçük, ağ şeklinde bir süzgeç göreceksiniz. Üzeri beyaz tortu veya kum ile kaplıysa tıkanıklık buradadır." },
        { title: "Temizleyin", text: "Süzgeci kılavuzunuz izin veriyorsa bir pense yardımıyla nazikçe çıkarın; akan su altında yumuşak bir fırçayla temizleyin. Kireç tabakası sertse süzgeci bir süre sirkeli suda bekletip yeniden fırçalayabilirsiniz." },
        { title: "Yerine takın ve sızıntıyı kontrol edin", text: "Süzgeci ve hortumdaki contayı yerine takıp hortumu elle sıkın. Musluğu açtıktan sonra bağlantıda damlama olup olmadığını kontrol edin." },
      ] },
      { type: "h2", text: "Süzgeç temiz ama makine hâlâ su almıyorsa" },
      { type: "p", text: "Bu durumda sorun makinenin içindedir: su giriş ventili, kapak kilidi, su seviyesini algılayan basınç anahtarı veya kontrol kartı. Bu parçaların teşhisi makinenin açılmasını gerektirir. Karatay’da gittiğimiz bir Beko çamaşır makinesinde, su almama sorununun nedeni basınç anahtarıydı." },
      { type: "note", title: "Güvenlik", text: "Hortumu sökmeden önce musluğu mutlaka kapatın. Hortum bağlantısını anahtarla aşırı sıkmayın; contaya zarar verebilir." },
    ],
    sources: [
      { label: "Arçelik — Çamaşır makinesi su almıyor", url: "https://www.arcelik.com.tr/destek/camasir-makinesi/camasir-makinesi-su-almiyor" },
      { label: "Siemens — Çamaşır makinesi su almıyor", url: "https://www.siemens-home.bsh-group.com/tr/musteri-hizmetleri/destek-merkezi/sorun-giderme/camasir-makinesi/su-dolmuyor" },
    ],
  },
  {
    slug: "/blog/kurutma-makinesi-kurutmuyor/",
    category: "Bakım Rehberi",
    title: "Kurutma makinesi kurutmuyor: çoğu zaman arıza değil, bakım",
    description: "Kurutma makinesi kurutmuyorsa filtre, yoğuşturucu ve su haznesi bakımıyla başlayın. Bakımın bittiği ve servisin başladığı noktayı anlatıyoruz.",
    excerpt: "Kurutmayan makinelerin önemli bir kısmında sorun, tüyle tıkanan filtre ve yoğuşturucudur. Bakımın nerede bittiğini de bilmek gerekir.",
    published: "2026-09-11",
    updated: "2026-09-27",
    device: "Kurutma Makinesi",
    servicePath: "/kurutma-makinesi-tamiri-konya/",
    blocks: [
      { type: "p", text: "Bir forumda paylaşılan deneyimde, ısı pompalı kurutma makinesi kullanan bir kullanıcı makinesinin kurutma performansının düştüğünü fark ediyor. Sorunun kaynağı, tiftik filtresinden kaçan ince tüylerin zamanla yoğuşturucuya yapışması çıkıyor ve kullanıcı yıllık bakımı kendisinin de yapabileceğini öğreniyor. Aynı forumda başka bir kullanıcı ise tüm filtreleri temizlemesine rağmen makinesinin hiç sıcak hava üretmediğini anlatıyor; orada sorun bakımla çözülebilecek bir durum değil." },
      { type: "p", text: "Bu iki hikâye, kurutma makinelerinde doğru sırayı gösteriyor: önce bakım, sonra servis." },
      { type: "h2", text: "Adım adım bakım" },
      { type: "steps", items: [
        { title: "Tiftik filtresini her kurutmada temizleyin", text: "Kapak kenarındaki filtreyi çıkarıp tüyleri elle alın. Filtre yağlanmış gibi görünüyorsa ılık suyla yıkayıp tamamen kuruduktan sonra takın." },
        { title: "Alt filtreyi kontrol edin", text: "Birçok modelde makinenin ön alt kısmında ikinci bir filtre veya sünger filtre bulunur. Kullanım kılavuzundaki aralıklarla çıkarıp yıkayın." },
        { title: "Yoğuşturucuyu temizleyin", text: "Yoğuşturuculu modellerde yoğuşturucu çıkarılabilir; kılavuza göre çıkarıp akan suyla yıkayın. Isı pompalı ve kendi kendini temizleyen modellerde bu işlem makinenin kendi sistemiyle ya da kılavuzda anlatılan şekilde yapılır." },
        { title: "Su haznesini boşaltın", text: "Hazneyi her kullanımdan sonra boşaltın, ara sıra yıkayın ve yerine tık sesiyle oturtun." },
        { title: "Doğru programı seçin", text: "Tamburu yarısından fazla doldurmayın, iyi sıkılmış çamaşır koyun ve ihtiyacınıza uygun kuruluk seviyesini seçin." },
      ] },
      { type: "h2", text: "Bakımın bittiği nokta" },
      { type: "list", items: ["Filtreler temiz olduğu hâlde makine hiç sıcak hava üretmiyorsa", "Isı pompalı modelde program başladıktan birkaç dakika sonra kompresör sesi hiç duyulmuyorsa", "Çamaşırlar kuruduğu hâlde makine durmadan çalışıyorsa", "Makineden yanık kokusu geliyor ya da kasası elle tutulamayacak kadar ısınıyorsa"] },
      { type: "p", text: "Bu durumlarda sorun ısıtma sistemi, kompresör, nem sensörü veya kontrol tarafındadır ve teşhis için servis gerekir. Meram’da gittiğimiz bir Altus kurutma makinesinde saatlerce süren kurutmanın nedeni arızalı sensördü." },
      { type: "note", title: "Güvenlik", text: "Tüy birikimi yangın riskini artırır. Filtreler temizlenmeden makineyi çalıştırmayın." },
    ],
    sources: [
      { label: "DonanımHaber Forum — Kurutma makinesi yıllık bakımı", url: "https://forum.donanimhaber.com/kurutma-makinesi-yillik-bakimi--69447179" },
      { label: "DonanımHaber Forum — Beko kurutma makinesi kurutmuyor", url: "https://forum.donanimhaber.com/beko-camasir-kurutma-makinesi-kurutmuyor-yardim-lutfen--140385914" },
      { label: "Electrolux — Kurutma makinesi filtre ve yoğuşturucu temizliği", url: "https://support.electrolux.com.tr/support-articles/article/kurutma-makinesi-filtrelerinin-ve-kondanserin-temizlenmesi" },
    ],
  },
  {
    slug: "/blog/buzdolabi-sogutmuyor-konya/",
    category: "Karar Rehberi",
    title: "Buzdolabı soğutmuyor: tamir mi, yenisi mi?",
    description: "Buzdolabı soğutmuyorsa servis gelene kadar gıdaları nasıl korursunuz ve tamir ile yeni cihaz arasında hangi kriterlere göre karar verirsiniz?",
    excerpt: "Soğutmayan buzdolabında iki soru öne çıkar: servis gelene kadar gıdalar ne olacak ve tamir ettirmeye değer mi?",
    published: "2026-09-11",
    updated: "2026-09-27",
    device: "Buzdolabı",
    servicePath: "/buzdolabi-tamiri-konya/",
    blocks: [
      { type: "p", text: "Bir forumda paylaşılan deneyimde, 14 yıllık bir buzdolabının kompresörü bozulan kullanıcı “motor mu taktırayım, yeni dolap mı alayım?” diye soruyor. Gelen cevaplar iki tarafa ayrılıyor: bir kısmı eski cihazların sağlam gövdesine güvenerek tamiri öneriyor, diğerleri yeni cihazın enerji verimliliğini ve yeni parçaların ömrünü öne çıkarıyor. Tartışmada öne çıkan teknik uyarı ise kompresör değişiminde cihazın gaz tipine uygun kompresör seçilmesi ve soğutma devresinin temizlenmesi gerektiği." },
      { type: "p", text: "Bu kararın tek bir doğru cevabı yok; ama doğru soruları sormak mümkün." },
      { type: "h2", text: "Önce gıdalarınızı koruyun" },
      { type: "list", items: ["Kapıyı mümkün olduğunca açmayın; kapalı bir buzdolabı içindeki soğuğu bir süre korur.", "Genel gıda güvenliği önerilerine göre kapısı açılmayan bir buzdolabı yiyecekleri yaklaşık 4 saat, dolu bir derin dondurucu ise yaklaşık 48 saat güvenli sıcaklıkta tutabilir.", "Çiğ et, süt ürünleri ve pişmiş yemekler gibi çabuk bozulan gıdaları öncelikle başka bir soğutucuya alın.", "Sıcaklığı bilinmeyen ve uzun süre soğuksuz kalmış çabuk bozulan gıdaları tüketmeyin."] },
      { type: "h2", text: "Tamir mi, yenisi mi? Beş soru" },
      { type: "steps", items: [
        { title: "Arıza nerede?", text: "Conta, fan, sensör veya defrost sistemi gibi arızalar çoğunlukla ekonomik biçimde onarılabilir. Kompresör değişimi veya soğutma devresindeki bir kaçağın onarımı ise daha kapsamlı bir iştir. Karar vermeden önce arızanın tam olarak nerede olduğunu öğrenin." },
        { title: "Cihazın genel durumu nasıl?", text: "Gövdede paslanma, çatlamış iç plastikler, sertleşmiş contalar veya sürekli tekrarlayan arızalar varsa tek bir parçanın değişimi cihazı uzun süre ayakta tutmayabilir." },
        { title: "Parça bulunuyor mu?", text: "Eski modellerde bazı parçaların temini zorlaşabilir. Parçanın bulunup bulunmadığını ve ne kadar sürede geleceğini sorun." },
        { title: "Enerji tüketimi ne durumda?", text: "Eski bir buzdolabı, özellikle contaları yıpranmışsa, yeni bir cihaza göre daha fazla enerji tüketebilir. Bu fark uzun vadede karara etki eder." },
        { title: "Yapılacak işlem açıkça anlatıldı mı?", text: "Özellikle kompresör ve gaz işlemlerinde hangi parçanın değişeceğini, kaçağın bulunup bulunmadığını ve işlemin nasıl test edileceğini önceden öğrenin." },
      ] },
    ],
    sources: [
      { label: "DonanımHaber Forum — Buzdolabı motoru bozuldu, motor mu taktırayım, yeni dolap mı alayım?", url: "https://forum.donanimhaber.com/buzdolabi-motoru-bozuldu-motor-mu-taktirayim-yeni-dolap-mi-alayim--158478713" },
    ],
  },
  {
    slug: "/blog/firin-isitmiyor-konya/",
    category: "Karar Rehberi",
    title: "Fırın ısıtmıyor: “atın” denmeden önce bilmeniz gerekenler",
    description: "Fırın ısıtmıyorsa en sık nedenler, belirtiye göre olası arızalar ve fırını atmaya karar vermeden önce sorulması gereken sorular.",
    excerpt: "Isıtmayan fırınların önemli bir kısmında sorun, değiştirilebilir bir parçadadır. Karar vermeden önce doğru teşhis gerekir.",
    published: "2026-09-11",
    updated: "2026-09-27",
    device: "Fırın",
    servicePath: "/firin-tamiri-konya/",
    blocks: [
      { type: "p", text: "Bir forumda paylaşılan deneyimde, bir kullanıcının midi fırını önce az ısıtmaya, sonra hiç ısıtmamaya başlıyor. Evine gelen teknisyen tamirin pahalı olacağını söyleyip fırını atmasını öneriyor. Kullanıcı ise fırını incelediğinde alt rezistanslardan birinin koptuğunu görüyor; uygun bir yedek parçayla fırın yeniden çalışıyor." },
      { type: "p", text: "Bu hikâyeden çıkarılacak ders, fırını kendiniz tamir etmeniz değil. Rezistans ve bağlantılarla çalışmak elektrik güvenliği gerektirir. Ders şu: bir cihaz için “tamir edilemez” denmeden önce arızanın ne olduğu açıkça tespit edilmelidir." },
      { type: "h2", text: "Belirtiye göre olası neden" },
      { type: "steps", items: [
        { title: "Ekran yanıyor, saat yanıp sönüyor, fırın ısıtmıyor", text: "Dijital ekranlı fırınların çoğu, elektrik gidip geldikten sonra saat yeniden kurulana kadar ısıtmaya geçmez. Saati ayarlayıp tekrar deneyin." },
        { title: "Altı pişmiyor ama üstü pişiyor", text: "Alt rezistans arızası en olası nedendir." },
        { title: "Fanlı programda soğuk hava üflüyor", text: "Havayı ısıtan fan rezistansı arızalanmış olabilir. Alt-üst ısıtma programında ısınma varsa bu ihtimal güçlenir." },
        { title: "Işık, ekran ve ısıtma birlikte çalışmıyor", text: "Fırına hiç enerji ulaşmıyor olabilir. Önce fırının bağlı olduğu sigortaya bakın; sigorta inmemişse sorun büyük olasılıkla fırının içindeki elektrik aksamındadır." },
        { title: "Isınıyor ama sıcaklığı tutturamıyor", text: "Termostat veya sıcaklık sensörü doğru ölçüm yapmıyor olabilir; kapak contasındaki ısı kaçağı da bu belirtiye yol açar." },
      ] },
      { type: "h2", text: "Atmaya karar vermeden önce sorun" },
      { type: "list", items: ["Arızalı parça tam olarak hangisi?", "Bu parça modeliniz için bulunabiliyor mu?", "Parça değişiminden sonra fırın nasıl test edilecek?", "Fırının gövdesi, kapak camı ve contası iyi durumda mı?"] },
      { type: "p", text: "Bu soruların cevapları açık değilse ikinci bir görüş almak makul bir yoldur." },
      { type: "note", title: "Güvenlik", text: "Fırının arka kapağını açmayın ve rezistansa dokunmayın. Gaz kokusu, duman veya kapak camında çatlak varsa fırını kullanmayı bırakın." },
    ],
    sources: [
      { label: "DonanımHaber Forum — Fırın rezistans arızası (kopmuş) ve değişimi", url: "https://forum.donanimhaber.com/firin-rezistans-arizasi-kopmus-ve-degisimi--137258531" },
    ],
  },
  {
    slug: "/blog/sahte-yetkili-servis-nasil-anlasilir/",
    category: "Tüketici Rehberi",
    title: "Sahte “yetkili servis” ilanları: arayan servisin gerçek olup olmadığını nasıl anlarsınız?",
    description: "İnternette yetkili servis gibi görünen ilanlara karşı servis çağırmadan önce yapabileceğiniz basit kontrolleri ve Ticaret Bakanlığı’nın önerisini anlatıyoruz.",
    excerpt: "Arama sonuçlarında “yetkili servis” yazan her ilan yetkili değildir. Servis çağırmadan önce birkaç dakikalık kontrol sizi korur.",
    published: "2026-09-27",
    updated: "2026-09-27",
    device: "Genel",
    servicePath: "/iletisim/",
    blocks: [
      { type: "p", text: "Ticaret Bakanlığı, Haziran 2026’da tüketicileri kendilerini yetkili servis olarak tanıtan sahte servislere karşı uyardı. Bakanlığın açıklamasına göre bu tür işletmeler arama motorlarında üst sıralara çıkıp markaların logolarını izinsiz kullanabiliyor. 2026 yazında farklı illerde bu yöntemle yapılan dolandırıcılıklara ilişkin haberler de basına yansıdı." },
      { type: "h2", text: "Yetkili, bağımsız ve sahte servis arasındaki fark" },
      { type: "list", items: ["Yetkili servis, üreticinin kendi servis ağındadır; garantisi devam eden cihazlarda ilk başvuru adresidir.", "Bağımsız servis, belirli bir üreticiye bağlı olmadan tamir hizmeti verir. Eşli Teknik bağımsız bir teknik servistir ve bunu açıkça belirtir.", "Sahte servis ise yetkili olmadığı hâlde kendini yetkili gibi tanıtır. Sorun bağımsız olmak değil, olmadığı bir şey gibi görünmektir."] },
      { type: "h2", text: "Servis çağırmadan önce beş kontrol" },
      { type: "steps", items: [
        { title: "Markanın resmî sitesine bakın", text: "Yetkili servis arıyorsanız servis bilgisini markanın resmî internet sitesinden veya çağrı merkezinden alın. Ticaret Bakanlığı da yetkili servis bilgisinin resmî kaynaklardan ve Bakanlığın servis bilgi sistemi üzerinden doğrulanmasını öneriyor." },
        { title: "Adres ve işletme bilgisini kontrol edin", text: "Servisin açık adresi, işletme adı ve Google’daki işletme profili birbiriyle uyumlu mu? Yalnızca bir telefon numarasından ibaret ilanlara temkinli yaklaşın." },
        { title: "Kendini nasıl tanıttığına dikkat edin", text: "Telefonda “yetkili servisiz” diyen bir işletmenin sitesinde hangi markanın servisi olduğu açıkça yazmıyorsa soru sorun." },
        { title: "Yapılacak işlemi önceden öğrenin", text: "Arızanın ne olduğu, hangi parçanın değişeceği ve ücretin ne olacağı iş başlamadan açıklanmalı. Onayınız alınmadan parça değişimi yapılmamalı." },
        { title: "Cihazınızın nereye gittiğini bilin", text: "Cihaz atölyeye götürülecekse işletmenin adresini ve cihazı kimin teslim aldığını not edin." },
      ] },
      { type: "note", title: "Bizim yaklaşımımız", text: "Eşli Teknik hiçbir markanın yetkili servisi olduğunu iddia etmez. Garantisi devam eden cihazlarda müşterilerimizi üreticinin servisine yönlendiriyoruz." },
    ],
    sources: [
      { label: "Yeni Akit — Ticaret Bakanlığı’ndan “sahte yetkili servis” uyarısı (Haziran 2026)", url: "https://www.yeniakit.com.tr/foto-galeri/ticaret-bakanligindan-dolandiricilik-uyarisi-sahte-yetkili-servis-tuzagina-dusmeyin-159448" },
      { label: "Cumhuriyet — “Beyaz eşya yetkili servis” ilanıyla dolandırıcılık haberi (Ağustos 2026)", url: "https://www.cumhuriyet.com.tr/turkiye/beyaz-esya-yetkili-servis-ilaniyla-dolandiricilik-2-gozalti-2532445" },
    ],
  },
  {
    slug: "/blog/beyaz-esya-servisinde-sorulacak-sorular/",
    category: "Tüketici Rehberi",
    title: "Servis şikâyetlerinin arkasında çoğu zaman belirsizlik var: sormanız gereken altı soru",
    description: "Beyaz eşya servis şikâyetlerinde uzun bekleme ve belirsizlik öne çıkıyor. Servis sürecinde sormanız gereken altı soruyu anlatıyoruz.",
    excerpt: "Şikâyet verilerinde en çok uzun onarım süresi, parça bekleme ve tekrarlayan arızalar öne çıkıyor. Doğru sorular belirsizliği azaltır.",
    published: "2026-09-27",
    updated: "2026-09-27",
    device: "Genel",
    servicePath: "/online-servis-takibi/",
    blocks: [
      { type: "p", text: "Konya Gündem’in Haziran 2026’da Şikâyetvar verilerine dayanarak aktardığına göre beyaz eşya servislerine yönelik şikâyetler bir yılda 2.812’den 4.467’ye çıktı. Şikâyetlerde en çok uzun onarım süreleri, yedek parça bekleme ve tekrarlayan arızalar öne çıkıyor. Yedek parçaya yönelik şikâyetlerdeki artış da cihaz fiyatları yükseldikçe daha fazla kişinin tamire yöneldiğini gösteriyor." },
      { type: "p", text: "Bu şikâyetlerin ortak noktası belirsizlik: cihazın ne zaman döneceğini, neyin değiştiğini ya da sürecin nerede olduğunu bilmemek. Servis sürecinde soracağınız birkaç soru bu belirsizliği büyük ölçüde azaltır." },
      { type: "h2", text: "Servis sürecinde sorulacak altı soru" },
      { type: "steps", items: [
        { title: "Arıza tam olarak ne?", text: "“Kart gitmiş” veya “motor bozuk” gibi genel ifadeler yerine hangi parçanın neden arızalandığını sorun." },
        { title: "Hangi parça değişecek ve neden?", text: "Değişecek parçanın adını ve bu parçanın belirtiyle ilişkisini öğrenin." },
        { title: "Ücret işlem başlamadan netleşiyor mu?", text: "Parça ve işçilik bilgisi iş başlamadan açıklanmalı; onayınız alınmadan işlem yapılmamalı." },
        { title: "Parça stokta mı, gelmesi ne kadar sürer?", text: "Parça sipariş edilecekse tahmini süreyi ve cihazın bu sürede nerede kalacağını sorun." },
        { title: "Süreci nasıl takip edeceğim?", text: "Sürecin hangi aşamada olduğunu öğrenmek için kimi arayacağınızı veya hangi bağlantıyı kullanacağınızı öğrenin." },
        { title: "Değişen parçayı görebilir miyim?", text: "Çıkan parçayı görmek istemek makul bir taleptir ve yapılan işlemin anlaşılmasını kolaylaştırır." },
      ] },
      { type: "h2", text: "Online servis takibi bu yüzden var" },
      { type: "p", text: "Eşli Teknik’te servis kaydı açıldığında size WhatsApp üzerinden özel bir takip bağlantısı gönderiyoruz. Bu bağlantıdan cihazınızın hangi aşamada olduğunu telefonunuzdan görebilirsiniz. Amacımız, “cihazım ne durumda?” sorusunu sizin sormak zorunda kalmamanız." },
    ],
    sources: [
      { label: "Konya Gündem — Yetkili servis şikâyetleri arttı (Haziran 2026)", url: "https://konyagundem.com/gundem/yetkili-servis-sikayetleri-artti-66797h" },
    ],
  },
];

export function blogWordCount(post: BlogPost): number {
  const text = post.blocks.map(block => block.type === "p" || block.type === "h2" ? block.text : block.type === "list" ? block.items.join(" ") : block.type === "steps" ? block.items.map(item => `${item.title} ${item.text}`).join(" ") : `${block.title} ${block.text}`).join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

export function blogReadingMinutes(post: BlogPost): number {
  return Math.max(2, Math.round(blogWordCount(post) / 180));
}

export function formatBlogDate(isoDate: string): string {
  const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const [year, month, day] = isoDate.split("-").map(Number);
  return `${day} ${months[month - 1]} ${year}`;
}

export function blogPostsForDevice(device: string): BlogPost[] {
  return blogPosts.filter(post => post.device === device);
}

export function blogShareLinks(url: string, title: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://x.com/intent/post?text=${t}&url=${u}`,
  };
}

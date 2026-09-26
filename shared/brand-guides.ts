/** Marka sayfalarının özgün içeriği — React sayfası ve prerender HTML ortak kaynağı. */
export type BrandNote = { title: string; text: string };
export type BrandGuide = { description: string; intro: string; notes: BrandNote[]; faqs: [string, string][] };

export const brandGuides: Record<string, BrandGuide> = {
  "Samsung": {
    description: "Konya’da Samsung çamaşır makinesi, bulaşık makinesi, no-frost buzdolabı ve kablosuz süpürge arızalarında bağımsız teknik servis; hızlı ön inceleme.",
    intro: "Samsung, Konya’da özellikle ekranlı çamaşır makineleri, bulaşık makineleri, no-frost buzdolapları ve kablosuz süpürgeleriyle evlerde yaygın bir marka; su sebili ve kurutma makinesi modelleri ise bu cihazların yanında daha az sayıda evde bulunuyor.",
    notes: [
      { title: "Ekranlı modellerde hata kodu okuma", text: "Samsung çamaşır ve bulaşık makinelerinin çoğunda ön paneldeki dijital ekran arıza anında bir harf-rakam kombinasyonu gösterir; bu kodu, cihazın tam model numarasıyla birlikte WhatsApp üzerinden paylaşmanız teknisyenin gelmeden önce olası nedeni daraltmasını sağlar." },
      { title: "No-frost buzdolabında donma ve akıntı", text: "Samsung no-frost buzdolaplarında evaporatör çevresinde buzlanma, kapı contasında sertleşme veya alt tepsiye su birikmesi sık görülen belirtilerdir; kompresörün çalışıp çalışmadığı ve dolabın kaç yıldır kullanıldığı bilgisi teşhisi hızlandırır." },
      { title: "Kablosuz süpürgede emiş ve şarj sorunları", text: "Samsung’un kablosuz süpürge modellerinde emiş gücünün azalması genelde filtre tıkanıklığından, cihazın hiç açılmaması ise çoğunlukla batarya veya şarj ünitesinden kaynaklanır; getirdiğiniz süpürgenin şarj kablosunu da yanında getirmeniz kontrolü kolaylaştırır." },
      { title: "Model etiketi ve seri numarası", text: "Samsung cihazlarında model ve seri numarası etiketi çamaşır makinesinde kapı çevresinde, buzdolabında ise iç yan duvarda ya da sebze çekmecesinin üstünde yer alır; bu etiketin fotoğrafını paylaşmak doğru yedek parçanın önceden temin edilmesine yardımcı olur." },
    ],
    faqs: [
      ["Samsung kurutmalı çamaşır makinesi programı neden normalden uzun sürüyor?", "Samsung’un kurutma özellikli çamaşır makinelerinde program süresinin uzaması genelde kurutma sensörünün tüy ve tiftikle kirlenmesinden veya hava kanalındaki bir tıkanıklıktan kaynaklanır; makineye aynı anda ne kadar çamaşır koyduğunuzu ve filtreyi en son ne zaman temizlediğinizi kontrol etmeniz ilk adım olabilir."],
      ["Samsung bulaşık makinesi neden aşırı köpük yapıp taşırıyor?", "Bu belirti çoğunlukla bulaşık deterjanı yerine elde yıkama sıvısının kullanılmasından veya deterjan dozunun su sertliğine göre fazla ayarlanmasından kaynaklanır; hangi deterjanı ve ne kadar kullandığınızı kontrol etmeniz, gereksiz bir arıza çağrısını önleyebilir."],
      ["Samsung su sebili neden kısa sürede yosun ve koku yapıyor?", "Su sebillerinde yosunlanma genelde iç haznenin uzun süre temizlenmemesinden veya damacana contasının tam oturmamasından kaynaklanır; sebili ne sıklıkla temizlediğinizi ve damacanayı değiştirirken contanın yerine tam oturup oturmadığını kontrol etmeniz faydalı olur."],
    ],
  },
  "Arçelik": {
    description: "Konya Karatay, Meram ve Selçuklu’da Arçelik çamaşır makinesi, buzdolabı, bulaşık makinesi ve fırın arızalarına bağımsız teknik servis desteği.",
    intro: "Arçelik, Konya’da uzun süredir kullanılan beyaz eşya markalarından biri; buzdolabından çamaşır makinesine kadar evdeki birden fazla cihazın aynı markadan olması sık karşılaşılan bir durumdur.",
    notes: [
      { title: "Buzdolabında arıza işaretleri", text: "Arçelik buzdolaplarında panel üzerinde belirmesi olası uyarı işaretleri genelde kapının açık kalması, ani elektrik kesintisi sonrası sıcaklık dengesizliği veya kompresörün devre dışı kalması gibi farklı nedenlere işaret edebilir; işaretin ne zaman ve hangi koşulda çıktığını aktarmanız teşhisi hızlandırır." },
      { title: "Çamaşır ve bulaşık makinesinde ortak arıza noktaları", text: "Arçelik çamaşır ve bulaşık makinelerinde su alma ve boşaltma devrelerindeki valf ile pompa parçaları benzer mantıkla çalıştığından, iki cihazda da suyun içeri girip girmediği ya da tahliyenin tamamlanıp tamamlanmadığı ilk kontrol noktasıdır; hangi cihazda hangi aşamada durduğunu belirtmeniz süreci kısaltır." },
      { title: "Fırın ve ankastre ocakta ısıtma sorunları", text: "Arçelik fırınlarında istenen sıcaklığa geç ulaşılması genelde rezistans veya ısı sensöründen, ankastre ocakta gözlerin geç veya hiç yanmaması ise ateşleme modülünden kaynaklanabilir; hangi gözün ya da fonksiyonun etkilendiğini belirtmeniz teşhis süresini kısaltır." },
      { title: "Geniş model yelpazesinde yedek parça uyumu", text: "Arçelik’in uzun yıllardır çok sayıda model çıkarmış olması, farklı üretim dönemlerine ait elektronik kart ve motor çeşitlerinin bir arada bulunduğu anlamına gelir; cihaz üzerindeki model ve seri numarası etiketinin fotoğrafını paylaşmanız doğru parçanın önceden temin edilmesini kolaylaştırır." },
    ],
    faqs: [
      ["Arçelik derin dondurucu neden kapağı açıldığında güçlü koku yapıyor?", "Derin dondurucularda koku genelde uzun süre kapalı kalan gıdaların kokusunun plastik yüzeylere sinmesinden veya defrost suyunun tahliye kanalında birikip kokuşmasından kaynaklanır; dondurucunun ne sıklıkla açıldığını ve tahliye kanalının tıkalı olup olmadığını kontrol etmeniz faydalı olur."],
      ["Arçelik davlumbaz neden çalışırken aniden kendiliğinden kapanıyor?", "Davlumbazın kendiliğinden kapanması genelde aşırı ısınmaya karşı devreye giren termik korumadan veya güç kablosundaki gevşek bir bağlantıdan kaynaklanabilir; kapanmanın hangi hız kademesinde ve ne kadar süre çalıştıktan sonra gerçekleştiğini not etmeniz teşhise yardımcı olur."],
      ["Arçelik süpürge neden kullanırken ıslık sesi çıkarıyor?", "Islık benzeri bir ses genelde hortum veya boru bağlantılarındaki hava kaçağından ya da filtrenin tam oturmamasından kaynaklanır; sesin hangi emiş gücü kademesinde arttığını ve filtrenin yerine tam oturup oturmadığını kontrol etmeniz arıza kaynağını daraltmamıza yardımcı olur."],
    ],
  },
  "Arnica": {
    description: "Konya’da Arnica elektrikli süpürge ve robot süpürge arızalarına bağımsız teknik servis; yerinde inceleme ile hızlı bilgilendirme.",
    intro: "Arnica, Konya evlerinde hemen tamamen elektrikli süpürge markası olarak biliniyor; robot süpürgelerin uygulamayla eşleşmesi, klasik dikey modellere göre kullanıcılardan daha sık teknik destek talebi doğuruyor.",
    notes: [
      { title: "Robot süpürgede çevrimdışı kalma", text: "Arnica robot süpürgelerin uygulama üzerinden çevrimdışı görünmesi genelde ev ağı bağlantısındaki bir kopukluktan veya cihazın kendi kablosuz modülünden kaynaklanabilir; süpürgenin şarj istasyonunda olup olmadığı ve üzerindeki ışığın rengi bu tür arızalarda ilk kontrol noktasıdır." },
      { title: "Dikey süpürgede hazne kapağı ve filtre", text: "Arnica dikey süpürgelerde toz haznesi kapağının tam kapanmaması genelde kilit mandalındaki bir kırılmadan, emişin zayıflaması ise filtrenin uzun süre yıkanmamasından kaynaklanır; hazneyi ne sıklıkla boşalttığınız bilgisi filtre durumunu değerlendirmemize yardımcı olur." },
    ],
    faqs: [
      ["Arnica süpürge neden şarj olurken ışığı yanıp sönüyor?", "Şarj ışığının sürekli yanıp sönmesi genelde bataryanın tam dolamamasından veya şarj adaptörünün temas sorunundan kaynaklanır; adaptörü prize takarken ışığın hemen mi yoksa birkaç saniye sonra mı yanıp söndüğünü ve süpürgenin daha önce ne kadar süre şarjda kaldığını not etmeniz teşhise yardımcı olur."],
      ["Arnica süpürge neden zeminde iz veya çizik bırakıyor?", "Zeminde iz oluşması genelde taban fırçasının aşırı sert bir ayarda kullanılmasından ya da fırça üzerindeki küçük tekerleklerin kırılmasından kaynaklanabilir; süpürgeyi hangi zemin ayarında kullandığınızı ve tekerleklerin serbestçe dönüp dönmediğini kontrol etmeniz faydalı olur."],
    ],
  },
  "Beko": {
    description: "Konya Karatay, Meram ve Selçuklu’da Beko çamaşır makinesi, bulaşık makinesi, buzdolabı ve fırın arızalarına bağımsız teknik servis desteği.",
    intro: "Beko, Arçelik A.Ş.’nin hem Türkiye’de hem uluslararası pazarlarda kullandığı markasıdır. Çamaşır makinesinden su sebiline kadar geniş bir cihaz yelpazesi bulunduğundan, servis talebinizde arızalı cihazın türünü ve belirtiyi birlikte yazmanız ilk yönlendirmeyi hızlandırır.",
    notes: [
      { title: "Bulaşık makinesinde program hataları", text: "Beko bulaşık makinelerinde ekranda beliren program hataları genellikle su alma süresinin uzaması, ısıtıcı devresindeki bir sapma ya da tahliye pompasındaki tıkanıklıkla ilgilidir; ekranda gördüğünüz harf-rakam kombinasyonunu ve programın hangi dakikasında durduğunu paylaşmanız arıza türünü daraltmamıza yardımcı olur." },
      { title: "Çamaşır makinesinde su alma ve merkezkaç", text: "Beko çamaşır makinelerinde suyun içeri alınmaması genelde giriş valfindeki bir tıkanıklıktan, sıkma devrinde makinenin aşırı sallanması ise amortisör veya yay takozlarının yorulmasından kaynaklanır; sallanmanın hangi devirde başladığını belirtmeniz kontrolü kolaylaştırır." },
      { title: "Buzdolabı ve derin dondurucuda soğutma dengesi", text: "Beko buzdolabı ve derin dondurucularında bir bölmenin aşırı soğuk, diğerinin yeterince soğuk olmaması genelde hava kanalındaki bir tıkanıklıktan veya damper motorundan kaynaklanabilir; hangi bölmenin sorunlu olduğunu ve dolabın no-frost olup olmadığını belirtmeniz teşhisi hızlandırır." },
      { title: "Farklı üretim yıllarında yedek parça planlaması", text: "Beko’nun uzun yıllar boyunca çok sayıda model üretmiş olması, aynı cihaz türünde bile farklı elektronik kart sürümleri bulunabileceği anlamına gelir; cihaz üzerindeki model ve seri numarası etiketinin net bir fotoğrafını paylaşmanız doğru parçanın önceden araştırılmasını sağlar." },
    ],
    faqs: [
      ["Beko fırın neden sadece tek taraf ısınıyor, alt-üst pişirme yapmıyor?", "Sadece bir rezistansın çalışması genelde diğer rezistansın yanmasından veya program seçici düğmenin ilgili konuma tam oturmamasından kaynaklanır; fırını farklı pişirme modlarında deneyip hangi modda ısınma olduğunu not etmeniz arızanın rezistans mı yoksa seçici mi olduğunu ayırt etmemize yardımcı olur."],
      ["Beko davlumbaz neden çalışırken sigortayı attırıyor?", "Sigorta atması genelde motor sargısında kısa devre veya güç kablosundaki bir hasardan kaynaklanabilir, bu durumda cihazı tekrar tekrar denemek yerine fişten çekili tutmak güvenlidir; sigortanın davlumbaz çalışır çalışmaz mı yoksa belirli bir hız kademesinde mi attığını not etmeniz teşhise yardımcı olur."],
      ["Beko süpürge neden hazne dolmadan emiş gücü düşüyor?", "Hazne dolmadan emiş kaybı genelde filtrenin ince tozla erken tıkanmasından veya hortum içinde kısmi bir tıkanıklıktan kaynaklanır; filtreyi çıkarıp ışığa tutarak tozla kaplı olup olmadığını, hortumu da düz bir yüzeyde sallayarak içinde bir cisim olup olmadığını kontrol edebilirsiniz."],
    ],
  },
  "Bosch": {
    description: "Konya’da Bosch çamaşır makinesi, bulaşık makinesi, buzdolabı ve fırın arızalarına bağımsız teknik servis; Karatay ve Meram’da yerinde randevu.",
    intro: "Bosch, Konya’da çamaşır ve bulaşık makinesi ağırlıklı bir kullanıcı tabanına sahiptir; ankastre fırın ve davlumbaz modelleri genellikle mutfak yenileme projelerinde birlikte tercih ediliyor, buzdolabı ve süpürge modelleri de ürün gamında yer alıyor.",
    notes: [
      { title: "Çamaşır makinesinde arıza kodları", text: "Bosch çamaşır makinelerinde ekranda beliren bir arıza kodu genellikle su alma, boşaltma veya motor devresindeki bir sapmayı işaret eder; kodun tam görünümünü ve programın hangi aşamasında ortaya çıktığını fotoğrafla paylaşmanız teşhis süresini kısaltır." },
      { title: "Bulaşık makinesinde beyaz leke ve kireçlenme", text: "Bosch bulaşık makinelerinde yıkama sonrası bardak ve tabaklarda beyaz lekeler görülmesi genelde su yumuşatıcı tuzunun bitmesinden veya sertlik ayarının yanlış yapılmasından kaynaklanır, iç yüzeydeki kireç birikintisi ise ısıtıcı direncin verimini düşürebilir; makinenizi hangi su sertliği ayarıyla kullandığınız bilgisi değerlendirmemize yardımcı olur." },
    ],
    faqs: [
      ["Bosch buzdolabı neden dondurucu bölümünde aşırı buzlanma yapıyor?", "Dondurucu bölümünde kalın buz tabakası oluşması genelde kapı contasının tam kapanmamasından veya kapının sık sık uzun süre açık tutulmasından kaynaklanır; contayı elinizle gezdirerek sertleşme veya boşluk olup olmadığını, kapının kapanma sesinin net bir tık verip vermediğini kontrol edebilirsiniz."],
      ["Bosch süpürge neden kullanırken hortum aşırı ısınıyor?", "Hortumun ısınması genelde içinde sıkışan bir tıkanıklığın hava akışını kısıtlamasından veya motorun aşırı yüklenmesinden kaynaklanır; hortumu düz bir zemine koyup içinden ışık tutarak bir tıkanıklık olup olmadığını, kaç dakika kullandıktan sonra ısınmanın başladığını kontrol etmeniz faydalı olur."],
    ],
  },
  "Electrolux": {
    description: "Konya’da Electrolux çamaşır makinesi, süpürge, buzdolabı ve fırın arızalarına bağımsız teknik servis; yerinde inceleme, net bilgilendirme.",
    intro: "Electrolux, İsveç kökenli bir ev aletleri üreticisidir. Markanın farklı ülkelerde üretilmiş modelleri bulunduğu için cihaz etiketindeki ürün numarası (PNC), doğru yedek parçanın belirlenmesinde en güvenilir bilgidir.",
    notes: [
      { title: "Süpürgede emiş kaybı ve ısınma", text: "Electrolux süpürgelerde emiş gücünün azalması genelde toz haznesi veya torba filtresinin dolmasından, cihazın kısa süre çalışıp kendini kapatması ise aşırı ısınmaya karşı devreye giren koruma sisteminden kaynaklanabilir; filtreyi ne zaman temizlediğiniz bilgisi ilk değerlendirme noktasıdır." },
      { title: "Fırında ısı sensörü ve buzdolabında kompresör", text: "Electrolux fırınlarında sıcaklığın istenen seviyeye geç ulaşması genelde ısı sensöründeki bir sapmadan, buzdolabında sürekli çalışan kompresörün soğutamaması ise gaz kaçağı veya tıkalı kılcal borudan kaynaklanabilir; hangi cihazda hangi belirtinin görüldüğünü ayrı ayrı belirtmeniz teşhisi hızlandırır." },
    ],
    faqs: [
      ["Electrolux çamaşır makinesi neden yıkama sonrası kötü koku bırakıyor?", "Yıkama sonrası kötü koku genelde kauçuk kapı contasının arkasında biriken nem ve deterjan kalıntısından veya düşük sıcaklıkta yıkama programlarının sık kullanılmasından kaynaklanır; kapı contasının iç kısmını elinizle kontrol edip nemli veya kaygan bir birikinti olup olmadığına bakmanız faydalı olur."],
      ["Electrolux bulaşık makinesi neden tabakları kirli bırakıyor?", "Yıkama sonrası tabakların kirli kalması genelde püskürtme kollarındaki deliklerin tıkanmasından veya filtre sepetinin temizlenmemesinden kaynaklanır; püskürtme kollarını elle çevirerek serbestçe dönüp dönmediğini ve filtre sepetinde katı artık birikip birikmediğini kontrol etmeniz ilk adım olabilir."],
    ],
  },
  "Franke": {
    description: "Konya’da Franke ankastre ocak, fırın, davlumbaz ve bulaşık makinesi arızalarına bağımsız teknik servis desteği; yerinde inceleme.",
    intro: "Franke, İsviçre kökenli ve mutfak sistemleri odaklı bir üreticidir. Ankastre ocak, fırın ve davlumbaz gibi gömme cihazlarda bazı arızalar cihaz dolaptan çıkarılmadan incelenemediği için servis planlamasında montaj şekli de dikkate alınır.",
    notes: [
      { title: "Ankastre ocakta ateşleme sorunları", text: "Franke ankastre ocaklarda çakmağın çıt çıt sesi çıkarıp gazı tutuşturmaması genelde ateşleme buji ucundaki kir birikintisinden veya termokupl adı verilen güvenlik sensöründeki arızadan kaynaklanır; hangi gözün sorunlu olduğunu ve sesin sürekli mi yoksa aralıklı mı çıktığını belirtmeniz teşhisi kolaylaştırır." },
      { title: "Davlumbazda filtre ve motor bakımı", text: "Franke davlumbazlarında emişin azalması çoğunlukla yağ filtresinin uzun süre yıkanmamasından, sürekli çalışan motor sesinin yükselmesi ise rulmanların yağ kaybetmesinden kaynaklanır; karbon filtreli mi yoksa baca bağlantılı mı olduğunu bilmemiz doğru bakım planını belirlememizi sağlar." },
      { title: "Ankastre fırında ısıtmama ve program hatası", text: "Franke fırınlarda üst veya alt rezistansın ısınmaması genelde rezistansın kendisinin yanmasından, programın hiç başlamaması ise kapı kilidi sensöründen kaynaklanabilir; fırının hangi pişirme modunda sorun verdiğini söylemeniz arızanın rezistans mı yoksa elektronik kart mı olduğunu ayırt etmemize yardımcı olur." },
      { title: "Bulaşık makinesinde su alma ve kurutmama", text: "Franke bulaşık makinelerinde suyun içeri alınmaması genelde giriş vanasındaki filtrenin tıkanmasından, yıkama sonunda tabakların ıslak kalması ise kurutma fanı veya parlatıcı dozajından kaynaklanır; hangi programda ne zaman durduğunu belirtmeniz teşhis süresini kısaltır." },
    ],
    faqs: [
      ["Franke ocak neden çıt çıt ses çıkarıp yanmıyor?", "Bu belirti genelde ateşleme ucunun kir veya yağ birikintisiyle kaplanmasından ya da güvenlik sensörü olan termokuplun ısınamamasından kaynaklanır; ses geliyor ama gaz tutuşmuyorsa, hangi gözde bu durumun yaşandığını ve ateşleme sesinin sürekli mi aralıklı mı olduğunu not almanız faydalı olur."],
      ["Franke davlumbaz neden ışığı yanıyor ama motoru çalışmıyor?", "Işık ve motor devreleri davlumbazlarda genelde birbirinden bağımsız çalıştığından, ışığın yanıp motorun tepki vermemesi çoğunlukla hız kademe anahtarındaki bir arızayı veya motor sargısındaki bir kopmayı gösterir; hangi hız kademesinde denediğinizi ve motorun hiç ses çıkarıp çıkarmadığını kontrol etmeniz teşhise yardımcı olur."],
      ["Franke ankastre buzdolabı neden iç yüzeyde su birikintisi yapıyor?", "Ankastre buzdolaplarında iç yüzeyde su birikmesi genelde kapı contasının tam kapanmamasından veya tahliye deliğinin tıkanmasından kaynaklanır; kapıyı kapatırken ince bir kağıdı sıkıştırıp çekme testiyle contanın tuttuğunu, tahliye deliğinin altındaki kanalın açık olup olmadığını kontrol edebilirsiniz."],
    ],
  },
  "Grundig": {
    description: "Konya’da Grundig çamaşır makinesi, bulaşık makinesi, kurutma makinesi ve fırın arızalarına bağımsız teknik servis; net ön bilgilendirme.",
    intro: "Grundig, kökleri Almanya’daki elektronik üretimine dayanan ve 2000’li yıllardan bu yana Arçelik A.Ş. bünyesinde yer alan bir markadır; bugün satılan Grundig beyaz eşyalar da bu grup tarafından üretilir.",
    notes: [
      { title: "Süpürgede kablo ve kömür aşınması", text: "Grundig kablolu süpürgelerde motorun aniden durması genelde kömürlerin aşınıp kontak kaybetmesinden, kordonun makaraya sarılırken kesik kesik geri gitmesi ise sarma mekanizmasındaki bir arızadan kaynaklanabilir; süpürgenin kaç yıldır kullanıldığı bilgisi kömür durumunu tahmin etmemize yardımcı olur." },
      { title: "Bulaşık makinesinde uzayan yıkama süreleri", text: "Grundig bulaşık makinelerinde standart bir programın olağandan çok daha uzun sürmesi genelde su ısıtma direncinin yavaş ısınmasından veya kirlilik sensörünün suyu hep kirli algılamasından kaynaklanabilir; hangi programı seçtiğinizi ve normalde kaç dakika sürdüğünü bilmemiz karşılaştırmalı değerlendirme yapmamızı sağlar." },
      { title: "Fırında ısıtma ve düğme tepkisizliği", text: "Grundig fırınlarında ısınmanın gecikmesi genelde rezistanstan, düğmelere basıldığında cihazın hiç tepki vermemesi ise kontrol panelindeki bağlantı sorunundan kaynaklanabilir; fırının kaç yaşında olduğu ve sorunun ilk ne zaman fark edildiği bilgisi arıza geçmişini anlamamıza yardımcı olur." },
      { title: "Buzdolabında panel göstergesi ve ısı ayarı", text: "Grundig buzdolaplarında panelde beliren bir uyarı ışığı genellikle kapının uzun süre aralık kalmasından veya iç sıcaklık ayarının yanlışlıkla değiştirilmesinden kaynaklanır; ışığın hangi renkte yandığını ve dolabın hangi bölmesinde soğutma şikâyeti yaşadığınızı belirtmeniz teşhisi kolaylaştırır." },
    ],
    faqs: [
      ["Grundig servisi Arçelik mi?", "Grundig, Arçelik, Beko ve Altus ile birlikte Arçelik A.Ş. çatısı altındaki markalardan biridir; bu ortak yapı bazı modellerde benzer devre kartı ve motor mimarisi kullanılabileceği anlamına gelir, ancak Grundig kendi model serisine özgü parçalar da barındırır, bu yüzden doğru parça için cihazın kendi model etiketine bakılması gerekir."],
      ["Grundig süpürge neden kullanırken kordonu geri sarmıyor?", "Kordonun geri sarılmaması genelde sarma yayının gerginliğini kaybetmesinden veya makara içindeki mekanizmanın kordonla birlikte dolanmasından kaynaklanır; kordonu elle yavaşça çekip bıraktığınızda hiç tepki alıp almadığınızı kontrol etmeniz arızanın yay mı yoksa mekanizma mı olduğunu ayırt etmemize yardımcı olur."],
      ["Grundig davlumbazın filtreleri ne sıklıkla temizlenmeli veya değiştirilmeli?", "Metal yağ filtreleri yıkanarak yeniden kullanılabilir; yıkama aralığı pişirme yoğunluğuna ve kullanım kılavuzundaki öneriye göre belirlenir. Havayı dışarı atmadan mutfağa geri veren modellerde bulunan karbon filtre ise yıkanmaz, belirli aralıklarla yenilenir. Tıkalı filtre çekişi zayıflatır ve motorun daha fazla zorlanmasına yol açar."],
    ],
  },
  "Hoover": {
    description: "Konya’da Hoover çamaşır makinesi, kurutma makinesi, fırın ve süpürge arızalarına bağımsız teknik servis; inceleme sonrası net bilgilendirme.",
    intro: "Hoover’ı Konya’da genelde çamaşır ve kurutma makinesi ikilisiyle hatırlarız; bu iki cihazın aynı kabinde birleştiği kombine modeller şehirde özellikle küçük dairelerde tercih ediliyor, fırın ve süpürge modelleri de ürün gamının bir parçası.",
    notes: [
      { title: "Çamaşır-kurutma kombine cihazlarda program takılması", text: "Hoover’ın çamaşır ve kurutmayı tek kabinde birleştiren modellerinde yıkama bitip kurutmaya geçmemesi genelde nem sensöründen, programın ortasında durması ise kapı kilidi mikro şalterinden kaynaklanabilir; cihazın kaç dakika sonra durduğunu belirtmeniz sorunun elektronik mi mekanik mi olduğunu ayırt etmemize yardımcı olur." },
      { title: "Fırında ısı ayarı ve zamanlayıcı", text: "Hoover fırınlarında ayarlanan sıcaklığa ulaşamama şikâyeti genelde ısı sensöründeki sapmadan, zamanlayıcının kendiliğinden sıfırlanması ise kontrol kartından kaynaklanır; hangi programda ve kaçıncı dakikada sorunun ortaya çıktığını söylemeniz teşhisi hızlandırır." },
      { title: "Süpürgede hortum ve fırça motoru", text: "Hoover süpürgelerde emişin aniden kesilmesi çoğunlukla hortum içinde sıkışan bir tıkanıklıktan, taban fırçasının dönmemesi ise fırça motorundaki kayış veya kömür aşınmasından kaynaklanır; süpürgenin torbalı mı torbasız mı olduğu bilgisi filtre kontrolünü kolaylaştırır." },
      { title: "Model etiketinin cihaz üzerindeki yeri", text: "Hoover’da model ve seri numarası etiketi çamaşır-kurutma makinelerinde kapı arkasındaki iç yüzeyde, fırında ise gövdenin yan tarafında ya da kapı çıtasının altında bulunur; bu etiketteki bilgiyi WhatsApp’tan iletmeniz doğru yedek parçanın önceden araştırılmasını sağlar." },
    ],
    faqs: [
      ["Hoover bulaşık makinesi neden bardaklarda buğu benzeri iz bırakıyor?", "Yıkama sonunda bardak ve tabaklarda buğu benzeri iz kalması genelde parlatıcı haznesinin boş kalmasından veya kurutma fanının yeterince çalışmamasından kaynaklanır; parlatıcı göstergesinin ne zamandır dolu görünmediğini ve programın kurutma aşamasının ne kadar sürdüğünü kontrol etmeniz faydalı olur."],
      ["Hoover davlumbaz neden yağ filtresi temizlense de kısa sürede yeniden yağlanıyor?", "Filtre kısa sürede yeniden yağlanıyorsa bu genelde ocak üstü pişirme yoğunluğuna göre filtre boyutunun yetersiz kalmasından veya motor emişinin zayıflamasından kaynaklanabilir; filtreyi hangi sıklıkla yıkadığınızı ve ocakta günlük ortalama kaç kez yağlı pişirme yaptığınızı not etmeniz değerlendirmeyi kolaylaştırır."],
      ["Hoover buzdolabı neden kapı açık kaldığında alarm çalmıyor?", "Kapı açık alarmının çalmaması genelde kapı üzerindeki manyetik sensörün kirlenmesinden veya kontrol kartındaki alarm devresinin devre dışı kalmasından kaynaklanabilir; kapıyı birkaç kez açıp kapatarak sensörün üzerinde görünür bir kir ya da hizalama bozukluğu olup olmadığını kontrol edebilirsiniz."],
    ],
  },
  "Kumtel": {
    description: "Konya’da Kumtel ocak, fırın, davlumbaz ve buzdolabı arızalarına bağımsız teknik servis; ateşleme ve motor kontrolü yerinde yapılır.",
    intro: "Kumtel’i Konya’da genelde uygun fiyatlı gaz ocağı ve fırın markası olarak biliriz; gaz ocaklarında çakmaklı ateşleme sistemi, fırınlarında ise mekanik zaman ayarlı modeller yaygındır, davlumbaz ve az sayıda buzdolabı modeli de ürün gamına dahildir.",
    notes: [
      { title: "Ocakta alev rengi ve basınç sorunları", text: "Kumtel ocaklarda alevin turuncu veya kırmızı yanması genelde ortam tozunun brülörde birikmesinden ya da gaz-hava karışımının bozulmasından kaynaklanır, alevin normalden küçük çıkması ise regülatördeki basınç düşüklüğüne işaret edebilir; hangi gözde ve ne renkte alev gördüğünüzü belirtmeniz kontrolü kolaylaştırır." },
      { title: "Davlumbazda hız kademesi ve anahtar arızaları", text: "Kumtel davlumbazlarında hız kademe düğmesine basıldığında motorun tepki vermemesi genelde kademe anahtarındaki bir temas sorunundan, sadece en yüksek hızda çalışması ise ara kademe direncinin yanmasından kaynaklanabilir; hangi kademede sorun yaşadığınızı belirtmeniz arıza noktasını daraltmamıza yardımcı olur." },
    ],
    faqs: [
      ["Kumtel fırın neden fanlı pişirmede yemekleri eşit pişirmiyor?", "Fanlı pişirmede eşitsiz sonuç genelde arka duvardaki fan motorunun yavaşlamasından veya fan kanatlarının yağ birikintisiyle dengesizleşmesinden kaynaklanır; fanı çalıştırdığınızda normalden farklı bir ses gelip gelmediğini ve fan kanatlarının üzerinde görünür bir kir tabakası olup olmadığını kontrol etmeniz faydalı olur."],
      ["Kumtel buzdolabı neden kapı rafında donma oluyor?", "Kapı rafında donma genelde kapı contasının o bölgede tam kapanmamasından veya termostat ayarının çok soğuğa çekilmiş olmasından kaynaklanır; termostat kadranının kaçta olduğunu ve kapıyı kapattığınızda raf bölgesinde bir hava akımı hissedip hissetmediğinizi kontrol etmeniz teşhise yardımcı olur."],
    ],
  },
  "Philips": {
    description: "Konya’da Philips elektrikli süpürge arızalarına bağımsız teknik servis; emiş, motor ve batarya sorunlarında yerinde inceleme.",
    intro: "Philips’in Konya’daki varlığı büyük ölçüde elektrikli süpürge modelleriyle sınırlı; kablosuz modellerin şarj süresi ve emiş gücü, klasik gövdeli modellere göre kullanıcılar tarafından daha sık soruluyor.",
    notes: [
      { title: "Kablosuz süpürgede batarya ömrü", text: "Philips kablosuz süpürgelerde şarj süresinin kısalması veya cihazın tam şarj olmaması genelde batarya hücrelerinin zamanla kapasite kaybetmesinden kaynaklanır; süpürgenin kaç yıldır kullanıldığı ve günlük ortalama kaç dakika çalıştırıldığı bilgisi batarya değerlendirmesini kolaylaştırır." },
      { title: "Klasik süpürgede hortum ve emiş kaybı", text: "Philips’in klasik torbalı ve torbasız süpürgelerinde emişin azalması genelde hortum içindeki bir tıkanıklıktan veya filtrenin doygunlaşmasından kaynaklanır; süpürgenin torba mı yoksa haznesi mi olduğu bilgisi doğru filtre kontrolünü sağlar." },
    ],
    faqs: [
      ["Philips süpürge neden çalıştırınca kendi kendine kapanıyor?", "Kendiliğinden kapanma genelde aşırı ısınmaya karşı devreye giren termik korumadan veya hazne kapağının tam kapanmamasından kaynaklanır; kapanma öncesi kaç dakika çalıştığını ve hazne kapağının kilitlenirken bir tık sesi verip vermediğini not etmeniz teşhise yardımcı olur."],
      ["Philips kablosuz süpürge neden düşük moddan yüksek moda geçemiyor?", "Mod değiştirilememesi genelde mod düğmesindeki bir temas sorunundan veya bataryanın düşük şarj seviyesinde yüksek modu desteklememesinden kaynaklanır; süpürgeyi tam şarj ettikten sonra aynı sorunu yaşayıp yaşamadığınızı kontrol etmeniz, arızanın batarya mı yoksa düğme mi olduğunu ayırt etmemize yardımcı olur."],
    ],
  },
  "Profilo": {
    description: "Konya Karatay’da Profilo çamaşır makinesi, bulaşık makinesi, buzdolabı ve fırın arızalarına bağımsız teknik servis desteği.",
    intro: "Profilo denince Konya’da ilk akla gelen çamaşır ve bulaşık makinesi; ankastre fırın ve davlumbaz modelleri ise daha çok yeni yapılan mutfaklarda tercih ediliyor, buzdolabı ve derin dondurucu modelleri de az sayıda evde bulunuyor.",
    notes: [
      { title: "BSH grubuna bağlı olması ve parça mantığı", text: "Profilo, Bosch ve Siemens ile aynı üretici grubuna (BSH) bağlı bir markadır; bu ortaklık bazı modellerde benzer üretim mantığı anlamına gelse de her markanın kendi model serisine özgü parçaları vardır, bu yüzden cihazın yerinde incelenmesi net teşhis sağlar." },
      { title: "Çamaşır makinesinde deterjan çekmecesi tıkanıklığı", text: "Profilo çamaşır makinelerinde deterjanın çekmecede kalıp suya karışmaması genelde çekmece kanalındaki birikintiden veya su basıncının düşük olmasından kaynaklanabilir, kumaş yumuşatıcısının erken boşalması ise sifon kanalındaki bir tıkanıklığa işaret eder; çekmeceyi ne sıklıkla temizlediğiniz bilgisi bakım durumunu değerlendirmemize yardımcı olur." },
    ],
    faqs: [
      ["Profilo bulaşık makinesi neden yıkama sonunda içeride su bırakıyor?", "Yıkama sonunda tabanda su kalması genelde tahliye pompasının tüy veya cam kırığı gibi bir yabancı madde ile tıkanmasından ya da tahliye hortumunun bükülmesinden kaynaklanır; hortumun arkada kıvrılıp kıvrılmadığını ve pompanın çalışırken bir uğultu sesi çıkarıp çıkarmadığını kontrol etmeniz faydalı olur."],
      ["Profilo davlumbaz neden kumanda düğmelerine geç tepki veriyor?", "Düğmelere geç tepki verme genelde kontrol kartındaki bir yaşlanmadan veya düğme temas noktalarındaki yağ birikintisinden kaynaklanabilir; düğmelerin üzerini hafifçe silip aynı gecikmenin devam edip etmediğini, gecikmenin belirli bir düğmede mi yoksa tüm düğmelerde mi olduğunu kontrol etmeniz teşhise yardımcı olur."],
    ],
  },
  "Regal": {
    description: "Konya’da Regal çamaşır makinesi, buzdolabı, derin dondurucu ve fırın arızalarına bağımsız teknik servis; yerinde inceleme, net bilgi.",
    intro: "Regal, çamaşır makinesinden davlumbaza kadar farklı cihaz gruplarında ürün sunan yerli bir beyaz eşya markasıdır.",
    notes: [
      { title: "Buzdolabı ve derin dondurucuda soğutmama", text: "Regal buzdolabı ve derin dondurucularında soğutmanın zayıflaması genelde kapı contasındaki hava kaçağından, sürekli çalışıp bir türlü istenen ısıya inememesi ise kompresör veya gaz kaçağından kaynaklanabilir; cihazın kaç yıldır kullanıldığı ve içindeki termostat ayarının kaçta olduğu bilgisi teşhisi hızlandırır." },
      { title: "Çamaşır makinesinde kapı kilidi ve program durması", text: "Regal çamaşır makinelerinde kapının yıkama sırasında aniden açılması veya hiç kilitlenmemesi genelde kapı kilit mekanizmasındaki bir arızayı işaret eder, programın ortasında donup kalması ise ana kontrol kartındaki bir sıfırlanmadan kaynaklanabilir; kapının kilitlenirken ses çıkarıp çıkarmadığı bilgisi teşhisi kolaylaştırır." },
      { title: "Davlumbaz ve fırında elektronik kart arızaları", text: "Regal davlumbaz ve fırınlarında düğmelere basıldığında hiçbir tepki alınamaması çoğunlukla elektronik kart üzerindeki bir bağlantı sorunundan kaynaklanır; bu tür belirtilerde sigortanın atıp atmadığı ve panelde herhangi bir ışığın yanıp yanmadığı bilgisi ilk kontrol noktasıdır." },
      { title: "Model etiketi ve doğru parça temini", text: "Regal cihazlarında model ve seri numarası etiketi genellikle gövdenin arka paneline ya da kapı iç kenarına yapıştırılır; bu etiketin net bir fotoğrafını paylaşmanız, cihazın hangi üretim dönemine ait olduğunu ve buna uygun yedek parçayı önceden araştırmamızı sağlar." },
    ],
    faqs: [
      ["Regal bulaşık makinesi neden bulaşıkları yarım yıkayıp duruyor?", "Programın ortasında durması genelde su seviyesi sensöründeki bir sapmadan veya kapı kilidinin yıkama sırasında geçici olarak açılmasından kaynaklanabilir; durma anında ekranda bir ışık yanıp yanmadığını ve kapının tam kapalı kalıp kalmadığını kontrol etmeniz faydalı olur."],
      ["Regal süpürge neden taban fırçası dönmüyor?", "Taban fırçasının dönmemesi genelde fırçaya dolanan saç veya iplik artıklarından ya da tahrik kayışının kopmasından kaynaklanır; fırçayı çıkarıp etrafında dolanma olup olmadığını kontrol etmeniz, kayış değişimi gerekip gerekmediğini önceden anlamamızı sağlar."],
      ["Regal derin dondurucu neden çekmeceler donarak birbirine yapışıyor?", "Çekmecelerin donarak yapışması genelde defrost sisteminin düzenli çalışmamasından veya kapının sık sık uzun süre açık tutulmasından kaynaklanır; dondurucunun kaç yılda bir buz çözme işlemi gördüğünü ve kapının günlük ortalama kaç kez açıldığını not etmeniz değerlendirmeye yardımcı olur."],
    ],
  },
  "Rowenta": {
    description: "Rowenta kablosuz ve kablolu süpürgelerde batarya, şarj ve emiş sorunları için Konya’da teknik servis; WhatsApp’tan kayıt açın.",
    intro: "Rowenta, Alman kökenli ve bugün Groupe SEB çatısı altında yer alan bir küçük ev aletleri markasıdır. Eşli Teknik bu marka için elektrikli süpürge servisi verir; kablosuz modellerde batarya ve şarj ünitesi, kablolu modellerde ise emiş hattı incelemenin odağındadır.",
    notes: [
      { title: "Hazne kilidinde açılma ve kapanma sorunu", text: "Rowenta süpürgelerde toz haznesinin yerine tam oturmaması veya kilit mandalının kırılması, hem emişin zayıflamasına hem de cihazın güvenlik nedeniyle çalışmayı reddetmesine yol açabilir; kilidin ne zaman kırıldığını ve haznenin ne kadar dolu kullanıldığını belirtmeniz teşhisi kolaylaştırır." },
      { title: "Motor ve filtre kaynaklı emiş kaybı", text: "Rowenta süpürgelerde emiş gücünün azalması genelde filtrenin yıkanmadan uzun süre kullanılmasından, motorun anormal ses çıkarması ise rulman aşınmasından kaynaklanır; süpürgenin ne sıklıkla temizlendiği bilgisi bakım geçmişini değerlendirmemize yardımcı olur." },
    ],
    faqs: [
      ["Rowenta süpürge neden çalışırken titreşim yapıyor?", "Aşırı titreşim genelde fan pervanesinin dengesini kaybetmesinden veya motor yataklarının aşınmasından kaynaklanır; titreşimin süpürgenin hangi hızında arttığını ve motordan gelen sesin normalden farklı olup olmadığını not etmeniz arıza kaynağını daraltmamıza yardımcı olur."],
      ["Rowenta süpürge neden farklı bir prizde de açılmıyor?", "Farklı bir prizde de açılmama, sorunu güç kaynağından ziyade süpürgenin kendisine işaret eder; bu durumda genelde güç düğmesindeki bir arıza veya kablo içindeki bir kopukluk söz konusudur, kabloyu dikkatlice bükerek açılıp açılmadığını denemeniz ilk ipucunu verebilir."],
    ],
  },
  "Siemens": {
    description: "Siemens çamaşır makinesi, bulaşık makinesi, buzdolabı ve ankastre fırınlarınız için Konya’da teknik servis; işlem ve ücret önceden açıklanır.",
    intro: "Siemens, Konya’da özellikle ankastre mutfak setlerinde —fırın, ocak ve davlumbaz üçlüsünde— tercih edilen bir marka; çamaşır ve bulaşık makinesi modelleri de yaygın kullanılıyor, bu geniş kullanım alanı arıza taleplerinin de birden fazla cihaz grubundan gelmesine yol açıyor.",
    notes: [
      { title: "Buzdolabında kapı contası ve enerji kaybı", text: "Siemens buzdolaplarında kapı contasının sertleşmesi veya köşelerinde kopma olması içeri sıcak hava girmesine, bu da kompresörün normalden sık ve uzun çalışmasına yol açabilir; contanın hangi kapıda ve nerede hasarlı göründüğünü belirtmeniz değişecek parçayı önceden netleştirmemize yardımcı olur." },
      { title: "Çamaşır makinesinde kapı kilidi açılmama", text: "Siemens çamaşır makinelerinde program bittiği hâlde kapının açılmaması genelde iç sıcaklığın veya su seviyesinin güvenli aralığa henüz düşmemesinden, bazen de kilit mekanizmasındaki elektromekanik bir arızadan kaynaklanır; kapının ne kadar süre kilitli kaldığını belirtmeniz arızanın türünü ayırt etmemize yardımcı olur." },
    ],
    faqs: [
      ["Siemens fırın neden temizlik programı sırasında yoğun koku yapıyor?", "Piroliz veya katalitik temizlik sırasında hafif koku genelde fırın içindeki yağ ve yemek artıklarının yüksek sıcaklıkta yanmasından kaynaklanan normal bir durumdur, ancak koku aşırı yoğunsa ve dumanla birlikte geliyorsa rezistans çevresinde aşırı birikinti olabilir; temizlik programından önce fırının ne kadar kirli olduğunu ve dumanın yoğunluğunu not etmeniz değerlendirmeye yardımcı olur."],
      ["Siemens süpürge neden hazne göstergesi dolu olmadan uyarı veriyor?", "Hazne dolu uyarısının erken gelmesi genelde filtredeki ince toz birikiminin hava akışını kısıtlamasından veya sensörün hassasiyet ayarının farklı ürünlerde farklı algılamasından kaynaklanabilir; filtreyi çıkarıp yıkadıktan sonra aynı uyarının devam edip etmediğini kontrol etmeniz faydalı olur."],
    ],
  },
  "Silverline": {
    description: "Konya’da Silverline ankastre fırın, elektrikli ocak, davlumbaz ve buzdolabı arızalarına bağımsız teknik servis desteği.",
    intro: "Silverline, Konya mutfaklarında ankastre fırın, elektrikli ocak ve davlumbaz üçlüsüyle tanınan bir marka; özellikle ankastre setlerde ocak ve fırının aynı marka ile alınması tercih ediliyor, buzdolabı modelleri de bulunuyor.",
    notes: [
      { title: "Elektrikli ocakta ısıtma bölgesi arızaları", text: "Silverline elektrikli ocaklarda belirli bir ısıtma bölgesinin hiç ısınmaması genelde o bölgenin rezistansından, tüm ocağın açılmaması ise ana kontrol kartından kaynaklanabilir; hangi gözün etkilendiğini ve ocağın seramik mi indüksiyonlu mu olduğunu belirtmeniz teşhisi kolaylaştırır." },
      { title: "Ankastre fırında kapı contası ve ısı kaybı", text: "Silverline fırınlarında pişirme süresinin normalden uzun sürmesi genelde kapı contasındaki ısı kaçağından, iç camın buğulanması ise conta veya fan motorundaki bir arızadan kaynaklanabilir; fırının hangi modda kullanıldığı bilgisi arıza kaynağını daraltmamıza yardımcı olur." },
    ],
    faqs: [
      ["Silverline buzdolabı neden dondurucu bölmesi soğuk kalıp diğer bölme ılıklaşıyor?", "Bu dengesizlik genelde iki bölme arasındaki hava kanalını açıp kapayan damper motorunun sıkışmasından veya kanalın buzla tıkanmasından kaynaklanır; buzdolabı bölmesindeki hava çıkış menfezinin önünün kapalı olup olmadığını ve dondurucudaki buzlanma miktarını kontrol etmeniz teşhise yardımcı olur."],
      ["Silverline davlumbaz neden ışığı titrek yanıyor?", "Işığın titrek yanması genelde LED sürücü kartındaki bir yaşlanmadan veya ampul soketindeki gevşek bir bağlantıdan kaynaklanır; ampulü çıkarıp yeniden takarak titremenin devam edip etmediğini kontrol etmeniz, arızanın ampul mü yoksa sürücü kart mı olduğunu ayırt etmemize yardımcı olur."],
    ],
  },
  "Sinbo": {
    description: "Konya’da Sinbo elektrikli süpürge, mini fırın ve elektrikli ocak arızalarına bağımsız teknik servis desteği, yerinde inceleme.",
    intro: "Sinbo, küçük ev aletleri odaklı yerli bir markadır. Küçük ev aletlerinde parça tedariki modele göre değiştiği için ürün kutusundaki veya cihaz altındaki model kodunu paylaşmanız, onarımın mümkün olup olmadığını önceden netleştirmemizi sağlar.",
    notes: [
      { title: "Süpürgede emiş ve motor sesi", text: "Sinbo süpürgelerinde emiş gücünün zamanla azalması genelde toz haznesi filtresinin tıkanmasından, motorun normalden yüksek sesle çalışması ise rulman aşınmasından kaynaklanabilir; şarjlı modellerde batarya süresinin kısalması ise ayrı bir kontrol gerektirir." },
      { title: "Mini fırında ısıtma teli arızaları", text: "Sinbo’nun mini ve midi fırınlarında ısının hiç yükselmemesi genelde alt veya üst ısıtma telinin yanmasından kaynaklanır, fırının içi ısınıyor ama süre dolunca kapanmıyor gibi bir belirti ise zaman ayarlayıcı düğmedeki bir arızayı gösterebilir; fırının hangi ısıtma modunda tepki vermediğini belirtmeniz teşhisi kolaylaştırır." },
      { title: "Elektrikli ocakta göz ısıtma sorunları", text: "Sinbo elektrikli ocaklarda sıcaklık ayar düğmesi en yüksek konuma getirilse bile gözün yeterince kızarmaması genelde uzun kullanım sonucu ısıtma telinin gücünü kaybetmesinden kaynaklanır; ocağı soğukken deneyip aynı yavaşlığın devam edip etmediğini ve düğmeyi çevirirken bir tık hissi alıp almadığınızı kontrol etmeniz faydalı olur." },
      { title: "Süpürgede hazne ve toz torbası uyumu", text: "Sinbo süpürgelerinde yanlış boy veya model toz torbası kullanılması emişin düşük hissedilmesine ve motorun daha çabuk ısınmasına yol açabilir; süpürgenizin model numarasını ve kullandığınız torbanın orijinal mi jenerik mi olduğunu paylaşmanız doğru parçanın belirlenmesini kolaylaştırır." },
    ],
    faqs: [
      ["Sinbo süpürge neden aniden koku yapmaya başlıyor?", "Süpürgeden yanık veya toz kokusu gelmesi genelde motorun aşırı ısınmasına veya haznenin uzun süre boşaltılmamış olmasına işaret eder; süpürgeyi kapatıp haznesini hemen boşaltmanız ve motor bölmesinin etrafında bir ısınma hissedip hissetmediğinizi kontrol etmeniz güvenlik açısından ilk adım olmalıdır."],
      ["Sinbo mini fırın neden kapı camı buğulanıp pişirmeyi geciktiriyor?", "Kapı camında yoğun buğulanma genelde kapı contasının tam kapanmamasından veya fırın içindeki nemin yeterince tahliye edilememesinden kaynaklanır; kapıyı kapatırken hafif bir direnç hissedip hissetmediğinizi ve contanın görünür bir deformasyon taşıyıp taşımadığını kontrol etmeniz faydalı olur."],
      ["Sinbo elektrikli ocak neden düğmeye basılınca ışık yanıp göz ısınmıyor?", "Bu belirti genelde gösterge lambasının ayrı bir devreden beslenmesi nedeniyle ısıtma telinin kopmuş olmasına işaret eder; ocağı farklı bir gözde deneyip aynı sonucu alıp almadığınızı kontrol etmeniz, arızanın tek bir göze mi yoksa ana devreye mi ait olduğunu ayırt etmemize yardımcı olur."],
    ],
  },
  "Şenocak": {
    description: "Konya’da Şenocak derin dondurucu, buzdolabı, su sebili ve davlumbaz arızalarına bağımsız teknik servis; yerinde net inceleme.",
    intro: "Şenocak’ı Konya’da çoğunlukla derin dondurucu ve buzdolabı markası olarak tanırız; sanayi tipi büyük hacimli derin dondurucu modelleri ev tipi modellerden daha sık tercih ediliyor, su sebili, fırın/ocak ve davlumbaz modelleri de yelpazede yer alır.",
    notes: [
      { title: "Buzdolabında kompresör çalışma döngüsü", text: "Şenocak buzdolaplarında kompresörün normalden çok daha sık devreye girip kısa süre çalışıp durması genelde gaz basıncındaki düşüklükten veya termostat ayarının çok soğuğa çekilmiş olmasından kaynaklanabilir; kompresörün bir çalışma döngüsünün kaç dakika sürdüğünü fark etmeniz bize yararlı bir ipucu verir." },
      { title: "Su sebilinde sıcak su ünitesi arızaları", text: "Şenocak su sebillerinde sıcak su musluğundan ılık su gelmesi genelde ısıtıcı rezistansın kısmen yanmasından, cihazın hiç sıcak su vermemesi ise termik sigortanın atmasından kaynaklanabilir; sebilinizin sıcak ve soğuk musluklarından hangisinde sorun yaşadığınızı belirtmeniz teşhisi hızlandırır." },
    ],
    faqs: [
      ["Şenocak derin dondurucu neden kapak lastiği yerinden çıkıp soğuk kaçırıyor?", "Kapak lastiğinin yerinden çıkması genelde uzun kullanım sonrası yapıştırıcının zayıflamasından veya lastiğin sertleşip esnekliğini kaybetmesinden kaynaklanır; lastiği yerine bastırıp birkaç saat sonra tekrar kontrol etmeniz, sorunun geçici mi yoksa lastiğin değişmesinin mi gerektiğini anlamamıza yardımcı olur."],
      ["Şenocak davlumbaz neden karbon filtre takılıyken koku gidermiyor?", "Karbon filtreli davlumbazlarda koku giderilememesi genelde filtrenin ömrünü doldurmuş olmasından kaynaklanır, karbon filtreler yıkanamaz ve zamanla emiş kapasitesini kaybeder; filtreyi en son ne zaman değiştirdiğinizi ve davlumbazı günde ortalama kaç saat çalıştırdığınızı not etmeniz doğru değişim aralığını belirlememize yardımcı olur."],
    ],
  },
  "Teka": {
    description: "Konya’da Teka ankastre ocak, fırın, davlumbaz ve bulaşık makinesi arızalarına bağımsız teknik servis; yerinde net değerlendirme.",
    intro: "Teka, ankastre mutfak cihazları ve evyeleriyle bilinen uluslararası bir üreticidir. Çoğu Teka fırında model etiketi kapak açıldığında iç çerçevede, ankastre ocaklarda ise cihazın alt yüzeyinde bulunur; etiketin fotoğrafı doğru parçanın belirlenmesine yeter.",
    notes: [
      { title: "Ocak düğmelerinde kilitlenme ve dokunmatik panel", text: "Teka’nın dokunmatik kontrollü ocaklarında panelin hiçbir dokunuşa tepki vermemesi genelde yüzeydeki nemden veya güvenlik kilidinin yanlışlıkla etkinleşmesinden kaynaklanabilir, gaz modellerinde ise çakmağın tutuşturamaması ayrı bir arıza grubudur; ocağınızın elektrikli mi yoksa gazlı mı olduğunu belirtmeniz doğru yönlendirmeyi sağlar." },
      { title: "Bulaşık makinesinde kapı kilidi ve başlamama", text: "Teka bulaşık makinelerinde programın hiç başlamaması çoğunlukla kapının tam kapandığını algılayamayan kilit sensöründen kaynaklanır, bazı modellerde ise su musluğunun kapalı unutulması aynı belirtiyi taklit edebilir; kapıyı kapatırken bir tık sesi alıp almadığınızı belirtmeniz teşhisi hızlandırır." },
    ],
    faqs: [
      ["Teka kurutma makinesi neden çamaşırları nemli bırakıyor?", "Çamaşırların nemli kalması genelde yoğuşma haznesinin dolu olmasından veya kondansatör ünitesinin tüy ile tıkanmasından kaynaklanır; su haznesini her kullanımdan sonra boşaltıp boşaltmadığınızı ve kondansatör filtresini ne sıklıkla temizlediğinizi kontrol etmeniz faydalı olur."],
      ["Teka davlumbaz neden çalışırken titreme sesi yapıyor?", "Titreme sesi genelde motor bağlantı vidalarının gevşemesinden veya fan pervanesinin dengesini kaybetmesinden kaynaklanır; sesin davlumbazın hangi hız kademesinde arttığını ve gövdeye dokunduğunuzda titreşimi hissedip hissetmediğinizi not etmeniz arıza kaynağını daraltmamıza yardımcı olur."],
    ],
  },
  "Uğur Soğutma": {
    description: "Konya’da Uğur Soğutma buzdolabı, derin dondurucu ve su sebili arızalarına bağımsız teknik servis; soğutma sistemine yerinde bakım.",
    intro: "Uğur Soğutma, derin dondurucu ve soğutma cihazları üzerine uzmanlaşmış yerli bir üreticidir. Bu cihazlarda arıza tespiti kompresör, termostat ve soğutma devresinin birlikte değerlendirilmesini gerektirir.",
    notes: [
      { title: "Derin dondurucuda hata kodları ve ayar", text: "Uğur derin dondurucularında panelde beliren bir hata kodu genellikle sıcaklık artışı veya defrost devresindeki bir arızayı işaret eder, termostat ayarının yanlışlıkla değişmiş olması da benzer bir belirti verebilir; kodun görünümünü ve ayarın kaçta olduğu bilgisini paylaşmanız teşhisi hızlandırır." },
      { title: "Su sebilinde soğutma performansı", text: "Uğur su sebillerinde soğuk suyun yeterince soğumaması genelde kompresörün uzun süre yorulmasından veya gaz basıncının düşmesinden kaynaklanabilir; günde ortalama kaç damacana su için kullandığınız ve şikâyetin ne zamandır sürdüğü bilgisi değerlendirmeyi kolaylaştırır." },
    ],
    faqs: [
      ["Uğur Soğutma buzdolabı neden kompresör çalışırken gövdesi aşırı ısınıyor?", "Kompresör gövdesinin belirgin biçimde ısınması bir miktar normal olsa da aşırı ısınma genelde arka taraftaki yoğuşturucu peteklerinin tozla kaplanmasından veya dolabın duvara çok yakın yerleştirilmesinden kaynaklanır; peteklerin arkasında en az birkaç santim boşluk olup olmadığını ve peteklerde toz birikimi olup olmadığını kontrol etmeniz faydalı olur."],
      ["Uğur Soğutma su sebili neden damacana takılınca gürültü sesi çıkarıyor?", "Damacana takılırken gelen gürültü genelde hazneye giren havanın su ile yer değiştirmesinden kaynaklanan normal bir sestir, ancak ses uzun süre devam ediyorsa şamandıra mekanizmasının sıkışmış olabileceğine işaret eder; sesin damacana takıldıktan kaç saniye sonra kesildiğini not etmeniz normal mi arıza mı olduğunu ayırt etmemize yardımcı olur."],
    ],
  },
  "Vestel": {
    description: "Konya Karatay, Meram ve Selçuklu’da Vestel çamaşır makinesi, buzdolabı, fırın ve derin dondurucu arızalarına bağımsız teknik servis.",
    intro: "Vestel, Zorlu Grubu’na bağlı ve üretimini ağırlıklı olarak Manisa’daki tesislerinde yapan yerli bir markadır. Hem büyük beyaz eşya hem küçük ev aletleri grubundaki Vestel cihazlarına servis veriyoruz.",
    notes: [
      { title: "Buzdolabı ve derin dondurucuda arıza kodları", text: "Vestel buzdolabı ve derin dondurucularının bir kısmında panel üzerinde yanıp sönen ışık dizileri ya da harf-rakam kombinasyonlarıyla arıza bildirilir; bu göstergenin fotoğrafını, dolabın soğutup soğutmadığı ve içerideki sıcaklık ekranının ne gösterdiği bilgisiyle birlikte paylaşmanız teşhisi hızlandırır." },
      { title: "Çamaşır makinesinde su boşaltma ve sıkma", text: "Vestel çamaşır makinelerinde su boşaltmama şikâyeti sıklıkla tahliye pompasındaki tıkanıklıktan, sıkma turunun düşmesi ise dengesizlik sensöründen veya kömürlerin aşınmasından kaynaklanır; makinenin hangi program adımında durduğunu belirtmeniz arızayı öngörmemize yardımcı olur." },
      { title: "Geniş ürün ailesinde yedek parça çeşitliliği", text: "Vestel’in aynı anda birçok farklı cihaz grubunda üretim yapması, model yılına göre kullanılan elektronik kart ve motor çeşitlerinin de fazla olması anlamına gelir; bu yüzden cihazın üzerindeki model ve seri numarası etiketini net biçimde paylaşmanız doğru parçanın önceden hazırlanmasını sağlar." },
      { title: "Davlumbazda ışık ve motor arızaları", text: "Vestel davlumbazlarında ışığın yanmaması genelde LED sürücü kartından, motorun düşük devirde takılı kalması ise kondansatör veya kömürlerden kaynaklanabilir; ocak üstü kullanım yoğunluğunuz ve filtre temizlik sıklığınız bize motor ömrü hakkında fikir verir." },
    ],
    faqs: [
      ["Vestel derin dondurucu neden sürekli çalışıp bir türlü istenen sıcaklığa inmiyor?", "Bu tür sürekli çalışma genelde kapı contasındaki hava kaçağından, dondurucunun aşırı dolu istiflenmesinden veya gaz basıncındaki düşüklükten kaynaklanır; dondurucunun kapasitesinin ne kadarının dolu olduğunu ve kapının tam kapanıp kapanmadığını kontrol etmeniz ilk aşamada faydalı olur."],
      ["Vestel süpürge neden kullanırken aniden duruyor?", "Süpürgenin kullanım sırasında aniden durması genelde aşırı ısınmaya karşı devreye giren termik korumadan veya hazne ile filtre tıkanıklığından kaynaklanır; süpürgeyi durdurmadan önce kaç dakika çalıştığınızı ve filtreyi en son ne zaman temizlediğinizi not etmeniz teşhise yardımcı olur."],
      ["Vestel su sebili neden damacana değişince su taşırıyor?", "Damacana değişiminde su taşırma genelde şamandıra mekanizmasının yapışmasından veya sebilin seviye sensöründeki bir arızadan kaynaklanır; damacanayı yerleştirdikten hemen sonra mı yoksa bir süre sonra mı taştığını gözlemlemeniz, arızanın mekanik mi elektronik mi olduğunu ayırt etmemize yardımcı olur."],
    ],
  },
  "Altus": {
    description: "Konya’da Altus çamaşır makinesi, buzdolabı, derin dondurucu ve su sebili arızalarına bağımsız teknik servis; hızlı yerinde randevu.",
    intro: "Altus, Arçelik A.Ş.’nin ekonomik segmentte konumlanan markasıdır. Model etiketindeki ürün kodu, cihazın hangi ürün ailesine ait olduğunu ve uygun parçanın belirlenmesini kolaylaştırır.",
    notes: [
      { title: "Davlumbazda klape ve kapak mekanizması", text: "Altus davlumbazlarında bacaya bağlı klapenin tam kapanmaması dışarıdan koku ve soğuk hava girmesine yol açabilir, motorlu kapaklı modellerde kapağın açılıp kapanmaması ise genelde kapak motorundaki bir arızadan kaynaklanır; hangi modelde hangi belirtiyi gözlemlediğiniz teşhisi kolaylaştırır." },
      { title: "Su sebilinde soğutmama ve su akıtma", text: "Altus su sebillerinde soğuk su verilmemesi genelde soğutma ünitesindeki termostat veya kompresörden, sebilin altından su sızması ise damacana contasından ya da iç tanktaki bir çatlaktan kaynaklanabilir; sebilin alttan mı üstten mi damacanalı olduğunu belirtmeniz doğru yönlendirmeyi sağlar." },
      { title: "Derin dondurucuda buzlanma ve alarm", text: "Altus derin dondurucularında iç yüzeyde kalın buz tabakası oluşması genelde kapının tam kapanmamasından veya defrost sisteminin çalışmamasından kaynaklanır, sürekli öten bir alarm ise sıcaklık artışına karşı devreye giren uyarı sistemi olabilir; dondurucunun sandık tipi mi çekmeceli mi olduğu bilgisi kontrolü kolaylaştırır." },
      { title: "Çamaşır makinesinde hata kodu paylaşımı", text: "Altus çamaşır makinelerinde ekranda beliren bir hata kodu genellikle su alma, boşaltma veya motor devresindeki bir sorunu işaret eder; kodun tam olarak hangi harf-rakam kombinasyonu olduğunu ve cihazın kaçıncı dakikada durduğunu fotoğraf veya kısa bir video ile paylaşmanız teşhisi hızlandırır." },
    ],
    faqs: [
      ["Altus kurutma makinesi neden çamaşırları sertleştiriyor?", "Çamaşırların kurutma sonrası sertleşmesi genelde tambur içi tüy filtresinin tıkanmasından veya yoğuşma ünitesinin verimsiz çalışmasından kaynaklanır; filtreyi her kullanımdan sonra temizleyip temizlemediğinizi ve kurutma programının süresini normalden uzun bulup bulmadığınızı kontrol etmeniz faydalı olur."],
      ["Altus fırın neden pişirme sırasında içeri duman veriyor?", "Fırın içinde duman oluşması genelde eski yemek artıklarının rezistans üzerinde yanmasından veya yağ birikintisinin ısınmasından kaynaklanır; fırının iç yüzeyini ve rezistansın çevresini ne zaman temizlediğinizi kontrol etmeniz, arızayla temizlik ihtiyacını ayırt etmemize yardımcı olur."],
      ["Altus çamaşır makinesi neden sıkma turunda kapıdan su sızdırıyor?", "Sıkma turunda su sızıntısı genelde kapı contasının kenarlarında biriken tüy ve kir birikintisinden veya contanın esnekliğini kaybetmesinden kaynaklanır; contayı elinizle gezdirip sertleşmiş veya çatlamış bir bölge olup olmadığını kontrol etmeniz ilk adım olabilir."],
    ],
  },
};

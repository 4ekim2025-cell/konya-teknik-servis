export type DeviceCareTip = { title: string; text: string };

export const deviceCare: Record<string, DeviceCareTip[]> = {
  "Çamaşır Makinesi": [
    { title: "Filtreyi kontrol edin", text: "Kapağı açmadan önce cihazı kapatın. Kullanım kılavuzundaki tahliye filtresi temizleme adımını izleyin ve zemine su sızmasına karşı hazırlık yapın." },
    { title: "Su girişini gözleyin", text: "Su musluğunun açık, hortumun kıvrılmamış ve bağlantı çevresinin kuru olduğunu dışarıdan kontrol edin; hortumu sökmeyin." },
    { title: "Tambur sesini not edin", text: "Sıkma sırasında oluşan sesin ne zaman başladığını ve tamburun boşken de aynı sesi çıkarıp çıkarmadığını not edin." },
    { title: "Model ve hata kodunu paylaşın", text: "Model etiketinin fotoğrafını ve ekrandaki uyarıyı servis talebine ekleyin; elektrikli bölümlere müdahale etmeyin." }
  ],
  "Bulaşık Makinesi": [
    { title: "Filtre ve süzgeci temizleyin", text: "Cihaz kapalı ve soğukken, kılavuzdaki filtre çıkarma adımlarını izleyin. Keskin cam veya metal parçalara karşı eldiven kullanın." },
    { title: "Püskürtme kollarını gözleyin", text: "Kolların bulaşıklarla sıkışmadığını ve deliklerde görünür birikinti olmadığını kontrol edin; zorlayarak sökmeyin." },
    { title: "Su birikmesini kaydedin", text: "Program sonunda içeride kalan suyun seviyesini, kokuyu ve hangi programda oluştuğunu not edin. Pompa kapağını açmadan önce kılavuza bakın." },
    { title: "Program ve hata bilgisini yazın", text: "Kullanılan programı, ekrandaki uyarıyı ve cihazın modelini paylaşın; cihazı tekrar tekrar çalıştırmak yerine servis yönlendirmesi alın." }
  ],
  "Kurutma Makinesi": [
    { title: "Tüy filtresini temizleyin", text: "Her kullanım sonrası tüy filtresindeki birikintiyi cihaz kapalıyken temizleyin. Filtreyi tamamen kurutmadan yerine takmayın." },
    { title: "Hava akışını kontrol edin", text: "Cihaz çevresindeki havalandırma alanının kapalı olmadığını ve yoğuşma haznesinin kılavuza göre boşaltıldığını kontrol edin." },
    { title: "Aşırı ısınmayı önemseyin", text: "Yanık kokusu, anormal ısı veya duman varsa cihazı hemen durdurup fişini güvenli biçimde çekin; yeniden çalıştırmayın." },
    { title: "Yük ve programı paylaşın", text: "Çamaşır miktarını, seçilen programı, kuruluk seviyesini ve varsa hata kodunu servis talebine ekleyin." }
  ],
  "Fırın": [
    { title: "Enerjiyi kesin", text: "Temizlik veya gözlem öncesinde fırını kapatın ve tamamen soğumasını bekleyin. Elektrik bağlantısını ve iç aksamı sökmeyin." },
    { title: "Isınma davranışını not edin", text: "Fırının hiç ısınmadığını, geç ısındığını veya sıcaklığı koruyamadığını; mümkünse seçilen dereceyle birlikte kaydedin." },
    { title: "Kapak contasını gözleyin", text: "Conta ve kapak çevresinde yırtık, gevşeme veya ısı kaçağı belirtisi olup olmadığını dışarıdan kontrol edin." },
    { title: "Hata kodunu fotoğraflayın", text: "Paneldeki uyarıyı kapatmadan önce fotoğraflayın ve model etiketini paylaşın; rezistans veya kart bölümüne müdahale etmeyin." }
  ],
  "Ocak": [
    { title: "Gaz kokusunda kullanmayın", text: "Gaz kokusu varsa ocağı yakmayın, elektrik düğmelerine dokunmayın, ortamı güvenli biçimde havalandırın ve yetkili acil destek kanallarına başvurun." },
    { title: "Yüzeyi soğukken temizleyin", text: "Ocak tamamen soğuduktan sonra yüzey ve düğmelerdeki görünür kalıntıları uygun ürünle temizleyin; gövdeyi açmayın." },
    { title: "Ateşleme davranışını not edin", text: "Ateşlemenin hiç çalışmadığını, sürekli ses yaptığını veya alevin düzensiz olduğunu hangi gözde görüldüğüyle birlikte yazın." },
    { title: "Yakıt türünü ve modeli paylaşın", text: "Gazlı, elektrikli veya indüksiyonlu olduğunu; model etiketini ve arıza belirtisini servis talebine ekleyin." }
  ],
  "Buzdolabı": [
    { title: "Hava kanallarını kapatmayın", text: "İçerideki hava çıkışlarının yiyeceklerle kapanmadığını ve kapının tam kapandığını kontrol edin; soğutucu gaz devresine müdahale etmeyin." },
    { title: "Conta ve sıcaklığı gözleyin", text: "Kapı contasının dışarıdan gevşek veya yırtık görünmediğini, sıcaklık ayarının değişip değişmediğini not edin." },
    { title: "Su ve buzlanmayı kaydedin", text: "Su birikmesinin yerini, buzlanmanın hangi bölümde oluştuğunu ve sorunun ne zamandır devam ettiğini fotoğrafla belgeleyin." },
    { title: "Gıdaları güvenli taşıyın", text: "Soğutma belirgin biçimde azaldıysa bozulabilir gıdaları güvenli sıcaklıkta koruyun; motor veya elektrik bölümünü açmayın." }
  ],
  "Elektrikli Süpürge": [
    { title: "Toz haznesini boşaltın", text: "Cihazı kapatıp fişini çekin veya bataryalı modeli kapatın. Hazne ve filtreyi kılavuzdaki yönteme göre temizleyin." },
    { title: "Filtreyi kuru takın", text: "Yıkanabilir filtreyi üretici talimatına göre tamamen kurutmadan takmayın; motor bölümüne su temas ettirmeyin." },
    { title: "Kablo ve başlığı gözleyin", text: "Kablo, fiş, başlık ve hortumda dışarıdan görülen hasarı kontrol edin; kabloyu veya motoru açarak onarmaya çalışmayın." },
    { title: "Çalışma süresini not edin", text: "Cihazın ne kadar süre sonra durduğunu, çekiş kaybını, kokuyu ve ısınmayı servis talebine ekleyin." }
  ],
  "Davlumbaz": [
    { title: "Filtreyi kontrol edin", text: "Enerjiyi kapatıp cihaz soğukken metal filtredeki yağ birikimini kılavuzdaki temizlik yöntemiyle giderin; motor bölümünü sökmeyin." },
    { title: "Hava çıkışını gözleyin", text: "Çekişin azaldığı durumda dışarıdan erişilebilen hava kanalında görünür engel olup olmadığını kontrol edin." },
    { title: "Aydınlatmayı ayrı not edin", text: "Motor, aydınlatma ve hız kademelerinden hangisinin çalışmadığını ayrı ayrı belirtin; elektrik bağlantısına müdahale etmeyin." },
    { title: "Koku ve sesi kaydedin", text: "Anormal ses veya yanık kokusu varsa cihazı kullanmayı bırakın ve servis talebine kısa bir ses/video kaydı ekleyin." }
  ],
  "Derin Dondurucu": [
    { title: "Kapı contasını kontrol edin", text: "Contanın dışarıdan kesintisiz temas ettiğini ve kapının tam kapandığını gözleyin; buzları kesici aletle kırmayın." },
    { title: "Buzlanmayı güvenli izleyin", text: "Buzlanmanın yerini ve kalınlığını not edin. Manuel çözdürme gerekiyorsa yalnızca kullanım kılavuzundaki yöntemi uygulayın." },
    { title: "Hava dolaşımını koruyun", text: "İç hava kanallarını ürünlerle kapatmayın ve cihazın çevresindeki havalandırma boşluklarını kapatmayın." },
    { title: "Gıda güvenliğini önceliklendirin", text: "Sıcaklık belirgin biçimde yükseldiyse gıdaları güvenli koşullara taşıyın; kompresör ve soğutma devresini açmayın." }
  ],
  "Su Sebili": [
    { title: "Su bağlantısını gözleyin", text: "Cihazı kapatıp su girişinde dışarıdan görülen kaçak, gevşeme veya kıvrılma olup olmadığını kontrol edin; bağlantıyı sökmeyin." },
    { title: "Damacanayı ve hazneyi kontrol edin", text: "Su seviyesini, damacana oturuşunu ve musluklardan akış durumunu kılavuza uygun biçimde gözleyin." },
    { title: "Temizliği kılavuza göre yapın", text: "Su temas eden yüzeyleri üretici talimatındaki yöntemle temizleyin; elektrikli bölümlere su kaçırmayın." },
    { title: "Sıcak su güvenliğini koruyun", text: "Sıcak su işlevinde sorun varsa cihazı zorlamayın; model, ışık göstergesi, akış ve ses bilgisini servis talebine ekleyin." }
  ]
};

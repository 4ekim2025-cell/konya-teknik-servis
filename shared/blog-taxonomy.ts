/**
 * Blog editörünün seçim listeleri: hizmet bölgeleri, markalar ve cihazlar.
 * Servis kaydı formu bu listelerden seçim yapar; `servicePath` ve `brandPath` buradan otomatik kurulur.
 * Liste sitedeki gerçek sayfalarla birebir eşleşmelidir (test: client/src/blogTaxonomy.test.ts).
 */
/** Hizmet bölgeleri; usta vakasının ilçesi bunlardan biriyle başlar. "Selçuklu · Yazır" gibi mahalle eklenebilir. */
export const BLOG_DISTRICTS = ["Karatay", "Meram", "Selçuklu"] as const;
export type BlogDistrict = (typeof BLOG_DISTRICTS)[number];

export type BlogBrandOption = { slug: string; name: string; path: string };
const brandRows: [string, string][] = [
  ["altus", "Altus"], ["arcelik", "Arçelik"], ["arnica", "Arnica"], ["beko", "Beko"], ["bosch", "Bosch"],
  ["electrolux", "Electrolux"], ["franke", "Franke"], ["grundig", "Grundig"], ["hoover", "Hoover"], ["kumtel", "Kumtel"],
  ["philips", "Philips"], ["profilo", "Profilo"], ["regal", "Regal"], ["rowenta", "Rowenta"], ["samsung", "Samsung"],
  ["siemens", "Siemens"], ["silverline", "Silverline"], ["sinbo", "Sinbo"], ["senocak", "Şenocak"], ["teka", "Teka"],
  ["ugur-sogutma", "Uğur Soğutma"], ["vestel", "Vestel"],
];
export const BLOG_BRANDS: BlogBrandOption[] = brandRows.map(([slug, name]) => ({ slug, name, path: `/${slug}-servisi-konya/` }));

export function brandPathFor(brandName: string): string | undefined {
  return BLOG_BRANDS.find(brand => brand.name === brandName)?.path;
}

export type BlogDeviceOption = {
  /** Yazının `device` alanı; cihaz sayfasındaki arıza rehberiyle aynı adı taşır. */
  device: string;
  /** Cihazın kendi hizmet sayfası. Boşsa (küçük ev aletleri, genel) servis düğmesi markanın ya da iletişim sayfasına gider. */
  servicePath?: string;
};

export const BLOG_DEVICES: BlogDeviceOption[] = [
  { device: "Çamaşır Makinesi", servicePath: "/camasir-makinesi-tamiri-konya/" },
  { device: "Bulaşık Makinesi", servicePath: "/bulasik-makinesi-tamiri-konya/" },
  { device: "Kurutma Makinesi", servicePath: "/kurutma-makinesi-tamiri-konya/" },
  { device: "Buzdolabı", servicePath: "/buzdolabi-tamiri-konya/" },
  { device: "Derin Dondurucu", servicePath: "/derin-dondurucu-tamiri-konya/" },
  { device: "Fırın", servicePath: "/firin-tamiri-konya/" },
  { device: "Ocak", servicePath: "/ocak-tamiri-konya/" },
  { device: "Davlumbaz", servicePath: "/davlumbaz-tamiri-konya/" },
  { device: "Elektrikli Süpürge", servicePath: "/elektrikli-supurge-tamiri-konya/" },
  { device: "Su Sebili", servicePath: "/su-sebili-tamiri-konya/" },
  { device: "Küçük Ev Aletleri" },
  { device: "Genel" },
];

export const SMALL_APPLIANCE_DEVICE = "Küçük Ev Aletleri";
export const GENERAL_DEVICE = "Genel";
/** "Genel" yazılarda servis düğmesinin gidebileceği sayfalar. */
export const GENERAL_SERVICE_PATHS: { path: string; label: string }[] = [
  { path: "/iletisim/", label: "İletişim" },
  { path: "/online-servis-takibi/", label: "Online servis takibi" },
];
/** Küçük ev aletlerinde servis kaydında görünen cihaz adı için hazır öneriler (serbest metin de yazılabilir). */
export const SMALL_APPLIANCE_SUGGESTIONS = ["Airfryer", "Dikey süpürge", "Kahve makinesi", "Ütü", "Blender", "Su ısıtıcısı", "Tost makinesi"];

export function deviceOption(device: string): BlogDeviceOption | undefined {
  return BLOG_DEVICES.find(option => option.device === device);
}

/** "Çamaşır Makinesi" → "Çamaşır makinesi" (servis kaydında görünen varsayılan ad). */
export function defaultCaseDeviceName(device: string): string {
  const lower = device.toLocaleLowerCase("tr-TR");
  return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
}

/**
 * Cihaz ve marka seçiminden yazının otomatik alanlarını kurar.
 *  - Cihazın kendi sayfası varsa `servicePath` o sayfadır.
 *  - Küçük ev aletlerinde servis düğmesi markanın sayfasına gider ("<Marka> servisi").
 *  - "Genel" yazılarda `servicePath` verilen iletişim/takip sayfasıdır.
 */
export function derivedServiceFields(input: { device: string; brand?: string; generalPath?: string }): { servicePath?: string; brandPath?: string; serviceLabel?: string } {
  const option = deviceOption(input.device);
  const brandPath = input.brand ? brandPathFor(input.brand) : undefined;
  if (option?.servicePath) return { servicePath: option.servicePath, ...(brandPath ? { brandPath } : {}) };
  if (input.device === SMALL_APPLIANCE_DEVICE) {
    return brandPath && input.brand ? { servicePath: brandPath, brandPath, serviceLabel: `${input.brand} servisi` } : {};
  }
  if (input.device === GENERAL_DEVICE) return { servicePath: input.generalPath ?? GENERAL_SERVICE_PATHS[0].path, ...(brandPath ? { brandPath } : {}) };
  return brandPath ? { brandPath } : {};
}

/** Servis kaydındaki ilçe metni ("Selçuklu · Yazır") yalnızca hizmet bölgesi adını döndürür. */
export function districtOf(caseDistrict: string): BlogDistrict | undefined {
  return BLOG_DISTRICTS.find(name => caseDistrict.startsWith(name));
}

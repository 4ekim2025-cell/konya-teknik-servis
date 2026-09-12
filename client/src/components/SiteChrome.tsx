import { ReactNode, useEffect, useRef, useState } from "react";
import { ChevronDown, Clock3, Droplets, Fan, Flame, Gauge, House, Info, LayoutGrid, MapPin, Menu, MessageCircle, Mail, Phone, Refrigerator, Sparkles, Tags, WashingMachine, Wrench, X } from "lucide-react";
import { useLocation } from "wouter";
import { SITE_PHONE_DISPLAY, SITE_PHONE_HREF, SITE_WHATSAPP_LINK } from "@/siteConfig";

export const contactPhone = SITE_PHONE_DISPLAY;
export const contactPhoneHref = SITE_PHONE_HREF;
export const contactEmail = "bilgi@esliteknik.com";
export const whatsappLink = SITE_WHATSAPP_LINK;

const services = [
  { name: "Çamaşır Makinesi", href: "/camasir-makinesi-tamiri-konya/", Icon: WashingMachine, note: "Bakım ve arıza" },
  { name: "Bulaşık Makinesi", href: "/bulasik-makinesi-tamiri-konya/", Icon: Sparkles, note: "Yıkama ve tahliye" },
  { name: "Kurutma Makinesi", href: "/kurutma-makinesi-tamiri-konya/", Icon: Fan, note: "Kurutma ve ısıtma" },
  { name: "Fırın", href: "/firin-tamiri-konya/", Icon: Gauge, note: "Isıtma ve panel" },
  { name: "Ocak", href: "/ocak-tamiri-konya/", Icon: Flame, note: "Ateşleme ve gözler" },
  { name: "Buzdolabı", href: "/buzdolabi-tamiri-konya/", Icon: Refrigerator, note: "Soğutma desteği" },
  { name: "Elektrikli Süpürge", href: "/elektrikli-supurge-tamiri-konya/", Icon: Wrench, note: "Çekiş ve motor" },
  { name: "Davlumbaz", href: "/davlumbaz-tamiri-konya/", Icon: Fan, note: "Motor ve filtre" },
  { name: "Derin Dondurucu", href: "/derin-dondurucu-tamiri-konya/", Icon: Refrigerator, note: "Dondurma desteği" },
  { name: "Su Sebili", href: "/su-sebili-tamiri-konya/", Icon: Droplets, note: "Sıcak ve soğuk su" },
];

const navItems = [
  { label: "Hizmetlerimiz", hint: "Cihaz ve tamir", href: "/#hizmetler", Icon: Wrench },
  { label: "Online Takip", hint: "Anlık iş durumu", href: "/online-servis-takibi/", Icon: LayoutGrid },
  { label: "İletişim", hint: "Bize ulaşın", href: "/iletisim/", Icon: MapPin },
];

const commonIssues = [
  { name: "Makine su almıyor", href: "/camasir-makinesi-tamiri-konya/" },
  { name: "Bulaşık makinesi su boşaltmıyor", href: "/bulasik-makinesi-tamiri-konya/" },
  { name: "Buzdolabı soğutmuyor", href: "/buzdolabi-tamiri-konya/" },
  { name: "Fırın ısıtmıyor", href: "/firin-tamiri-konya/" },
];

const brands = [
  { name: "Altus", href: "/altus-servisi-konya/" }, { name: "Arçelik", href: "/arcelik-servisi-konya/" },
  { name: "Arnica", href: "/arnica-servisi-konya/" }, { name: "Beko", href: "/beko-servisi-konya/" },
  { name: "Bosch", href: "/bosch-servisi-konya/" }, { name: "Electrolux", href: "/electrolux-servisi-konya/" },
  { name: "Franke", href: "/franke-servisi-konya/" }, { name: "Hoover", href: "/hoover-servisi-konya/" },
  { name: "Kumtel", href: "/kumtel-servisi-konya/" }, { name: "Philips", href: "/philips-servisi-konya/" },
  { name: "Profilo", href: "/profilo-servisi-konya/" }, { name: "Regal", href: "/regal-servisi-konya/" }, { name: "Rowenta", href: "/rowenta-servisi-konya/" },
  { name: "Samsung", href: "/samsung-servisi-konya/" }, { name: "Siemens", href: "/siemens-servisi-konya/" },
  { name: "Silverline", href: "/silverline-servisi-konya/" }, { name: "Şenocak", href: "/senocak-servisi-konya/" },
  { name: "Teka", href: "/teka-servisi-konya/" }, { name: "Uğur Soğutma", href: "/ugur-sogutma-servisi-konya/" },
  { name: "Vestel", href: "/vestel-servisi-konya/" },
];

const brandColumns = [
  brands.filter((_, index) => index % 3 === 0),
  brands.filter((_, index) => index % 3 === 1),
  brands.filter((_, index) => index % 3 === 2),
];

const RECENT_SERVICE_KEY = "esli-teknik-last-service";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [brandsMegaOpen, setBrandsMegaOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [recentService, setRecentService] = useState<string | null>(null);
  const [location] = useLocation();
  const servicesMenuRef = useRef<HTMLDivElement>(null);
  const brandsMenuRef = useRef<HTMLDivElement>(null);
  const normalized = location.endsWith("/") ? location : `${location}/`;
  const active = (href: string) => href === "/" ? normalized === "/" : normalized === href;
  const servicesActive = services.some(({ href }) => active(href));
  const brandsActive = brands.some(({ href }) => active(href)) || active("/tum-markalar/");
  const rememberedService = recentService ? services.find(({ href }) => href === recentService) : undefined;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(RECENT_SERVICE_KEY);
      if (saved && services.some(({ href }) => href === saved)) setRecentService(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (!megaOpen && !brandsMegaOpen) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (servicesMenuRef.current && !servicesMenuRef.current.contains(target)) setMegaOpen(false);
      if (brandsMenuRef.current && !brandsMenuRef.current.contains(target)) setBrandsMegaOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMegaOpen(false);
        setBrandsMegaOpen(false);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [megaOpen, brandsMegaOpen]);

  const remember = (href: string) => {
    try { window.localStorage.setItem(RECENT_SERVICE_KEY, href); } catch {}
    setRecentService(href);
  };
  const closeMobile = () => {
    setMobileOpen(false);
    setMobileServicesOpen(false);
  };
  const follow = (href: string, mobile = false) => {
    remember(href);
    setMegaOpen(false);
    setBrandsMegaOpen(false);
    if (mobile) closeMobile();
  };

  return <header className="site-header">
    <div className="header-row">
      <nav className="desktop-nav desktop-nav-left" aria-label="Ana menü başlangıcı">
        <a href="/" className={active("/") ? "active" : ""} aria-current={active("/") ? "page" : undefined}>
          <House size={17} /><span className="desktop-nav-label"><span>Ana Sayfa</span><small>Başlangıç</small></span>
        </a>
        <a href="/hakkimizda/" className={active("/hakkimizda/") ? "active" : ""} aria-current={active("/hakkimizda/") ? "page" : undefined}>
          <Info size={17} /><span className="desktop-nav-label"><span>Hakkımızda</span><small>Bizi tanıyın</small></span>
        </a>
        <div className="brands-menu-wrap" ref={brandsMenuRef}>
          <button type="button" className={`desktop-brands-trigger ${brandsMegaOpen ? "open" : ""} ${brandsActive ? "active" : ""}`} onClick={() => { setMegaOpen(false); setBrandsMegaOpen(!brandsMegaOpen); }} aria-expanded={brandsMegaOpen} aria-haspopup="menu">
            <Tags size={17} /><span className="desktop-nav-label"><span>Markalar</span><small>20 servis rehberi</small></span><ChevronDown size={13} />
          </button>
          {brandsMegaOpen && <div className="brands-mega-menu" role="menu" aria-label="Hizmet verdiğimiz markalar">
            <div className="brands-mega-intro"><b><Tags size={17} />Hizmet verdiğimiz markalar</b><p>Markanıza özel servis, arıza ve tamir rehberini seçin.</p></div>
            <div className="brands-mega-grid">{brandColumns.map((column, index) => <div className="brands-mega-column" key={`brand-column-${index}`}>{column.map(({ name, href }) => <a href={href} key={href} onClick={() => setBrandsMegaOpen(false)}><span>{name.slice(0, 1)}</span><strong>{name}</strong><i>→</i></a>)}</div>)}</div>
          </div>}
        </div>
      </nav>

      <a className="brand" href="/" aria-label="EŞLİ TEKNİK ana sayfa" />

      <nav className="desktop-nav desktop-nav-right" aria-label="Ana menü devamı">
        <a href="/#hizmetler" className={servicesActive ? "active" : ""} aria-current={servicesActive ? "page" : undefined}>
          <Wrench size={17} /><span className="desktop-nav-label"><span>Hizmetlerimiz</span><small>Cihaz ve tamir</small></span>
        </a>
        {navItems.slice(1).map(({ label, hint, href, Icon }) => <a href={href} className={active(href) ? "active" : ""} aria-current={active(href) ? "page" : undefined} key={label}>
          <Icon size={17} /><span className="desktop-nav-label"><span>{label}</span><small>{hint}</small></span>
        </a>)}
      </nav>

      <button className="nav-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen} aria-label="Menüyü aç veya kapat">{mobileOpen ? <X /> : <Menu />}</button>
    </div>

    <div className="header-subrow">
      <div className="services-menu-wrap subrow-services" ref={servicesMenuRef}>
        <button type="button" className={`services-nav ${megaOpen ? "open" : ""} ${servicesActive ? "active" : ""}`} onClick={() => { setBrandsMegaOpen(false); setMegaOpen(!megaOpen); }} aria-expanded={megaOpen} aria-haspopup="menu"><Wrench size={15} /><span>Hizmetler</span><ChevronDown size={13} /></button>
        {megaOpen && <div className="mega-menu" role="menu">
          <div className="mega-services"><b><Wrench size={16} />Cihaz kategorileri</b><div className="mega-services-grid">{services.map(({ name, href, Icon, note }) => <a href={href} onClick={() => follow(href)} className="mega-service-card" key={href}><span><Icon size={21} /></span><strong>{name}</strong><small>{note}</small></a>)}</div></div>
          <div className="mega-column"><b><MapPin size={16} />Hizmet bölgeleri</b><a href="/karatay/">Karatay</a><a href="/meram/">Meram</a><a href="/selcuklu/">Selçuklu</a></div>
          <div className="mega-column mega-quick-links"><b><MessageCircle size={16} />Hızlı erişim</b><a href="/online-servis-takibi/">Online Servis Takibi</a><a href="/tum-markalar/">Hizmet Verilen Markalar</a><a href="/sss/">Sık Sorulan Sorular</a>{rememberedService && <><b className="recent-heading"><Clock3 size={15} />Son görüntülenen</b><a className="recent-service" href={rememberedService.href} onClick={() => follow(rememberedService.href)}><rememberedService.Icon size={16} /><span>{rememberedService.name}</span><i>→</i></a></>}<b className="issue-heading"><Wrench size={15} />Sık görülen arızalar</b>{commonIssues.map(({ name, href }) => <a href={href} onClick={() => setMegaOpen(false)} className="issue-link" key={name}>{name}<span>→</span></a>)}</div>
        </div>}
      </div>
      <a className="preform-shortcut" href="/#on-bilgi-formu" aria-label="WhatsApp üzerinden hızlı servis talebi oluştur"><MessageCircle size={14} /><span>Hızlı servis talebi</span></a>
      <p><span className="live-dot" />Konya’da online takipli teknik servis</p>
      <a href="/online-servis-takibi/">Takip nasıl çalışır? →</a>
      <a href="/kvkk/">KVKK</a>
      <a href="/blog/" className="header-blog-link">Bilgi Merkezi</a>
    </div>

    {mobileOpen && <nav className="mobile-nav" aria-label="Mobil menü">
      <a href="/" className={active("/") ? "active" : ""} onClick={closeMobile}><House size={17} /><span>Ana Sayfa</span></a>
      <a className="mobile-nav-item" href="/hakkimizda/" onClick={closeMobile}><Info size={17} /><span>Hakkımızda</span></a>
      <a className="mobile-nav-item" href="/tum-markalar/" onClick={closeMobile}><Tags size={17} /><span>Markalar</span></a>
      <button type="button" className={`mobile-services-toggle ${mobileServicesOpen ? "open" : ""} ${servicesActive ? "active" : ""}`} onClick={() => setMobileServicesOpen(!mobileServicesOpen)} aria-expanded={mobileServicesOpen}><Wrench size={17} /><span>Hizmetlerimiz</span><ChevronDown size={16} /></button>
      {mobileServicesOpen && <div className="mobile-service-accordion">{services.map(({ name, href, Icon, note }) => <a href={href} onClick={() => follow(href, true)} key={href}><Icon size={16} /><span>{name}<small>{note}</small></span><span>→</span></a>)}</div>}
      {navItems.slice(1).map(({ label, href, Icon }) => <a href={href} onClick={closeMobile} className={active(href) ? "active" : ""} aria-current={active(href) ? "page" : undefined} key={label}><Icon size={17} /><span>{label}</span></a>)}
      <a className="mobile-nav-item" href="/kvkk/" onClick={closeMobile}><Info size={17} /><span>KVKK</span></a>
      <a className="mobile-contact" target="_blank" rel="noreferrer" href={whatsappLink}><MessageCircle size={17} />WhatsApp’tan Yazın</a>
    </nav>}
  </header>;
}

export function Footer() {
  return <footer className="site-footer"><div className="footer-top"><p>EŞLİ TEKNİK, Konya’da beyaz eşya ve küçük ev aletleri için aynı gün servis, orijinal parça ve online iş takibi sunar.</p><a className="footer-phone" href={contactPhoneHref}><Phone size={18} />{contactPhone}</a></div><div className="footer-links"><div><h3>Hizmetler</h3>{services.slice(0, 4).map(({ name, href }) => <a key={href} href={href}>{name}</a>)}</div><div><h3>Konya’da Servis</h3><a href="/karatay/">Karatay</a><a href="/meram/">Meram</a><a href="/selcuklu/">Selçuklu</a><a href="/tum-markalar/">Hizmet Verilen Markalar</a></div><div><h3>Bilgi Merkezi</h3><a href="/blog/">Arıza Rehberleri</a><a className="footer-preform" href="/#on-bilgi-formu"><Wrench size={14} />Ön Bilgi Formu</a><a href="/online-servis-takibi/">Online İş Takibi</a><a href="/sss/">Sık Sorulan Sorular</a></div><div className="footer-policy-links"><h3>Yasal ve İletişim</h3><a href="/kvkk/">KVKK Aydınlatma Metni</a><a href="/gizlilik-politikasi/">Gizlilik Politikası</a><a href="/cerez-politikasi/">Çerez Politikası</a><a href="/iletisim/">İletişim</a></div><div><h3>İletişim</h3><span><Clock3 size={14} />Her gün 08:00–22:00</span><span><MapPin size={14} />Gaziosmanpaşa Mah. Menzil Cad. No:70 Karatay/KONYA</span><span><MapPin size={14} />Karatay · Meram · Selçuklu</span><a href={`mailto:${contactEmail}`}><Mail size={14} />{contactEmail}</a><a target="_blank" rel="noreferrer" href={whatsappLink}><MessageCircle size={14} />WhatsApp’tan yazın</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} EŞLİ TEKNİK.</span><div><a href="/kvkk/">KVKK</a></div></div></footer>;
}

export function FloatingActions() {
  const openSmartInfo = () => {
    if (document.querySelector(".smart-info-section")) {
      window.dispatchEvent(new Event("esli:open-smart-info"));
      return;
    }
    try { window.sessionStorage.setItem("esli-open-smart-info", "1"); } catch {}
    window.location.href = "/#on-bilgi-formu";
  };
  return <><a className="floating-whatsapp" href={whatsappLink} target="_blank" rel="noreferrer"><MessageCircle size={20} /><span>WhatsApp’tan Yazın</span></a><div className="mobile-action-bar"><a className="mobile-call-action" href={contactPhoneHref} aria-label="EŞLİ TEKNİK’i hemen ara"><Phone size={18} />Hemen ara</a><button type="button" className="mobile-preform-action" onClick={openSmartInfo} aria-label="Hızlı servis talebi oluştur" aria-haspopup="dialog"><span className="mobile-whatsapp-mark" aria-hidden="true"><MessageCircle size={20} /><Phone size={9} /></span>Hızlı servis talebi oluştur</button></div></>;
}

export function SiteChrome({ children }: { children: ReactNode }) {
  return <><Header /><main>{children}</main><Footer /><FloatingActions /></>;
}

/** TASARIM NOTU — Koyu Teknik Servis Komuta Merkezi: beyaz üst çubuk, kömür zemin, kırmızı kritik aksiyonlar. */
import { FormEvent, ReactNode, useState } from "react";
import { ChevronDown, Clock3, MapPin, Menu, MessageCircle, Phone, Search, Wrench, X } from "lucide-react";

export const contactPhone = "0555 555 55 55";
export const whatsappLink = "https://wa.me/905555555555?text=Merhaba%2C%20cihaz%C4%B1m%20i%C3%A7in%20servis%20talebi%20olu%C5%9Fturmak%20istiyorum.";

const services = [
  ["Çamaşır Makinesi", "/camasir-makinesi-tamiri-konya/"], ["Bulaşık Makinesi", "/bulasik-makinesi-tamiri-konya/"],
  ["Buzdolabı", "/buzdolabi-tamiri-konya/"], ["Fırın & Ocak", "/firin-ocak-tamiri-konya/"],
  ["Ankastre Set", "/ankastre-set-montaj/"], ["Küçük Ev Aletleri", "/kucuk-ev-aletleri-tamiri/"],
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [query, setQuery] = useState("");
  function onSearch(event: FormEvent<HTMLFormElement>) { event.preventDefault(); window.location.href = "/#hizmetler"; }
  return <header className="site-header">
    <div className="header-row">
      <a className="brand" href="/" aria-label="Konya Teknik Servis ana sayfa"><img src="/manus-storage/konya-teknik-logo_ab71dae1.png" alt="" /><span><strong>KONYA TEKNİK</strong><small>SERVİS</small></span></a>
      <nav className="desktop-nav" aria-label="Ana menü"><a href="/">Ana Sayfa</a><a href="/#hizmetler">Hizmetler</a><a href="/online-servis-takibi/">Online Takip</a><a href="/sss/">Sık Sorulanlar</a><a href="/blog/">Blog</a><a href="/iletisim/">İletişim</a></nav>
      <div className="desktop-tools"><form className="smart-search" role="search" onSubmit={onSearch}><Search size={14}/><input aria-label="Cihaz veya arıza ara" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cihaz veya arıza ara..." /></form><a className="header-phone" href="tel:+905555555555"><Phone size={14}/>{contactPhone}</a><a className="header-support" href={whatsappLink} target="_blank" rel="noreferrer"><MessageCircle size={14}/>WhatsApp</a></div>
      <button className="nav-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen} aria-label="Menüyü aç veya kapat">{mobileOpen ? <X/> : <Menu/>}</button>
    </div>
    <div className="header-subrow"><button className="mega-trigger" onClick={() => setMegaOpen(!megaOpen)} aria-expanded={megaOpen}><Menu size={15}/>Tüm Hizmetler<ChevronDown size={14}/></button><p><span className="live-dot"/>Konya’da online takipli teknik servis</p><a href="/online-servis-takibi/">Takip nasıl çalışır? →</a></div>
    {megaOpen && <div className="mega-menu"><div><b><Wrench size={15}/>Hizmetler</b>{services.map(([name, href]) => <a href={href} key={href}>{name}</a>)}</div><div><b><MapPin size={15}/>Hizmet Bölgeleri</b><a href="/karatay/">Karatay</a><a href="/meram/">Meram</a><a href="/selcuklu/">Selçuklu</a></div><div><b><MessageCircle size={15}/>Bilgi Merkezi</b><a href="/online-servis-takibi/">Online Servis Takibi</a><a href="/tum-markalar/">Tüm Markalar</a><a href="/sss/">Sık Sorulan Sorular</a></div></div>}
    {mobileOpen && <nav className="mobile-nav" aria-label="Mobil menü"><a href="/">Ana Sayfa</a><a href="/#hizmetler">Hizmetler</a><a href="/online-servis-takibi/">Online Takip</a><a href="/tum-markalar/">Markalar</a><a href="/sss/">Sık Sorulanlar</a><a href="/iletisim/">İletişim</a><a className="mobile-contact" target="_blank" rel="noreferrer" href={whatsappLink}><MessageCircle size={17}/>WhatsApp’tan Yazın</a></nav>}
  </header>;
}

export function Footer() {
  return <footer className="site-footer"><div className="footer-top"><a className="brand" href="/"><img src="/manus-storage/konya-teknik-logo_ab71dae1.png" alt=""/><span><strong>KONYA TEKNİK</strong><small>SERVİS</small></span></a><p>Konya’da beyaz eşya ve küçük ev aletleri için aynı gün servis, orijinal parça ve online iş takibi.</p><a className="footer-phone" href="tel:+905555555555"><Phone size={18}/>{contactPhone}</a></div><div className="footer-links"><div><h3>Hizmetler</h3>{services.slice(0,4).map(([n,h])=><a key={h} href={h}>{n}</a>)}</div><div><h3>Konya’da Servis</h3><a href="/karatay/">Karatay</a><a href="/meram/">Meram</a><a href="/selcuklu/">Selçuklu</a><a href="/tum-markalar/">Tüm Markalar</a></div><div><h3>Bilgi Merkezi</h3><a href="/online-servis-takibi/">Online İş Takibi</a><a href="/sss/">Sık Sorulan Sorular</a><a href="/blog/">Blog</a><a href="/hakkimizda/">Hakkımızda</a></div><div><h3>İletişim</h3><span><Clock3 size={14}/>Her gün 08:00–22:00</span><span><MapPin size={14}/>Karatay · Meram · Selçuklu</span><a target="_blank" rel="noreferrer" href={whatsappLink}><MessageCircle size={14}/>WhatsApp’tan yazın</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Konya Teknik Servis.</span><div><a href="/kvkk/">KVKK</a><a href="/garanti-kosullari/">Garanti ve Koşullar</a></div></div></footer>;
}

export function FloatingActions() { return <><a className="floating-whatsapp" href={whatsappLink} target="_blank" rel="noreferrer"><MessageCircle size={20}/><span>WhatsApp’tan Yazın</span></a><div className="mobile-action-bar"><a href="tel:+905555555555"><Phone size={18}/>Hemen Ara</a><a href={whatsappLink} target="_blank" rel="noreferrer"><MessageCircle size={18}/>WhatsApp</a></div></>; }

export function SiteChrome({children}:{children:ReactNode}) { return <><Header/><main>{children}</main><Footer/><FloatingActions/></>; }

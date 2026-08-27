/** TASARIM NOTU — Koyu Teknik Servis Komuta Merkezi: bütün rotalarda tutarlı kontrast, yerel iletişim ve görünür WhatsApp aksiyonları. */
import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useLocation } from "wouter";
import Home from "./pages/Home";
import ContentPage from "./pages/ContentPage";

function Routes() {
  const [location] = useLocation();
  const path = location.endsWith("/") ? location : `${location}/`;
  useEffect(() => {
    const targetId = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : "";
    if (targetId) {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ block: "start" })));
    } else {
      window.scrollTo(0, 0);
    }
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.setAttribute("rel", "canonical"); document.head.append(canonical); }
    canonical.setAttribute("href", `${window.location.origin}${path}`);
    document.getElementById("konya-teknik-schema")?.remove();
    const isService = path.includes("tamiri") || path.includes("montaj") || path.includes("servisi-konya");
    const graph: Record<string, unknown>[] = [
      { "@context": "https://schema.org", "@type": "ProfessionalService", name: "EŞLİ TEKNİK", description: "Konya’da beyaz eşya ve küçük ev aletleri için WhatsApp üzerinden servis talebi ve online iş takibi sunan teknik servis.", url: window.location.href, areaServed: ["Karatay, Konya", "Meram, Konya", "Selçuklu, Konya"], serviceType: ["Beyaz eşya teknik servisi", "Küçük ev aletleri teknik servisi", "Online servis takibi"], availableLanguage: "tr" },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Ana Sayfa", item: window.location.origin }, { "@type": "ListItem", position: 2, name: document.title, item: window.location.href }] },
    ];
    if (isService) graph.push({ "@context": "https://schema.org", "@type": "Service", name: document.title, serviceType: "Beyaz eşya ve küçük ev aletleri teknik servisi", areaServed: ["Karatay", "Meram", "Selçuklu"], provider: { "@type": "ProfessionalService", name: "EŞLİ TEKNİK" } });
    if (path === "/sss/" || path === "/online-servis-takibi/") graph.push({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "İş takip linki nedir, nasıl çalışır?", acceptedAnswer: { "@type": "Answer", text: "Servis kaydı açıldıktan sonra WhatsApp üzerinden müşteriye özel takip bağlantısı iletilir." } }, { "@type": "Question", name: "Takip linkim kayboldu, ne yapmalıyım?", acceptedAnswer: { "@type": "Answer", text: "WhatsApp üzerinden iletişime geçilerek kayıt doğrulamasından sonra bağlantı yeniden paylaşılabilir." } }] });
    const script = document.createElement("script"); script.id = "konya-teknik-schema"; script.type = "application/ld+json"; script.text = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }); document.head.append(script);
  }, [path]);
  return path === "/" ? <Home /> : <ContentPage path={path} />;
}

export default function App() { return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Routes /></TooltipProvider></ThemeProvider></ErrorBoundary>; }

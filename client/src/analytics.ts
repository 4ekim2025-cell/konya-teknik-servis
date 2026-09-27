/**
 * Google Analytics 4 — yalnızca ziyaretçi çerez bildiriminde "Kabul et" dediğinde yüklenir (temel onay modu).
 * Onay yoksa hiçbir Google isteği yapılmaz, çerez yazılmaz. Reklam/kişiselleştirme sinyalleri kapalıdır.
 * WhatsApp ve telefon tıklamaları sayfa ve konum bilgisiyle "whatsapp_click" / "phone_click" olarak ölçülür.
 * Önizleme ve geliştirme ortamında Google betiği yüklenmez; olaylar yalnızca window.dataLayer'a yazılır.
 */

export const GA_MEASUREMENT_ID = "G-CBLYCZBBY0";
export const CONSENT_STORAGE_KEY = "esli-cerez-tercihi";
export const CONSENT_REOPEN_EVENT = "esli-cerez-tercihleri";
const PRODUCTION_HOSTS = ["esliteknik.com", "www.esliteknik.com"];

export type ConsentChoice = "granted" | "denied";
export type ContactKind = "whatsapp" | "phone";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

let analyticsLoaded = false;
let trackingInstalled = false;

export function readConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function saveConsent(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    /* Tarayıcı depolamaya izin vermiyorsa tercih yalnızca bu oturumda geçerli olur. */
  }
  if (choice === "granted") loadAnalytics();
  else disableAnalytics();
}

export function loadAnalytics() {
  if (typeof window === "undefined") return;
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
  if (analyticsLoaded) return;
  analyticsLoaded = true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js, dizi değil "arguments" nesnesi bekler.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  if (!PRODUCTION_HOSTS.includes(window.location.hostname)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.append(script);
}

function disableAnalytics() {
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  const domain = window.location.hostname.replace(/^www\./, "");
  document.cookie.split(";").map(cookie => cookie.split("=")[0].trim()).filter(name => name === "_ga" || name.startsWith("_ga_")).forEach(name => {
    document.cookie = `${name}=; Max-Age=0; path=/`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
  });
}

export function contactKind(href: string): ContactKind | null {
  if (href.startsWith("tel:")) return "phone";
  if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\//i.test(href) || href.startsWith("whatsapp:")) return "whatsapp";
  return null;
}

export function contactPlacement(link: Element): string {
  if (link.closest(".mobile-action-bar")) return "mobil_alt_cubuk";
  if (link.closest(".floating-whatsapp")) return "sabit_whatsapp";
  if (link.closest(".site-header")) return "ust_menu";
  if (link.closest(".site-footer")) return "alt_bilgi";
  return "sayfa_ici";
}

export function trackContact(kind: ContactKind, placement: string) {
  if (!analyticsLoaded || !window.gtag || window[`ga-disable-${GA_MEASUREMENT_ID}`]) return;
  window.gtag("event", kind === "whatsapp" ? "whatsapp_click" : "phone_click", { placement, page_path: window.location.pathname });
}

export function installContactTracking() {
  if (trackingInstalled || typeof document === "undefined") return;
  trackingInstalled = true;
  document.addEventListener("click", event => {
    const link = (event.target as Element | null)?.closest?.("a[href]");
    if (!link) return;
    const kind = contactKind(link.getAttribute("href") ?? "");
    if (kind) trackContact(kind, contactPlacement(link));
  }, { capture: true });
}

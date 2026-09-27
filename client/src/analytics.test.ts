import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GA_MEASUREMENT_ID, contactKind } from "./analytics";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");
const analytics = read("client/src/analytics.ts");
const consent = read("client/src/components/CookieConsent.tsx");
const app = read("client/src/App.tsx");
const chrome = read("client/src/components/SiteChrome.tsx");
const page = read("client/src/pages/ContentPage.tsx");
const indexHtml = read("client/index.html");

describe("Google Analytics ve çerez onayı", () => {
  it("GA4 betiğini yalnızca onaydan sonra ve yalnızca canlı alan adında yükler", () => {
    expect(GA_MEASUREMENT_ID).toBe("G-CBLYCZBBY0");
    expect(indexHtml).not.toContain("googletagmanager.com");
    expect(analytics).toContain('if (choice === "granted") loadAnalytics();');
    expect(analytics).toContain('const PRODUCTION_HOSTS = ["esliteknik.com", "www.esliteknik.com"];');
    expect(analytics).toContain("ad_storage: \"denied\"");
    expect(analytics).toContain("allow_google_signals: false");
  });

  it("onay şeridinde reddetme kabul etmek kadar kolaydır ve tercih sonradan değiştirilebilir", () => {
    expect(consent).toContain('onClick={()=>choose("denied")}>Reddet</button>');
    expect(consent).toContain('onClick={()=>choose("granted")}>Kabul et</button>');
    expect(app).toContain("<CookieConsent/>");
    expect(chrome).toContain("Çerez Tercihleri</button>");
    expect(read("shared/legal-pages.ts")).toContain('{title:"Google Analytics",paragraphs:');
  });

  it("WhatsApp ve telefon bağlantılarını ayırt eder", () => {
    expect(contactKind("https://wa.me/905511858773?text=Merhaba")).toBe("whatsapp");
    expect(contactKind("tel:+905511858773")).toBe("phone");
    expect(contactKind("/iletisim/")).toBeNull();
    expect(analytics).toContain('"whatsapp_click" : "phone_click"');
    expect(read("client/src/components/SmartInfoModal.tsx")).toContain('trackContact("whatsapp", "on_bilgi_formu");');
    expect(read("client/src/pages/Home.tsx")).toContain('trackContact("whatsapp","ariza_formu");');
  });
});

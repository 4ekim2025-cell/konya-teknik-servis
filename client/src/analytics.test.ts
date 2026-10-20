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
  it("GA4 betiğini site açılır açılmaz herkese ve yalnızca canlı alan adında yükler", () => {
    expect(GA_MEASUREMENT_ID).toBe("G-CBLYCZBBY0");
    expect(indexHtml).not.toContain("googletagmanager.com");
    expect(consent).toContain('loadAnalytics();if(readConsent()!=="granted")setOpen(true);');
    expect(read("shared/legal-pages.ts")).toContain("“Reddet” seçeneğini işaretlerseniz siteden ayrılırsınız");
    expect(analytics).toContain('const PRODUCTION_HOSTS = ["esliteknik.com", "www.esliteknik.com"];');
    expect(analytics).toContain("ad_storage: \"denied\"");
    expect(analytics).toContain("allow_google_signals: false");
  });

  it("onay şeridinde Reddet ziyaretçiyi boş sayfaya yönlendirir ve şerit sonradan yeniden açılabilir", () => {
    expect(consent).toContain("Size verdiğimiz hizmetlerimizi geliştirmek için çerezleri kullanıyoruz.");
    expect(consent).toContain('window.location.replace("about:blank")');
    expect(consent).toContain("onClick={reject}>Reddet</button>");
    expect(consent).toContain("onClick={accept}>Kabul et</button>");
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

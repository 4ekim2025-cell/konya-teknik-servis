import { describe, expect, it } from "vitest";
import {
  SITE_PHONE_DIGITS,
  SITE_PHONE_DISPLAY,
  SITE_PHONE_HREF,
  SITE_WHATSAPP_HREF,
  SITE_WHATSAPP_LINK,
} from "./siteConfig";

describe("site contact configuration", () => {
  it("keeps phone, tel and WhatsApp destinations on one number", () => {
    expect(SITE_PHONE_DISPLAY).toBe("0551 185 87 73");
    expect(SITE_PHONE_DIGITS).toBe("905511858773");
    expect(SITE_PHONE_HREF).toBe("tel:+905511858773");
    expect(SITE_WHATSAPP_HREF).toBe("https://wa.me/905511858773");
    expect(SITE_WHATSAPP_LINK).toContain("https://wa.me/905511858773?text=");
  });
});

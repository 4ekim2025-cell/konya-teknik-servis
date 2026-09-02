import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");

describe("AKILLI ÖN BİLGİ KVKK bildirimi", () => {
  it("WhatsApp servis talebi açıklamasını doğru panelde gösterir", () => {
    expect(home).toContain('className="diagnostic-privacy-note"');
    expect(home).toContain("WhatsApp üzerinden servis talebi oluşturmanız halinde paylaşacağınız kişisel bilgileriniz");
    expect(home).toContain("Eşli Teknik tarafından işlenecektir.");
    expect(home).toContain("Detaylı bilgi için KVKK Aydınlatma Metnimizi inceleyebilirsiniz.");
  });
});

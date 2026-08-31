import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const page = readFileSync(resolve(root, "client/src/pages/ContentPage.tsx"), "utf8");
const styles = readFileSync(resolve(root, "client/src/index.css"), "utf8");

describe("online takip alt sayfa standardı", () => {
  it("KVKK ile uyumlu Simple hero ve belge düzenini kullanır", () => {
    expect(page).toContain('className="tracking-page"');
    expect(page).toContain('<Simple kicker="ONLINE SERVİS TAKİBİ"');
    expect(page).toContain('className="tracking-standard-layout"');
    expect(page).toContain('className="tracking-standard-document"');
    expect(page).toContain('className="tracking-standard-aside"');
  });

  it("kartlı süreç adımları ve duyarlı takip yerleşimi tanımlar", () => {
    expect(styles).toContain(".tracking-standard-stages article{display:grid;grid-template-columns:44px minmax(0,1fr);");
    expect(styles).toContain(".tracking-standard-layout{grid-template-columns:1fr;gap:18px;width:100%;margin:-30px auto 0;");
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

describe("sayfa kodu yüklenemezse statik içerik korunur", () => {
  it("prerender içeriği React başlamadan önce saklanır", () => {
    expect(read("client/src/main.tsx")).toContain("savePrerenderedHtml(rootElement);\ncreateRoot(rootElement)");
  });

  it("sayfa kodu yeniden denenir ve yüklenirken statik içerik gösterilir", () => {
    const app = read("client/src/App.tsx");
    expect(app).toContain('const ContentPage=lazyWithRetry(()=>import("./pages/ContentPage"));');
    expect(app).toContain("<Suspense fallback={<RouteFallback/>}>");
    expect(app).toContain('dangerouslySetInnerHTML={{__html:html}}/>:<PageSkeleton/>');
  });

  it("hata durumunda İngilizce hata ekranı yerine statik içerik gösterilir", () => {
    const boundary = read("client/src/components/ErrorBoundary.tsx");
    expect(boundary).toContain("const html = prerenderedHtml();");
    expect(boundary).toContain("Sayfayı yenile");
  });
});

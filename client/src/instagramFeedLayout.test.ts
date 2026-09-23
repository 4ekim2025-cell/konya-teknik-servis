import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const styles = readFileSync(resolve(root, "client/src/index.css"), "utf8");

describe("Instagram vitrini", () => {
  it("küçük gönderilerden seçilen paylaşımı büyük önizlemede gösterir", () => {
    expect(home).toContain("selectedPostId");
    expect(home).toContain("setSelectedPostId(post.id)");
    expect(home).toContain('aria-pressed={post.id === selectedPost.id}');
    expect(home).toContain('className="instagram-featured-post"');
    expect(styles).toContain(".instagram-feed-showcase{display:grid;grid-template-columns:");
    expect(styles).toContain("object-fit:contain");
  });

  it("Instagram kimliği, açıklaması ve profil bağlantısını sunar", () => {
    expect(home).toContain("<Instagram size={30}/>");
    expect(home).toContain("Son paylaşımlarımızı");
    expect(home).toContain('href="https://www.instagram.com/esad.esli.teknik/"');
    expect(home).toContain("@esad.esli.teknik");
  });
});

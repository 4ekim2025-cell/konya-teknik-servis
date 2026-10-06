import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { blogImageHtml, withCoverHead, blogCardImageHtml } from "../../shared/blog-image-html";
import { BLOG_IMAGE_HOST } from "../../shared/blog-images";

const projectRoot = resolve(import.meta.dirname, "..", "..");
const read = (path: string) => readFileSync(resolve(projectRoot, path), "utf8");

const HOST = "teststore123.public.blob.vercel-storage.com";
const ID = "0123456789abcdef0123456789abcdef";
const cover = { src: `https://${HOST}/blog/${ID}-1600.webp`, alt: "Pompa & \"filtre\" <temiz>", width: 1600, height: 1067 };

describe("fotoğraf HTML'i (prerender ve React ortak kuralları)", () => {
  it("gövde fotoğrafı ertelenir (lazy), boyutları açıktır ve alt metni kaçışlanır", () => {
    const html = blogImageHtml(cover, false);
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain("fetchpriority");
    expect(html).toContain('width="1600" height="1067"');
    expect(html).toContain('alt="Pompa &amp; &quot;filtre&quot; &lt;temiz&gt;"');
    expect(html).toContain(`srcset="https://${HOST}/blog/${ID}-800.webp 800w, ${cover.src} 1600w"`);
    expect(html).toContain('sizes="(min-width: 1024px) 760px, 100vw"');
    expect(html.startsWith("<figure>")).toBe(true);
  });

  it("kapak ertelenmez, öncelikli yüklenir (LCP'yi geciktirmez)", () => {
    const html = blogImageHtml(cover, true);
    expect(html).toContain('fetchpriority="high"');
    expect(html).not.toContain("lazy");
    expect(html).toContain('width="1600" height="1067"');
  });

  it("kapak <head> etiketlerini yalnızca paylaşım görseline ve önyüklemeye uygular; başlık, açıklama, canonical ve şemaya dokunmaz", () => {
    const template = read("client/index.html");
    const out = withCoverHead(template, cover);
    expect(out).toContain(`<meta property="og:image" content="${cover.src}" />`);
    expect(out).toContain('<meta property="og:image:type" content="image/webp" />');
    expect(out).toContain('<meta property="og:image:width" content="1600" />');
    expect(out).toContain('<meta property="og:image:height" content="1067" />');
    expect(out).toContain('<meta property="og:image:alt" content="Pompa &amp; &quot;filtre&quot; &lt;temiz&gt;" />');
    expect(out).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(out).toContain(`<meta name="twitter:image" content="${cover.src}" />`);
    expect(out.match(/rel="preload" as="image"/g)).toHaveLength(template.match(/rel="preload" as="image"/g)!.length + 1);
    expect(out).toContain(`imagesrcset="https://${HOST}/blog/${ID}-800.webp 800w, ${cover.src} 1600w"`);
    // Kapak dışındaki her satır aynı kalır.
    const strip = (html: string) => html.split("\n").filter(line => !/og:image|twitter:card|twitter:image|rel="preload" as="image" href="https:\/\/teststore/.test(line)).join("\n");
    expect(strip(out)).toBe(strip(template));
  });

  it("fotoğrafsız yazılar fotoğraf koduna girmez: prerender ve React yalnızca kapak/blok varsa fotoğraf basar", () => {
    const prerender = read("scripts/prerender.ts");
    expect(prerender).toContain('${post.cover ? blogImageHtml(post.cover, true) : ""}');
    expect(prerender).toContain('if (block.type === "image") return blogImageHtml(block, false);');
    expect(prerender).toContain("const cover = blogPosts.find(post => post.slug === route)?.cover;\n  if (cover) html = withCoverHead(html, cover);");
    expect(prerender).toContain("image: blogPost.cover ? blogPost.cover.src : `${siteUrl}/esli-teknik-konya-hero-background.webp`");
    const page = read("client/src/pages/ContentPage.tsx");
    expect(page).toContain("const cover=post.cover&&<BlogImageView image={post.cover} cover/>;");
    // Kapak yoksa servis kaydı sarmalanmaz: fotoğrafsız yazının görünümü aynı kalır.
    expect(page).toContain("{cover&&record?<div className={isSideCover(post.cover!)");
    expect(page).toContain(":<>{record}{cover}</>}");
    expect(page).toContain('if(block.type==="image")return <BlogImageView image={block}/>;');
    expect(page).toContain('{loading:"lazy" as const}');
    expect(page).toContain('{fetchPriority:"high" as const}');
    expect(page).toContain("width={image.width} height={image.height}");
  });

  it("blog listesinde yalnızca kapak fotoğrafı olan yazı küçük resim gösterir: 800 px sürüm, boyutlu, ertelenmiş; fotoğrafsız kart aynı kalır", () => {
    const page = read("client/src/pages/ContentPage.tsx");
    const card = page.slice(page.indexOf("function BlogCard"), page.indexOf("function BlogAuthor"));
    // Proje sahibinin kararı (2026-10-06): kapak varsa kartta küçük resim. Büyük (1600) sürüm ve yazı içi fotoğraflar listeye girmez.
    expect(card).toContain("const cover=post.cover");
    expect(card).toContain("src={blogImageSmallUrl(cover.src)} width={thumb.width} height={thumb.height} alt={cover.alt}");
    expect(card).toContain('{...(featured?{}:{loading:"lazy" as const})}');
    expect(card).not.toMatch(/srcSet|fetchPriority|post\.blocks/);
    expect(card).toContain("{cover&&thumb?<span className=\"blog-card-media\">");
    const prerender = read("scripts/prerender.ts");
    const index = prerender.slice(prerender.indexOf("function blogIndexHtml"), prerender.indexOf("function blogPostHtml("));
    expect(index).toContain('${post.cover ? blogCardImageHtml(post.cover) : ""}');
    expect(index).not.toMatch(/figure|blogImageHtml\(/);
    const cover = { src: `https://${BLOG_IMAGE_HOST || "ornek.public.blob.vercel-storage.com"}/blog/${"a".repeat(32)}-1600.webp`, alt: 'Açılmış "sebil" musluğu', width: 1200, height: 1600 };
    const html = blogCardImageHtml(cover);
    expect(html).toContain("-800.webp");
    expect(html).not.toContain("-1600.webp");
    expect(html).toContain('width="600" height="800"');
    expect(html).toContain('loading="lazy" decoding="async"');
    expect(html).toContain("&quot;sebil&quot;");
    const css = read("client/src/index.css");
    for (const rule of [".blog-card-media{position:relative;display:block;aspect-ratio:16/10", ".blog-card-media img{display:block;width:100%;height:100%;object-fit:cover}"]) expect(css).toContain(rule);
  });

  it("fotoğraf alanı ayarlıysa Vercel Blob alan adı kalıbına uyar (yazım hatasına karşı)", () => {
    const host: string = BLOG_IMAGE_HOST;
    if (host !== "") expect(host).toMatch(/^[a-z0-9]+\.public\.blob\.vercel-storage\.com$/);
  });

  it("kapak kırpılmaz: dikey kapak servis kaydının yanında, yatay kapak altında tam satır", () => {
    const page = read("client/src/pages/ContentPage.tsx");
    expect(page).toContain("const isSideCover=(image:BlogImage)=>image.height>=image.width;");
    const css = read("client/src/index.css");
    expect(css).not.toMatch(/\.blog-post-cover img\{[^}]*(aspect-ratio|object-fit:cover)/);
    expect(css).toContain(".blog-post-lead-side{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,36%)");
    expect(css).toContain("@container blog-article (min-width:620px)");
    // Sayfa kayması olmasın: kapakta da genişlik ve yükseklik HTML'de kalır.
    expect(page).toContain("width={image.width} height={image.height}");
  });
});

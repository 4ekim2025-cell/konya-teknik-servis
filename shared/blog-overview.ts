/**
 * Panel özet görünümü: ilçe, marka, cihaz ve kategori bazında yazı sayıları ve boş kalan konular.
 * Yalnızca yayındaki yazılar sayılır; taslaklar ayrı gösterilir. İlçe ve marka sayıları servis kaydı taşıyan
 * ("Ustanın Defterinden") yazılara bakar, çünkü ilçe ve marka bilgisi yalnızca orada vardır.
 */
import { blogCategories } from "./blog-meta";
import type { BlogPostInput } from "./blog-schema";
import { BLOG_BRANDS, BLOG_DEVICES, BLOG_DISTRICTS, districtOf } from "./blog-taxonomy";

export type OverviewRow = { name: string; count: number };
export type BlogOverview = {
  total: number;
  published: number;
  drafts: number;
  byCategory: OverviewRow[];
  byDistrict: OverviewRow[];
  byBrand: OverviewRow[];
  byDevice: OverviewRow[];
  /** Hiç yazısı olmayan konular. */
  empty: { categories: string[]; districts: string[]; brands: string[]; devices: string[] };
};

const norm = (value: string) => value.toLocaleLowerCase("tr-TR").trim();

export function computeOverview(posts: BlogPostInput[]): BlogOverview {
  const live = posts.filter(post => post.status !== "draft");
  const count = (names: readonly string[], pick: (post: BlogPostInput) => string | undefined): OverviewRow[] =>
    names.map(name => ({ name, count: live.filter(post => { const value = pick(post); return value !== undefined && norm(value) === norm(name); }).length }));

  const byCategory = count(blogCategories, post => post.category);
  const byDistrict = BLOG_DISTRICTS.map(name => ({ name: name as string, count: live.filter(post => post.caseFile && districtOf(post.caseFile.district) === name).length }));
  const byBrand = count(BLOG_BRANDS.map(brand => brand.name), post => post.caseFile?.brand).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr-TR"));
  const byDevice = count(BLOG_DEVICES.map(option => option.device), post => post.device);
  const emptyNames = (rows: OverviewRow[]) => rows.filter(row => row.count === 0).map(row => row.name);

  return {
    total: posts.length,
    published: live.length,
    drafts: posts.length - live.length,
    byCategory,
    byDistrict,
    byBrand,
    byDevice,
    empty: { categories: emptyNames(byCategory), districts: emptyNames(byDistrict), brands: emptyNames(byBrand), devices: emptyNames(byDevice) },
  };
}

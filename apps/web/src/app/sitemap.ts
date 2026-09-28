import type { MetadataRoute } from "next";
import { siteUrl } from "@/server/env";
import { listSitemapEntries } from "@/server/queries/catalog";

// Published products, categories, collections and portfolio stories (performance-seo.md §3).
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories, collections, projects } = await listSitemapEntries();
  const page = (path: string, lastModified?: Date, priority = 0.5): MetadataRoute.Sitemap[number] => ({
    url: `${siteUrl}${path}`,
    ...(lastModified ? { lastModified } : {}),
    priority,
  });
  return [
    page("/", undefined, 1),
    page("/shop", undefined, 0.9),
    page("/portfolio", undefined, 0.7),
    page("/about", undefined, 0.3),
    page("/contact", undefined, 0.3),
    ...categories.map((c) => page(`/shop/${c.slug}`, c.updatedAt, 0.7)),
    ...collections.map((c) => page(`/collections/${c.slug}`, c.updatedAt, 0.7)),
    ...products.map((p) => page(`/product/${p.slug}`, p.updatedAt, 0.8)),
    ...projects.map((p) => page(`/portfolio/${p.slug}`, p.updatedAt, 0.6)),
  ];
}

import { shopFiltersSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/client/components/shared/json-ld";
import { ShopListing } from "@/client/features/products/shop-listing";
import { siteUrl } from "@/server/env";
import { getCategoryBySlug, loadShopListing } from "@/server/queries/catalog";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";
import { breadcrumbJsonLd, categoryDescription, categoryTitle } from "@/server/seo";

type Props = { params: Promise<{ category: string }>; searchParams: SearchParams };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).category);
  if (!category) notFound();
  const title = categoryTitle(category.name);
  const description = categoryDescription(category.name);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/shop/${category.slug}` },
    // Setting openGraph here drops the site-wide picture, so name it again.
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Virzeen" }],
    },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await getCategoryBySlug((await params).category);
  if (!category) notFound();
  const query = flattenSearchParams(await searchParams);
  const filters = shopFiltersSchema.parse({ ...query, category: category.slug });
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(siteUrl, [
          { name: "Shop", path: "/shop" },
          { name: category.name, path: `/shop/${category.slug}` },
        ])}
      />
      <ShopListing
        data={await loadShopListing(filters)}
        title={category.name}
        filters={filters}
        params={{ ...query, category: category.slug }}
        activeCategory={category.slug}
      />
    </>
  );
}

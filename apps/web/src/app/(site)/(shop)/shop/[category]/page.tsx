import { shopFiltersSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopListing } from "@/client/features/products/shop-listing";
import { getCategoryBySlug, loadShopListing } from "@/server/queries/catalog";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

type Props = { params: Promise<{ category: string }>; searchParams: SearchParams };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).category);
  if (!category) notFound();
  return {
    title: category.name,
    description: `Shop ${category.name.toLowerCase()} from Virzeen. Prices include VAT.`,
    alternates: { canonical: `/shop/${category.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await getCategoryBySlug((await params).category);
  if (!category) notFound();
  const query = flattenSearchParams(await searchParams);
  const filters = shopFiltersSchema.parse({ ...query, category: category.slug });
  return (
    <ShopListing
      data={await loadShopListing(filters)}
      title={category.name}
      filters={filters}
      params={{ ...query, category: category.slug }}
      activeCategory={category.slug}
    />
  );
}

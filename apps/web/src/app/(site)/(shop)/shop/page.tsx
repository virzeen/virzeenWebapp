import { shopFiltersSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { ShopListing } from "@/client/features/products/shop-listing";
import { loadShopListing } from "@/server/queries/catalog";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";
import { SHOP_TITLE, searchHeading, searchTitle } from "@/server/seo";

const SHOP_METADATA: Metadata = {
  title: { absolute: SHOP_TITLE },
  description:
    "Shop Virzeen: monochrome, black and white clothing and accessories from Nepal. Prices include VAT. Free delivery on larger orders and cash on delivery.",
  alternates: { canonical: "/shop" },
};

/** A search (`?q=`) keeps the shop's canonical and isn't indexed (specs/search.md). */
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { q } = shopFiltersSchema.parse(flattenSearchParams(await searchParams));
  if (!q) return SHOP_METADATA;
  return { ...SHOP_METADATA, title: { absolute: searchTitle(q) }, robots: { index: false, follow: true } };
}

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = flattenSearchParams(await searchParams);
  const filters = shopFiltersSchema.parse(params);
  return (
    <ShopListing
      data={await loadShopListing(filters)}
      title={filters.q ? searchHeading(filters.q) : "Shop"}
      filters={filters}
      params={params}
    />
  );
}

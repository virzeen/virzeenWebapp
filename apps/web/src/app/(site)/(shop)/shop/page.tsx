import { shopFiltersSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { ShopListing } from "@/client/features/products/shop-listing";
import { loadShopListing } from "@/server/queries/catalog";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";
import { SHOP_TITLE } from "@/server/seo";

export const metadata: Metadata = {
  title: { absolute: SHOP_TITLE },
  description:
    "Shop Virzeen: monochrome, black and white clothing and accessories from Nepal. Prices include VAT. Free shipping and cash on delivery.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = flattenSearchParams(await searchParams);
  const filters = shopFiltersSchema.parse(params);
  return <ShopListing data={await loadShopListing(filters)} title="Shop" filters={filters} params={params} />;
}

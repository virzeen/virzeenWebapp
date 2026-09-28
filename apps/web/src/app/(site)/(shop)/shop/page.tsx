import { shopFiltersSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { ShopListing } from "@/client/features/products/shop-listing";
import { loadShopListing } from "@/server/queries/catalog";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Shop the Virzeen collection. Prices include VAT. Cash on delivery, eSewa and Khalti across Nepal.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = flattenSearchParams(await searchParams);
  const filters = shopFiltersSchema.parse(params);
  return <ShopListing data={await loadShopListing(filters)} title="Shop" filters={filters} params={params} />;
}

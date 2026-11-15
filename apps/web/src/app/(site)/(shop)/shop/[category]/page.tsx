import { permanentRedirect } from "next/navigation";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

type Props = { params: Promise<{ category: string }>; searchParams: SearchParams };

/**
 * An old category address (`/shop/tops`) goes to the collection with the same slug: categories and collections are
 * one thing now (specs/catalog-groups-visibility.md). The filters in the address are kept.
 */
export default async function OldCategoryPage({ params, searchParams }: Props) {
  const { category } = await params;
  const query = new URLSearchParams(flattenSearchParams(await searchParams)).toString();
  permanentRedirect(`/collections/${encodeURIComponent(category)}${query ? `?${query}` : ""}`);
}

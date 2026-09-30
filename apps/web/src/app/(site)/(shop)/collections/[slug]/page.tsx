import { shopFiltersSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopListing } from "@/client/features/products/shop-listing";
import { getCollectionBySlug, loadShopListing } from "@/server/queries/catalog";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";
import { collectionTitle } from "@/server/seo";

type Props = { params: Promise<{ slug: string }>; searchParams: SearchParams };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await getCollectionBySlug((await params).slug);
  if (!collection) notFound();
  return {
    title: { absolute: collectionTitle(collection.name) },
    description: collection.description ?? `The ${collection.name} collection from Virzeen.`,
    alternates: { canonical: `/collections/${collection.slug}` },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const collection = await getCollectionBySlug((await params).slug);
  if (!collection) notFound();
  const query = flattenSearchParams(await searchParams);
  const filters = shopFiltersSchema.parse({ ...query, collection: collection.slug });
  return (
    <ShopListing
      data={await loadShopListing(filters)}
      title={collection.name}
      intro={collection.description}
      filters={filters}
      params={{ ...query, collection: collection.slug }}
    />
  );
}

import { shopFiltersSchema } from "@virzeen/validators";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/client/components/shared/json-ld";
import { ShopListing } from "@/client/features/products/shop-listing";
import { siteUrl } from "@/server/env";
import { getCollectionBySlug, loadShopListing } from "@/server/queries/catalog";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";
import { breadcrumbJsonLd, collectionDescription, collectionTitle, fit } from "@/server/seo";

type Props = { params: Promise<{ slug: string }>; searchParams: SearchParams };

/** The owner's description when there is one, else the usual line for a section of the shop. */
const describe = (collection: { name: string; description: string | null }) =>
  collection.description ? fit(collection.description, 155) : collectionDescription(collection.name);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await getCollectionBySlug((await params).slug);
  if (!collection) notFound();
  const title = collectionTitle(collection.name);
  const description = describe(collection);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/collections/${collection.slug}` },
    // Setting openGraph here drops the site-wide picture, so name it again.
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "Virzeen" }],
    },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const collection = await getCollectionBySlug((await params).slug);
  if (!collection) notFound();
  const query = flattenSearchParams(await searchParams);
  const filters = shopFiltersSchema.parse({ ...query, collection: collection.slug });
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(siteUrl, [
          { name: "Shop", path: "/shop" },
          { name: collection.name, path: `/collections/${collection.slug}` },
        ])}
      />
      <ShopListing
        data={await loadShopListing(filters)}
        title={collection.name}
        intro={collection.description}
        filters={filters}
        params={{ ...query, collection: collection.slug }}
        activeCollection={collection.slug}
      />
    </>
  );
}

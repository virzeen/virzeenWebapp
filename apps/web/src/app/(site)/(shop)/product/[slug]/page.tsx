import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JsonLd } from "@/client/components/shared/json-ld";
import { ProductDetails } from "@/client/features/products/product-details";
import { RelatedProducts } from "@/client/features/products/related-products";
import { ProductReviews } from "@/client/features/reviews/product-reviews";
import {
  getProductBySlug,
  getReviewSummary,
  getViewerIsPass,
  listProductReviews,
  listRecommendations,
} from "@/server/queries/catalog";
import { getUser } from "@/server/auth/session";
import { siteUrl } from "@/server/env";
import { listMyWaitingVariantIds } from "@/server/queries/account";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";
import { absoluteImageUrl, breadcrumbJsonLd, productDescription, productTitle } from "@/server/seo";

// Next.js 16: params and searchParams are Promises and must be awaited.
type Props = { params: Promise<{ slug: string }>; searchParams: SearchParams };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const prices = product.variants.map((v) => v.pricePaisa);
  const title = productTitle(product.name, product.mainCollection.name);
  const description = productDescription({
    seoDescription: product.seoDescription,
    description: product.description,
    lowestPaisa: Math.min(...prices),
    highestPaisa: Math.max(...prices),
  });
  // Link previews (WhatsApp, Facebook) show the product's first photo instead of the site-wide picture.
  const image = product.images[0] && absoluteImageUrl(product.images[0].url, siteUrl);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
  };
}

/** The variants a signed-in customer waits for ("Notify me when it's back", specs/notify-me.md); none for guests. */
async function waitingFor(variantIds: string[]) {
  const user = await getUser();
  return user ? listMyWaitingVariantIds(user.id, variantIds) : [];
}

/** The carousels under the product (specs/product-page-v2.md), streamed in after it so they never hold it up. */
async function Recommendations({ product }: { product: { id: string; mainCollectionId: string } }) {
  return <RelatedProducts recommendations={await listRecommendations(product)} />;
}

/** "Reviews" under the product (specs/reviews.md), streamed in the same way. */
async function Reviews({ product }: { product: { id: string; slug: string } }) {
  const [summary, reviews] = await Promise.all([
    getReviewSummary(product.id),
    listProductReviews(product.id),
  ]);
  return <ProductReviews slug={product.slug} summary={summary} reviews={reviews} />;
}

export default async function ProductPage({ params, searchParams }: Props) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  // `?style=` picks the style a shared link or a favourite names, `?size=` the size a "back in stock" email or the way
  // back from sign-in names; the canonical address stays /product/{slug}.
  const { style, size } = flattenSearchParams(await searchParams);
  const lowestPrice = Math.min(...product.variants.map((v) => v.pricePaisa));
  const image = product.images[0] ? absoluteImageUrl(product.images[0].url, siteUrl) : null;
  const [rating, waitingVariantIds, isPass, user] = await Promise.all([
    getReviewSummary(product.id),
    waitingFor(product.variants.map((variant) => variant.id)),
    getViewerIsPass(),
    getUser(),
  ]);
  // Everyone sees a members-only product; only the Pass may buy it (specs/catalog-groups-visibility.md).
  const lock =
    product.membersOnly && !isPass
      ? user
        ? { href: "/membership", note: "Join the Monochrome Pass to buy this." }
        : {
            href: `/login?next=${encodeURIComponent(`/product/${product.slug}`)}`,
            note: "Sign in, then join the Monochrome Pass to buy this.",
          }
      : undefined;

  return (
    <>
      <ProductDetails
        product={{ ...product, productId: product.id }}
        styleParam={style}
        sizeParam={size}
        waitingVariantIds={waitingVariantIds}
        lock={lock}
      />

      <Suspense fallback={null}>
        <Reviews product={product} />
      </Suspense>

      <Suspense fallback={null}>
        <Recommendations product={product} />
      </Suspense>

      <JsonLd
        data={breadcrumbJsonLd(siteUrl, [
          { name: "Shop", path: "/shop" },
          { name: product.mainCollection.name, path: `/collections/${product.mainCollection.slug}` },
          { name: product.name, path: `/product/${product.slug}` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.seoDescription ?? product.description,
          url: `${siteUrl}/product/${product.slug}`,
          ...(image ? { image } : {}),
          sku: product.variants[0]?.sku,
          brand: { "@type": "Brand", name: "Virzeen" },
          category: product.mainCollection.name,
          ...(rating.count > 0 && rating.average !== null
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: rating.average,
                  reviewCount: rating.count,
                  bestRating: 5,
                  worstRating: 1,
                },
              }
            : {}),
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "NPR",
            lowPrice: (lowestPrice / 100).toFixed(2),
            highPrice: (Math.max(...product.variants.map((v) => v.pricePaisa)) / 100).toFixed(2),
            offerCount: product.variants.length,
            availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }}
      />
    </>
  );
}

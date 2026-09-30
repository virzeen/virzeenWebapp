// apps/web/src/app/(site)/(shop)/product/[slug]/page.tsx  — Server Component (no "use client")
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProductBySlug, listRecommendations } from "@/server/queries/catalog";
import { ProductDetails } from "@/client/features/products/product-details";
import { RelatedProducts } from "@/client/features/products/related-products";
import { JsonLd } from "@/client/components/shared/json-ld";

// Next.js 15+: params and searchParams are Promises and must be awaited.
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ style?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug); // same cached loader as the page
  if (!product) notFound();
  return {
    title: product.name,
    description: product.seoDescription ?? product.description.slice(0, 155),
    alternates: { canonical: `/product/${product.slug}` },
  };
}

/** "You may also like" and "More from Virzeen" (specs/product-page-v2.md), streamed in after the product. */
async function Recommendations({ product }: { product: { id: string; categoryId: string } }) {
  return <RelatedProducts recommendations={await listRecommendations(product)} />;
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug); // server/queries: select only needed fields
  if (!product) notFound();
  // `?style=` from a shared link or a favourite picks that style; the canonical address stays /product/{slug}.
  const { style } = await searchParams;

  return (
    <>
      {/*
        Gallery, pickers, buttons, description, popups and "Features that perform" (patterns.md §6). One shared
        block, also used by the admin Preview, so it lays itself out (Container + grid) and imports no server code.
        Only its small leaves are client components.
      */}
      <ProductDetails product={{ ...product, productId: product.id }} styleParam={style} />
      {/* The carousels never hold up the product: they stream in after it. */}
      <Suspense fallback={null}>
        <Recommendations product={product} />
      </Suspense>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          image: product.images[0]?.url, // the real page makes it an absolute address
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "NPR",
            lowPrice: (product.fromPricePaisa / 100).toFixed(2),
            availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }}
      />
    </>
  );
}
// Siblings: loading.tsx (skeleton matching this layout), error.tsx ("use client", friendly message + retry).

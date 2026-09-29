import { Container, Grid } from "@virzeen/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/client/components/shared/json-ld";
import { ProductCard } from "@/client/features/products/product-card";
import { ProductDetails } from "@/client/features/products/product-details";
import { getProductBySlug, listRelatedProducts } from "@/server/queries/catalog";
import { env, siteUrl } from "@/server/env";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

// Next.js 16: params and searchParams are Promises and must be awaited.
type Props = { params: Promise<{ slug: string }>; searchParams: SearchParams };

/** An absolute address for a product photo (JSON-LD): the same Cloudinary delivery as image-loader.ts, or this site. */
function absoluteImageUrl(src: string): string | undefined {
  if (src.startsWith("https://")) return src;
  if (src.startsWith("/")) return `${siteUrl}${src}`;
  return env.CLOUDINARY_CLOUD_NAME
    ? `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/${src}`
    : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const description = product.seoDescription ?? product.description.slice(0, 155);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { title: `${product.name} — Virzeen`, description, type: "website" },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  // `?style=` picks the style a shared link or a favourite names; the canonical address stays /product/{slug}.
  const { style } = flattenSearchParams(await searchParams);
  const related = await listRelatedProducts(product);
  const lowestPrice = Math.min(...product.variants.map((v) => v.pricePaisa));
  const image = product.images[0] ? absoluteImageUrl(product.images[0].url) : undefined;

  return (
    <>
      <ProductDetails product={{ ...product, productId: product.id }} styleParam={style} />

      {related.length > 0 && (
        <Container as="section" className="flex flex-col gap-8 py-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="font-display text-h2">
            You may also like
          </h2>
          <Grid columns="products" gap={4}>
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </Grid>
        </Container>
      )}

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
          category: product.category.name,
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

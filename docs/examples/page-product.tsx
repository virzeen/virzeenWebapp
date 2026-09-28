// apps/web/src/app/(shop)/product/[slug]/page.tsx  — Server Component (no "use client")
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@virzeen/ui";
import { getProductBySlug } from "@/server/queries/products";
import { ProductGallery } from "@/client/features/products/product-gallery";
import { ProductDetails } from "@/client/features/products/product-details";
import { JsonLd } from "@/client/components/shared/json-ld";

// Next.js 15+: params is a Promise and must be awaited.
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return {
    title: `${product.name} — Virzeen`,
    description: product.seoDescription,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { images: product.images.slice(0, 1).map((i) => i.url) },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug); // server/queries: select only needed fields
  if (!product) notFound();

  return (
    <Container className="py-8 lg:py-16">
      <div className="gap-8 lg:grid-cols-[3fr_2fr] lg:gap-16 grid">
        <ProductGallery images={product.images} productName={product.name} />
        {/* Server component; renders the small client leaf <AddToBagButton /> inside */}
        <ProductDetails product={product} />
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          image: product.images.map((i) => i.url),
          offers: {
            "@type": "Offer",
            priceCurrency: "NPR",
            price: (product.fromPricePaisa / 100).toFixed(2),
            availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          },
        }}
      />
    </Container>
  );
}
// Siblings: loading.tsx (skeleton matching this grid), error.tsx ("use client", friendly message + retry).

import { Accordion, AccordionItem, Container, Grid, Link } from "@virzeen/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/client/components/shared/json-ld";
import { ProductCard } from "@/client/features/products/product-card";
import { ProductGallery } from "@/client/features/products/product-gallery";
import { ProductPurchase } from "@/client/features/products/product-purchase";
import { getProductBySlug, listRelatedProducts } from "@/server/queries/catalog";
import { siteUrl } from "@/server/env";

// Next.js 16: params is a Promise and must be awaited.
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return {};
  const description = product.seoDescription ?? product.description.slice(0, 155);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: { title: `${product.name} — Virzeen`, description, type: "website" },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();
  const related = await listRelatedProducts(product);
  const lowestPrice = Math.min(...product.variants.map((v) => v.pricePaisa));

  return (
    <>
      <Container className="py-6 pb-28 md:pb-16 lg:py-12">
        <nav aria-label="Breadcrumb" className="pb-6">
          <ol className="gap-2 flex items-center text-small text-ink-muted">
            <li>
              <Link href="/shop" variant="subtle">
                Shop
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href={`/shop/${product.category.slug}`} variant="subtle">
                {product.category.name}
              </Link>
            </li>
          </ol>
        </nav>
        <div className="gap-8 lg:grid-cols-[3fr_2fr] lg:gap-16 grid">
          <ProductGallery images={product.images} productName={product.name} />
          <div className="gap-8 lg:sticky lg:top-24 lg:self-start flex flex-col">
            <h1 className="font-display text-h1">{product.name}</h1>
            <ProductPurchase variants={product.variants} sizes={product.sizes} colors={product.colors} />
            <p className="text-small text-ink-muted">
              Prices include 13% VAT. Shipping is calculated at checkout. Pay by cash on delivery, eSewa or
              Khalti.
            </p>
            <Accordion type="multiple" defaultValue={["description"]}>
              <AccordionItem value="description" title="Description">
                <p className="whitespace-pre-line">{product.description}</p>
              </AccordionItem>
              {product.care && (
                <AccordionItem value="care" title="Care">
                  <p className="whitespace-pre-line">{product.care}</p>
                </AccordionItem>
              )}
              <AccordionItem value="shipping" title="Shipping & returns">
                <p>
                  Delivered in 1–3 days inside Kathmandu Valley and 3–7 days elsewhere in Nepal.{" "}
                  <Link href="/returns">Read our returns policy</Link>.
                </p>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </Container>

      {related.length > 0 && (
        <Container as="section" className="gap-8 py-16 flex flex-col" aria-labelledby="related-heading">
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

import { Accordion, AccordionItem, Container, Link } from "@virzeen/ui";
import { ProductGallery } from "./product-gallery";
import { ProductPurchase } from "./product-purchase";

export type ProductDetailsData = {
  name: string;
  description: string;
  care: string | null;
  category: { name: string; slug: string };
  images: { id: string; url: string; alt: string }[];
  /** For sale only; `pricePaisa` is what the customer pays (shipping included). */
  variants: { id: string; size: string | null; color: string | null; pricePaisa: number; stock: number }[];
  sizes: string[];
  colors: string[];
};

/**
 * The product page's main block: breadcrumb, gallery, name, pickers, delivery note and the description sections.
 * Shared by the shop's product page and the admin preview (specs/admin-product-editor.md "Preview"), so the
 * preview always looks like the real page.
 */
export function ProductDetails({
  product,
  preview = false,
}: {
  product: ProductDetailsData;
  preview?: boolean;
}) {
  return (
    <Container className="py-6 pb-28 md:pb-16 lg:py-12">
      {/* 44px-tall links; the negative top margin keeps the text where the shorter links had it. */}
      <nav aria-label="Breadcrumb" className="-mt-3 pb-3">
        <ol className="flex items-center gap-2 text-small text-ink-muted">
          <li>
            <Link href="/shop" variant="subtle" className="inline-flex min-h-11 items-center">
              Shop
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link
              href={`/shop/${product.category.slug}`}
              variant="subtle"
              className="inline-flex min-h-11 items-center"
            >
              {product.category.name}
            </Link>
          </li>
        </ol>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-16">
        <ProductGallery images={product.images} productName={product.name} />
        <div className="flex flex-col gap-8 lg:sticky lg:top-24 lg:self-start">
          <h1 className="font-display text-h1">{product.name}</h1>
          <ProductPurchase
            variants={product.variants}
            sizes={product.sizes}
            colors={product.colors}
            preview={preview}
          />
          <p className="text-small text-ink-muted">
            Prices include 13% VAT. Free shipping across Nepal and 7-day free returns. Pay in cash when it
            arrives.
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
                Free delivery in 1–3 days inside Kathmandu Valley and 3–7 days elsewhere in Nepal. Free
                returns within 7 days of delivery. <Link href="/returns">Read our returns policy</Link>.
              </p>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </Container>
  );
}

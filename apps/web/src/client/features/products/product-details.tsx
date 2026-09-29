import { Container, Link } from "@virzeen/ui";
import { ProductAccordions } from "./product-accordions";
import { ProductDescription } from "./product-description";
import type { ProductDetailsData } from "./product-details-data";
import { ProductFeatures } from "./product-features";
import { ProductPurchase } from "./product-purchase";
import { ProductSelectionProvider } from "./product-selection";
import { SelectedPrice } from "./selected-price";
import { StyleGallery } from "./style-gallery";
import { hasStylePhotos, styleFromParam, tilePhotoFor } from "./style-photos";

type ProductDetailsProps = {
  product: ProductDetailsData;
  /** The page's `?style=` (a shared link or a favourite); ignored unless the product sells that style. */
  styleParam?: string | undefined;
  preview?: boolean;
};

/**
 * The product page's main block (specs/product-page.md, patterns.md §6). From lg: the gallery on the left, sticky
 * under the header, and the name, price, pickers, buttons, description and accordions on the right. Below lg: name
 * and price, then the gallery, then the rest (one h1, placed by the grid). Then "Features that perform".
 * Shared by the shop's product page and the admin preview (specs/admin-product-editor.md "Preview"), so the preview
 * always looks like the real page: no server-only imports here.
 */
export function ProductDetails({ product, styleParam, preview = false }: ProductDetailsProps) {
  const firstStyle = styleFromParam(styleParam, product.variants, product.colors);
  // Styles with their own photos get picture tiles: each style's first photo, else the main photo.
  const tiles = hasStylePhotos(product.images, product.colors)
    ? Object.fromEntries(
        product.colors.map((style) => [style, tilePhotoFor(product.images, style)?.url ?? null]),
      )
    : undefined;

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
      <ProductSelectionProvider
        variants={product.variants}
        colors={product.colors}
        sizes={product.sizes}
        initialStyle={firstStyle}
        syncUrl={!preview}
      >
        {/* Row 1 on the right holds the name; the gallery spans both rows; row 2 takes the rest of the height. */}
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr] lg:grid-rows-[auto_1fr] lg:gap-x-16">
          <div className="flex flex-col gap-1 lg:col-start-2 lg:row-start-1 lg:max-w-md">
            <h1 className="font-display text-h1">{product.name}</h1>
            <p className="text-body text-ink-muted">{product.category.name}</p>
            <SelectedPrice className="pt-2 text-h3" />
          </div>
          <div className="lg:sticky lg:top-24 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
            <StyleGallery images={product.images} productName={product.name} />
          </div>
          <div className="flex flex-col gap-8 lg:col-start-2 lg:row-start-2 lg:max-w-md">
            <ProductPurchase
              productId={product.productId}
              sizeGuide={product.sizeGuide}
              tiles={tiles}
              preview={preview}
            />
            <p className="text-small text-ink-muted">
              Prices include 13% VAT. Free shipping across Nepal and 7-day free returns. Pay in cash when it
              arrives.
            </p>
            <ProductDescription product={product} />
            <ProductAccordions sizeGuide={product.sizeGuide} />
          </div>
        </div>
      </ProductSelectionProvider>
      {product.features.length > 0 && <ProductFeatures features={product.features} />}
    </Container>
  );
}

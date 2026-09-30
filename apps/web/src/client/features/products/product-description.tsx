import { StyleBullets } from "./colour-shown";
import type { ProductDetailsData } from "./product-details-data";
import { ProductDetailsDialog } from "./product-details-dialog";

/**
 * The description under the buttons (plain text, line breaks kept), the "Colour shown", "Style" and origin bullets,
 * and "View product details" (specs/product-page.md, specs/product-editor-on-page.md). Server-rendered on the shop
 * page; only the bullets that follow the picked style and the popup run in the browser.
 */
export function ProductDescription({ product }: { product: ProductDetailsData }) {
  // A style always has a line (its colour shown falls back to its name); the "" style only with a number or a colour
  // shown. No list at all when nothing would be in it.
  const hasBullets =
    product.colors.length > 0 ||
    product.styles.some((style) => style.code || style.colourShown) ||
    Boolean(product.countryOfOrigin);
  return (
    <div className="flex flex-col gap-4 text-body">
      {product.description && <p className="whitespace-pre-line">{product.description}</p>}
      {hasBullets && (
        <ul className="flex list-disc flex-col gap-1 pl-6">
          <StyleBullets styles={product.styles} />
          {product.countryOfOrigin && <li>Country/Region of origin: {product.countryOfOrigin}</li>}
        </ul>
      )}
      <ProductDetailsDialog
        product={{
          name: product.name,
          description: product.description,
          benefits: product.benefits,
          details: product.details,
          countryOfOrigin: product.countryOfOrigin,
          care: product.care,
          images: product.images,
          styles: product.styles,
        }}
      />
    </div>
  );
}

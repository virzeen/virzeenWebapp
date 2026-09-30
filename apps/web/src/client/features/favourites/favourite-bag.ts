import type { FavouriteView } from "@/server/actions/favourites";

type Variant = FavouriteView["variants"][number];
type SizedVariant = Variant & { size: string };

/** What a favourite's pill button does (specs/favourites.md "Nike layout"). */
export type BagChoice =
  | { kind: "soldOut" }
  /** "View product": the saved style isn't sold any more, but the product is in stock in another style. */
  | { kind: "view" }
  /** "Select size": the style's sizes (sold out ones too), in shop order. */
  | { kind: "size"; sizes: SizedVariant[] }
  /** "Add to bag": the style's one variant. */
  | { kind: "add"; variant: Variant };

/**
 * A style no longer sold has no variants: "View product" while the product is in stock in another style (the card
 * then shows the product's usual photo, price and stock), else "Sold out". A style still sold: "Sold out" when none
 * of it is in stock, "Select size" when it has sizes, else "Add to bag" for its one variant. Pure, so it's
 * unit-tested.
 */
export function bagChoice({
  variants,
  product,
}: {
  variants: readonly Variant[];
  product: Pick<FavouriteView["product"], "inStock">;
}): BagChoice {
  if (variants.length === 0) return product.inStock ? { kind: "view" } : { kind: "soldOut" };
  const inStock = variants.find((variant) => variant.stock > 0);
  if (!inStock) return { kind: "soldOut" };
  const sizes = variants.filter((variant): variant is SizedVariant => variant.size !== null);
  return sizes.length > 0 ? { kind: "size", sizes } : { kind: "add", variant: inStock };
}

/** The product page with the saved style picked (the product's usual page when the style isn't sold any more). */
export const favouriteHref = ({
  product,
  style,
}: {
  product: Pick<FavouriteView["product"], "slug">;
  style: string;
}) => (style ? `/product/${product.slug}?style=${encodeURIComponent(style)}` : `/product/${product.slug}`);

/** The grey line under the name: "Tops · Black", or just the category without a style. */
export const favouriteDetails = ({ category, style }: Pick<FavouriteView, "category" | "style">) =>
  style ? `${category} · ${style}` : category;

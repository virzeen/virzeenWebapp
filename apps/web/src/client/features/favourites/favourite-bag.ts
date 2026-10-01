import type { FavouriteView } from "@/server/actions/favourites";
import { keyOf } from "./favourites-store";

type Variant = FavouriteView["variants"][number];
type SizedVariant = Variant & { size: string };

/** The bag page's favourites: the newest few, and how many there are in all. */
export type FavouritesPreview = { items: FavouriteView[]; total: number };

/**
 * How many favourites the bag page shows, as Nike's does; "View more favourites" leads to the rest. Here, not in a
 * client file, so the bag page (a Server Component) reads the number itself.
 */
export const BAG_FAVOURITES_SHOWN = 2;

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

/** "Added" on the pill: the bag holds one of the saved style's variants (any of its sizes). */
export const styleInBag = (variants: readonly Pick<Variant, "id">[], bag: readonly { variantId: string }[]) =>
  bag.some((line) => variants.some((variant) => variant.id === line.variantId));

/**
 * The Favourites page's cards once a new list arrives (`next`): the cards already shown stay in their places (with
 * fresh data while listed), the ones whose heart was pressed here (`pressed`) stay even when the list has dropped
 * them, so a second press saves them again, and new ones go first, newest first as listed. Any other card the list
 * dropped (removed on another device, no longer on sale) goes.
 */
export function keepPlaces<T extends { productId: string; color: string }>(
  before: readonly T[],
  next: readonly T[],
  pressed: ReadonlySet<string>,
): T[] {
  const listed = new Map(next.map((item) => [keyOf(item), item]));
  const shown = new Set(before.map(keyOf));
  const added = next.filter((item) => !shown.has(keyOf(item)));
  const kept = before.flatMap((item) => {
    const fresh = listed.get(keyOf(item));
    if (fresh) return [fresh];
    return pressed.has(keyOf(item)) ? [item] : [];
  });
  return [...added, ...kept];
}

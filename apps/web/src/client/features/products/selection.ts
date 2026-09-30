// The picked style and size → the variant and the price to show (specs/product-page.md). Pure, shared by every
// part of the product page that reads the pick (product-selection.tsx).

export type Variant = {
  id: string;
  size: string | null;
  color: string | null;
  pricePaisa: number;
  stock: number;
};

/** The variant for a style and size; a product without styles or sizes ignores that half. */
export function variantFor<V extends Variant>(
  variants: readonly V[],
  hasStyles: boolean,
  hasSizes: boolean,
  style: string | null,
  size: string | null,
): V | undefined {
  return variants.find((v) => (!hasStyles || v.color === style) && (!hasSizes || v.size === size));
}

export const styleHasStock = (variants: readonly Variant[], style: string) =>
  variants.some((v) => v.color === style && v.stock > 0);

/**
 * The price shown: the picked variant's; before a size is picked, the picked style's lowest, as "From" when its
 * sizes cost different amounts (styles can have their own price, specs/product-styles.md).
 */
export function priceFor(
  variants: readonly Variant[],
  style: string | null,
  selected: Variant | undefined,
): { paisa: number; from: boolean } {
  if (selected) return { paisa: selected.pricePaisa, from: false };
  const pool = style ? variants.filter((v) => v.color === style) : variants;
  const prices = (pool.length > 0 ? pool : variants).map((v) => v.pricePaisa);
  const lowest = Math.min(...prices);
  return { paisa: lowest, from: lowest !== Math.max(...prices) };
}

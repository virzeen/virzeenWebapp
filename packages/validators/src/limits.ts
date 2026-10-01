// Limits and checks the browser needs on every page, without zod. Client code that only needs these imports
// "@virzeen/validators/limits", so the schemas (and zod, about 95 KB) stay out of every page's bundle; the schemas
// in this package use the same values. (Lighthouse audit, 2026-10-01.)

/** Most of one variant in the bag (cart.ts `addToCartSchema`). */
export const MAX_QTY_PER_LINE = 10;

/** Most favourites one account (or one browser) keeps. */
export const MAX_FAVOURITES = 100;

/** Longest style name a favourite keeps (favourites.ts `favouriteKeySchema`). */
export const MAX_FAVOURITE_COLOR = 40;

/** zod's `cuid2()`: what `idSchema` accepts. */
const CUID2 = /^[0-9a-z]+$/;

/**
 * The favourite key `favouriteKeySchema` would return (the style trimmed), or null when it would refuse it: for the
 * browser's stored list, which is read on every page.
 */
export function toFavouriteKey(
  productId: unknown,
  color: unknown,
): { productId: string; color: string } | null {
  if (typeof productId !== "string" || !CUID2.test(productId) || typeof color !== "string") return null;
  const style = color.trim();
  return style.length <= MAX_FAVOURITE_COLOR ? { productId, color: style } : null;
}

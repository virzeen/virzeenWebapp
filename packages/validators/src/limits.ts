// Limits and checks the browser needs on every page, without zod. Client code that only needs these imports
// "@virzeen/validators/limits", so the schemas (and zod, about 95 KB) stay out of every page's bundle; the schemas
// in this package use the same values. (Lighthouse audit, 2026-10-01.)

/** Most of one variant in the bag (cart.ts `addToCartSchema`). */
export const MAX_QTY_PER_LINE = 10;

/** Most favourites one account (or one browser) keeps. */
export const MAX_FAVOURITES = 100;

/** Most "Notify me when it's back" requests one account keeps waiting (specs/notify-me.md). */
export const MAX_STOCK_ALERTS = 20;

/** Longest style name a favourite keeps (favourites.ts `favouriteKeySchema`). */
export const MAX_FAVOURITE_COLOR = 40;

/** Longest search query (catalog.ts `shopFiltersSchema.q`, `productSearchSchema`; specs/search.md). */
export const SEARCH_QUERY_MAX = 60;

/** The header search panel asks for live results from this many characters (`productSearchSchema`). */
export const SEARCH_QUERY_MIN = 2;

/** At or under this, the shop says "Only {n} left" and the admin dashboard lists the size under "Low stock". */
export const LOW_STOCK_THRESHOLD = 3;

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

// Delivery fees (owner decision 2026-11-11, docs/specs/checkout-v2-week1.md). Pure rules, shared so the bag page can
// show the same hints the server charges by. The server is the only place that charges: `calculateTotals` in core.

export type DeliveryTier = "GUEST" | "MEMBER" | "PASS";

export const DELIVERY_FEES: Record<DeliveryTier, { feePaisa: number; freeFromPaisa: number }> = {
  GUEST: { feePaisa: 20_000, freeFromPaisa: 999_900 },
  MEMBER: { feePaisa: 15_000, freeFromPaisa: 300_000 },
  // The Monochrome Pass: free delivery on every order, no minimum.
  PASS: { feePaisa: 0, freeFromPaisa: 0 },
};

/** The Monochrome Pass takes this much off the products' price (owner 2026-11-11; a promo code replaces it). */
export const PASS_DISCOUNT_PERCENT = 10;

/** The Pass discount on a subtotal: a percentage rounded down, then whole rupees (the same rounding as a code). */
export function passDiscountFor(subtotalPaisa: number): number {
  return Math.floor(Math.floor((subtotalPaisa * PASS_DISCOUNT_PERCENT) / 100) / 100) * 100;
}

/** The delivery fee for a bag worth `payablePaisa` (after any discount) for this tier. */
export function deliveryFeeFor(tier: DeliveryTier, payablePaisa: number): number {
  const rule = DELIVERY_FEES[tier];
  return payablePaisa >= rule.freeFromPaisa ? 0 : rule.feePaisa;
}

/** What more the customer must add for free delivery; 0 when it is already free. */
export function remainingForFreeDelivery(tier: DeliveryTier, payablePaisa: number): number {
  return Math.max(0, DELIVERY_FEES[tier].freeFromPaisa - payablePaisa);
}

/** How much a MONO Member would save on delivery against a guest for the same bag (never negative). */
export function memberDeliverySaving(payablePaisa: number): number {
  return Math.max(0, deliveryFeeFor("GUEST", payablePaisa) - deliveryFeeFor("MEMBER", payablePaisa));
}

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

// Points and credit (owner 2026-11-11, docs/specs/wallet.md). Pure rules, shared so the checkout shows what the
// server applies; only the server spends them.

/** A member earns points on a delivered order: 1 per Rs 1,200 paid (Pass members 2 per Rs 1,200). */
export const POINT_EARN_UNIT_PAISA = 120_000;
/** 1 point is worth Rs 1 at checkout. */
export const POINT_VALUE_PAISA = 100;
/** Points can pay for at most this share of the products' price (after any discount). */
export const POINTS_MAX_SHARE_PERCENT = 20;
/** MONO Member points expire this many days after they are earned; Pass members' never do. */
export const POINTS_EXPIRY_DAYS = 365;

/** Points earned by a delivered order worth `totalPaisa`, for the buyer's tier (guests earn none). */
export function pointsEarned(totalPaisa: number, tier: DeliveryTier | "GUEST"): number {
  if (tier === "GUEST") return 0;
  return Math.floor(totalPaisa / POINT_EARN_UNIT_PAISA) * (tier === "PASS" ? 2 : 1);
}

export type WalletApplication = { pointsUsed: number; creditUsedPaisa: number };

/**
 * How much of the member's points and credit pay for this order. Points first (whole points, at most 20% of the
 * products' price after discount, never more than the order's total), then credit for what is left of the total.
 */
export function walletApplication(input: {
  /** Subtotal less any discount: the base of the 20% cap. */
  goodsPayablePaisa: number;
  /** Total before points and credit (goods, discount and delivery). */
  totalBeforeWalletPaisa: number;
  pointsBalance: number;
  creditBalancePaisa: number;
  usePoints: boolean;
  useCredit: boolean;
}): WalletApplication {
  const maxByShare = Math.floor(
    (input.goodsPayablePaisa * POINTS_MAX_SHARE_PERCENT) / 100 / POINT_VALUE_PAISA,
  );
  const maxByTotal = Math.floor(input.totalBeforeWalletPaisa / POINT_VALUE_PAISA);
  const pointsUsed = input.usePoints ? Math.max(0, Math.min(input.pointsBalance, maxByShare, maxByTotal)) : 0;
  const left = input.totalBeforeWalletPaisa - pointsUsed * POINT_VALUE_PAISA;
  const creditUsedPaisa = input.useCredit ? Math.max(0, Math.min(input.creditBalancePaisa, left)) : 0;
  return { pointsUsed, creditUsedPaisa };
}

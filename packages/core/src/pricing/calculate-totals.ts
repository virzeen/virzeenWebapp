import type { CustomerTier } from "@virzeen/db";
import { AppError } from "../errors";
import { discountAmount, type DiscountRule } from "./discounts";
import { deliveryFeeFor } from "./shipping-rates";
import { POINT_VALUE_PAISA, passDiscountFor, type WalletApplication } from "@virzeen/validators/limits";

export type PricedLine = { unitPricePaisa: number; quantity: number };

export type Totals = {
  subtotalPaisa: number;
  shippingPaisa: number;
  /**
   * Taken off the subtotal: by a discount code, or by the Monochrome Pass's 10% when there is no code (a code replaces
   * the Pass discount); 0 otherwise (payment-policy.md §2).
   */
  discountPaisa: number;
  /** True when `discountPaisa` is the Pass discount, not a code's. */
  isPassDiscount: boolean;
  /** Points spent (1 point = Rs 1) and credit spent, in paisa; both already off `totalPaisa` (specs/wallet.md). */
  pointsUsed: number;
  creditUsedPaisa: number;
  totalPaisa: number;
  /** VAT portion included in the total (prices are VAT-inclusive, payment-policy.md §2). */
  vatPaisa: number;
};

export const VAT_RATE_PERCENT = 13;

/** VAT contained in a VAT-inclusive amount: round(total × 13 / 113). */
export function vatIncluded(totalPaisa: number): number {
  return Math.round((totalPaisa * VAT_RATE_PERCENT) / (100 + VAT_RATE_PERCENT));
}

export function calculateSubtotal(lines: readonly PricedLine[]): number {
  return lines.reduce((sum, line) => {
    if (!Number.isInteger(line.unitPricePaisa) || !Number.isInteger(line.quantity)) {
      throw new AppError("INTERNAL", "Money and quantities must be integers.");
    }
    return sum + line.unitPricePaisa * line.quantity;
  }, 0);
}

/**
 * The only place order totals are computed. Inputs come from the database, never the client. A discount comes off
 * the subtotal (never more than it), so the total can't go below the delivery fee. The fee depends on the buyer's tier
 * and on the bag after the discount (specs/checkout-v2-week1.md). A Pass member gets 10% off unless a code is
 * applied, which replaces it (owner 2026-11-11, specs/membership-portal.md), and free delivery on every order.
 */
export function calculateTotals(
  lines: readonly PricedLine[],
  tier: CustomerTier,
  discount: DiscountRule | null = null,
): Totals {
  const subtotalPaisa = calculateSubtotal(lines);
  const isPassDiscount = tier === "PASS" && !discount;
  const discountPaisa = discount
    ? discountAmount(subtotalPaisa, discount)
    : isPassDiscount
      ? passDiscountFor(subtotalPaisa)
      : 0;
  const shippingPaisa = lines.length === 0 ? 0 : deliveryFeeFor(tier, subtotalPaisa - discountPaisa);
  const totalPaisa = subtotalPaisa - discountPaisa + shippingPaisa;
  return {
    subtotalPaisa,
    shippingPaisa,
    discountPaisa,
    isPassDiscount,
    pointsUsed: 0,
    creditUsedPaisa: 0,
    totalPaisa,
    vatPaisa: vatIncluded(totalPaisa),
  };
}

/**
 * Takes a member's points and credit off the total (`walletApplication` in validators says how much). Points and
 * credit pay for part of the order after the discount and delivery; the total never goes below zero, and VAT is the
 * share contained in what is actually paid.
 */
export function applyWalletToTotals(base: Totals, wallet: WalletApplication): Totals {
  const off = wallet.pointsUsed * POINT_VALUE_PAISA + wallet.creditUsedPaisa;
  if (!Number.isInteger(off) || off < 0 || off > base.totalPaisa) {
    throw new AppError("INTERNAL", "Points and credit can't be more than the order total.");
  }
  const totalPaisa = base.totalPaisa - off;
  return {
    ...base,
    pointsUsed: wallet.pointsUsed,
    creditUsedPaisa: wallet.creditUsedPaisa,
    totalPaisa,
    vatPaisa: vatIncluded(totalPaisa),
  };
}

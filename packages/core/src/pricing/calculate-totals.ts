import type { CustomerTier } from "@virzeen/db";
import { AppError } from "../errors";
import { discountAmount, type DiscountRule } from "./discounts";
import { deliveryFeeFor } from "./shipping-rates";
import { passDiscountFor } from "@virzeen/validators/limits";

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
    totalPaisa,
    vatPaisa: vatIncluded(totalPaisa),
  };
}

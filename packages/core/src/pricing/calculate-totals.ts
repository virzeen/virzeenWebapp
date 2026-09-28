import type { ShippingZone } from "@virzeen/db";
import { AppError } from "../errors";
import { shippingFor } from "./shipping-rates";

export type PricedLine = { unitPricePaisa: number; quantity: number };

export type Totals = {
  subtotalPaisa: number;
  shippingPaisa: number;
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

/** The only place order totals are computed. Inputs come from the database, never the client. */
export function calculateTotals(lines: readonly PricedLine[], zone: ShippingZone): Totals {
  const subtotalPaisa = calculateSubtotal(lines);
  const shippingPaisa = lines.length === 0 ? 0 : shippingFor(zone);
  const totalPaisa = subtotalPaisa + shippingPaisa;
  return { subtotalPaisa, shippingPaisa, totalPaisa, vatPaisa: vatIncluded(totalPaisa) };
}

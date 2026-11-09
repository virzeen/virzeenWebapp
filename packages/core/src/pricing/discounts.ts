import type { DiscountKind } from "@virzeen/db";
import { DISCOUNT_CODE_INVALID } from "@virzeen/validators";
import { AppError } from "../errors";

// Discount codes: the pure rules (payment-policy.md §2, docs/specs/discount-codes.md). No database here.

export type DiscountRule = {
  kind: DiscountKind;
  percentOff: number | null;
  amountOffPaisa: number | null;
};

export type DiscountCodeState = DiscountRule & {
  isActive: boolean;
  endsAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  minSubtotalPaisa: number | null;
  oncePerCustomer: boolean;
};

/**
 * Money off a subtotal: a percentage rounds down, then every discount is cut to whole rupees and never exceeds the
 * subtotal, so the total can't go below Rs 0.
 */
export function discountAmount(subtotalPaisa: number, rule: DiscountRule): number {
  if (!Number.isInteger(subtotalPaisa) || subtotalPaisa < 0) {
    throw new AppError("INTERNAL", "Money must be a non-negative integer.");
  }
  let raw: number;
  if (rule.kind === "PERCENT") {
    const percent = rule.percentOff;
    if (percent === null || !Number.isInteger(percent) || percent < 1 || percent > 100) {
      throw new AppError("INTERNAL", "A percentage code needs 1 to 100 percent.");
    }
    raw = Math.floor((subtotalPaisa * percent) / 100);
  } else {
    const amount = rule.amountOffPaisa;
    if (amount === null || !Number.isInteger(amount) || amount < 0) {
      throw new AppError("INTERNAL", "A fixed code needs an amount.");
    }
    raw = amount;
  }
  const wholeRupees = Math.floor(raw / 100) * 100;
  return Math.min(wholeRupees, subtotalPaisa);
}

export type DiscountRefusal = "INVALID" | "ENDED" | "USED_UP" | "MINIMUM" | "ALREADY_USED";

/** Why a code can't be used on this bag, or null when it can. Checked in this order. */
export function discountRefusal(
  code: DiscountCodeState | null,
  context: { subtotalPaisa: number; now: Date; customerUses: number },
): DiscountRefusal | null {
  if (!code || !code.isActive) return "INVALID";
  if (code.endsAt && code.endsAt.getTime() < context.now.getTime()) return "ENDED";
  if (code.maxUses !== null && code.usedCount >= code.maxUses) return "USED_UP";
  if (code.minSubtotalPaisa !== null && context.subtotalPaisa < code.minSubtotalPaisa) return "MINIMUM";
  if (code.oncePerCustomer && context.customerUses > 0) return "ALREADY_USED";
  return null;
}

const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** The words under the checkout's code field (docs/ui/content-style.md "Checkout"). */
export function discountRefusalMessage(refusal: DiscountRefusal, code: DiscountCodeState | null): string {
  switch (refusal) {
    case "INVALID":
      return DISCOUNT_CODE_INVALID;
    case "ENDED":
      return "This code has ended.";
    case "USED_UP":
      return "This code has been fully used.";
    case "MINIMUM":
      return `Spend Rs ${rupees.format((code?.minSubtotalPaisa ?? 0) / 100)} or more to use this code.`;
    case "ALREADY_USED":
      return "You've already used this code.";
  }
}

/** The refusal as the error checkout returns: a field error the form shows under the code. */
export function discountRefusalError(refusal: DiscountRefusal, code: DiscountCodeState | null): AppError {
  const message = discountRefusalMessage(refusal, code);
  return new AppError("VALIDATION_FAILED", message, { fields: { discountCode: message } });
}

// Nepal is UTC+05:45 all year (no daylight saving).
const NEPAL_OFFSET = "+05:45";
const nepalDate = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Kathmandu",
});

/** "2026-12-31" → the last millisecond of 31 December in Nepal. */
export function endOfNepalDay(date: string): Date {
  const end = new Date(`${date}T23:59:59.999${NEPAL_OFFSET}`);
  if (Number.isNaN(end.getTime())) throw new AppError("VALIDATION_FAILED", "Choose a date");
  return end;
}

/** The Nepal calendar date of a moment, as "YYYY-MM-DD" (the admin form's "Ends on"). */
export function nepalDateOf(moment: Date): string {
  return nepalDate.format(moment);
}

import { describe, expect, it } from "vitest";
import { calculateTotals, vatIncluded } from "./calculate-totals";
import {
  discountAmount,
  discountRefusal,
  discountRefusalMessage,
  endOfNepalDay,
  nepalDateOf,
  type DiscountCodeState,
} from "./discounts";

// payment-policy.md §2, docs/specs/discount-codes.md "Discount amount".

const percent = (percentOff: number) => ({ kind: "PERCENT" as const, percentOff, amountOffPaisa: null });
const fixed = (amountOffPaisa: number) => ({ kind: "FIXED" as const, percentOff: null, amountOffPaisa });

describe("discountAmount", () => {
  it("takes a percentage of the subtotal, rounded down to whole rupees", () => {
    expect(discountAmount(450_000, percent(10))).toBe(45_000);
    // 15% of Rs 1,299 = Rs 194.85 → Rs 194.
    expect(discountAmount(129_900, percent(15))).toBe(19_400);
    // 10% of Rs 1,250.50 = Rs 125.05 → Rs 125.
    expect(discountAmount(125_050, percent(10))).toBe(12_500);
  });

  it("takes a fixed amount", () => {
    expect(discountAmount(450_000, fixed(50_000))).toBe(50_000);
  });

  it("never takes more than the subtotal, so the total can't go below Rs 0", () => {
    expect(discountAmount(30_000, fixed(50_000))).toBe(30_000);
    expect(discountAmount(450_000, percent(100))).toBe(450_000);
    expect(discountAmount(0, percent(50))).toBe(0);
  });

  it("refuses broken rules and non-integer money", () => {
    expect(() => discountAmount(1000.5, percent(10))).toThrow();
    expect(() => discountAmount(1000, percent(0))).toThrow();
    expect(() => discountAmount(1000, { kind: "FIXED", percentOff: null, amountOffPaisa: null })).toThrow();
  });
});

describe("calculateTotals with a discount", () => {
  const lines = [{ unitPricePaisa: 225_000, quantity: 2 }];

  it("takes the discount off the subtotal and works out VAT from the new total", () => {
    const totals = calculateTotals(lines, "GUEST", percent(10));
    expect(totals.subtotalPaisa).toBe(450_000);
    expect(totals.discountPaisa).toBe(45_000);
    expect(totals.totalPaisa).toBe(450_000 - 45_000 + totals.shippingPaisa);
    expect(totals.vatPaisa).toBe(vatIncluded(totals.totalPaisa));
  });

  it("has no discount without a code", () => {
    const totals = calculateTotals(lines, "GUEST");
    expect(totals.discountPaisa).toBe(0);
    expect(totals.totalPaisa).toBe(totals.subtotalPaisa + totals.shippingPaisa);
  });
});

const NOW = new Date("2026-11-09T06:00:00Z");

const code = (overrides: Partial<DiscountCodeState> = {}): DiscountCodeState => ({
  ...percent(10),
  isActive: true,
  endsAt: null,
  maxUses: null,
  usedCount: 0,
  minSubtotalPaisa: null,
  oncePerCustomer: false,
  ...overrides,
});

const context = { subtotalPaisa: 450_000, now: NOW, customerUses: 0 };

describe("discountRefusal", () => {
  it("accepts a working code", () => {
    expect(discountRefusal(code(), context)).toBeNull();
  });

  it("gives each reason a code can't be used", () => {
    expect(discountRefusal(null, context)).toBe("INVALID");
    expect(discountRefusal(code({ isActive: false }), context)).toBe("INVALID");
    expect(discountRefusal(code({ endsAt: new Date(NOW.getTime() - 1) }), context)).toBe("ENDED");
    expect(discountRefusal(code({ maxUses: 5, usedCount: 5 }), context)).toBe("USED_UP");
    expect(discountRefusal(code({ minSubtotalPaisa: 500_000 }), context)).toBe("MINIMUM");
    expect(discountRefusal(code({ oncePerCustomer: true }), { ...context, customerUses: 1 })).toBe(
      "ALREADY_USED",
    );
  });

  it("still works on its last moment, on the exact minimum and with a use left", () => {
    expect(discountRefusal(code({ endsAt: NOW }), context)).toBeNull();
    expect(discountRefusal(code({ minSubtotalPaisa: 450_000 }), context)).toBeNull();
    expect(discountRefusal(code({ maxUses: 5, usedCount: 4 }), context)).toBeNull();
    expect(discountRefusal(code({ oncePerCustomer: false }), { ...context, customerUses: 3 })).toBeNull();
  });

  it("says why in the checkout's words", () => {
    expect(discountRefusalMessage("INVALID", null)).toBe("This code isn't valid.");
    expect(discountRefusalMessage("ENDED", null)).toBe("This code has ended.");
    expect(discountRefusalMessage("USED_UP", null)).toBe("This code has been fully used.");
    expect(discountRefusalMessage("MINIMUM", code({ minSubtotalPaisa: 200_000 }))).toBe(
      "Spend Rs 2,000 or more to use this code.",
    );
    expect(discountRefusalMessage("ALREADY_USED", null)).toBe("You've already used this code.");
  });
});

describe("Nepal end-of-day dates", () => {
  it("ends a code at the last millisecond of the chosen day in Nepal (UTC+05:45)", () => {
    expect(endOfNepalDay("2026-12-31").toISOString()).toBe("2026-12-31T18:14:59.999Z");
  });

  it("shows the Nepal date of a moment for the admin form", () => {
    expect(nepalDateOf(endOfNepalDay("2026-12-31"))).toBe("2026-12-31");
    // 20:00 UTC on the 31st is already 1 January in Nepal.
    expect(nepalDateOf(new Date("2026-12-31T20:00:00Z"))).toBe("2027-01-01");
  });
});

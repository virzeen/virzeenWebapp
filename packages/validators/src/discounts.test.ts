import { describe, expect, it } from "vitest";
import { checkoutPreviewSchema, checkoutSchema } from "./checkout";
import { discountCodeInputSchema, discountCodeSchema } from "./discounts";

const addressId = "tz4a98xxat96iws9zmbrgj3a";

const percentCode = {
  code: "welcome10",
  kind: "PERCENT",
  percentOff: 10,
  oncePerCustomer: false,
  isActive: true,
} as const;

const firstMessage = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

describe("discountCodeInputSchema (what the customer types)", () => {
  it("matches any case and ignores spaces around the code", () => {
    expect(discountCodeInputSchema.parse("  welcome-10 ")).toBe("WELCOME-10");
  });

  it("asks for a code when the field is empty", () => {
    expect(firstMessage(discountCodeInputSchema.safeParse("   "))).toBe("Enter a discount code");
  });

  it("answers like an unknown code for anything no code can look like", () => {
    for (const typed of ["AB", "WELCOME 10", "10%OFF", "A".repeat(25)]) {
      expect(firstMessage(discountCodeInputSchema.safeParse(typed))).toBe("This code isn't valid.");
    }
  });
});

describe("discountCodeSchema (admin form)", () => {
  it("stores the code upper-case and leaves the optional limits out", () => {
    expect(discountCodeSchema.parse(percentCode)).toEqual({ ...percentCode, code: "WELCOME10" });
  });

  it("asks for the percentage of a percentage code, from 1 to 100", () => {
    const { percentOff: _, ...withoutPercent } = percentCode;
    expect(firstMessage(discountCodeSchema.safeParse(withoutPercent))).toBe(
      "Enter a percentage from 1 to 100",
    );
    for (const percentOff of [0, 101, 12.5]) {
      expect(firstMessage(discountCodeSchema.safeParse({ ...percentCode, percentOff }))).toBe(
        "Enter a percentage from 1 to 100",
      );
    }
  });

  it("asks for a fixed code's amount in whole rupees", () => {
    const fixed = { ...percentCode, kind: "FIXED", percentOff: undefined };
    expect(firstMessage(discountCodeSchema.safeParse(fixed))).toBe("Enter an amount in rupees, e.g. 500");
    expect(firstMessage(discountCodeSchema.safeParse({ ...fixed, amountOffPaisa: 50_050 }))).toBe(
      "Enter whole rupees",
    );
    expect(firstMessage(discountCodeSchema.safeParse({ ...fixed, amountOffPaisa: 0 }))).toBe(
      "Enter at least Rs 1",
    );
    expect(discountCodeSchema.parse({ ...fixed, amountOffPaisa: 50_000 }).amountOffPaisa).toBe(50_000);
  });

  it("checks the optional minimum, end date and total uses", () => {
    expect(firstMessage(discountCodeSchema.safeParse({ ...percentCode, minSubtotalPaisa: 199_950 }))).toBe(
      "Enter whole rupees",
    );
    expect(firstMessage(discountCodeSchema.safeParse({ ...percentCode, endsOn: "31/12/2026" }))).toBe(
      "Choose a date",
    );
    expect(firstMessage(discountCodeSchema.safeParse({ ...percentCode, maxUses: 0 }))).toBe(
      "Enter a whole number, 1 or more",
    );
    expect(
      discountCodeSchema.parse({
        ...percentCode,
        minSubtotalPaisa: 200_000,
        endsOn: "2026-12-31",
        maxUses: 50,
      }),
    ).toMatchObject({ minSubtotalPaisa: 200_000, endsOn: "2026-12-31", maxUses: 50 });
  });

  it("refuses codes with spaces or symbols, and unknown fields", () => {
    expect(firstMessage(discountCodeSchema.safeParse({ ...percentCode, code: "10% OFF" }))).toBe(
      "Use 3 to 24 letters, numbers or hyphens",
    );
    expect(discountCodeSchema.safeParse({ ...percentCode, usedCount: 0 }).success).toBe(false);
  });
});

describe("checkout schemas with a discount code", () => {
  it("take an optional code, normalised", () => {
    expect(checkoutSchema.parse({ addressId, paymentMethod: "COD", discountCode: " welcome10" })).toEqual({
      addressId,
      paymentMethod: "COD",
      discountCode: "WELCOME10",
    });
    expect(checkoutSchema.parse({ addressId, paymentMethod: "COD" })).toEqual({
      addressId,
      paymentMethod: "COD",
    });
    expect(checkoutPreviewSchema.parse({ addressId: null, discountCode: "launch" })).toEqual({
      addressId: null,
      discountCode: "LAUNCH",
    });
  });
});

import { describe, expect, it } from "vitest";
import { calculateTotals, vatIncluded } from "./calculate-totals";
import { COD_MAX_TOTAL_PAISA, isCodAvailable } from "./cod-rules";
import { passDiscountFor } from "@virzeen/validators/limits";
import {
  arrivalWindow,
  deliveryFeeFor,
  memberDeliverySaving,
  remainingForFreeDelivery,
  shippingZoneFor,
} from "./shipping-rates";

describe("shippingZoneFor", () => {
  it("puts Kathmandu, Lalitpur and Bhaktapur in the valley zone", () => {
    for (const district of ["Kathmandu", "Lalitpur", "Bhaktapur"]) {
      expect(shippingZoneFor(district)).toBe("KATHMANDU_VALLEY");
    }
  });

  it("puts every other district outside the valley", () => {
    expect(shippingZoneFor("Kaski")).toBe("OUTSIDE_VALLEY");
    expect(shippingZoneFor("Jhapa")).toBe("OUTSIDE_VALLEY");
  });
});

describe("calculateTotals", () => {
  it("adds line totals and the buyer's delivery fee", () => {
    const totals = calculateTotals(
      [
        { unitPricePaisa: 450_000, quantity: 2 },
        { unitPricePaisa: 125_000, quantity: 1 },
      ],
      "GUEST",
    );
    expect(totals.subtotalPaisa).toBe(1_025_000);
    expect(totals.shippingPaisa).toBe(0); // above Rs. 9,999
    expect(totals.totalPaisa).toBe(1_025_000);
  });

  it("charges no shipping for an empty bag", () => {
    expect(calculateTotals([], "GUEST")).toMatchObject({
      subtotalPaisa: 0,
      shippingPaisa: 0,
      totalPaisa: 0,
    });
  });

  it("rejects non-integer money", () => {
    expect(() => calculateTotals([{ unitPricePaisa: 10.5, quantity: 1 }], "GUEST")).toThrow();
  });
});

describe("vatIncluded", () => {
  it("extracts 13% VAT from a VAT-inclusive total, rounded to the paisa", () => {
    expect(vatIncluded(113_000)).toBe(13_000);
    expect(vatIncluded(460_000)).toBe(52_920);
  });
});

describe("isCodAvailable", () => {
  it("allows COD up to and including the limit, or any total when there is no limit", () => {
    if (COD_MAX_TOTAL_PAISA === null) {
      expect(isCodAvailable(1_000_000_000)).toBe(true);
    } else {
      expect(isCodAvailable(COD_MAX_TOTAL_PAISA)).toBe(true);
      expect(isCodAvailable(COD_MAX_TOTAL_PAISA + 1)).toBe(false);
    }
  });
});

describe("delivery fees (owner decision 2026-11-11)", () => {
  const line = (rupees: number) => [{ unitPricePaisa: rupees * 100, quantity: 1 }];

  it("charges a guest Rs. 200 below Rs. 9,999 and nothing from Rs. 9,999", () => {
    expect(deliveryFeeFor("GUEST", 999_899)).toBe(20_000);
    expect(deliveryFeeFor("GUEST", 999_900)).toBe(0);
  });

  it("charges a member Rs. 150 below Rs. 3,000 and nothing from Rs. 3,000", () => {
    expect(deliveryFeeFor("MEMBER", 299_999)).toBe(15_000);
    expect(deliveryFeeFor("MEMBER", 300_000)).toBe(0);
  });

  it("matches the worked example: Rs. 2,500 is Rs. 2,700 for a guest and Rs. 2,650 for a member", () => {
    expect(calculateTotals(line(2500), "GUEST").totalPaisa).toBe(270_000);
    expect(calculateTotals(line(2500), "MEMBER").totalPaisa).toBe(265_000);
  });

  it("measures the free-delivery threshold after a discount", () => {
    const tenPercent = { kind: "PERCENT", percentOff: 10, amountOffPaisa: null } as const;
    // Rs. 4,200 less 10% is Rs. 3,780: below the guest threshold, above the member one.
    expect(calculateTotals(line(4200), "GUEST", tenPercent).shippingPaisa).toBe(20_000);
    expect(calculateTotals(line(4200), "MEMBER", tenPercent).shippingPaisa).toBe(0);
  });

  it("says how much more makes delivery free, and how much membership saves", () => {
    expect(remainingForFreeDelivery("GUEST", 280_000)).toBe(719_900);
    expect(remainingForFreeDelivery("GUEST", 1_050_000)).toBe(0);
    expect(memberDeliverySaving(250_000)).toBe(5_000);
    expect(memberDeliverySaving(450_000)).toBe(20_000); // guest pays, member free
    expect(memberDeliverySaving(1_050_000)).toBe(0); // free for everyone
    expect(memberDeliverySaving(350_000)).toBe(20_000); // guest pays, member free
  });
});

describe("arrivalWindow", () => {
  const monday = new Date("2026-11-11T06:00:00Z"); // 11:45 on 11 Nov in Kathmandu

  it("is one date inside the valley: dispatch (48 h guest, 24 h member) plus the same day", () => {
    expect(arrivalWindow("GUEST", "KATHMANDU_VALLEY", monday)).toBe("Nov 13");
    expect(arrivalWindow("MEMBER", "KATHMANDU_VALLEY", monday)).toBe("Nov 12");
  });

  it("is a range elsewhere, and names both months across a month end", () => {
    expect(arrivalWindow("GUEST", "OUTSIDE_VALLEY", monday)).toBe("Nov 15 to 17");
    expect(arrivalWindow("GUEST", "OUTSIDE_VALLEY", new Date("2026-11-27T06:00:00Z"))).toBe("Dec 1 to 3");
    expect(arrivalWindow("MEMBER", "OUTSIDE_VALLEY", new Date("2026-11-28T06:00:00Z"))).toBe("Dec 1 to 3");
  });

  it("uses the Nepal date late in the evening", () => {
    // 20:00 UTC is already the next morning in Nepal.
    expect(arrivalWindow("MEMBER", "KATHMANDU_VALLEY", new Date("2026-11-11T20:00:00Z"))).toBe("Nov 13");
  });
});

describe("Monochrome Pass pricing (owner 2026-11-11, specs/membership-portal.md)", () => {
  const line = (rupees: number) => [{ unitPricePaisa: rupees * 100, quantity: 1 }];
  const tenPercent = { kind: "PERCENT", percentOff: 10, amountOffPaisa: null } as const;
  const fiveHundredOff = { kind: "FIXED", percentOff: null, amountOffPaisa: 50_000 } as const;

  it("delivers free on every order, however small", () => {
    expect(deliveryFeeFor("PASS", 100)).toBe(0);
    expect(calculateTotals(line(500), "PASS").shippingPaisa).toBe(0);
    expect(remainingForFreeDelivery("PASS", 100)).toBe(0);
  });

  it("takes 10% off the products when there is no code", () => {
    const totals = calculateTotals(line(2500), "PASS");
    expect(totals).toMatchObject({
      discountPaisa: 25_000,
      isPassDiscount: true,
      shippingPaisa: 0,
      totalPaisa: 225_000,
    });
  });

  it("rounds the Pass discount down to whole rupees", () => {
    expect(passDiscountFor(149_900)).toBe(14_900); // 10% is Rs. 149.90, so Rs. 149
    expect(calculateTotals(line(1499), "PASS").discountPaisa).toBe(14_900);
  });

  it("lets a code replace the Pass discount instead of adding to it", () => {
    const withCode = calculateTotals(line(2500), "PASS", fiveHundredOff);
    expect(withCode).toMatchObject({ discountPaisa: 50_000, isPassDiscount: false, totalPaisa: 200_000 });
    const sameAsPass = calculateTotals(line(2500), "PASS", tenPercent);
    expect(sameAsPass).toMatchObject({ discountPaisa: 25_000, isPassDiscount: false });
  });

  it("gives guests and MONO Members no Pass discount", () => {
    expect(calculateTotals(line(2500), "MEMBER").discountPaisa).toBe(0);
    expect(calculateTotals(line(2500), "GUEST").isPassDiscount).toBe(false);
  });
});

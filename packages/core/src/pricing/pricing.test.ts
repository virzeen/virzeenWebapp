import { describe, expect, it } from "vitest";
import { calculateTotals, vatIncluded } from "./calculate-totals";
import { COD_MAX_TOTAL_PAISA, isCodAvailable } from "./cod-rules";
import { SHIPPING_RATES_PAISA, shippingZoneFor } from "./shipping-rates";

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
  it("adds line totals and the zone's shipping rate", () => {
    const totals = calculateTotals(
      [
        { unitPricePaisa: 450_000, quantity: 2 },
        { unitPricePaisa: 125_000, quantity: 1 },
      ],
      "OUTSIDE_VALLEY",
    );
    expect(totals.subtotalPaisa).toBe(1_025_000);
    expect(totals.shippingPaisa).toBe(SHIPPING_RATES_PAISA.OUTSIDE_VALLEY);
    expect(totals.totalPaisa).toBe(1_025_000 + SHIPPING_RATES_PAISA.OUTSIDE_VALLEY);
  });

  it("charges no shipping for an empty bag", () => {
    expect(calculateTotals([], "KATHMANDU_VALLEY")).toMatchObject({
      subtotalPaisa: 0,
      shippingPaisa: 0,
      totalPaisa: 0,
    });
  });

  it("rejects non-integer money", () => {
    expect(() => calculateTotals([{ unitPricePaisa: 10.5, quantity: 1 }], "KATHMANDU_VALLEY")).toThrow();
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

describe("free shipping (owner decision 2026-09-28)", () => {
  it("charges nothing at checkout because shipping is included in product prices", () => {
    expect(calculateTotals([{ unitPricePaisa: 245_000, quantity: 1 }], "OUTSIDE_VALLEY")).toMatchObject({
      shippingPaisa: 0,
      totalPaisa: 245_000,
    });
  });
});

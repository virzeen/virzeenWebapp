import { describe, expect, it } from "vitest";
import { missingForPublish, publishChecks } from "./publish-checks";

const ready = {
  name: "Linen shirt",
  images: [{ url: "p/a", alt: "" }],
  description: "Soft linen.",
  categoryId: "tz4a98xxat96iws9zmbrgj3a",
  shippingPaisa: 15_000,
  variants: [{ sku: "", size: "M", color: "", pricePaisa: 150_000, stock: 2, isActive: true }],
};

describe("before publishing", () => {
  it("passes a complete product", () => {
    expect(missingForPublish(ready)).toEqual([]);
    expect(publishChecks(ready).noStock).toBe(false);
  });

  it("lists what a new draft still needs, in checklist order", () => {
    expect(
      missingForPublish({
        ...ready,
        images: [],
        description: " ",
        shippingPaisa: Number.NaN,
        variants: [{ ...ready.variants[0]!, isActive: false }],
      }),
    ).toEqual(["At least one photo", "Description", "Price", "Shipping (0 for none)", "Something for sale"]);
  });

  it("warns about no stock only once everything else is in place", () => {
    expect(publishChecks({ ...ready, variants: [{ ...ready.variants[0]!, stock: 0 }] }).noStock).toBe(true);
    expect(
      publishChecks({ ...ready, name: "", variants: [{ ...ready.variants[0]!, stock: 0 }] }).noStock,
    ).toBe(false);
  });
});

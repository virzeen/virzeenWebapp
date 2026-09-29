import { describe, expect, it } from "vitest";
import { priceFor, styleHasStock, variantFor } from "./selection";

const variant = (id: string, color: string | null, size: string | null, pricePaisa: number, stock = 5) => ({
  id,
  color,
  size,
  pricePaisa,
  stock,
});

describe("product selection (specs/product-page.md)", () => {
  const variants = [
    variant("bm", "Black", "M", 450_000),
    variant("bl", "Black", "L", 480_000),
    variant("wm", "White", "M", 500_000, 0),
  ];

  it("finds the variant for a style and size", () => {
    expect(variantFor(variants, true, true, "Black", "L")?.id).toBe("bl");
    expect(variantFor(variants, true, true, "White", "L")).toBeUndefined();
    const plain = [variant("one", null, null, 100_000)];
    expect(variantFor(plain, false, false, null, null)?.id).toBe("one");
  });

  it("follows the picked style's price, as From until a size is picked", () => {
    expect(priceFor(variants, "Black", undefined)).toEqual({ paisa: 450_000, from: true });
    expect(priceFor(variants, "White", undefined)).toEqual({ paisa: 500_000, from: false });
    expect(priceFor(variants, "Black", variants[1])).toEqual({ paisa: 480_000, from: false });
    expect(priceFor(variants, null, undefined)).toEqual({ paisa: 450_000, from: true });
  });

  it("knows which styles have stock", () => {
    expect(styleHasStock(variants, "Black")).toBe(true);
    expect(styleHasStock(variants, "White")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { bagChoice, favouriteDetails, favouriteHref } from "./favourite-bag";

const variant = (id: string, size: string | null, stock: number) => ({
  id,
  size,
  stock,
  pricePaisa: 250_000,
});

/** A favourite's variants; `inStock` is the card's (the whole product's when the style isn't sold any more). */
const item = (variants: ReturnType<typeof variant>[], inStock = variants.some((v) => v.stock > 0)) => ({
  variants,
  product: { inStock },
});

describe("bagChoice", () => {
  it("adds the one variant of a style without sizes", () => {
    expect(bagChoice(item([variant("cap", null, 3)]))).toEqual({
      kind: "add",
      variant: variant("cap", null, 3),
    });
  });

  it("asks for a size when the style has sizes, keeping sold out ones in order", () => {
    const sizes = [variant("s", "S", 0), variant("m", "M", 2), variant("l", "L", 1)];
    expect(bagChoice(item(sizes))).toEqual({ kind: "size", sizes });
    // One size is still picked in the popup, as on the product page.
    expect(bagChoice(item([variant("m", "M", 2)]))).toEqual({ kind: "size", sizes: [variant("m", "M", 2)] });
  });

  it("is sold out when nothing of the style is in stock", () => {
    expect(bagChoice(item([variant("s", "S", 0), variant("m", "M", 0)]))).toEqual({ kind: "soldOut" });
    expect(bagChoice(item([variant("cap", null, 0)]))).toEqual({ kind: "soldOut" });
  });

  it("points to the product when the style isn't sold any more but another style is in stock", () => {
    expect(bagChoice(item([], true))).toEqual({ kind: "view" });
    // The whole product is sold out too.
    expect(bagChoice(item([], false))).toEqual({ kind: "soldOut" });
  });
});

describe("favouriteHref", () => {
  it("opens the product in the saved style, or the product's usual page", () => {
    const product = { slug: "linen-overshirt" };
    expect(favouriteHref({ product, style: "Sand Beige" })).toBe(
      "/product/linen-overshirt?style=Sand%20Beige",
    );
    expect(favouriteHref({ product, style: "" })).toBe("/product/linen-overshirt");
  });
});

describe("favouriteDetails", () => {
  it("gives the category and the style, or just the category", () => {
    expect(favouriteDetails({ category: "Tops", style: "Black" })).toBe("Tops · Black");
    expect(favouriteDetails({ category: "Accessories", style: "" })).toBe("Accessories");
  });
});

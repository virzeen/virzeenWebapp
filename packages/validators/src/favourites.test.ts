import { describe, expect, it } from "vitest";
import {
  favouriteKeySchema,
  favouriteProductsSchema,
  mergeFavouritesSchema,
  setFavouriteSchema,
} from "./favourites";
import { MAX_FAVOURITES, toFavouriteKey } from "./limits";

const PRODUCT_ID = "tz4a98xxat96iws9zmbrgj3a";

describe("favourite keys (specs/favourites.md)", () => {
  it("takes a product with a style, or with no style as a blank colour", () => {
    expect(favouriteKeySchema.parse({ productId: PRODUCT_ID, color: " White " })).toEqual({
      productId: PRODUCT_ID,
      color: "White",
    });
    expect(favouriteKeySchema.safeParse({ productId: PRODUCT_ID, color: "" }).success).toBe(true);
  });

  it("refuses a bad product id, a missing or long colour, and extra keys like savedAt", () => {
    expect(favouriteKeySchema.safeParse({ productId: "../etc", color: "" }).success).toBe(false);
    expect(favouriteKeySchema.safeParse({ productId: PRODUCT_ID }).success).toBe(false);
    expect(favouriteKeySchema.safeParse({ productId: PRODUCT_ID, color: "x".repeat(41) }).success).toBe(
      false,
    );
    expect(
      favouriteKeySchema.safeParse({ productId: PRODUCT_ID, color: "", savedAt: "2026-09-29" }).success,
    ).toBe(false);
  });

  it("needs an explicit saved flag to set a favourite", () => {
    expect(setFavouriteSchema.parse({ productId: PRODUCT_ID, color: "Black", saved: false })).toEqual({
      productId: PRODUCT_ID,
      color: "Black",
      saved: false,
    });
    expect(setFavouriteSchema.safeParse({ productId: PRODUCT_ID, color: "Black" }).success).toBe(false);
    expect(
      setFavouriteSchema.safeParse({ productId: PRODUCT_ID, color: "Black", saved: true, extra: 1 }).success,
    ).toBe(false);
  });

  it("takes up to 100 keys to merge or look up", () => {
    const keys = (n: number) => Array.from({ length: n }, () => ({ productId: PRODUCT_ID, color: "" }));
    expect(MAX_FAVOURITES).toBe(100);
    expect(mergeFavouritesSchema.safeParse({ keys: keys(100) }).success).toBe(true);
    expect(mergeFavouritesSchema.safeParse({ keys: keys(101) }).success).toBe(false);
    expect(favouriteProductsSchema.safeParse({ keys: [] }).success).toBe(true);
    expect(favouriteProductsSchema.safeParse({ keys: keys(101) }).success).toBe(false);
  });
});

describe("toFavouriteKey (the browser's zod-free check)", () => {
  const id = "cmg1a2b3c4d5e6f7g8h9i0j1k";
  const cases: [unknown, unknown][] = [
    [id, ""],
    [id, "  Black  "],
    [id, "x".repeat(40)],
    [id, "x".repeat(41)],
    ["Not-A-Cuid", "Black"],
    ["", "Black"],
    [42, "Black"],
    [id, null],
    [id, 7],
  ];

  it("accepts and trims exactly what favouriteKeySchema does", () => {
    for (const [productId, color] of cases) {
      const parsed = favouriteKeySchema.safeParse({ productId, color });
      expect(toFavouriteKey(productId, color)).toEqual(parsed.success ? parsed.data : null);
    }
  });
});

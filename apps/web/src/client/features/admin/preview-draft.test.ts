import type { ProductInput } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import { toPreviewProduct } from "./preview-draft";

const values: ProductInput = {
  name: "Linen Shirt",
  slug: "linen-shirt",
  description: "Washed linen.",
  care: "",
  seoDescription: "",
  categoryId: "tz4a98xxat96iws9zmbrgj3a",
  collectionIds: [],
  isPublished: false,
  images: [
    { url: "virzeen/products/new/front", alt: "" },
    { url: "virzeen/products/new/back", alt: "Back view" },
  ],
  shippingPaisa: 15_000,
  variants: [
    { sku: "", size: "XL", color: "Black", pricePaisa: 135_000, stock: 2, isActive: true },
    { sku: "", size: "S", color: "Black", pricePaisa: 135_000, stock: 0, isActive: true },
    { sku: "", size: "M", color: "Red", pricePaisa: 135_000, stock: 4, isActive: false },
  ],
};

describe("toPreviewProduct", () => {
  it("shows what the shop would: rows for sale, prices with shipping, sizes in shop order, made descriptions", () => {
    const product = toPreviewProduct({ values, category: { name: "Shirts", slug: "shirts" } });

    expect(product.variants.map((v) => [v.color, v.size, v.pricePaisa, v.stock])).toEqual([
      ["Black", "XL", 150_000, 2],
      ["Black", "S", 150_000, 0],
    ]);
    expect(product.sizes).toEqual(["S", "XL"]);
    expect(product.colors).toEqual(["Black"]);
    expect(product.images.map((image) => image.alt)).toEqual(["Linen Shirt", "Back view"]);
    expect(product.care).toBeNull();
    expect(product.category).toEqual({ name: "Shirts", slug: "shirts" });
  });

  it("copes with a half-filled form after the trip through JSON (blank numbers arrive as null)", () => {
    const draft = JSON.parse(
      JSON.stringify({
        values: {
          ...values,
          name: " ",
          shippingPaisa: Number.NaN,
          variants: [
            { sku: "", size: "", color: "", pricePaisa: Number.NaN, stock: Number.NaN, isActive: true },
          ],
        },
        category: null,
      }),
    );

    const product = toPreviewProduct(draft);

    expect(product.name).toBe("Product name");
    expect(product.category.name).toBe("No category yet");
    expect(product.variants).toEqual([{ id: "preview-0", size: null, color: null, pricePaisa: 0, stock: 0 }]);
  });
});

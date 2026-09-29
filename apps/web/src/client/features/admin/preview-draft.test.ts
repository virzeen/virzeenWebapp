import type { ProductInput } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import { toPreviewProduct } from "./preview-draft";

const values: ProductInput = {
  name: "Linen Shirt",
  slug: "linen-shirt",
  description: "Washed linen.",
  care: "",
  benefits: [],
  details: [],
  countryOfOrigin: "",
  seoDescription: "",
  categoryId: "tz4a98xxat96iws9zmbrgj3a",
  sizeGuideId: "",
  collectionIds: [],
  isPublished: false,
  images: [
    { url: "virzeen/products/new/front", alt: "" },
    { url: "virzeen/products/new/back", alt: "Back view" },
  ],
  features: [],
  shippingPaisa: 15_000,
  variants: [
    { sku: "", size: "XL", color: "Black", pricePaisa: 135_000, stock: 2, isActive: true },
    { sku: "", size: "S", color: "Black", pricePaisa: 135_000, stock: 0, isActive: true },
    { sku: "", size: "M", color: "Red", pricePaisa: 135_000, stock: 4, isActive: false },
  ],
};

describe("toPreviewProduct", () => {
  it("shows what the shop would: rows for sale, prices with shipping, sizes in shop order, made descriptions", () => {
    const product = toPreviewProduct({
      values,
      category: { name: "Shirts", slug: "shirts" },
      sizeGuide: null,
    });

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
        sizeGuide: null,
      }),
    );

    const product = toPreviewProduct(draft);

    expect(product.name).toBe("Product name");
    expect(product.category.name).toBe("No category yet");
    expect(product.variants).toEqual([{ id: "preview-0", size: null, color: null, pricePaisa: 0, stock: 0 }]);
  });

  it("shows the product details, features and picked size guide, with blank lines dropped and made descriptions", () => {
    const sizeGuide = {
      name: "Tops",
      intro: null,
      chart: { columns: ["Chest"], rows: [{ size: "M", values: ["94-100"] }] },
      fitTips: null,
      howToMeasure: [],
      imageUrl: null,
      imageAlt: null,
    };
    const product = toPreviewProduct({
      values: {
        ...values,
        benefits: ["Breathable", " "],
        details: [" 100% linen "],
        countryOfOrigin: " Nepal ",
        features: [
          { title: "Cool", body: "Airy weave.", imageUrl: "virzeen/products/new/cool", alt: "" },
          { title: "Soft", body: "Washed.", imageUrl: "virzeen/products/new/soft", alt: "Close-up" },
        ],
      },
      category: null,
      sizeGuide,
    });

    expect(product.productId).toBe("preview");
    expect(product.benefits).toEqual(["Breathable"]);
    expect(product.details).toEqual(["100% linen"]);
    expect(product.countryOfOrigin).toBe("Nepal");
    expect(product.features.map((feature) => [feature.title, feature.imageAlt])).toEqual([
      ["Cool", "Linen Shirt, Cool"],
      ["Soft", "Close-up"],
    ]);
    expect(product.sizeGuide).toEqual(sizeGuide);
  });

  it("opens a draft saved by an older editor, before details, features and size guides", () => {
    const oldValues: Record<string, unknown> = { ...values };
    for (const key of ["benefits", "details", "countryOfOrigin", "sizeGuideId", "features"])
      delete oldValues[key];
    const draft = JSON.parse(JSON.stringify({ values: oldValues, category: null }));

    const product = toPreviewProduct(draft);

    expect(product.benefits).toEqual([]);
    expect(product.details).toEqual([]);
    expect(product.countryOfOrigin).toBeNull();
    expect(product.features).toEqual([]);
    expect(product.sizeGuide).toBeNull();
    expect(product.variants).toHaveLength(2);
  });
});

import type { ProductInput } from "@virzeen/validators";
import { describe, expect, it } from "vitest";
import { relatedQueryFor, toPreviewProduct } from "./preview-draft";

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
  featureLayout: "TALL_LEFT",
  featureRows: [{ count: 1, shape: "LANDSCAPE" }],
  styles: [{ color: "Black", colourShown: "Black/White", code: "VZ0042-101" }],
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
      kind: "CHART" as const,
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
    for (const key of [
      "benefits",
      "details",
      "countryOfOrigin",
      "sizeGuideId",
      "features",
      "featureLayout",
      "featureRows",
      "styles",
    ])
      delete oldValues[key];
    const draft = JSON.parse(JSON.stringify({ values: oldValues, category: null }));

    const product = toPreviewProduct(draft);

    expect(product.benefits).toEqual([]);
    expect(product.details).toEqual([]);
    expect(product.countryOfOrigin).toBeNull();
    expect(product.features).toEqual([]);
    expect(product.featureLayout).toBe("THREE");
    expect(product.featureRows).toEqual([]);
    expect(product.sizeGuide).toBeNull();
    expect(product.variants).toHaveLength(2);
    expect(product.styles).toEqual([{ color: "Black", code: "", colourShown: "Black" }]);
    expect(relatedQueryFor(draft)).toEqual({ categoryId: "tz4a98xxat96iws9zmbrgj3a" });
  });

  it("lays the features out as the form says, and shows a picture-only feature named after the product", () => {
    const product = toPreviewProduct({
      values: {
        ...values,
        features: [{ title: " ", body: "", imageUrl: "virzeen/products/new/cool", alt: "" }],
      },
      category: null,
      sizeGuide: null,
    });

    expect(product.featureLayout).toBe("TALL_LEFT");
    expect(product.features).toEqual([
      {
        id: "0-virzeen/products/new/cool",
        title: "",
        body: "",
        imageUrl: "virzeen/products/new/cool",
        imageAlt: "Linen Shirt",
      },
    ]);
    const odd = JSON.parse(JSON.stringify({ values: { ...values, featureLayout: "GRID" }, category: null }));
    expect(toPreviewProduct(odd).featureLayout).toBe("THREE");
  });

  it("carries the Custom rows, and reads rows that can't be used as none", () => {
    const featureRows = [
      { count: 1, shape: "LANDSCAPE" as const },
      { count: 2, shape: "PORTRAIT" as const },
      { count: 4, shape: "PORTRAIT" as const },
    ];
    const product = toPreviewProduct({
      values: { ...values, featureLayout: "CUSTOM", featureRows },
      category: null,
      sizeGuide: null,
    });
    expect(product).toMatchObject({ featureLayout: "CUSTOM", featureRows });

    const odd = JSON.parse(
      JSON.stringify({ values: { ...values, featureRows: [{ count: 6, shape: "ROUND" }] }, category: null }),
    );
    expect(toPreviewProduct(odd).featureRows).toEqual([]);
  });

  it("shows a picked Accessories size guide as it is (a picture, no table)", () => {
    const sizeGuide = {
      kind: "PICTURE" as const,
      name: "Belts",
      intro: null,
      chart: null,
      fitTips: null,
      howToMeasure: [],
      imageUrl: "virzeen/size-guides/new/belts",
      imageAlt: null,
    };
    expect(toPreviewProduct({ values, category: null, sizeGuide }).sizeGuide).toEqual(sizeGuide);
  });

  it("reads a size guide picked before guide types as a size table", () => {
    const chart = { columns: ["Chest"], rows: [{ size: "M", values: ["94-100"] }] };
    const old = {
      name: "Tops",
      intro: null,
      chart,
      fitTips: null,
      howToMeasure: [],
      imageUrl: null,
      imageAlt: null,
    };
    const draft = JSON.parse(JSON.stringify({ values, category: null, sizeGuide: old }));
    expect(toPreviewProduct(draft).sizeGuide).toEqual({ ...old, kind: "CHART" });
  });

  it("shows each style's number and colour shown; a new style has no number yet", () => {
    const product = toPreviewProduct({
      values: {
        ...values,
        variants: [
          ...values.variants,
          { sku: "", size: "M", color: "Sky blue", pricePaisa: 135_000, stock: 1, isActive: true },
        ],
        styles: [
          { color: "black", colourShown: " Black/White ", code: "VZ0042-101" },
          { color: "Sky blue", colourShown: "", code: "" },
        ],
      },
      category: null,
      sizeGuide: null,
    });

    expect(product.styles).toEqual([
      { color: "Black", code: "VZ0042-101", colourShown: "Black/White" },
      { color: "Sky blue", code: "", colourShown: "Sky blue" },
    ]);
  });

  it("gives a product without colours its one style", () => {
    const product = toPreviewProduct({
      values: {
        ...values,
        variants: [{ sku: "", size: "M", color: "", pricePaisa: 135_000, stock: 1, isActive: true }],
        styles: [{ color: "", colourShown: "", code: "VZ0007-101" }],
      },
      category: null,
      sizeGuide: null,
    });

    expect(product.styles).toEqual([{ color: "", code: "VZ0007-101", colourShown: null }]);
  });
});

describe("relatedQueryFor", () => {
  const draft = { values, category: null, sizeGuide: null };

  it("asks for the picked category, leaving out the product itself", () => {
    expect(
      relatedQueryFor({
        ...draft,
        category: { id: "k0kvxwv7jyowq6xrdk4qojeu", name: "Shirts", slug: "shirts" },
        productId: "u9f2l9k1v3yq0b8m7c6x5z4a",
      }),
    ).toEqual({ categoryId: "k0kvxwv7jyowq6xrdk4qojeu", excludeId: "u9f2l9k1v3yq0b8m7c6x5z4a" });
  });

  it("falls back to the form's category, and asks nothing without one", () => {
    expect(relatedQueryFor(draft)).toEqual({ categoryId: "tz4a98xxat96iws9zmbrgj3a" });
    expect(relatedQueryFor({ ...draft, values: { ...values, categoryId: "" } })).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  adminProductFiltersSchema,
  categorySchema,
  createDraftProductSchema,
  parseSizeChart,
  productSchema,
  relatedByCategorySchema,
  saveSizeGuideSchema,
  sizeChartSchema,
  sizeGuideSchema,
  uploadSignatureSchema,
} from "./catalog";

const VALID_ID = "tz4a98xxat96iws9zmbrgj3a";

const variant = {
  sku: "VZ-LINEN-BLK-M",
  size: "M",
  color: "Black",
  pricePaisa: 450_000,
  stock: 3,
  isActive: true,
};
const product = {
  name: "Linen Overshirt",
  slug: "linen-overshirt",
  description: "Relaxed overshirt.",
  benefits: [],
  details: [],
  countryOfOrigin: "",
  categoryId: VALID_ID,
  sizeGuideId: "",
  collectionIds: [],
  isPublished: true,
  images: [{ url: "virzeen/products/abc/front", alt: "Front view" }],
  features: [],
  styles: [],
  shippingPaisa: 15_000,
  variants: [variant],
};

/** Field path → first message, the way the admin form shows them. */
function errorsOf(input: unknown) {
  const result = productSchema.safeParse(input);
  const errors: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) errors[issue.path.join(".")] ??= issue.message;
  return errors;
}

describe("productSchema messages", () => {
  it("says what to enter for a blank form, in plain words", () => {
    const errors = errorsOf({
      ...product,
      name: "",
      slug: "",
      description: "",
      categoryId: "",
      isPublished: false,
      images: [],
      shippingPaisa: Number.NaN,
      variants: [{ ...variant, sku: "", pricePaisa: Number.NaN, stock: Number.NaN }],
    });
    expect(errors).toEqual({
      name: "Enter the product name",
      slug: "Enter a URL slug",
      categoryId: "Choose a category",
      shippingPaisa: "Enter a shipping price (0 for none)",
      "variants.0.pricePaisa": "Enter a price in rupees, e.g. 1250",
      "variants.0.stock": "Enter the stock as a whole number (0 or more)",
    });
  });

  it("spells the SKU format the way the form's helper does", () => {
    expect(errorsOf({ ...product, variants: [{ ...variant, sku: "LINEN-M" }] })).toEqual({
      "variants.0.sku": "Use the format VZ-PRODUCT-COLOUR-SIZE, or leave it blank to make one",
    });
  });

  it("accepts blank SKUs and photo descriptions (made from the product when saving), even on several rows", () => {
    const result = productSchema.safeParse({
      ...product,
      images: [{ url: "virzeen/products/abc/front", alt: "  " }],
      variants: [
        { ...variant, sku: "" },
        { ...variant, sku: "  ", size: "L" },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data?.variants.map((v) => v.sku)).toEqual(["", ""]);
    expect(result.data?.images[0]?.alt).toBe("");
  });

  it("asks for whole-number stock", () => {
    expect(errorsOf({ ...product, variants: [{ ...variant, stock: 1.5 }] })).toEqual({
      "variants.0.stock": "Enter the stock as a whole number (0 or more)",
    });
  });

  it("marks every row that shares a SKU, ignoring case and spaces", () => {
    const errors = errorsOf({
      ...product,
      variants: [variant, { ...variant, sku: "VZ-LINEN-BLK-L" }, { ...variant, sku: " vz-linen-blk-m " }],
    });
    expect(errors).toEqual({
      "variants.0.sku": "Another variant has the same SKU",
      "variants.2.sku": "Another variant has the same SKU",
    });
  });

  it("reports clashing SKUs and publishing problems together with other field errors", () => {
    const errors = errorsOf({
      ...product,
      images: [],
      variants: [
        { ...variant, stock: Number.NaN, isActive: false },
        { ...variant, isActive: false },
      ],
    });
    expect(errors).toMatchObject({
      "variants.0.stock": "Enter the stock as a whole number (0 or more)",
      "variants.1.sku": "Another variant has the same SKU",
      images: "Add at least one image before publishing",
      variants: "Add a size or style for sale before publishing",
    });
  });

  it("takes photos for a style or for every style, and names a photo whose style doesn't exist", () => {
    const withStyles = {
      ...product,
      images: [
        { url: "virzeen/products/abc/front", alt: "", color: "Black" },
        { url: "virzeen/products/abc/chart", alt: "", color: "" },
      ],
    };
    expect(productSchema.safeParse(withStyles).success).toBe(true);
    expect(
      errorsOf({ ...product, images: [{ url: "virzeen/products/abc/front", alt: "", color: "Blue" }] }),
    ).toEqual({ "images.0.color": 'No style is called "Blue"' });
  });

  it("lets a draft have no description, no images and no variant for sale", () => {
    const draft = {
      ...product,
      description: " ",
      isPublished: false,
      images: [],
      variants: [{ ...variant, isActive: false }],
    };
    expect(productSchema.safeParse(draft).success).toBe(true);
  });

  it("needs a description to publish", () => {
    expect(errorsOf({ ...product, description: "  " })).toEqual({
      description: "Add a description before publishing",
    });
    expect(errorsOf({ ...product, description: "x".repeat(5001) })).toEqual({
      description: "Keep the description under 5,000 characters",
    });
  });

  it("does not crash on input that is not an object", () => {
    expect(productSchema.safeParse(undefined).success).toBe(false);
    expect(productSchema.safeParse({ ...product, variants: "none" }).success).toBe(false);
  });
});

describe("productSchema: product details and features (specs/product-page.md)", () => {
  const feature = {
    title: "Breathable linen",
    body: "Keeps you cool all day.",
    imageUrl: "/placeholder/a.jpg",
  };

  it("takes benefits, details, a country, a size guide and features", () => {
    const result = productSchema.safeParse({
      ...product,
      benefits: [" Soft washed linen "],
      details: ["100% linen", "Horn-effect buttons"],
      countryOfOrigin: " Nepal ",
      sizeGuideId: VALID_ID,
      features: [{ ...feature, alt: "" }, feature],
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ benefits: ["Soft washed linen"], countryOfOrigin: "Nepal" });
  });

  it("needs every new key, so old forms fail loudly instead of wiping the details", () => {
    const { benefits: _benefits, features: _features, styles: _styles, ...old } = product;
    expect(errorsOf(old)).toMatchObject({
      benefits: expect.any(String),
      features: expect.any(String),
      styles: expect.any(String),
    });
  });

  it("limits benefits to 12, details to 20 and each line to 200 characters", () => {
    expect(
      errorsOf({
        ...product,
        benefits: Array.from({ length: 13 }, (_, i) => `Benefit ${i}`),
        details: Array.from({ length: 21 }, (_, i) => `Detail ${i}`),
      }),
    ).toEqual({ benefits: "Add up to 12 benefits", details: "Add up to 20 product details" });
    expect(errorsOf({ ...product, details: ["x".repeat(201), "  "] })).toEqual({
      "details.0": "Keep each line under 200 characters",
      "details.1": "Remove the empty line",
    });
    expect(errorsOf({ ...product, countryOfOrigin: "x".repeat(61) })).toEqual({
      countryOfOrigin: "Keep the country or region under 60 characters",
    });
  });

  it("asks to choose a size guide when the id is not one", () => {
    expect(errorsOf({ ...product, sizeGuideId: "not an id!" })).toEqual({
      sizeGuideId: "Choose a size guide",
    });
  });

  it("limits features to 6, each with a picture, a title up to 60 and text up to 400", () => {
    expect(errorsOf({ ...product, features: Array.from({ length: 7 }, () => feature) })).toEqual({
      features: "Add up to 6 features",
    });
    expect(
      errorsOf({
        ...product,
        features: [
          { title: "", body: "", imageUrl: "" },
          { title: "x".repeat(61), body: "x".repeat(401), imageUrl: "https://evil.example/x.png" },
        ],
      }),
    ).toEqual({
      "features.0.title": "Enter a title for the feature",
      "features.0.body": "Enter the text for the feature",
      "features.0.imageUrl": "Add a picture for the feature",
      "features.1.title": "Keep the title under 60 characters",
      "features.1.body": "Keep the text under 400 characters",
      "features.1.imageUrl": "Use a Cloudinary public id or a /public path, not a web address",
    });
    expect(errorsOf({ ...product, features: [{ title: "Soft", body: "Very." }] })).toEqual({
      "features.0.imageUrl": "Add a picture for the feature",
    });
  });
});

describe("productSchema: styles (specs/product-editor-on-page.md)", () => {
  it("takes each style's colour shown and the style number it had, trimmed, with blanks allowed", () => {
    const result = productSchema.safeParse({
      ...product,
      styles: [
        { color: " Black ", colourShown: " Black/White ", code: " VZ0042-101 " },
        { color: "Bone", colourShown: "" },
        { color: "", code: "" },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data?.styles).toEqual([
      { color: "Black", colourShown: "Black/White", code: "VZ0042-101" },
      { color: "Bone", colourShown: "" },
      { color: "", code: "" },
    ]);
  });

  it("names every style that has another style's name, ignoring case and spaces", () => {
    expect(
      errorsOf({
        ...product,
        styles: [{ color: "Black" }, { color: "White" }, { color: " black " }],
      }),
    ).toEqual({
      "styles.0.color": "Two styles have the same name",
      "styles.2.color": "Two styles have the same name",
    });
  });

  it("limits styles to 20 and their names and colour shown to 40 and 80 characters", () => {
    expect(
      errorsOf({ ...product, styles: Array.from({ length: 21 }, (_, i) => ({ color: `Style ${i}` })) }),
    ).toEqual({ styles: "Add up to 20 styles" });
    expect(
      errorsOf({ ...product, styles: [{ color: "x".repeat(41), colourShown: "x".repeat(81), extra: 1 }] }),
    ).toMatchObject({
      "styles.0.color": "Keep the style name under 40 characters",
      "styles.0.colourShown": "Keep the colour shown under 80 characters",
    });
  });
});

describe("createDraftProductSchema (New product popup)", () => {
  it("takes a name, a category and a price", () => {
    expect(
      createDraftProductSchema.parse({ name: " Beanie ", categoryId: VALID_ID, pricePaisa: 135_000 }),
    ).toEqual({ name: "Beanie", categoryId: VALID_ID, pricePaisa: 135_000 });
  });

  it("says what is missing in the product form's words, and takes nothing else", () => {
    const result = createDraftProductSchema.safeParse({ name: "", categoryId: "", pricePaisa: Number.NaN });
    const errors = Object.fromEntries(result.error?.issues.map((i) => [i.path.join("."), i.message]) ?? []);
    expect(errors).toEqual({
      name: "Enter the product name",
      categoryId: "Choose a category",
      pricePaisa: "Enter a price in rupees, e.g. 1250",
    });
    expect(
      createDraftProductSchema.safeParse({
        name: "Beanie",
        categoryId: VALID_ID,
        pricePaisa: 135_000,
        isPublished: true,
      }).success,
    ).toBe(false);
  });
});

describe("relatedByCategorySchema", () => {
  it("takes a category and, optionally, the product to leave out", () => {
    expect(relatedByCategorySchema.safeParse({ categoryId: VALID_ID }).success).toBe(true);
    expect(relatedByCategorySchema.safeParse({ categoryId: VALID_ID, excludeId: VALID_ID }).success).toBe(
      true,
    );
    expect(relatedByCategorySchema.safeParse({ categoryId: "" }).success).toBe(false);
  });
});

describe("sizeChartSchema (specs/size-guides.md)", () => {
  const chart = {
    columns: ["Chest", "Length"],
    rows: [
      { size: "S", values: ["92-96", "70"] },
      { size: "M", values: ["96-101", ""] },
    ],
  };
  function chartErrors(input: unknown) {
    const result = sizeChartSchema.safeParse(input);
    const errors: Record<string, string> = {};
    for (const issue of result.error?.issues ?? []) errors[issue.path.join(".")] ??= issue.message;
    return errors;
  }

  it("takes sizes with a value for every measurement (blank values allowed)", () => {
    expect(sizeChartSchema.parse(chart)).toEqual(chart);
  });

  it("needs each size to have as many values as there are measurements", () => {
    expect(
      chartErrors({
        ...chart,
        rows: [
          { size: "S", values: ["92"] },
          { size: "M", values: ["96", "72", "60"] },
        ],
      }),
    ).toEqual({
      "rows.0.values": "Each size needs a value for every measurement",
      "rows.1.values": "Each size needs a value for every measurement",
    });
  });

  it("names every size and measurement that is there twice, ignoring case and spaces", () => {
    expect(
      chartErrors({
        columns: ["Chest", " chest ", "Length"],
        rows: [
          { size: "M", values: ["", "", ""] },
          { size: "L", values: ["", "", ""] },
          { size: " m", values: ["", "", ""] },
        ],
      }),
    ).toEqual({
      "columns.0": "Another measurement has the same name",
      "columns.1": "Another measurement has the same name",
      "rows.0.size": "Another size has the same name",
      "rows.2.size": "Another size has the same name",
    });
  });

  it("keeps to 1-6 measurements and 1-20 sizes, with short names and values", () => {
    expect(chartErrors({ columns: [], rows: [] })).toEqual({
      columns: "Add at least one measurement",
      rows: "Add at least one size",
    });
    const columns = ["A", "B", "C", "D", "E", "F", "G"];
    expect(chartErrors({ columns, rows: [{ size: "S", values: columns.map(() => "") }] })).toMatchObject({
      columns: "Add up to 6 measurements",
    });
    const rows = Array.from({ length: 21 }, (_, i) => ({ size: `S${i}`, values: ["1"] }));
    expect(chartErrors({ columns: ["Chest"], rows })).toEqual({ rows: "Add up to 20 sizes" });
    expect(
      chartErrors({ columns: ["x".repeat(31)], rows: [{ size: "x".repeat(21), values: ["1".repeat(21)] }] }),
    ).toEqual({
      "columns.0": "Keep the measurement name under 30 characters",
      "rows.0.size": "Keep the size under 20 characters",
      "rows.0.values.0": "Keep each value under 20 characters",
    });
  });

  it("parseSizeChart gives null for a stored chart that isn't valid", () => {
    expect(parseSizeChart(chart)).toEqual(chart);
    expect(parseSizeChart(null)).toBeNull();
    expect(parseSizeChart({ columns: ["Chest"], rows: [{ size: "S", values: [] }] })).toBeNull();
    expect(parseSizeChart({ ...chart, extra: true })).toBeNull();
  });
});

describe("sizeGuideSchema", () => {
  const guide = {
    name: "Tops",
    intro: "",
    chart: { columns: ["Chest"], rows: [{ size: "M", values: ["96-101"] }] },
    fitTips: "",
    howToMeasure: ["Measure around the fullest part of your chest."],
    imageUrl: "",
    imageAlt: "",
  };

  it("takes a guide with only a name and a chart filled in", () => {
    expect(sizeGuideSchema.safeParse(guide).success).toBe(true);
  });

  it("names what is missing or too long", () => {
    const result = sizeGuideSchema.safeParse({
      ...guide,
      name: " ",
      intro: "x".repeat(501),
      howToMeasure: Array.from({ length: 11 }, () => "Tip"),
      imageUrl: "https://evil.example/x.png",
    });
    const errors = Object.fromEntries(result.error?.issues.map((i) => [i.path.join("."), i.message]) ?? []);
    expect(errors).toEqual({
      name: "Enter a name",
      intro: "Keep the intro under 500 characters",
      howToMeasure: "Add up to 10 tips",
      imageUrl: "Use a Cloudinary public id or a /public path, not a web address",
    });
  });

  it("is sent as { id?, guide } by the admin form, like a product", () => {
    expect(saveSizeGuideSchema.safeParse({ guide }).success).toBe(true);
    expect(saveSizeGuideSchema.safeParse({ id: VALID_ID, guide }).success).toBe(true);
    expect(saveSizeGuideSchema.safeParse({ id: "not an id", guide }).success).toBe(false);
    expect(saveSizeGuideSchema.safeParse({ ...guide, id: VALID_ID }).success).toBe(false);
  });

  it("allows size-guides uploads", () => {
    expect(uploadSignatureSchema.safeParse({ folder: "size-guides", entityId: "new" }).success).toBe(true);
  });
});

describe("categorySchema", () => {
  it("asks for a whole number order from 0 to 1,000", () => {
    for (const sortOrder of [Number.NaN, -1, 2.5, 1001]) {
      const result = categorySchema.safeParse({ name: "Tops", slug: "tops", sortOrder });
      expect(result.error?.issues[0]?.message).toBe("Enter a whole number from 0 to 1,000");
    }
  });
});

describe("adminProductFiltersSchema", () => {
  it("trims the search and ignores a blank one", () => {
    expect(adminProductFiltersSchema.parse({ q: "  socks " })).toEqual({ q: "socks" });
    expect(adminProductFiltersSchema.parse({ q: "   " })).toEqual({ q: undefined });
    expect(adminProductFiltersSchema.parse({})).toEqual({});
  });

  it("keeps a known status and ignores anything else", () => {
    expect(adminProductFiltersSchema.parse({ status: "draft" })).toEqual({ status: "draft" });
    expect(adminProductFiltersSchema.parse({ status: "deleted" })).toEqual({ status: undefined });
  });
});

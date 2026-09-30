import { describe, expect, it } from "vitest";
import {
  adminProductFiltersSchema,
  categorySchema,
  createDraftProductSchema,
  FEATURE_LAYOUT_LABELS,
  FEATURE_LAYOUTS,
  FEATURE_ROW_SHAPE_LABELS,
  FEATURE_ROW_SHAPES,
  featureRowSchema,
  featureRowsSchema,
  MAX_FEATURES,
  parseFeatureRows,
  parseSizeChart,
  productSchema,
  relatedByCategorySchema,
  saveSizeGuideSchema,
  sizeChartSchema,
  SIZE_GUIDE_KIND_LABELS,
  SIZE_GUIDE_KINDS,
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
  featureLayout: "THREE",
  featureRows: [],
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
    const {
      benefits: _benefits,
      features: _features,
      featureLayout: _featureLayout,
      featureRows: _featureRows,
      styles: _styles,
      ...old
    } = product;
    expect(errorsOf(old)).toMatchObject({
      benefits: expect.any(String),
      features: expect.any(String),
      featureLayout: "Choose a layout",
      featureRows: expect.any(String),
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

  it("limits features to 9, each with a picture, a title up to 60 and text up to 400", () => {
    expect(MAX_FEATURES).toBe(9);
    expect(errorsOf({ ...product, features: Array.from({ length: 9 }, () => feature) })).toEqual({});
    expect(errorsOf({ ...product, features: Array.from({ length: 10 }, () => feature) })).toEqual({
      features: "Add up to 9 features",
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
      "features.0.imageUrl": "Add a picture for the feature",
      "features.1.title": "Keep the title under 60 characters",
      "features.1.body": "Keep the text under 400 characters",
      "features.1.imageUrl": "Use a Cloudinary public id or a /public path, not a web address",
    });
    expect(errorsOf({ ...product, features: [{ title: "Soft", body: "Very." }] })).toEqual({
      "features.0.imageUrl": "Add a picture for the feature",
    });
  });

  it("takes a feature that is only a picture: blank title and text, trimmed (specs/product-page-v2.md)", () => {
    const result = productSchema.safeParse({
      ...product,
      features: [{ title: "  ", body: "", imageUrl: "/placeholder/a.jpg", alt: "" }],
    });
    expect(result.success).toBe(true);
    expect(result.data?.features).toEqual([{ title: "", body: "", imageUrl: "/placeholder/a.jpg", alt: "" }]);
    const longest = { ...feature, title: ` ${"x".repeat(60)} `, body: "x".repeat(400) };
    expect(errorsOf({ ...product, features: [longest] })).toEqual({});
  });
});

describe("productSchema: feature layout (specs/product-page-v2.md)", () => {
  it("has seven ready-made layouts and Custom, each with a name", () => {
    expect(FEATURE_LAYOUTS).toEqual([
      "THREE",
      "THREE_TWO",
      "TWO",
      "FULL",
      "TALL_LEFT",
      "TALL_RIGHT",
      "WIDE_TOP",
      "CUSTOM",
    ]);
    expect(Object.keys(FEATURE_LAYOUT_LABELS)).toEqual([...FEATURE_LAYOUTS]);
    expect(Object.values(FEATURE_LAYOUT_LABELS)).toEqual([
      "Three across",
      "Three + two",
      "Two across",
      "Full width",
      "Tall + two",
      "Two + tall",
      "Wide + two",
      "Custom",
    ]);
  });

  it("takes any of the layouts and nothing else", () => {
    for (const featureLayout of FEATURE_LAYOUTS) {
      expect(productSchema.safeParse({ ...product, featureLayout }).data?.featureLayout).toBe(featureLayout);
    }
    expect(errorsOf({ ...product, featureLayout: "GRID" })).toEqual({ featureLayout: "Choose a layout" });
    expect(errorsOf({ ...product, featureLayout: "three" })).toEqual({ featureLayout: "Choose a layout" });
  });
});

describe("productSchema: Custom layout rows (specs/product-page-v2.md)", () => {
  const row = { count: 2, shape: "PORTRAIT" };

  it("has two shapes, Landscape and Portrait", () => {
    expect(FEATURE_ROW_SHAPES).toEqual(["LANDSCAPE", "PORTRAIT"]);
    expect(FEATURE_ROW_SHAPE_LABELS).toEqual({ LANDSCAPE: "Landscape", PORTRAIT: "Portrait" });
  });

  it("takes rows of 1 to 4 pictures, kept whatever layout is picked", () => {
    const featureRows = [
      { count: 1, shape: "LANDSCAPE" },
      { count: 2, shape: "PORTRAIT" },
      { count: 4, shape: "PORTRAIT" },
    ];
    for (const featureLayout of ["CUSTOM", "THREE"]) {
      expect(productSchema.safeParse({ ...product, featureLayout, featureRows }).data?.featureRows).toEqual(
        featureRows,
      );
    }
    expect(errorsOf({ ...product, featureLayout: "CUSTOM", featureRows: [] })).toEqual({});
  });

  it("says what to change in a row that can't be used", () => {
    expect(
      errorsOf({
        ...product,
        featureRows: [
          { count: 0, shape: "PORTRAIT" },
          { count: 5, shape: "LANDSCAPE" },
          { count: 1.5, shape: "PORTRAIT" },
          { count: 2, shape: "SQUARE" },
        ],
      }),
    ).toEqual({
      "featureRows.0.count": "Choose 1 to 4 pictures",
      "featureRows.1.count": "Choose 1 to 4 pictures",
      "featureRows.2.count": "Choose 1 to 4 pictures",
      "featureRows.3.shape": "Choose Landscape or Portrait",
    });
    expect(featureRowSchema.safeParse({ ...row, extra: true }).success).toBe(false);
  });

  it("limits the rows to 9", () => {
    expect(featureRowsSchema.safeParse(Array(9).fill(row)).success).toBe(true);
    expect(errorsOf({ ...product, featureRows: Array(10).fill(row) })).toEqual({
      featureRows: "Add up to 9 rows",
    });
  });

  it("reads stored rows defensively: anything invalid is no rows", () => {
    expect(parseFeatureRows([{ count: 3, shape: "LANDSCAPE" }])).toEqual([{ count: 3, shape: "LANDSCAPE" }]);
    for (const stored of [
      null,
      undefined,
      "[]",
      {},
      [{ count: 9, shape: "PORTRAIT" }],
      Array(10).fill(row),
    ]) {
      expect(parseFeatureRows(stored)).toEqual([]);
    }
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
    kind: "CHART",
    name: "Tops",
    intro: "",
    chart: { columns: ["Chest"], rows: [{ size: "M", values: ["96-101"] }] },
    fitTips: "",
    howToMeasure: ["Measure around the fullest part of your chest."],
    imageUrl: "",
    imageAlt: "",
  };

  /** Field path → first message, the way the admin form shows them. */
  function guideErrors(input: unknown) {
    const result = sizeGuideSchema.safeParse(input);
    const errors: Record<string, string> = {};
    for (const issue of result.error?.issues ?? []) errors[issue.path.join(".")] ??= issue.message;
    return errors;
  }

  it("takes a guide with only a name and a chart filled in", () => {
    expect(sizeGuideSchema.safeParse(guide).success).toBe(true);
  });

  it("has two types, Clothing and Accessories, and needs one of them", () => {
    expect(SIZE_GUIDE_KINDS).toEqual(["CHART", "PICTURE"]);
    expect(SIZE_GUIDE_KIND_LABELS).toEqual({ CHART: "Clothing", PICTURE: "Accessories" });
    const { kind: _kind, ...withoutKind } = guide;
    expect(guideErrors(withoutKind)).toEqual({ kind: "Choose a type" });
    expect(guideErrors({ ...guide, kind: "TABLE" })).toEqual({ kind: "Choose a type" });
  });

  it("needs a valid chart for a Clothing guide, with errors at their places in the chart", () => {
    expect(guideErrors({ ...guide, chart: { columns: [], rows: [] } })).toEqual({
      "chart.columns": "Add at least one measurement",
      "chart.rows": "Add at least one size",
    });
    expect(
      guideErrors({
        ...guide,
        name: "",
        chart: { columns: ["Chest", "chest"], rows: [{ size: " ", values: ["96"] }] },
      }),
    ).toEqual({
      name: "Enter a name",
      "chart.columns.0": "Another measurement has the same name",
      "chart.columns.1": "Another measurement has the same name",
      "chart.rows.0.size": "Enter the size",
      "chart.rows.0.values": "Each size needs a value for every measurement",
    });
    expect(guideErrors({ ...guide, chart: "not a chart" })).toHaveProperty("chart");
    const { chart: _chart, ...withoutChart } = guide;
    expect(guideErrors(withoutChart)).toHaveProperty("chart");
  });

  it("gives a Clothing guide its chart, trimmed", () => {
    const result = sizeGuideSchema.parse({
      ...guide,
      chart: { columns: [" Chest "], rows: [{ size: " M ", values: [" 96-101 "] }] },
    });
    expect(result.kind).toBe("CHART");
    expect(result.chart).toEqual({ columns: ["Chest"], rows: [{ size: "M", values: ["96-101"] }] });
  });

  it("reads a blank picture as none", () => {
    expect(sizeGuideSchema.parse({ ...guide, imageUrl: "  " }).imageUrl).toBe("");
  });

  it("needs the size chart picture for an Accessories guide", () => {
    for (const imageUrl of ["", "  ", undefined]) {
      expect(guideErrors({ ...guide, kind: "PICTURE", imageUrl })).toEqual({
        imageUrl: "Upload the size chart picture",
      });
    }
    expect(guideErrors({ ...guide, kind: "PICTURE", imageUrl: "https://evil.example/x.png" })).toEqual({
      imageUrl: "Use a Cloudinary public id or a /public path, not a web address",
    });
  });

  it("drops an Accessories guide's chart without checking it (the form keeps the draft table)", () => {
    const picture = { ...guide, kind: "PICTURE", imageUrl: "virzeen/size-guides/new/belts", imageAlt: "" };
    for (const chart of [{ columns: [""], rows: [{ size: "", values: ["", ""] }] }, "junk", null]) {
      const result = sizeGuideSchema.safeParse({ ...picture, chart });
      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        kind: "PICTURE",
        chart: null,
        imageUrl: "virzeen/size-guides/new/belts",
      });
    }
  });

  it("names what is missing or too long", () => {
    const errors = guideErrors({
      ...guide,
      name: " ",
      intro: "x".repeat(501),
      howToMeasure: Array.from({ length: 11 }, () => "Tip"),
      imageUrl: "https://evil.example/x.png",
    });
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

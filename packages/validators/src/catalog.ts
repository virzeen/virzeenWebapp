import { z } from "zod";
import { idSchema, slugSchema } from "./common";

export const SHOP_SORTS = ["newest", "price-asc", "price-desc"] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];

const optionalFilter = z.string().trim().min(1).max(40).optional().catch(undefined);

/** Shop filters come from the URL, so every field falls back instead of throwing. */
export const shopFiltersSchema = z.object({
  category: slugSchema.optional().catch(undefined),
  collection: slugSchema.optional().catch(undefined),
  size: optionalFilter,
  color: optionalFilter,
  inStock: z
    .enum(["1"])
    .optional()
    .catch(undefined)
    .transform((v) => v === "1"),
  sort: z.enum(SHOP_SORTS).catch("newest"),
  cursor: idSchema.optional().catch(undefined),
});
export type ShopFilters = z.output<typeof shopFiltersSchema>;

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "FREE", "ONE SIZE"];

/**
 * Sizes in shop order: letter sizes S → XXXL, then Free/One size, then numbers, then anything else A–Z.
 * Here (not in core) so the product page and the admin preview in the browser order them the same way.
 */
export function sortSizes(sizes: readonly string[]): string[] {
  const rank = (size: string) => {
    const index = SIZE_ORDER.indexOf(size.toUpperCase());
    if (index >= 0) return index;
    const numeric = Number.parseFloat(size);
    return Number.isNaN(numeric) ? 1000 : 100 + numeric;
  };
  return [...new Set(sizes)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, { error: "Enter a SKU" })
  .regex(/^VZ(-[A-Z0-9]+){2,4}$/, { error: "Use the format VZ-PRODUCT-COLOUR-SIZE" });

const IMAGE_REF_ERROR = "Use a Cloudinary public id or a /public path, not a web address";

/** An image reference that says `required` when it's blank (e.g. "Add a picture for the feature"). */
const imageRef = (required: string) =>
  z
    .string({ error: required })
    .trim()
    .min(1, { error: required })
    .max(300, { error: IMAGE_REF_ERROR })
    .regex(/^(\/[\w\-./]+|[\w-]+(\/[\w\-.]+)*)$/, { error: IMAGE_REF_ERROR });

/** Cloudinary public id (e.g. virzeen/products/abc/front) or a local /public path for seed data. */
export const imageRefSchema = imageRef("Add an image");

/** Blank means "use the product name" (catalogService.saveProduct fills it in). */
const altSchema = z.string().trim().max(200, { error: "Keep the photo description under 200 characters" });

// The form sends blank or non-numeric number fields as NaN, so each number says what to type.
const PRICE_ERROR = "Enter a price in rupees, e.g. 1250";
const STOCK_ERROR = "Enter the stock as a whole number (0 or more)";
const SORT_ORDER_ERROR = "Enter a whole number from 0 to 1,000";

/** Admin list order: lower numbers come first. */
export const sortOrderSchema = z
  .int({ error: SORT_ORDER_ERROR })
  .min(0, { error: SORT_ORDER_ERROR })
  .max(1000, { error: SORT_ORDER_ERROR });

export const productImageSchema = z.strictObject({
  url: imageRefSchema,
  alt: altSchema,
  /** The style (a variant colour) this photo shows; blank = shared by every style (specs/product-styles.md). */
  color: z.string().trim().max(40).optional().or(z.literal("")),
});
export type ProductImageInput = z.infer<typeof productImageSchema>;

/**
 * How "Features that perform" is laid out on the product page (specs/product-page-v2.md): seven ready-made layouts,
 * in the editor's picker order, then CUSTOM (the owner's own rows, `featureRows`).
 */
export const FEATURE_LAYOUTS = [
  "THREE",
  "THREE_TWO",
  "TWO",
  "FULL",
  "TALL_LEFT",
  "TALL_RIGHT",
  "WIDE_TOP",
  "CUSTOM",
] as const;
export type FeatureLayout = (typeof FEATURE_LAYOUTS)[number];

/** The editor's Layout picker names (specs/product-page-v2.md). */
export const FEATURE_LAYOUT_LABELS: Record<FeatureLayout, string> = {
  THREE: "Three across",
  THREE_TWO: "Three + two",
  TWO: "Two across",
  FULL: "Full width",
  TALL_LEFT: "Tall + two",
  TALL_RIGHT: "Two + tall",
  WIDE_TOP: "Wide + two",
  CUSTOM: "Custom",
};

/** How many features a product can have (specs/product-page-v2.md). */
export const MAX_FEATURES = 9;
/** How many rows the Custom layout can have. */
export const MAX_FEATURE_ROWS = 9;
/** How many pictures one Custom row can hold (1 to 4). */
export const MAX_FEATURE_ROW_COUNT = 4;

/** A Custom row's picture shape: LANDSCAPE = 16:9, PORTRAIT = 4:5. */
export const FEATURE_ROW_SHAPES = ["LANDSCAPE", "PORTRAIT"] as const;
export type FeatureRowShape = (typeof FEATURE_ROW_SHAPES)[number];

/** The rows editor's shape names. */
export const FEATURE_ROW_SHAPE_LABELS: Record<FeatureRowShape, string> = {
  LANDSCAPE: "Landscape",
  PORTRAIT: "Portrait",
};

const ROW_COUNT_ERROR = "Choose 1 to 4 pictures";

/** One row of the Custom layout, top to bottom: how many pictures it holds and their shape. */
export const featureRowSchema = z.strictObject({
  count: z
    .int({ error: ROW_COUNT_ERROR })
    .min(1, { error: ROW_COUNT_ERROR })
    .max(MAX_FEATURE_ROW_COUNT, { error: ROW_COUNT_ERROR }),
  shape: z.enum(FEATURE_ROW_SHAPES, { error: "Choose Landscape or Portrait" }),
});
export type FeatureRow = z.infer<typeof featureRowSchema>;

/**
 * The Custom layout's rows (Product.featureRows). Kept when another layout is picked, so switching back to Custom
 * gets them back; no rows looks like "Three across".
 */
export const featureRowsSchema = z
  .array(featureRowSchema)
  .max(MAX_FEATURE_ROWS, { error: `Add up to ${MAX_FEATURE_ROWS} rows` });

/** Parses stored Custom rows; anything invalid gives no rows (the shop then shows "Three across"), never a crash. */
export function parseFeatureRows(value: unknown): FeatureRow[] {
  const result = featureRowsSchema.safeParse(value);
  return result.success ? result.data : [];
}

/**
 * A "Features that perform" card (specs/product-page-v2.md): only the picture is needed; the title and text are
 * optional ("" = none), so a feature can be just a picture and saves as soon as it's uploaded.
 */
export const productFeatureSchema = z.strictObject({
  title: z.string().trim().max(60, { error: "Keep the title under 60 characters" }),
  body: z.string().trim().max(400, { error: "Keep the text under 400 characters" }),
  imageUrl: imageRef("Add a picture for the feature"),
  /** Blank means "{product}, {title}", or "{product}" without a title (catalogService.saveProduct fills it in). */
  alt: z
    .string()
    .trim()
    .max(200, { error: "Keep the picture description under 200 characters" })
    .optional()
    .or(z.literal("")),
});
export type ProductFeatureInput = z.infer<typeof productFeatureSchema>;

/** One bullet of "Benefits" or "Product details" (the admin types one per line). */
const bulletSchema = z
  .string()
  .trim()
  .min(1, { error: "Remove the empty line" })
  .max(200, { error: "Keep each line under 200 characters" });

/** A variant's SKU as the admin form sends it: blank means "make one when saving" (catalogService.saveProduct). */
const variantSkuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^(VZ(-[A-Z0-9]+){2,4})?$/, {
    error: "Use the format VZ-PRODUCT-COLOUR-SIZE, or leave it blank to make one",
  });

// Same limits as paisaSchema, with messages the admin can act on.
const productPriceSchema = z
  .int({ error: PRICE_ERROR })
  .min(100, { error: "Enter a price of at least Rs 1" })
  .max(1_000_000_000, { error: "Enter a price under Rs 1 crore" });

export const variantSchema = z.strictObject({
  id: idSchema.optional(),
  sku: variantSkuSchema,
  size: z
    .string()
    .trim()
    .max(20, { error: "Keep the size under 20 characters" })
    .optional()
    .or(z.literal("")),
  color: z
    .string()
    .trim()
    .max(40, { error: "Keep the colour under 40 characters" })
    .optional()
    .or(z.literal("")),
  pricePaisa: productPriceSchema,
  stock: z
    .int({ error: STOCK_ERROR })
    .min(0, { error: "Stock can't be negative" })
    .max(100_000, { error: "Enter a stock of 100,000 or less" }),
  isActive: z.boolean(),
});
export type VariantInput = z.input<typeof variantSchema>;

/**
 * A style's "Colour shown" and style number (specs/product-editor-on-page.md). `color` is the style's name (a variant
 * colour; "" for a product without styles). `code` echoes the stored style number, so a renamed style keeps it; the
 * server makes numbers and ignores a code that isn't one of this product's.
 */
export const productStyleSchema = z.strictObject({
  color: z.string().trim().max(40, { error: "Keep the style name under 40 characters" }),
  /** e.g. "Black/White"; blank = the style's name. */
  colourShown: z
    .string()
    .trim()
    .max(80, { error: "Keep the colour shown under 80 characters" })
    .optional()
    .or(z.literal("")),
  code: z
    .string()
    .trim()
    .max(20, { error: "Keep the style number under 20 characters" })
    .optional()
    .or(z.literal("")),
});
export type ProductStyleInput = z.input<typeof productStyleSchema>;

const productNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Enter the product name" })
  .max(120, { error: "Keep the name under 120 characters" });

const DUPLICATE_SKU = "Another variant has the same SKU";
const NO_VARIANT_FOR_SALE = "Add a size or style for sale before publishing";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const skuOf = (row: unknown) =>
  isRecord(row) && typeof row.sku === "string" ? row.sku.trim().toUpperCase() : "";

export const productSchema = z
  .strictObject({
    name: productNameSchema,
    slug: slugSchema,
    /** May be blank on a draft; publishing needs it (below). */
    description: z.string().trim().max(5000, { error: "Keep the description under 5,000 characters" }),
    care: z
      .string()
      .trim()
      .max(2000, { error: "Keep the care notes under 2,000 characters" })
      .optional()
      .or(z.literal("")),
    /** "Benefits" and "Product details" bullets in the product details popup (specs/product-page.md). */
    benefits: z.array(bulletSchema).max(12, { error: "Add up to 12 benefits" }),
    details: z.array(bulletSchema).max(20, { error: "Add up to 20 product details" }),
    countryOfOrigin: z
      .string()
      .trim()
      .max(60, { error: "Keep the country or region under 60 characters" })
      .optional()
      .or(z.literal("")),
    seoDescription: z
      .string()
      .trim()
      .max(155, { error: "Keep the search description under 155 characters" })
      .optional()
      .or(z.literal("")),
    categoryId: z.cuid2({ error: "Choose a category" }),
    /** Blank = no size guide (specs/size-guides.md). */
    sizeGuideId: z.cuid2({ error: "Choose a size guide" }).optional().or(z.literal("")),
    collectionIds: z.array(idSchema).max(20, { error: "Choose up to 20 collections" }),
    isPublished: z.boolean(),
    images: z.array(productImageSchema).max(60, { error: "Add up to 60 photos" }),
    features: z
      .array(productFeatureSchema)
      .max(MAX_FEATURES, { error: `Add up to ${MAX_FEATURES} features` }),
    /** How the features are laid out on the product page (specs/product-page-v2.md). */
    featureLayout: z.enum(FEATURE_LAYOUTS, { error: "Choose a layout" }),
    /** The Custom layout's rows; saved whatever layout is picked, so they come back when Custom is picked again. */
    featureRows: featureRowsSchema,
    /** Colour shown and style numbers (specs/product-editor-on-page.md); styles are the variant colours. */
    styles: z.array(productStyleSchema).max(20, { error: "Add up to 20 styles" }),
    /** Delivery charge added to every variant's price; customers see one price and free shipping. */
    shippingPaisa: z
      .int({ error: "Enter a shipping price (0 for none)" })
      .min(0, { error: "Shipping price can't be negative" })
      .max(10_000_000, { error: "Shipping price is too high" }),
    /** Variant prices here are product prices before shipping. */
    variants: z
      .array(variantSchema)
      .min(1, { error: "Add at least one variant" })
      .max(60, { error: "Add up to 60 variants" }),
  })
  .superRefine(
    (product, ctx) => {
      // Runs even when other fields failed (see `when`), so values may be unparsed: read them defensively.
      const rows: unknown[] = Array.isArray(product.variants) ? product.variants : [];
      const skus = rows.map((row) => skuOf(row));
      skus.forEach((sku, index) => {
        if (sku && skus.indexOf(sku) !== skus.lastIndexOf(sku)) {
          // On every clashing row, so the admin sees which ones to change.
          ctx.addIssue({ code: "custom", path: ["variants", index, "sku"], message: DUPLICATE_SKU });
        }
      });
      const styles = new Set(
        rows.map((row) => (isRecord(row) && typeof row.color === "string" ? row.color.trim() : "")),
      );
      const images: unknown[] = Array.isArray(product.images) ? product.images : [];
      images.forEach((image, index) => {
        const style = isRecord(image) && typeof image.color === "string" ? image.color.trim() : "";
        if (style && !styles.has(style)) {
          ctx.addIssue({
            code: "custom",
            path: ["images", index, "color"],
            message: `No style is called "${style}"`,
          });
        }
      });
      const styleEntries: unknown[] = Array.isArray(product.styles) ? product.styles : [];
      const styleKeys = styleEntries.map((entry) =>
        isRecord(entry) && typeof entry.color === "string" ? entry.color.trim().toLowerCase() : null,
      );
      styleKeys.forEach((key, index) => {
        if (key !== null && styleKeys.indexOf(key) !== styleKeys.lastIndexOf(key)) {
          ctx.addIssue({
            code: "custom",
            path: ["styles", index, "color"],
            message: "Two styles have the same name",
          });
        }
      });
      if (product.isPublished !== true) return;
      if (typeof product.description === "string" && product.description.trim() === "") {
        ctx.addIssue({
          code: "custom",
          path: ["description"],
          message: "Add a description before publishing",
        });
      }
      if (Array.isArray(product.images) && product.images.length === 0) {
        ctx.addIssue({
          code: "custom",
          path: ["images"],
          message: "Add at least one image before publishing",
        });
      }
      if (rows.length > 0 && !rows.some((row) => isRecord(row) && row.isActive === true)) {
        ctx.addIssue({ code: "custom", path: ["variants"], message: NO_VARIANT_FOR_SALE });
      }
    },
    // Show these alongside the field errors instead of only after every field is fixed.
    { when: (payload) => isRecord(payload.value) },
  );
export type ProductInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;

export const saveProductSchema = z.strictObject({ id: idSchema.optional(), product: productSchema });
export type SaveProductInput = z.input<typeof saveProductSchema>;

/** The New product popup (specs/product-editor-on-page.md): a draft starts from a name, a category and a price. */
export const createDraftProductSchema = z.strictObject({
  name: productNameSchema,
  categoryId: z.cuid2({ error: "Choose a category" }),
  /** The product price before shipping, like a variant's. */
  pricePaisa: productPriceSchema,
});
export type CreateDraftProductInput = z.infer<typeof createDraftProductSchema>;

/**
 * The recommendations the editor and Preview show under the product (specs/product-page-v2.md): "You may also like"
 * (the category, without `excludeId`) and "More from Virzeen" (other categories).
 */
export const relatedByCategorySchema = z.strictObject({
  categoryId: idSchema,
  excludeId: idSchema.optional(),
});
export type RelatedByCategoryInput = z.infer<typeof relatedByCategorySchema>;

export const categorySchema = z.strictObject({
  id: idSchema.optional(),
  name: z
    .string()
    .trim()
    .min(1, { error: "Enter a name" })
    .max(60, { error: "Keep the name under 60 characters" }),
  slug: slugSchema,
  sortOrder: sortOrderSchema,
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const collectionSchema = z.strictObject({
  id: idSchema.optional(),
  name: z
    .string()
    .trim()
    .min(1, { error: "Enter a name" })
    .max(80, { error: "Keep the name under 80 characters" }),
  slug: slugSchema,
  description: z
    .string()
    .trim()
    .max(500, { error: "Keep the description under 500 characters" })
    .optional()
    .or(z.literal("")),
  isFeatured: z.boolean(),
});
export type CollectionInput = z.infer<typeof collectionSchema>;

export const ADMIN_PRODUCT_STATUSES = ["published", "draft"] as const;
export type AdminProductStatus = (typeof ADMIN_PRODUCT_STATUSES)[number];

/** A size chart in cm: measurement columns (e.g. Chest) and one row per size with a value for each. */
export const sizeChartSchema = z
  .strictObject({
    columns: z
      .array(
        z
          .string()
          .trim()
          .min(1, { error: "Enter a name for the measurement" })
          .max(30, { error: "Keep the measurement name under 30 characters" }),
      )
      .min(1, { error: "Add at least one measurement" })
      .max(6, { error: "Add up to 6 measurements" }),
    rows: z
      .array(
        z.strictObject({
          size: z
            .string()
            .trim()
            .min(1, { error: "Enter the size" })
            .max(20, { error: "Keep the size under 20 characters" }),
          /** One per column, in cm ("96" or "96-101"); blank allowed. */
          values: z
            .array(z.string().trim().max(20, { error: "Keep each value under 20 characters" }))
            .max(6, { error: "Add up to 6 measurements" }),
        }),
      )
      .min(1, { error: "Add at least one size" })
      .max(20, { error: "Add up to 20 sizes" }),
  })
  .superRefine(
    (chart, ctx) => {
      // Runs even when other fields failed (see `when`), so values may be unparsed: read them defensively.
      const columns: unknown[] = Array.isArray(chart.columns) ? chart.columns : [];
      const rows: unknown[] = Array.isArray(chart.rows) ? chart.rows : [];
      const key = (text: unknown) => (typeof text === "string" ? text.trim().toLowerCase() : "");
      // Every clashing entry is named, so the admin sees which ones to change.
      const columnKeys = columns.map(key);
      columnKeys.forEach((name, index) => {
        if (name && columnKeys.indexOf(name) !== columnKeys.lastIndexOf(name)) {
          ctx.addIssue({
            code: "custom",
            path: ["columns", index],
            message: "Another measurement has the same name",
          });
        }
      });
      const sizeKeys = rows.map((row) => (isRecord(row) ? key(row.size) : ""));
      rows.forEach((row, index) => {
        const size = sizeKeys[index];
        if (size && sizeKeys.indexOf(size) !== sizeKeys.lastIndexOf(size)) {
          ctx.addIssue({
            code: "custom",
            path: ["rows", index, "size"],
            message: "Another size has the same name",
          });
        }
        if (isRecord(row) && Array.isArray(row.values) && row.values.length !== columns.length) {
          ctx.addIssue({
            code: "custom",
            path: ["rows", index, "values"],
            message: "Each size needs a value for every measurement",
          });
        }
      });
    },
    // Show these alongside the field errors instead of only after every field is fixed.
    { when: (payload) => isRecord(payload.value) },
  );
export type SizeChart = z.infer<typeof sizeChartSchema>;

/** Parses a stored size chart; an invalid one gives null, so the shop hides the guide instead of crashing. */
export function parseSizeChart(value: unknown): SizeChart | null {
  const result = sizeChartSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** What a size guide shows (specs/product-page-v2.md): a size table (clothing) or one size chart picture. */
export const SIZE_GUIDE_KINDS = ["CHART", "PICTURE"] as const;
export type SizeGuideKind = (typeof SIZE_GUIDE_KINDS)[number];

/** The size guide form's Type choices and the admin list's Type column. */
export const SIZE_GUIDE_KIND_LABELS: Record<SizeGuideKind, string> = {
  CHART: "Clothing",
  PICTURE: "Accessories",
};

const SIZE_CHART_PICTURE_REQUIRED = "Upload the size chart picture";

/**
 * A size guide made in admin and picked on products (specs/size-guides.md, specs/product-page-v2.md).
 * - CHART (Clothing): `chart` must be a valid sizeChartSchema (errors keep their chart.* paths); `imageUrl` is the
 *   optional how-to-measure picture.
 * - PICTURE (Accessories): `imageUrl` is the size chart picture and is required; `chart` isn't checked (the form keeps
 *   the table typed before switching type, until Save) and comes out null.
 * The input is one flat shape (the form's values: SizeGuideFormValues); the output is a union on `kind`
 * (SizeGuideInput) whose `chart` is a SizeChart for CHART and null for PICTURE.
 */
export const sizeGuideSchema = z
  .strictObject({
    kind: z.enum(SIZE_GUIDE_KINDS, { error: "Choose a type" }),
    name: z
      .string()
      .trim()
      .min(1, { error: "Enter a name" })
      .max(60, { error: "Keep the name under 60 characters" }),
    intro: z
      .string()
      .trim()
      .max(500, { error: "Keep the intro under 500 characters" })
      .optional()
      .or(z.literal("")),
    /**
     * Checked below for a CHART guide only, so it's typed as a chart for the form. Always sent (the form keeps its
     * draft table): a PICTURE guide may send anything here, null included.
     */
    chart: z.custom<z.input<typeof sizeChartSchema>>(),
    fitTips: z
      .string()
      .trim()
      .max(500, { error: "Keep the fit tips under 500 characters" })
      .optional()
      .or(z.literal("")),
    /** One tip per line. */
    howToMeasure: z
      .array(
        z
          .string()
          .trim()
          .min(1, { error: "Remove the empty line" })
          .max(200, { error: "Keep each line under 200 characters" }),
      )
      .max(10, { error: "Add up to 10 tips" }),
    /** CHART: the how-to-measure picture (optional). PICTURE: the size chart picture (required, below). Blank = none. */
    imageUrl: z
      .string()
      .trim()
      .pipe(z.union([z.literal(""), imageRefSchema]))
      .optional(),
    /** Blank: CHART → "How to measure", PICTURE → "{name} size chart" (made where it's shown). */
    imageAlt: z
      .string()
      .trim()
      .max(200, { error: "Keep the picture description under 200 characters" })
      .optional()
      .or(z.literal("")),
  })
  .superRefine(
    (guide, ctx) => {
      // Runs even when other fields failed (see `when`), so values may be unparsed: read them defensively.
      if (guide.kind === "CHART") {
        const checked = sizeChartSchema.safeParse(guide.chart);
        for (const issue of checked.error?.issues ?? []) {
          ctx.addIssue({ code: "custom", path: ["chart", ...issue.path], message: issue.message });
        }
      }
      if (guide.kind === "PICTURE" && (typeof guide.imageUrl !== "string" || guide.imageUrl.trim() === "")) {
        ctx.addIssue({ code: "custom", path: ["imageUrl"], message: SIZE_CHART_PICTURE_REQUIRED });
      }
    },
    // Show these alongside the field errors instead of only after every field is fixed.
    { when: (payload) => isRecord(payload.value) },
  )
  // Only runs once everything above passed, so a CHART guide's chart is valid here.
  .transform(({ chart, ...guide }) =>
    guide.kind === "CHART"
      ? { ...guide, kind: "CHART" as const, chart: sizeChartSchema.parse(chart) }
      : { ...guide, kind: "PICTURE" as const, chart: null },
  );
/** The size guide form's values: one shape for both types, with the draft table kept while PICTURE is picked. */
export type SizeGuideFormValues = z.input<typeof sizeGuideSchema>;
/** A checked size guide (what catalogService.saveSizeGuide takes): `chart` is null for a PICTURE guide. */
export type SizeGuideInput = z.output<typeof sizeGuideSchema>;

/** What the admin size guide form sends: the guide, plus its id when editing (like saveProductSchema). */
export const saveSizeGuideSchema = z.strictObject({ id: idSchema.optional(), guide: sizeGuideSchema });
export type SaveSizeGuideInput = z.input<typeof saveSizeGuideSchema>;

/** Admin products search and status filter: they come from the URL, so anything odd is ignored instead of throwing. */
export const adminProductFiltersSchema = z.object({
  q: z.string().trim().min(1).max(60).optional().catch(undefined),
  status: z.enum(ADMIN_PRODUCT_STATUSES).optional().catch(undefined),
});
export type AdminProductFilters = z.output<typeof adminProductFiltersSchema>;

export const archiveSchema = z.strictObject({ id: idSchema });
export const duplicateProductSchema = z.strictObject({ id: idSchema });

/** Signed Cloudinary upload request (security-policy.md §4). */
export const uploadSignatureSchema = z.strictObject({
  folder: z.enum(["products", "portfolio", "size-guides"]),
  entityId: idSchema.or(z.literal("new")),
});
export type UploadSignatureInput = z.infer<typeof uploadSignatureSchema>;

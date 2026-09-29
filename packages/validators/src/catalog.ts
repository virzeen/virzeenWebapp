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

export const skuSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, { error: "Enter a SKU" })
  .regex(/^VZ(-[A-Z0-9]+){2,4}$/, { error: "Use the format VZ-PRODUCT-COLOUR-SIZE" });

/** Cloudinary public id (e.g. virzeen/products/abc/front) or a local /public path for seed data. */
export const imageRefSchema = z
  .string()
  .trim()
  .min(1, { error: "Add an image" })
  .max(300, { error: "Use a Cloudinary public id or a /public path, not a web address" })
  .regex(/^(\/[\w\-./]+|[\w-]+(\/[\w\-.]+)*)$/, {
    error: "Use a Cloudinary public id or a /public path, not a web address",
  });

const altSchema = z
  .string()
  .trim()
  .min(1, { error: "Describe the image for screen readers" })
  .max(200, { error: "Keep the alt text under 200 characters" });

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
});
export type ProductImageInput = z.infer<typeof productImageSchema>;

export const variantSchema = z.strictObject({
  id: idSchema.optional(),
  sku: skuSchema,
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
  // Same limits as paisaSchema, with messages the admin can act on.
  pricePaisa: z
    .int({ error: PRICE_ERROR })
    .min(100, { error: "Enter a price of at least Rs 1" })
    .max(1_000_000_000, { error: "Enter a price under Rs 1 crore" }),
  stock: z
    .int({ error: STOCK_ERROR })
    .min(0, { error: "Stock can't be negative" })
    .max(100_000, { error: "Enter a stock of 100,000 or less" }),
  isActive: z.boolean(),
});
export type VariantInput = z.input<typeof variantSchema>;

const DUPLICATE_SKU = "Another variant has the same SKU";
const NO_VARIANT_FOR_SALE = "Tick For sale on at least one variant, or switch off Published";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const skuOf = (row: unknown) =>
  isRecord(row) && typeof row.sku === "string" ? row.sku.trim().toUpperCase() : "";

export const productSchema = z
  .strictObject({
    name: z
      .string()
      .trim()
      .min(1, { error: "Enter the product name" })
      .max(120, { error: "Keep the name under 120 characters" }),
    slug: slugSchema,
    description: z
      .string()
      .trim()
      .min(1, { error: "Enter a description" })
      .max(5000, { error: "Keep the description under 5,000 characters" }),
    care: z
      .string()
      .trim()
      .max(2000, { error: "Keep the care notes under 2,000 characters" })
      .optional()
      .or(z.literal("")),
    seoDescription: z
      .string()
      .trim()
      .max(155, { error: "Keep the search description under 155 characters" })
      .optional()
      .or(z.literal("")),
    categoryId: z.cuid2({ error: "Choose a category" }),
    collectionIds: z.array(idSchema).max(20, { error: "Choose up to 20 collections" }),
    isPublished: z.boolean(),
    images: z.array(productImageSchema).max(12, { error: "Add up to 12 images" }),
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
      if (product.isPublished !== true) return;
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

/** Admin products search: comes from the URL, so anything odd is ignored instead of throwing. */
export const adminProductFiltersSchema = z.object({
  q: z.string().trim().min(1).max(60).optional().catch(undefined),
});
export type AdminProductFilters = z.output<typeof adminProductFiltersSchema>;

export const archiveSchema = z.strictObject({ id: idSchema });

/** Signed Cloudinary upload request (security-policy.md §4). */
export const uploadSignatureSchema = z.strictObject({
  folder: z.enum(["products", "portfolio"]),
  entityId: idSchema.or(z.literal("new")),
});
export type UploadSignatureInput = z.infer<typeof uploadSignatureSchema>;

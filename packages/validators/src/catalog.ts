import { z } from "zod";
import { idSchema, paisaSchema, slugSchema } from "./common";

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
  .regex(/^VZ(-[A-Z0-9]+){2,4}$/, { error: "Use the format VZ-PRODUCT-COLOR-SIZE" });

/** Cloudinary public id (e.g. virzeen/products/abc/front) or a local /public path for seed data. */
export const imageRefSchema = z
  .string()
  .trim()
  .min(1)
  .max(300)
  .regex(/^(\/[\w\-./]+|[\w-]+(\/[\w\-.]+)*)$/, { error: "Invalid image reference" });

const altSchema = z.string().trim().min(1, { error: "Describe the image for screen readers" }).max(200);

export const productImageSchema = z.strictObject({
  url: imageRefSchema,
  alt: altSchema,
});
export type ProductImageInput = z.infer<typeof productImageSchema>;

export const variantSchema = z.strictObject({
  id: idSchema.optional(),
  sku: skuSchema,
  size: z.string().trim().max(20).optional().or(z.literal("")),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  pricePaisa: paisaSchema.min(100, { error: "Enter a price of at least Rs 1" }),
  stock: z.int().min(0, { error: "Stock can't be negative" }).max(100_000),
  isActive: z.boolean(),
});
export type VariantInput = z.input<typeof variantSchema>;

export const productSchema = z
  .strictObject({
    name: z.string().trim().min(1, { error: "Enter the product name" }).max(120),
    slug: slugSchema,
    description: z.string().trim().min(1, { error: "Enter a description" }).max(5000),
    care: z.string().trim().max(2000).optional().or(z.literal("")),
    seoDescription: z.string().trim().max(155).optional().or(z.literal("")),
    categoryId: idSchema,
    collectionIds: z.array(idSchema).max(20),
    isPublished: z.boolean(),
    images: z.array(productImageSchema).max(12),
    /** Delivery charge added to every variant's price; customers see one price and free shipping. */
    shippingPaisa: z
      .int({ error: "Enter a shipping price (0 for none)" })
      .min(0, { error: "Shipping price can't be negative" })
      .max(10_000_000, { error: "Shipping price is too high" }),
    /** Variant prices here are product prices before shipping. */
    variants: z.array(variantSchema).min(1, { error: "Add at least one variant" }).max(60),
  })
  .refine((p) => new Set(p.variants.map((v) => v.sku)).size === p.variants.length, {
    path: ["variants"],
    error: "Each variant needs a unique SKU",
  })
  .refine((p) => !p.isPublished || p.images.length > 0, {
    path: ["images"],
    error: "Add at least one image before publishing",
  });
export type ProductInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;

export const saveProductSchema = z.strictObject({ id: idSchema.optional(), product: productSchema });
export type SaveProductInput = z.input<typeof saveProductSchema>;

export const categorySchema = z.strictObject({
  id: idSchema.optional(),
  name: z.string().trim().min(1, { error: "Enter a name" }).max(60),
  slug: slugSchema,
  sortOrder: z.int().min(0).max(1000),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const collectionSchema = z.strictObject({
  id: idSchema.optional(),
  name: z.string().trim().min(1, { error: "Enter a name" }).max(80),
  slug: slugSchema,
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isFeatured: z.boolean(),
});
export type CollectionInput = z.infer<typeof collectionSchema>;

export const archiveSchema = z.strictObject({ id: idSchema });

/** Signed Cloudinary upload request (security-policy.md §4). */
export const uploadSignatureSchema = z.strictObject({
  folder: z.enum(["products", "portfolio"]),
  entityId: idSchema.or(z.literal("new")),
});
export type UploadSignatureInput = z.infer<typeof uploadSignatureSchema>;

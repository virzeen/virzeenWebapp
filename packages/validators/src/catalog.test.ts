import { describe, expect, it } from "vitest";
import { adminProductFiltersSchema, categorySchema, productSchema } from "./catalog";

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
  categoryId: VALID_ID,
  collectionIds: [],
  isPublished: true,
  images: [{ url: "virzeen/products/abc/front", alt: "Front view" }],
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
      description: "Enter a description",
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
      variants: "Tick For sale on at least one variant, or switch off Published",
    });
  });

  it("lets a draft have no images and no variant for sale", () => {
    const draft = { ...product, isPublished: false, images: [], variants: [{ ...variant, isActive: false }] };
    expect(productSchema.safeParse(draft).success).toBe(true);
  });

  it("does not crash on input that is not an object", () => {
    expect(productSchema.safeParse(undefined).success).toBe(false);
    expect(productSchema.safeParse({ ...product, variants: "none" }).success).toBe(false);
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

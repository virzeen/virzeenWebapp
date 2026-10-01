import { db } from "@virzeen/db";
import type { ProductData, SizeGuideInput } from "@virzeen/validators";
import { beforeEach, describe, expect, it } from "vitest";
import { createCart, createCategory, createUser, resetDatabase } from "../../test/factories";
import { cartService } from "../cart/cart.service";
import { adminReads } from "../admin/admin-reads";
import { catalogReads } from "./catalog.reads";
import { catalogService } from "./catalog.service";

async function productInput(overrides: Partial<ProductData> = {}): Promise<ProductData> {
  const category = await createCategory();
  return {
    name: "Linen Overshirt",
    slug: "linen-overshirt",
    description: "Relaxed overshirt in washed linen.",
    care: "",
    benefits: [],
    details: [],
    countryOfOrigin: "",
    seoDescription: "",
    categoryId: category.id,
    sizeGuideId: "",
    collectionIds: [],
    isPublished: true,
    images: [{ url: "virzeen/products/linen/front", alt: "Front view" }],
    features: [],
    featureLayout: "THREE",
    featureRows: [],
    styles: [],
    shippingPaisa: 0,
    variants: [
      { sku: "VZ-LINEN-BLK-M", size: "M", color: "Black", pricePaisa: 450_000, stock: 3, isActive: true },
      { sku: "VZ-LINEN-BLK-L", size: "L", color: "Black", pricePaisa: 480_000, stock: 0, isActive: true },
    ],
    ...overrides,
  };
}

describe("catalogService.saveProduct", () => {
  beforeEach(resetDatabase);

  it("creates a product that appears in the shop with its lowest price (admin creates → visible on shop)", async () => {
    const admin = await createUser({ role: "ADMIN" });

    await catalogService.saveProduct(admin.id, { product: await productInput() });

    const page = await catalogReads.listProducts({ sort: "newest", inStock: false });
    expect(page.items).toMatchObject([{ slug: "linen-overshirt", fromPricePaisa: 450_000, inStock: true }]);
    const detail = await catalogReads.getProductBySlug("linen-overshirt");
    expect(detail?.sizes).toEqual(["M", "L"]);
    expect(await db.auditLog.count({ where: { action: "product.create" } })).toBe(1);
  });

  it("adds the product's shipping to every variant price, and the edit form gets the two parts back", async () => {
    const admin = await createUser({ role: "ADMIN" });

    const saved = await catalogService.saveProduct(admin.id, {
      product: await productInput({ shippingPaisa: 15_000 }), // Rs 150 shipping
    });

    const variants = await db.productVariant.findMany({
      where: { productId: saved.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(variants.map((v) => v.pricePaisa)).toEqual([465_000, 495_000]);
    const page = await catalogReads.listProducts({ sort: "newest", inStock: false });
    expect(page.items[0]?.fromPricePaisa).toBe(465_000);

    const forEdit = await adminReads.getProductForEdit(saved.id);
    expect(forEdit.shippingPaisa).toBe(15_000);
    expect(forEdit.variants.map((v) => v.pricePaisa)).toEqual([450_000, 480_000]);
  });

  it("deactivates variants removed from the form instead of deleting them", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput();
    const saved = await catalogService.saveProduct(admin.id, { product: input });
    const existing = await db.productVariant.findMany({
      where: { productId: saved.id },
      orderBy: { sortOrder: "asc" },
    });

    await catalogService.saveProduct(admin.id, {
      id: saved.id,
      product: { ...input, variants: [{ ...input.variants[0]!, id: existing[0]!.id }] },
    });

    const variants = await db.productVariant.findMany({
      where: { productId: saved.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(variants.map((v) => [v.sku, v.isActive])).toEqual([
      ["VZ-LINEN-BLK-M", true],
      ["VZ-LINEN-BLK-L", false],
    ]);
  });

  it("reports a duplicate slug as a field error", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await catalogService.saveProduct(admin.id, { product: await productInput() });

    await expect(
      catalogService.saveProduct(admin.id, {
        product: await productInput({
          variants: [
            { sku: "VZ-OTHER-BLK-M", size: "M", color: "Black", pricePaisa: 1_000, stock: 1, isActive: true },
          ],
        }),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED", fields: { slug: "This slug is already used" } });
  });

  it("hides unpublished and archived products from the shop", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput({ isPublished: false });
    const draft = await catalogService.saveProduct(admin.id, { product: input });
    expect((await catalogReads.listProducts({ sort: "newest", inStock: false })).items).toHaveLength(0);

    const variants = await db.productVariant.findMany({
      where: { productId: draft.id },
      orderBy: { sortOrder: "asc" },
    });
    await catalogService.saveProduct(admin.id, {
      id: draft.id,
      product: {
        ...input,
        isPublished: true,
        variants: input.variants.map((v, i) => ({ ...v, id: variants[i]!.id })),
      },
    });
    expect((await catalogReads.listProducts({ sort: "newest", inStock: false })).items).toHaveLength(1);
    await catalogService.archiveProduct(admin.id, draft.id);

    expect((await catalogReads.listProducts({ sort: "newest", inStock: false })).items).toHaveLength(0);
    expect(await catalogReads.getProductBySlug("linen-overshirt")).toBeNull();
  });

  it("names the variant rows whose SKU is already used elsewhere", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput();
    await catalogService.saveProduct(admin.id, { product: input });
    const [medium, large] = input.variants;

    // Another product reusing the L SKU: the second row is named.
    await expect(
      catalogService.saveProduct(admin.id, {
        product: await productInput({
          slug: "linen-shirt",
          variants: [{ ...medium!, sku: "VZ-SHIRT-BLK-M" }, large!],
        }),
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "One SKU is already used. Change it and save again.",
      fields: { "variants.1.sku": "Another product already uses this SKU" },
    });
  });

  it("brings a variant back when a new row reuses its SKU, keeping its id for past orders", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput();
    const saved = await catalogService.saveProduct(admin.id, { product: input });
    const [medium, large] = input.variants;
    const before = await db.productVariant.findMany({
      where: { productId: saved.id },
      orderBy: { sortOrder: "asc" },
    });
    // The L row is dropped from the form (deactivated), then added again as a new row with the same SKU.
    await catalogService.saveProduct(admin.id, {
      id: saved.id,
      product: { ...input, variants: [{ ...medium!, id: before[0]!.id }] },
    });

    await catalogService.saveProduct(admin.id, {
      id: saved.id,
      product: {
        ...input,
        variants: [
          { ...medium!, id: before[0]!.id },
          { ...large!, stock: 4 },
        ],
      },
    });

    const after = await db.productVariant.findMany({
      where: { productId: saved.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(after.map((v) => [v.id, v.sku, v.isActive, v.stock])).toEqual([
      [before[0]!.id, "VZ-LINEN-BLK-M", true, 3],
      [before[1]!.id, "VZ-LINEN-BLK-L", true, 4],
    ]);
  });

  it("keeps variants that are not for sale in the edit form, so For sale can be ticked again", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput();
    const [medium, large] = input.variants;
    const saved = await catalogService.saveProduct(admin.id, {
      product: { ...input, variants: [medium!, { ...large!, isActive: false }] },
    });

    const forEdit = await adminReads.getProductForEdit(saved.id);

    expect(forEdit.variants.map((v) => [v.sku, v.isActive])).toEqual([
      ["VZ-LINEN-BLK-M", true],
      ["VZ-LINEN-BLK-L", false],
    ]);
  });

  it("lets two variants of a product swap SKUs in one save", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput();
    const saved = await catalogService.saveProduct(admin.id, { product: input });
    const [medium, large] = input.variants;
    const before = await db.productVariant.findMany({
      where: { productId: saved.id },
      orderBy: { sortOrder: "asc" },
    });

    await catalogService.saveProduct(admin.id, {
      id: saved.id,
      product: {
        ...input,
        variants: [
          { ...medium!, id: before[0]!.id, sku: large!.sku },
          { ...large!, id: before[1]!.id, sku: medium!.sku },
        ],
      },
    });

    const after = await db.productVariant.findMany({
      where: { productId: saved.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(after.map((v) => [v.id, v.sku])).toEqual([
      [before[0]!.id, "VZ-LINEN-BLK-L"],
      [before[1]!.id, "VZ-LINEN-BLK-M"],
    ]);
  });

  it("refuses to publish a product with no variant for sale, in the form's words", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput();

    await expect(
      catalogService.saveProduct(admin.id, {
        product: { ...input, variants: input.variants.map((v) => ({ ...v, isActive: false })) },
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      fields: { variants: "Add a size or style for sale before publishing" },
    });
  });
});

describe("catalogService.archiveCategory", () => {
  beforeEach(resetDatabase);

  it("refuses while products use the category, counting them in plain words", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput();
    await catalogService.saveProduct(admin.id, { product: input });

    await expect(catalogService.archiveCategory(admin.id, input.categoryId)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Move or archive the 1 product in this category first.",
    });

    await catalogService.saveProduct(admin.id, {
      product: {
        ...input,
        slug: "linen-shirt",
        variants: input.variants.map((v) => ({ ...v, sku: v.sku.replace("LINEN", "SHIRT") })),
      },
    });
    await expect(catalogService.archiveCategory(admin.id, input.categoryId)).rejects.toMatchObject({
      message: "Move or archive the 2 products in this category first.",
    });
  });
});

describe("catalogService.saveProduct: made SKUs and photo descriptions", () => {
  beforeEach(resetDatabase);

  const blank = (size: string, color: string) => ({
    sku: "",
    size,
    color,
    pricePaisa: 135_000,
    stock: 2,
    isActive: true,
  });
  const skusOf = async (productId: string) =>
    (await db.productVariant.findMany({ where: { productId }, orderBy: { sortOrder: "asc" } })).map(
      (v) => v.sku,
    );

  it("makes VZ-PRODUCT-COLOUR-SIZE from the slug for blank SKUs, and STD with no size or colour", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const shirt = await catalogService.saveProduct(admin.id, {
      product: await productInput({
        variants: [blank("M", "Black"), blank("Free size", "Sky blue"), blank("XL", "")],
      }),
    });
    expect(await skusOf(shirt.id)).toEqual([
      "VZ-LINENOVERSHI-BLACK-M",
      "VZ-LINENOVERSHI-SKYBLUE-FREESIZE",
      "VZ-LINENOVERSHI-XL",
    ]);

    const tote = await catalogService.saveProduct(admin.id, {
      product: await productInput({ slug: "tote", variants: [blank("", "")] }),
    });
    expect(await skusOf(tote.id)).toEqual(["VZ-TOTE-STD"]);
  });

  it("adds -2, -3… when another product or row already has the made SKU", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await catalogService.saveProduct(admin.id, {
      product: await productInput({ slug: "linen-overshirt-white", variants: [blank("M", "Black")] }),
    });

    const saved = await catalogService.saveProduct(admin.id, {
      product: await productInput({
        slug: "linen-overshirt-black",
        variants: [blank("M", "Black"), blank("M", "Black")],
      }),
    });

    expect(await skusOf(saved.id)).toEqual(["VZ-LINENOVERSHI-BLACK-M-2", "VZ-LINENOVERSHI-BLACK-M-3"]);
  });

  it("brings back this product's switched-off variant when a blank row makes its SKU", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput({ variants: [blank("M", "Black"), blank("L", "Black")] });
    const saved = await catalogService.saveProduct(admin.id, { product: input });
    const [medium] = await db.productVariant.findMany({ where: { productId: saved.id, size: "M" } });
    // Size M removed and saved: switched off, kept for past orders.
    const forEdit = await adminReads.getProductForEdit(saved.id);
    const large = forEdit.variants.find((v) => v.size === "L");
    await catalogService.saveProduct(admin.id, {
      id: saved.id,
      product: { ...input, variants: [{ ...blank("L", "Black"), id: large?.id, sku: large?.sku ?? "" }] },
    });

    // Size M added again as a new blank row.
    await catalogService.saveProduct(admin.id, {
      id: saved.id,
      product: {
        ...input,
        variants: [{ ...blank("L", "Black"), id: large?.id, sku: large?.sku ?? "" }, blank("M", "Black")],
      },
    });

    const variants = await db.productVariant.findMany({ where: { productId: saved.id } });
    expect(variants).toHaveLength(2);
    expect(variants.find((v) => v.size === "M")).toMatchObject({ id: medium?.id, isActive: true });
  });

  it("describes photos with the product name when their description is blank", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const saved = await catalogService.saveProduct(admin.id, {
      product: await productInput({
        images: [
          { url: "virzeen/products/linen/front", alt: "" },
          { url: "virzeen/products/linen/back", alt: "" },
          { url: "virzeen/products/linen/detail", alt: "Stitching on the cuff" },
        ],
      }),
    });

    const images = await db.productImage.findMany({
      where: { productId: saved.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(images.map((image) => image.alt)).toEqual([
      "Linen Overshirt",
      "Linen Overshirt, photo 2",
      "Stitching on the cuff",
    ]);
  });
});

describe("catalogService.duplicateProduct", () => {
  beforeEach(resetDatabase);

  it("copies a product as a draft with stock 0, new SKUs and the same prices, photos and text", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const source = await catalogService.saveProduct(admin.id, {
      product: await productInput({
        shippingPaisa: 15_000,
        images: [
          { url: "virzeen/products/linen/front", alt: "" },
          { url: "virzeen/products/linen/back", alt: "Back view" },
        ],
      }),
    });

    const copy = await catalogService.duplicateProduct(admin.id, source.id);
    const again = await catalogService.duplicateProduct(admin.id, source.id);

    expect(copy.slug).toBe("linen-overshirt-copy");
    expect(again.slug).toBe("linen-overshirt-copy-2");
    const forEdit = await adminReads.getProductForEdit(copy.id);
    expect(forEdit).toMatchObject({
      name: "Linen Overshirt (copy)",
      description: "Relaxed overshirt in washed linen.",
      isPublished: false,
      shippingPaisa: 15_000,
      images: [
        { url: "virzeen/products/linen/front", alt: "Linen Overshirt (copy)" },
        { url: "virzeen/products/linen/back", alt: "Back view" },
      ],
    });
    expect(
      forEdit.variants.map(({ sku, size, pricePaisa, stock }) => ({ sku, size, pricePaisa, stock })),
    ).toEqual([
      { sku: "VZ-LINENOVERSHI-BLACK-M", size: "M", pricePaisa: 450_000, stock: 0 },
      { sku: "VZ-LINENOVERSHI-BLACK-L", size: "L", pricePaisa: 480_000, stock: 0 },
    ]);
    const audit = await db.auditLog.findFirst({ where: { entityId: copy.id } });
    expect(audit).toMatchObject({ action: "product.create", diff: { duplicatedFrom: source.id } });
  });

  it("answers not found for an archived product", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const saved = await catalogService.saveProduct(admin.id, { product: await productInput() });
    await catalogService.archiveProduct(admin.id, saved.id);

    await expect(catalogService.duplicateProduct(admin.id, saved.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("adminReads products status", () => {
  beforeEach(resetDatabase);

  it("filters the list by status and counts each one", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await catalogService.saveProduct(admin.id, { product: await productInput() });
    await catalogService.saveProduct(admin.id, {
      product: await productInput({
        slug: "draft-tee",
        name: "Draft tee",
        isPublished: false,
        variants: [{ sku: "", size: "M", color: "", pricePaisa: 100_000, stock: 1, isActive: true }],
      }),
    });

    expect((await adminReads.listProducts(undefined, "draft")).map((p) => p.slug)).toEqual(["draft-tee"]);
    expect((await adminReads.listProducts(undefined, "published")).map((p) => p.slug)).toEqual([
      "linen-overshirt",
    ]);
    expect(await adminReads.listProducts()).toHaveLength(2);
    expect(await adminReads.productStatusCounts()).toEqual({ all: 2, published: 1, draft: 1 });
  });
});

describe("product styles (specs/product-styles.md)", () => {
  beforeEach(resetDatabase);

  const row = (color: string, size: string, pricePaisa: number) => ({
    sku: "",
    size,
    color,
    pricePaisa,
    stock: 3,
    isActive: true,
  });

  it("saves each style's photos in style order before shared ones, with descriptions naming the style", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const saved = await catalogService.saveProduct(admin.id, {
      product: await productInput({
        name: "Oversized Tee",
        slug: "oversized-tee",
        images: [
          { url: "virzeen/products/tee/chart", alt: "", color: "" },
          { url: "virzeen/products/tee/river", alt: "", color: "River" },
          { url: "virzeen/products/tee/mountain-front", alt: "", color: "Mountain" },
          { url: "virzeen/products/tee/mountain-back", alt: "", color: "Mountain" },
        ],
        variants: [row("Mountain", "M", 180_000), row("River", "M", 165_000)],
      }),
    });

    const images = await db.productImage.findMany({
      where: { productId: saved.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(images.map(({ url, alt, color }) => [url.split("/").at(-1), alt, color])).toEqual([
      ["mountain-front", "Oversized Tee, Mountain", "Mountain"],
      ["mountain-back", "Oversized Tee, Mountain, photo 2", "Mountain"],
      ["river", "Oversized Tee, River", "River"],
      ["chart", "Oversized Tee", null],
    ]);
    const page = await catalogReads.getProductBySlug("oversized-tee");
    expect(page?.images.map((image) => image.color)).toEqual(["Mountain", "Mountain", "River", null]);
    expect(page?.colors).toEqual(["Mountain", "River"]);
    const [card] = (await catalogReads.listProducts({ sort: "newest", inStock: false })).items;
    expect(card).toMatchObject({
      imageUrl: "virzeen/products/tee/mountain-front",
      hasStylePhotos: true,
      colorCount: 2,
      styles: ["Mountain", "River"],
    });
    const forEdit = await adminReads.getProductForEdit(saved.id);
    expect(forEdit.images.at(-1)?.color).toBe("");
  });

  it("shows the bought style's photo in the bag", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const saved = await catalogService.saveProduct(admin.id, {
      product: await productInput({
        images: [
          { url: "virzeen/products/tee/mountain", alt: "", color: "Mountain" },
          { url: "virzeen/products/tee/river", alt: "", color: "River" },
        ],
        variants: [row("Mountain", "M", 180_000), row("River", "M", 165_000)],
      }),
    });
    const river = await db.productVariant.findFirstOrThrow({
      where: { productId: saved.id, color: "River" },
    });

    const cart = await createCart();
    const summary = await cartService.addItem({ cartId: cart.id, variantId: river.id, quantity: 1 });

    expect(summary.items[0]).toMatchObject({
      imageUrl: "virzeen/products/tee/river",
      unitPricePaisa: 165_000,
    });
  });
});

type ChartGuide = Extract<SizeGuideInput, { kind: "CHART" }>;
type PictureGuide = Extract<SizeGuideInput, { kind: "PICTURE" }>;

function sizeGuideInput(overrides: Partial<ChartGuide> = {}): ChartGuide {
  return {
    kind: "CHART",
    name: "Tops",
    intro: "Body measurements in cm.",
    chart: {
      columns: ["Chest", "Length"],
      rows: [
        { size: "M", values: ["96-101", "72"] },
        { size: "L", values: ["101-106", ""] },
      ],
    },
    fitTips: "",
    howToMeasure: ["Measure around the fullest part of your chest."],
    imageUrl: "",
    imageAlt: "Ignored without a picture",
    ...overrides,
  };
}

/** An Accessories guide (specs/product-page-v2.md): one size chart picture, no table. */
function pictureGuideInput(overrides: Partial<PictureGuide> = {}): PictureGuide {
  return {
    kind: "PICTURE",
    name: "Belts",
    intro: "",
    chart: null,
    fitTips: "Pick your trouser waist size.",
    howToMeasure: [],
    imageUrl: "virzeen/size-guides/new/belts",
    imageAlt: "",
    ...overrides,
  };
}

const FEATURES = [
  {
    title: "Breathable",
    body: "Washed linen keeps you cool.",
    imageUrl: "virzeen/products/linen/f1",
    alt: "",
  },
  {
    title: "Roomy pockets",
    body: "Two patch pockets.",
    imageUrl: "virzeen/products/linen/f2",
    alt: "Pocket",
  },
];

describe("product details, features and size guides (specs/product-page.md, specs/size-guides.md)", () => {
  beforeEach(resetDatabase);

  it("saves details, features and the size guide, and reads them back for the editor and the shop", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const guide = await catalogService.saveSizeGuide(admin.id, sizeGuideInput());
    const input = await productInput({
      benefits: ["Soft from the first wear"],
      details: ["100% linen", "Horn-effect buttons"],
      countryOfOrigin: "Nepal",
      sizeGuideId: guide.id,
      features: FEATURES,
    });

    const saved = await catalogService.saveProduct(admin.id, { product: input });

    const forEdit = await adminReads.getProductForEdit(saved.id);
    expect(forEdit).toMatchObject({
      benefits: ["Soft from the first wear"],
      details: ["100% linen", "Horn-effect buttons"],
      countryOfOrigin: "Nepal",
      sizeGuideId: guide.id,
      features: [
        { ...FEATURES[0], alt: "Linen Overshirt, Breathable" },
        { ...FEATURES[1], alt: "Pocket" },
      ],
    });
    const page = await catalogReads.getProductBySlug("linen-overshirt");
    expect(page).toMatchObject({
      benefits: ["Soft from the first wear"],
      details: ["100% linen", "Horn-effect buttons"],
      countryOfOrigin: "Nepal",
      features: [
        { title: "Breathable", imageAlt: "Linen Overshirt, Breathable" },
        { title: "Roomy pockets", imageAlt: "Pocket" },
      ],
    });
    expect(page?.sizeGuide).toEqual({
      kind: "CHART",
      name: "Tops",
      intro: "Body measurements in cm.",
      chart: sizeGuideInput().chart,
      fitTips: null,
      howToMeasure: ["Measure around the fullest part of your chest."],
      imageUrl: null,
      imageAlt: null,
    });
    const audit = await db.auditLog.findFirst({ where: { action: "product.create" } });
    expect(audit?.diff).toMatchObject({ features: 2, sizeGuideId: guide.id });

    // Saving again replaces the features and can take the size guide off.
    await catalogService.saveProduct(admin.id, {
      id: saved.id,
      product: {
        ...input,
        countryOfOrigin: "",
        sizeGuideId: "",
        features: [FEATURES[1]!],
      },
    });
    const after = await adminReads.getProductForEdit(saved.id);
    // A cleared origin stays cleared: the editor shows what the product page shows (no origin line).
    expect(after).toMatchObject({ countryOfOrigin: "", sizeGuideId: "" });
    expect(after.values.countryOfOrigin).toBe("");
    expect(after.features.map((feature) => feature.title)).toEqual(["Roomy pockets"]);
    expect(await db.productFeature.count()).toBe(1);
    const shop = await catalogReads.getProductBySlug("linen-overshirt");
    expect(shop?.sizeGuide).toBeNull();
    expect(shop?.countryOfOrigin).toBeNull();
  });

  it("refuses a size guide that is archived or doesn't exist, in the form's words", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const guide = await catalogService.saveSizeGuide(admin.id, sizeGuideInput());
    await catalogService.archiveSizeGuide(admin.id, guide.id);

    for (const sizeGuideId of [guide.id, "tz4a98xxat96iws9zmbrgj3a"]) {
      await expect(
        catalogService.saveProduct(admin.id, { product: await productInput({ sizeGuideId }) }),
      ).rejects.toMatchObject({ code: "VALIDATION_FAILED", fields: { sizeGuideId: "Choose a size guide" } });
    }
  });

  it("shows no size guide in the shop when its stored chart isn't valid or it was archived", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const guide = await catalogService.saveSizeGuide(admin.id, sizeGuideInput());
    await catalogService.saveProduct(admin.id, { product: await productInput({ sizeGuideId: guide.id }) });

    await db.sizeGuide.update({ where: { id: guide.id }, data: { chart: { columns: "Chest" } } });
    expect((await catalogReads.getProductBySlug("linen-overshirt"))?.sizeGuide).toBeNull();
    expect(await adminReads.listSizeGuideOptions()).toEqual([]);
    expect((await adminReads.getSizeGuideForEdit(guide.id))?.chart).toEqual({ columns: [], rows: [] });

    await db.sizeGuide.update({
      where: { id: guide.id },
      data: { chart: sizeGuideInput().chart, archivedAt: new Date() },
    });
    expect((await catalogReads.getProductBySlug("linen-overshirt"))?.sizeGuide).toBeNull();
  });

  it("copies details, features and the size guide to a duplicate, making feature descriptions again", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const guide = await catalogService.saveSizeGuide(admin.id, sizeGuideInput());
    const source = await catalogService.saveProduct(admin.id, {
      product: await productInput({
        benefits: ["Soft"],
        details: ["100% linen"],
        countryOfOrigin: "Nepal",
        sizeGuideId: guide.id,
        features: FEATURES,
      }),
    });

    const copy = await catalogService.duplicateProduct(admin.id, source.id);

    expect(await adminReads.getProductForEdit(copy.id)).toMatchObject({
      benefits: ["Soft"],
      details: ["100% linen"],
      countryOfOrigin: "Nepal",
      sizeGuideId: guide.id,
      features: [
        { title: "Breathable", alt: "Linen Overshirt (copy), Breathable" },
        { title: "Roomy pockets", alt: "Pocket" },
      ],
    });
  });

  it("drops an archived size guide when duplicating", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const guide = await catalogService.saveSizeGuide(admin.id, sizeGuideInput());
    const source = await catalogService.saveProduct(admin.id, {
      product: await productInput({ sizeGuideId: guide.id }),
    });
    // Only possible by hand: archiving through the service is refused while the product uses it.
    await db.sizeGuide.update({ where: { id: guide.id }, data: { archivedAt: new Date() } });

    const copy = await catalogService.duplicateProduct(admin.id, source.id);

    expect((await adminReads.getProductForEdit(copy.id)).sizeGuideId).toBe("");
  });
});

describe("feature layouts and picture-only features (specs/product-page-v2.md)", () => {
  beforeEach(resetDatabase);

  it("saves the features layout, reads it back for the editor and the shop, and copies it to a duplicate", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const input = await productInput({ featureLayout: "TALL_LEFT", features: FEATURES });

    const saved = await catalogService.saveProduct(admin.id, { product: input });

    expect(saved.values.featureLayout).toBe("TALL_LEFT");
    expect((await adminReads.getProductForEdit(saved.id)).values.featureLayout).toBe("TALL_LEFT");
    expect((await catalogReads.getProductBySlug("linen-overshirt"))?.featureLayout).toBe("TALL_LEFT");

    await catalogService.saveProduct(admin.id, {
      id: saved.id,
      product: { ...input, featureLayout: "WIDE_TOP" },
    });
    expect((await catalogReads.getProductBySlug("linen-overshirt"))?.featureLayout).toBe("WIDE_TOP");

    const copy = await catalogService.duplicateProduct(admin.id, saved.id);
    expect(copy.values.featureLayout).toBe("WIDE_TOP");
  });

  it("saves the Custom rows, reads them back, keeps them under another layout, and copies them", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const featureRows = [
      { count: 1, shape: "LANDSCAPE" as const },
      { count: 2, shape: "PORTRAIT" as const },
      { count: 4, shape: "PORTRAIT" as const },
    ];
    const input = await productInput({ featureLayout: "CUSTOM", featureRows, features: FEATURES });

    const saved = await catalogService.saveProduct(admin.id, { product: input });

    expect(saved.values).toMatchObject({ featureLayout: "CUSTOM", featureRows });
    expect((await adminReads.getProductForEdit(saved.id)).values.featureRows).toEqual(featureRows);
    expect(await catalogReads.getProductBySlug("linen-overshirt")).toMatchObject({
      featureLayout: "CUSTOM",
      featureRows,
    });

    // Another layout keeps the rows, so picking Custom again gets them back.
    await catalogService.saveProduct(admin.id, { id: saved.id, product: { ...input, featureLayout: "TWO" } });
    expect(await catalogReads.getProductBySlug("linen-overshirt")).toMatchObject({
      featureLayout: "TWO",
      featureRows,
    });

    const copy = await catalogService.duplicateProduct(admin.id, saved.id);
    expect(copy.values).toMatchObject({ featureLayout: "TWO", featureRows });
  });

  it("reads rows that can't be used as no rows", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const saved = await catalogService.saveProduct(admin.id, {
      product: await productInput({ featureLayout: "CUSTOM" }),
    });
    // Only possible by hand in the database.
    await db.product.update({
      where: { id: saved.id },
      data: { featureRows: [{ count: 7, shape: "ROUND" }] },
    });

    expect((await adminReads.getProductForEdit(saved.id)).values.featureRows).toEqual([]);
    expect((await catalogReads.getProductBySlug("linen-overshirt"))?.featureRows).toEqual([]);
    expect((await catalogService.duplicateProduct(admin.id, saved.id)).values.featureRows).toEqual([]);
  });

  it("starts a new draft with three across and no Custom rows", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const category = await createCategory();

    const draft = await catalogService.createDraft(admin.id, {
      name: "Beanie",
      categoryId: category.id,
      pricePaisa: 135_000,
    });

    expect((await adminReads.getProductForEdit(draft.id)).values).toMatchObject({
      featureLayout: "THREE",
      featureRows: [],
    });
  });

  it("keeps the saved layout and rows when a save leaves them out", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const featureRows = [{ count: 3, shape: "PORTRAIT" as const }];
    const { featureLayout: _layout, featureRows: _rows, ...rest } = await productInput();
    const saved = await catalogService.saveProduct(admin.id, {
      product: { ...rest, featureLayout: "CUSTOM", featureRows },
    });

    await catalogService.saveProduct(admin.id, { id: saved.id, product: rest });

    expect((await adminReads.getProductForEdit(saved.id)).values).toMatchObject({
      featureLayout: "CUSTOM",
      featureRows,
    });
  });

  it("saves a feature that is only a picture, describing it with the product's name", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const pictureOnly = { title: "", body: "", imageUrl: "virzeen/products/linen/f3", alt: "" };

    const saved = await catalogService.saveProduct(admin.id, {
      product: await productInput({ features: [pictureOnly, FEATURES[0]!] }),
    });

    expect(saved.values.features).toEqual([
      { ...pictureOnly, alt: "Linen Overshirt" },
      { ...FEATURES[0], alt: "Linen Overshirt, Breathable" },
    ]);
    const page = await catalogReads.getProductBySlug("linen-overshirt");
    expect(page?.features.map(({ title, body, imageAlt }) => ({ title, body, imageAlt }))).toEqual([
      { title: "", body: "", imageAlt: "Linen Overshirt" },
      { title: "Breathable", body: "Washed linen keeps you cool.", imageAlt: "Linen Overshirt, Breathable" },
    ]);

    // A duplicate makes the description again from its own name.
    const copy = await catalogService.duplicateProduct(admin.id, saved.id);
    expect(copy.values.features.map((feature) => feature.alt)).toEqual([
      "Linen Overshirt (copy)",
      "Linen Overshirt (copy), Breathable",
    ]);
  });
});

describe("catalogService size guides", () => {
  beforeEach(resetDatabase);

  it("saves a guide, audits it, and lists it with the number of products using it", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const guide = await catalogService.saveSizeGuide(
      admin.id,
      sizeGuideInput({ fitTips: "True to size.", imageUrl: "/placeholder/product-01.jpg", imageAlt: "" }),
    );
    await catalogService.saveProduct(admin.id, { product: await productInput({ sizeGuideId: guide.id }) });
    await catalogService.saveSizeGuide(admin.id, { ...sizeGuideInput({ name: "Bottoms" }) });

    expect(
      (await adminReads.listSizeGuides()).map(({ name, productCount }) => ({ name, productCount })),
    ).toEqual([
      { name: "Bottoms", productCount: 0 },
      { name: "Tops", productCount: 1 },
    ]);
    expect(await adminReads.getSizeGuideForEdit(guide.id)).toEqual({
      id: guide.id,
      ...sizeGuideInput({ fitTips: "True to size.", imageUrl: "/placeholder/product-01.jpg", imageAlt: "" }),
    });
    expect((await adminReads.listSizeGuideOptions()).map((option) => option.name)).toEqual([
      "Bottoms",
      "Tops",
    ]);

    await catalogService.saveSizeGuide(admin.id, {
      ...sizeGuideInput({ name: "Tops (unisex)" }),
      id: guide.id,
    });
    expect((await adminReads.getSizeGuideForEdit(guide.id))?.name).toBe("Tops (unisex)");
    expect(
      (await db.auditLog.findMany({ where: { entity: "SizeGuide" }, orderBy: { createdAt: "asc" } })).map(
        (entry) => entry.action,
      ),
    ).toEqual(["sizeGuide.create", "sizeGuide.create", "sizeGuide.update"]);
  });

  it("keeps names unique among guides that aren't archived, ignoring case", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const tops = await catalogService.saveSizeGuide(admin.id, sizeGuideInput());

    await expect(
      catalogService.saveSizeGuide(admin.id, sizeGuideInput({ name: "TOPS" })),
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      fields: { name: "There's already a size guide with this name" },
    });
    // Saving a guide under its own name is fine.
    await catalogService.saveSizeGuide(admin.id, { ...sizeGuideInput({ intro: "" }), id: tops.id });

    await catalogService.archiveSizeGuide(admin.id, tops.id);
    await expect(catalogService.saveSizeGuide(admin.id, sizeGuideInput())).resolves.toMatchObject({
      id: expect.any(String),
    });
  });

  it("refuses to archive a guide while products use it, counting them in plain words", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const guide = await catalogService.saveSizeGuide(admin.id, sizeGuideInput());
    const input = await productInput({ sizeGuideId: guide.id });
    const first = await catalogService.saveProduct(admin.id, { product: input });

    await expect(catalogService.archiveSizeGuide(admin.id, guide.id)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "1 product uses this size guide. Pick another guide on it first.",
    });

    const shirt = {
      ...input,
      slug: "linen-shirt",
      variants: input.variants.map((v) => ({ ...v, sku: v.sku.replace("LINEN", "SHIRT") })),
    };
    const second = await catalogService.saveProduct(admin.id, { product: shirt });
    await expect(catalogService.archiveSizeGuide(admin.id, guide.id)).rejects.toMatchObject({
      message: "2 products use this size guide. Pick another guide on them first.",
    });

    // Archived products don't count; a product that no longer uses it doesn't either.
    await catalogService.archiveProduct(admin.id, first.id);
    await catalogService.saveProduct(admin.id, { id: second.id, product: { ...shirt, sizeGuideId: "" } });
    await expect(catalogService.archiveSizeGuide(admin.id, guide.id)).resolves.toEqual({ id: guide.id });

    expect(await adminReads.getSizeGuideForEdit(guide.id)).toBeNull();
    expect(await adminReads.listSizeGuides()).toEqual([]);
    await expect(catalogService.archiveSizeGuide(admin.id, guide.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      catalogService.saveSizeGuide(admin.id, { ...sizeGuideInput(), id: guide.id }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await db.auditLog.count({ where: { action: "sizeGuide.archive" } })).toBe(1);
  });

  it("lists each guide's type", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await catalogService.saveSizeGuide(admin.id, sizeGuideInput());
    await catalogService.saveSizeGuide(admin.id, pictureGuideInput());

    expect((await adminReads.listSizeGuides()).map(({ name, kind }) => ({ name, kind }))).toEqual([
      { name: "Belts", kind: "PICTURE" },
      { name: "Tops", kind: "CHART" },
    ]);
  });
});

describe("Accessories size guides (specs/product-page-v2.md)", () => {
  beforeEach(resetDatabase);

  it("saves the picture without a table and shows it in the editor, the product editor's options and the shop", async () => {
    const admin = await createUser({ role: "ADMIN" });

    const guide = await catalogService.saveSizeGuide(admin.id, pictureGuideInput());
    await catalogService.saveProduct(admin.id, { product: await productInput({ sizeGuideId: guide.id }) });

    const stored = await db.sizeGuide.findUniqueOrThrow({ where: { id: guide.id } });
    expect(stored).toMatchObject({ kind: "PICTURE", chart: null, imageUrl: "virzeen/size-guides/new/belts" });
    expect(await adminReads.getSizeGuideForEdit(guide.id)).toEqual({ id: guide.id, ...pictureGuideInput() });
    const shown = {
      kind: "PICTURE",
      name: "Belts",
      intro: null,
      chart: null,
      fitTips: "Pick your trouser waist size.",
      howToMeasure: [],
      imageUrl: "virzeen/size-guides/new/belts",
      imageAlt: null,
    };
    expect(await adminReads.listSizeGuideOptions()).toEqual([{ id: guide.id, ...shown }]);
    expect((await catalogReads.getProductBySlug("linen-overshirt"))?.sizeGuide).toEqual(shown);
    const audit = await db.auditLog.findFirst({ where: { action: "sizeGuide.create" } });
    expect(audit?.diff).toEqual({ name: "Belts", kind: "PICTURE", measurements: [], sizes: [] });
  });

  it("switches a guide between a table and a picture", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const guide = await catalogService.saveSizeGuide(admin.id, sizeGuideInput());

    await catalogService.saveSizeGuide(admin.id, { ...pictureGuideInput({ name: "Tops" }), id: guide.id });
    expect(await adminReads.getSizeGuideForEdit(guide.id)).toMatchObject({ kind: "PICTURE", chart: null });

    await catalogService.saveSizeGuide(admin.id, { ...sizeGuideInput(), id: guide.id });
    expect(await adminReads.getSizeGuideForEdit(guide.id)).toMatchObject({
      kind: "CHART",
      chart: sizeGuideInput().chart,
    });
  });

  it("is hidden from the shop and the product editor without its picture", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const guide = await catalogService.saveSizeGuide(admin.id, pictureGuideInput());
    await catalogService.saveProduct(admin.id, { product: await productInput({ sizeGuideId: guide.id }) });

    // Only possible by hand: the form needs the picture.
    await db.sizeGuide.update({ where: { id: guide.id }, data: { imageUrl: null } });

    expect((await catalogReads.getProductBySlug("linen-overshirt"))?.sizeGuide).toBeNull();
    expect(await adminReads.listSizeGuideOptions()).toEqual([]);
    expect(await adminReads.getSizeGuideForEdit(guide.id)).toMatchObject({ kind: "PICTURE", imageUrl: "" });
  });
});

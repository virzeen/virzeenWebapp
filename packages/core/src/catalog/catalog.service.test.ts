import { db } from "@virzeen/db";
import type { ProductData } from "@virzeen/validators";
import { beforeEach, describe, expect, it } from "vitest";
import { createCategory, createUser, resetDatabase } from "../../test/factories";
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
    seoDescription: "",
    categoryId: category.id,
    collectionIds: [],
    isPublished: true,
    images: [{ url: "virzeen/products/linen/front", alt: "Front view" }],
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
});

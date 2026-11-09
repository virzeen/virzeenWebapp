import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { createProduct, createVariant, resetDatabase } from "../../test/factories";
import { catalogReads } from "./catalog.reads";

// The product card's grey line and the header's Sale link (ui/patterns.md §5, owner 2026-11-08), against the test
// database.

describe("product cards", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("carry the category name for the grey line", async () => {
    const product = await createProduct({ name: "Linen Overshirt" });
    await db.category.update({ where: { id: product.categoryId }, data: { name: "VWear" } });
    await createVariant({ productId: product.id });

    const [card] = (await catalogReads.listProducts({ sort: "newest", inStock: false })).items;
    expect(card).toMatchObject({ name: "Linen Overshirt", categoryName: "VWear", styles: ["Black"] });
  });
});

describe("catalogReads.hasLiveCollection", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("is true only for a collection that isn't archived and holds a published product", async () => {
    expect(await catalogReads.hasLiveCollection("sale")).toBe(false);

    const draft = await createProduct({ published: false });
    await db.collection.create({
      data: { slug: "sale", name: "Sale", products: { connect: { id: draft.id } } },
    });
    expect(await catalogReads.hasLiveCollection("sale")).toBe(false);

    const live = await createProduct();
    await db.collection.update({ where: { slug: "sale" }, data: { products: { connect: { id: live.id } } } });
    expect(await catalogReads.hasLiveCollection("sale")).toBe(true);

    await db.collection.update({ where: { slug: "sale" }, data: { archivedAt: new Date() } });
    expect(await catalogReads.hasLiveCollection("sale")).toBe(false);
  });
});

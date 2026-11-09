import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { createProduct, createVariant, resetDatabase } from "../../test/factories";
import { catalogReads } from "./catalog.reads";

// specs/search.md: the shop listing with a search query, against the test database.

const search = async (q: string) =>
  (await catalogReads.listProducts({ q, sort: "newest", inStock: false })).items.map((p) => p.name);

/** A product with a fixed category name, so the factory's random slug can't match a search word. */
async function bareProduct(name: string, options: { published?: boolean } = {}) {
  const created = await createProduct({ name, ...options });
  await db.category.update({ where: { id: created.categoryId }, data: { name: "Clothing" } });
  return created;
}

async function product(name: string, color = "Black", options: { published?: boolean } = {}) {
  const created = await bareProduct(name, options);
  await createVariant({ productId: created.id, color });
  return created;
}

describe("catalogReads.listProducts with a search query", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("finds a product by any part of its name, in any case", async () => {
    await product("Linen Overshirt");
    await product("Oversized Tee");

    expect(await search("LINEN")).toEqual(["Linen Overshirt"]);
    expect(await search("overs")).toHaveLength(2);
  });

  it("needs every word to match something: a name word and a style colour", async () => {
    await product("Oversized Tee", "Black");
    await product("Oversized Tee White", "White");
    await product("Linen Overshirt", "Black");

    expect(await search("black tee")).toEqual(["Oversized Tee"]);
  });

  it("matches the category, a collection, a colour shown and a style number", async () => {
    const tee = await product("Oversized Tee");
    await db.category.update({ where: { id: tee.categoryId }, data: { name: "Tops" } });
    await db.collection.create({
      data: { slug: "monsoon", name: "Monsoon", products: { connect: { id: tee.id } } },
    });
    await db.productStyle.create({
      data: { productId: tee.id, color: "Black", code: "VZ0042-101", colourShown: "Black/Bone" },
    });
    await product("Linen Overshirt");

    expect(await search("tops")).toEqual(["Oversized Tee"]);
    expect(await search("monsoon")).toEqual(["Oversized Tee"]);
    expect(await search("bone")).toEqual(["Oversized Tee"]);
    expect(await search("vz0042-101")).toEqual(["Oversized Tee"]);
  });

  it("ignores archived collections and inactive styles", async () => {
    const tee = await bareProduct("Oversized Tee");
    await createVariant({ productId: tee.id, color: "Black" });
    await createVariant({ productId: tee.id, color: "Sand", isActive: false });
    await db.collection.create({
      data: {
        slug: "old",
        name: "Old drop",
        archivedAt: new Date(),
        products: { connect: { id: tee.id } },
      },
    });

    expect(await search("sand")).toEqual([]);
    expect(await search("drop")).toEqual([]);
  });

  it("counts every product the listing holds, with the same filters and search", async () => {
    await product("Oversized Tee", "Black");
    await product("Oversized Tee White", "White");
    await product("Linen Overshirt", "Black");
    await product("Draft Tee", "Black", { published: false });

    expect(await catalogReads.countProducts({ sort: "newest", inStock: false })).toBe(3);
    expect(await catalogReads.countProducts({ q: "tee", sort: "newest", inStock: false })).toBe(2);
    expect(await catalogReads.countProducts({ color: "Black", sort: "newest", inStock: false })).toBe(2);
  });

  it("never shows drafts", async () => {
    await product("Linen Overshirt", "Black", { published: false });

    expect(await search("linen")).toEqual([]);
  });
});

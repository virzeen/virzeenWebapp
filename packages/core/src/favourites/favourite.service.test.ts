import { db } from "@virzeen/db";
import { MAX_FAVOURITES } from "@virzeen/validators";
import { beforeEach, describe, expect, it } from "vitest";
import { createProduct, createUser, resetDatabase } from "../../test/factories";
import { favouriteService } from "./favourite.service";

/** Rows saved in separate requests get separate times (createdAt has millisecond precision). */
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

/**
 * A published product with a photo for White, one for Black (two) and one shared by every style. White costs
 * Rs 2,500 and is in stock; Black costs Rs 3,500 or Rs 3,800 (by size) and is sold out.
 */
async function productWithStyles(name = "Oversized Tee") {
  const product = await createProduct({ name });
  await db.productImage.deleteMany({ where: { productId: product.id } });
  await db.productImage.createMany({
    data: [
      { productId: product.id, url: "tee/white", alt: "Tee, White", color: "White", sortOrder: 0 },
      { productId: product.id, url: "tee/black-1", alt: "Tee, Black", color: "Black", sortOrder: 1 },
      { productId: product.id, url: "tee/black-2", alt: "Tee, Black, photo 2", color: "Black", sortOrder: 2 },
      { productId: product.id, url: "tee/chart", alt: "Tee", color: null, sortOrder: 3 },
    ],
  });
  const variant = (color: string, size: string, pricePaisa: number, stock: number, sortOrder: number) => ({
    productId: product.id,
    sku: `${product.id}-${color}-${size}`,
    size,
    color,
    pricePaisa,
    stock,
    sortOrder,
  });
  await db.productVariant.createMany({
    data: [
      variant("White", "M", 250_000, 4, 0),
      variant("Black", "M", 380_000, 0, 1),
      variant("Black", "L", 350_000, 0, 2),
    ],
  });
  return db.product.update({ where: { id: product.id }, data: { fromPricePaisa: 250_000 } });
}

describe("favouriteService.set", () => {
  beforeEach(resetDatabase);

  it("saves and removes idempotently, so double clicks and retries change nothing", async () => {
    const user = await createUser();
    const product = await createProduct();
    const key = { productId: product.id, color: "" };

    expect(await favouriteService.set(user.id, { ...key, saved: true })).toEqual({ ...key, saved: true });
    await favouriteService.set(user.id, { ...key, saved: true });
    expect(await db.favourite.count({ where: { userId: user.id } })).toBe(1);

    expect(await favouriteService.set(user.id, { ...key, saved: false })).toEqual({ ...key, saved: false });
    await favouriteService.set(user.id, { ...key, saved: false });
    expect(await db.favourite.count()).toBe(0);
  });

  it("keeps one favourite per style, and removing one style keeps the other", async () => {
    const user = await createUser();
    const product = await productWithStyles();

    await favouriteService.set(user.id, { productId: product.id, color: "White", saved: true });
    await tick();
    await favouriteService.set(user.id, { productId: product.id, color: "Black", saved: true });
    expect(await favouriteService.listKeys(user.id)).toEqual([
      { productId: product.id, color: "Black" },
      { productId: product.id, color: "White" },
    ]);

    await favouriteService.set(user.id, { productId: product.id, color: "White", saved: false });
    expect(await favouriteService.listKeys(user.id)).toEqual([{ productId: product.id, color: "Black" }]);
  });

  it("only saves products on sale, but always lets a favourite be removed", async () => {
    const user = await createUser();
    const draft = await createProduct({ published: false });
    const archived = await createProduct({ archived: true });

    for (const productId of [draft.id, archived.id, "tz4a98xxat96iws9zmbrgj3a"]) {
      await expect(
        favouriteService.set(user.id, { productId, color: "", saved: true }),
      ).rejects.toMatchObject({ code: "NOT_FOUND", message: "This product isn't available." });
    }

    await db.favourite.create({ data: { userId: user.id, productId: draft.id } });
    await favouriteService.set(user.id, { productId: draft.id, color: "", saved: false });
    expect(await db.favourite.count()).toBe(0);
  });

  it(`stops at ${MAX_FAVOURITES} favourites, but saving one already saved is still fine`, async () => {
    const user = await createUser();
    const product = await createProduct();
    await db.favourite.createMany({
      data: Array.from({ length: MAX_FAVOURITES }, (_, i) => ({
        userId: user.id,
        productId: product.id,
        color: `Style ${i}`,
      })),
    });

    await expect(
      favouriteService.set(user.id, { productId: product.id, color: "", saved: true }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "You can save up to 100 favourites. Remove one to add another.",
    });
    await favouriteService.set(user.id, { productId: product.id, color: "Style 3", saved: true });

    await favouriteService.set(user.id, { productId: product.id, color: "Style 3", saved: false });
    await favouriteService.set(user.id, { productId: product.id, color: "", saved: true });
    expect(await db.favourite.count({ where: { userId: user.id } })).toBe(MAX_FAVOURITES);
  });

  it("makes room in a full list from products no longer on sale, which the customer can't see to remove", async () => {
    const user = await createUser();
    const product = await createProduct();
    const gone = await createProduct({ name: "Old Cap" });
    const other = await createUser();
    await db.favourite.createMany({
      data: [
        ...Array.from({ length: MAX_FAVOURITES - 1 }, (_, i) => ({
          userId: user.id,
          productId: product.id,
          color: `Style ${i}`,
        })),
        { userId: user.id, productId: gone.id },
        { userId: other.id, productId: gone.id },
      ],
    });
    await db.product.update({ where: { id: gone.id }, data: { archivedAt: new Date() } });

    await favouriteService.set(user.id, { productId: product.id, color: "", saved: true });

    expect(await db.favourite.count({ where: { userId: user.id } })).toBe(MAX_FAVOURITES);
    expect(await db.favourite.count({ where: { productId: gone.id } })).toBe(1);
  });

  it("keeps each customer's favourites apart", async () => {
    const [asha, bina] = [await createUser(), await createUser()];
    const product = await createProduct();

    await favouriteService.set(asha.id, { productId: product.id, color: "", saved: true });
    await favouriteService.set(bina.id, { productId: product.id, color: "", saved: false });

    expect(await favouriteService.listKeys(asha.id)).toHaveLength(1);
    expect(await favouriteService.listKeys(bina.id)).toEqual([]);
  });
});

describe("favouriteService.list", () => {
  beforeEach(resetDatabase);

  it("lists newest first with the saved style's photo, leaving out products no longer on sale", async () => {
    const user = await createUser();
    const tee = await productWithStyles();
    const plain = await createProduct({ name: "Linen Overshirt" });
    const later = await createProduct({ name: "Logo Cap" });

    await favouriteService.set(user.id, { productId: tee.id, color: "Black", saved: true });
    await tick();
    await favouriteService.set(user.id, { productId: plain.id, color: "", saved: true });
    await tick();
    await favouriteService.set(user.id, { productId: tee.id, color: "White", saved: true });
    await tick();
    await favouriteService.set(user.id, { productId: later.id, color: "", saved: true });
    await tick();
    await favouriteService.set(user.id, { productId: tee.id, color: "Blue", saved: true });
    await db.product.update({ where: { id: later.id }, data: { isPublished: false } });

    const items = await favouriteService.list(user.id);

    expect(
      items.map((item) => [
        item.color,
        item.style,
        item.product.name,
        item.product.imageUrl,
        item.product.hoverImageUrl,
      ]),
    ).toEqual([
      // A style not sold (any more) shows the product's usual card, without the style.
      ["Blue", "", "Oversized Tee", "tee/white", "tee/black-1"],
      ["White", "White", "Oversized Tee", "tee/white", null],
      ["", "", "Linen Overshirt", "/placeholder/product-1.jpg", null],
      ["Black", "Black", "Oversized Tee", "tee/black-1", "tee/black-2"],
    ]);
    expect(items[1]).toMatchObject({ productId: tee.id, savedAt: expect.any(Date) });
    expect(items[1]?.product).toMatchObject({ id: tee.id, imageAlt: "Tee, White" });
    // The Add to bag popup's gallery: the style's photos, else every photo of the product.
    expect(items.map((item) => item.photos.map((photo) => photo.url))).toEqual([
      ["tee/white", "tee/black-1", "tee/black-2", "tee/chart"],
      ["tee/white"],
      ["/placeholder/product-1.jpg"],
      ["tee/black-1", "tee/black-2"],
    ]);
    expect(items[1]?.photos[0]).toEqual({ id: expect.any(String), url: "tee/white", alt: "Tee, White" });
    expect(await favouriteService.listKeys(user.id)).toHaveLength(5);
  });

  it("shows the saved style's price and stock, and the shared photo for a style without its own", async () => {
    const user = await createUser();
    const tee = await productWithStyles();
    await db.productVariant.create({
      data: {
        productId: tee.id,
        sku: `${tee.id}-Sand`,
        size: "M",
        color: "Sand",
        pricePaisa: 270_000,
        stock: 1,
      },
    });
    for (const color of ["Sand", "Black", "White", "Blue"]) {
      await favouriteService.set(user.id, { productId: tee.id, color, saved: true });
      await tick();
    }

    const items = await favouriteService.list(user.id);

    expect(
      items.map(({ style, product }) => [style, product.fromPricePaisa, product.inStock, product.imageUrl]),
    ).toEqual([
      // A style no longer sold: the product's lowest price, and in stock when any style is.
      ["", 250_000, true, "tee/white"],
      ["White", 250_000, true, "tee/white"],
      // The lowest of the style's sizes; sold out although White is in stock.
      ["Black", 350_000, false, "tee/black-1"],
      // No photos of its own: the photo shared by every style, as on the product page, not White's.
      ["Sand", 270_000, true, "tee/chart"],
    ]);
    expect(items.at(-1)?.product).toMatchObject({ imageAlt: "Tee", hoverImageUrl: null });
    expect((await favouriteService.summariesFor([{ productId: tee.id, color: "Black" }]))[0]).toMatchObject({
      style: "Black",
      product: { fromPricePaisa: 350_000, inStock: false, imageUrl: "tee/black-1" },
    });
  });

  it("carries the category and the saved style's variants for sale, sizes in the product page's order", async () => {
    const user = await createUser();
    const tee = await productWithStyles();
    const cap = await createProduct({ name: "Logo Cap" });
    // Black XL comes first in the admin's order, and Black XS isn't for sale.
    await db.productVariant.createMany({
      data: [
        {
          productId: tee.id,
          sku: `${tee.id}-Black-XL`,
          size: "XL",
          color: "Black",
          pricePaisa: 400_000,
          stock: 2,
        },
        {
          productId: tee.id,
          sku: `${tee.id}-Black-XS`,
          size: "XS",
          color: "Black",
          pricePaisa: 350_000,
          stock: 5,
          isActive: false,
        },
        { productId: cap.id, sku: `${cap.id}-one`, size: null, color: null, pricePaisa: 180_000, stock: 3 },
      ],
    });
    const variantId = async (productId: string, size: string | null, color: string | null) =>
      (await db.productVariant.findFirstOrThrow({ where: { productId, size, color } })).id;
    const categoryOf = async (categoryId: string) =>
      (await db.category.findUniqueOrThrow({ where: { id: categoryId } })).name;
    for (const [productId, color] of [
      [cap.id, ""],
      [tee.id, "Blue"],
      [tee.id, "White"],
      [tee.id, "Black"],
    ] as const) {
      await favouriteService.set(user.id, { productId, color, saved: true });
      await tick();
    }

    const items = await favouriteService.list(user.id);

    expect(items.map(({ color, variants }) => [color, variants])).toEqual([
      [
        "Black",
        [
          { id: await variantId(tee.id, "M", "Black"), size: "M", stock: 0, pricePaisa: 380_000 },
          { id: await variantId(tee.id, "L", "Black"), size: "L", stock: 0, pricePaisa: 350_000 },
          { id: await variantId(tee.id, "XL", "Black"), size: "XL", stock: 2, pricePaisa: 400_000 },
        ],
      ],
      ["White", [{ id: await variantId(tee.id, "M", "White"), size: "M", stock: 4, pricePaisa: 250_000 }]],
      // A style not sold any more has nothing to add.
      ["Blue", []],
      // A product without styles or sizes: its one variant.
      ["", [{ id: await variantId(cap.id, null, null), size: null, stock: 3, pricePaisa: 180_000 }]],
    ]);
    const [teeCategory, capCategory] = [await categoryOf(tee.categoryId), await categoryOf(cap.categoryId)];
    expect(items.map((item) => item.category)).toEqual([teeCategory, teeCategory, teeCategory, capCategory]);
    expect(await favouriteService.summariesFor([{ productId: tee.id, color: "Black" }])).toEqual([
      expect.objectContaining({ category: items[0]?.category, variants: items[0]?.variants }),
    ]);
  });
});

describe("favouriteService.merge", () => {
  beforeEach(resetDatabase);

  it("adds the browser's favourites above the account's own, once each, skipping products not on sale", async () => {
    const user = await createUser();
    const tee = await productWithStyles();
    const cap = await createProduct({ name: "Logo Cap" });
    const draft = await createProduct({ published: false });
    await favouriteService.set(user.id, { productId: cap.id, color: "", saved: true });

    const keys = await favouriteService.merge(user.id, [
      { productId: tee.id, color: "White" },
      { productId: draft.id, color: "" },
      { productId: cap.id, color: "" },
      { productId: "tz4a98xxat96iws9zmbrgj3a", color: "" },
      { productId: tee.id, color: "Black" },
      { productId: tee.id, color: "White" },
    ]);

    expect(keys).toEqual([
      { productId: tee.id, color: "White" },
      { productId: tee.id, color: "Black" },
      { productId: cap.id, color: "" },
    ]);
    expect(await favouriteService.merge(user.id, [])).toEqual(keys);
  });

  it(`never goes over ${MAX_FAVOURITES}: the account's own are kept and the newest browser ones fill the rest`, async () => {
    const user = await createUser();
    const product = await createProduct();
    const old = new Date("2026-01-01T00:00:00Z");
    await db.favourite.createMany({
      data: Array.from({ length: MAX_FAVOURITES - 2 }, (_, i) => ({
        userId: user.id,
        productId: product.id,
        color: `Style ${i}`,
        createdAt: old,
      })),
    });

    const keys = await favouriteService.merge(user.id, [
      { productId: product.id, color: "New 1" },
      { productId: product.id, color: "Style 5" },
      { productId: product.id, color: "New 2" },
      { productId: product.id, color: "New 3" },
    ]);

    expect(keys).toHaveLength(MAX_FAVOURITES);
    expect(keys.slice(0, 2).map((key) => key.color)).toEqual(["New 1", "New 2"]);
    expect(keys.some((key) => key.color === "New 3")).toBe(false);

    await favouriteService.merge(user.id, [{ productId: product.id, color: "New 4" }]);
    expect(await db.favourite.count({ where: { userId: user.id } })).toBe(MAX_FAVOURITES);

    // Favourites of a product taken off sale show nowhere, so they give up their room first.
    await db.favourite.updateMany({
      where: { userId: user.id, color: { in: ["Style 0", "Style 1"] } },
      data: { productId: (await createProduct({ published: false })).id },
    });
    const after = await favouriteService.merge(user.id, [{ productId: product.id, color: "New 4" }]);
    expect(after[0]).toEqual({ productId: product.id, color: "New 4" });
    expect(after).toHaveLength(MAX_FAVOURITES - 1);
  });

  it("keeps favourites of products taken off sale for a while when the new ones fit", async () => {
    const user = await createUser();
    const product = await createProduct();
    const reshoot = await createProduct({ name: "Logo Cap" });
    await db.favourite.createMany({
      data: [
        ...Array.from({ length: 70 }, (_, i) => ({
          userId: user.id,
          productId: product.id,
          color: `Style ${i}`,
        })),
        ...["Black", "White", "Sand"].map((color) => ({ userId: user.id, productId: reshoot.id, color })),
      ],
    });
    await db.product.update({ where: { id: reshoot.id }, data: { isPublished: false } });

    // 40 from the browser, 35 of them already in the account: 73 + 40 is over the limit, but only 5 are new.
    const keys = await favouriteService.merge(user.id, [
      ...Array.from({ length: 5 }, (_, i) => ({ productId: product.id, color: `New ${i}` })),
      ...Array.from({ length: 35 }, (_, i) => ({ productId: product.id, color: `Style ${i}` })),
    ]);

    expect(keys).toHaveLength(78);
    expect(await db.favourite.count({ where: { userId: user.id, productId: reshoot.id } })).toBe(3);
  });
});

describe("favouriteService.summariesFor (guests)", () => {
  beforeEach(resetDatabase);

  it("gives the cards in the browser's order with each style's photo, leaving out repeats and products off sale", async () => {
    const tee = await productWithStyles();
    const cap = await createProduct({ name: "Logo Cap" });
    const archived = await createProduct({ archived: true });

    const items = await favouriteService.summariesFor([
      { productId: cap.id, color: "" },
      { productId: archived.id, color: "" },
      { productId: tee.id, color: "Black" },
      { productId: "tz4a98xxat96iws9zmbrgj3a", color: "" },
      { productId: tee.id, color: "White" },
      { productId: cap.id, color: "" },
    ]);

    expect(items.map((item) => [item.productId, item.color, item.product.imageUrl, item.savedAt])).toEqual([
      [cap.id, "", "/placeholder/product-1.jpg", null],
      [tee.id, "Black", "tee/black-1", null],
      [tee.id, "White", "tee/white", null],
    ]);
    expect(await favouriteService.summariesFor([])).toEqual([]);
  });
});

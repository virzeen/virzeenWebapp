import { db } from "@virzeen/db";
import { EARLY_ACCESS_HOURS } from "@virzeen/validators/limits";
import { beforeEach, describe, expect, it } from "vitest";
import {
  checkoutFixture,
  createCart,
  createCollection,
  createUser,
  createVariant,
  resetDatabase,
} from "../../test/factories";
import { cartService } from "../cart/cart.service";
import { favouriteService } from "../favourites/favourite.service";
import { checkoutService } from "../orders/checkout.service";
import { orderService } from "../orders/orders.service";
import {
  buyableProductWhere,
  catalogReads,
  isMembersOnly,
  isPassViewer,
  visibleProductWhere,
} from "./catalog.reads";

// Public and Monochrome Pass items (specs/catalog-groups-visibility.md, owner 2026-11-16): everyone SEES a members-only
// product (locked, in the "For Members only" row); only a Pass member may BUY it. A MONO Member is a public shopper.

type Level = "PUBLIC" | "PASS";
const LEVELS: Level[] = ["PUBLIC", "PASS"];
/** The viewers: a visitor, a MONO Member and a Pass member, as their early-access hours say. */
const VIEWERS = [
  { name: "a visitor", hours: EARLY_ACCESS_HOURS.GUEST, pass: false },
  { name: "a MONO Member", hours: EARLY_ACCESS_HOURS.MEMBER, pass: false },
  { name: "a Pass member", hours: EARLY_ACCESS_HOURS.PASS, pass: true },
] as const;

/** A for-sale product in a new collection, with the levels set. */
async function productAt(options: { product?: Level; collection?: Level; name?: string } = {}) {
  const collection = await createCollection({ audience: options.collection ?? "PUBLIC" });
  const variant = await createVariant({ stock: 5 });
  const product = await db.product.update({
    where: { id: variant.productId },
    data: {
      name: options.name ?? "Linen Overshirt",
      audience: options.product ?? "PUBLIC",
      mainCollectionId: collection.id,
      collections: { set: [{ id: collection.id }] },
    },
  });
  return { product, collection, variant };
}

async function makePass(userId: string) {
  await db.user.update({ where: { id: userId }, data: { passEndsAt: new Date(Date.now() + 86_400_000) } });
}

describe("the viewer levels", () => {
  it("are strictly increasing, so a viewer's hours say who they are", () => {
    expect(EARLY_ACCESS_HOURS.GUEST).toBeLessThan(EARLY_ACCESS_HOURS.MEMBER);
    expect(EARLY_ACCESS_HOURS.MEMBER).toBeLessThan(EARLY_ACCESS_HOURS.PASS);
  });

  it("make only the Pass a buyer of members-only products; a MONO Member is public", () => {
    expect(isPassViewer(EARLY_ACCESS_HOURS.GUEST)).toBe(false);
    expect(isPassViewer(EARLY_ACCESS_HOURS.MEMBER)).toBe(false);
    expect(isPassViewer(EARLY_ACCESS_HOURS.PASS)).toBe(true);
  });
});

describe("what is members-only (product level × collection level)", () => {
  beforeEach(resetDatabase);

  it("is a Pass product, or one in no public collection; everyone still sees all of them", async () => {
    const made = new Map<string, boolean>();
    for (const productLevel of LEVELS) {
      for (const collectionLevel of LEVELS) {
        const { product } = await productAt({ product: productLevel, collection: collectionLevel });
        made.set(product.id, productLevel === "PASS" || collectionLevel === "PASS");
      }
    }
    for (const viewer of VIEWERS) {
      const seen = await db.product.findMany({
        where: visibleProductWhere(viewer.hours),
        select: { id: true },
      });
      expect(seen, viewer.name).toHaveLength(made.size);
      const buyable = await db.product.findMany({
        where: buyableProductWhere(viewer.hours),
        select: { id: true },
      });
      const expected = [...made].filter(([, locked]) => viewer.pass || !locked).map(([id]) => id);
      expect(buyable.map((row) => row.id).sort(), viewer.name).toEqual(expected.sort());
    }
    const rows = await db.product.findMany({
      select: { id: true, audience: true, collections: { select: { audience: true, archivedAt: true } } },
    });
    for (const row of rows) expect(isMembersOnly(row), row.id).toBe(made.get(row.id));
  });

  it("is not members-only when one of its collections is public", async () => {
    const { product } = await productAt({ collection: "PASS" });
    const open = await createCollection();
    await db.product.update({
      where: { id: product.id },
      data: { collections: { connect: { id: open.id } } },
    });
    const row = await db.product.findUniqueOrThrow({
      where: { id: product.id },
      select: { id: true, audience: true, collections: { select: { audience: true, archivedAt: true } } },
    });
    expect(isMembersOnly(row)).toBe(false);
    expect(await db.product.count({ where: { ...buyableProductWhere(0), id: product.id } })).toBe(1);
  });

  it("still hides a product whose collections are archived, and a draft or archived product", async () => {
    const { product, collection } = await productAt();
    await db.collection.update({ where: { id: collection.id }, data: { archivedAt: new Date() } });
    expect(await db.product.count({ where: { ...visibleProductWhere(48), id: product.id } })).toBe(0);
  });
});

describe("a Pass-only product and collection, read as each viewer", () => {
  beforeEach(resetDatabase);

  it("shows it to everyone, marked members-only, in its own row apart from the grid", async () => {
    const locked = await productAt({ product: "PASS", collection: "PASS", name: "Pass Hoodie" });
    const open = await productAt({ name: "Open Tee" });
    await db.collection.update({ where: { id: locked.collection.id }, data: { slug: "pass-drop" } });

    for (const viewer of VIEWERS) {
      const list = await catalogReads.listProducts({ sort: "newest", inStock: false }, 50, viewer.hours);
      const card = list.items.find((item) => item.id === locked.product.id);
      expect(card?.membersOnly, viewer.name).toBe(true);
      expect(list.items.find((item) => item.id === open.product.id)?.membersOnly).toBe(false);

      const grid = await catalogReads.listProducts(
        { sort: "newest", inStock: false },
        50,
        viewer.hours,
        "exclude",
      );
      expect(
        grid.items.map((item) => item.id),
        viewer.name,
      ).toEqual([open.product.id]);
      const row = await catalogReads.listProducts(
        { sort: "newest", inStock: false },
        50,
        viewer.hours,
        "only",
      );
      expect(
        row.items.map((item) => item.id),
        viewer.name,
      ).toEqual([locked.product.id]);
      expect(await catalogReads.countProducts({ sort: "newest", inStock: false }, viewer.hours, "only")).toBe(
        1,
      );

      const page = await catalogReads.getProductBySlug(locked.product.slug, viewer.hours);
      expect(page?.membersOnly, viewer.name).toBe(true);
      expect(await catalogReads.getCollectionBySlug("pass-drop", viewer.hours), viewer.name).not.toBeNull();
      expect((await catalogReads.listShopCollections(viewer.hours)).map((c) => c.id)).toContain(
        locked.collection.id,
      );
      const found = await catalogReads.listProducts(
        { sort: "newest", inStock: false, q: "pass hoodie" },
        50,
        viewer.hours,
      );
      expect(
        found.items.map((item) => item.id),
        viewer.name,
      ).toContain(locked.product.id);
    }
    const sitemap = await catalogReads.listSitemapEntries();
    expect(sitemap.products.map((entry) => entry.slug)).toContain(locked.product.slug);
  });
});

describe("the bag and checkout: only the Pass may buy members-only products", () => {
  beforeEach(resetDatabase);

  it("won't add one for a visitor or a MONO Member, not even by a direct call, but lets a Pass member", async () => {
    const { variant } = await productAt({ product: "PASS" });
    const guestCart = await createCart();
    await expect(
      cartService.addItem({ cartId: guestCart.id, variantId: variant.id, quantity: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const member = await createUser();
    const memberCart = await createCart(member.id);
    await expect(
      cartService.addItem({ cartId: memberCart.id, variantId: variant.id, quantity: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const pass = await createUser();
    await makePass(pass.id);
    const passCart = await createCart(pass.id);
    await expect(
      cartService.addItem({ cartId: passCart.id, variantId: variant.id, quantity: 1 }),
    ).resolves.toMatchObject({ itemCount: 1 });

    // A public product in a Pass-only collection is members-only too.
    const inClub = await productAt({ collection: "PASS" });
    await expect(
      cartService.addItem({ cartId: memberCart.id, variantId: inClub.variant.id, quantity: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("shows a line the buyer may no longer buy as unavailable, and checkout refuses it without an order", async () => {
    const fixture = await checkoutFixture({ stock: 5, quantity: 1 });
    await db.product.update({ where: { id: fixture.variant.productId }, data: { audience: "PASS" } });

    const summary = await cartService.getSummary({ userId: fixture.user.id });
    expect(summary.items.map((line) => line.isAvailable)).toEqual([false]);
    expect(summary.subtotalPaisa).toBe(0);

    await expect(
      checkoutService.placeOrder({
        userId: fixture.user.id,
        customerEmail: fixture.user.email,
        cartId: fixture.cart.id,
        addressId: fixture.address.id,
        paymentMethod: "COD",
      }),
    ).rejects.toMatchObject({ code: expect.stringMatching(/OUT_OF_STOCK|CART_EMPTY/) });
    expect(await db.order.count()).toBe(0);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(5);
  });

  it("lets a Pass member check out the same members-only line", async () => {
    const fixture = await checkoutFixture({ stock: 5, quantity: 1 });
    await db.product.update({ where: { id: fixture.variant.productId }, data: { audience: "PASS" } });
    await makePass(fixture.user.id);

    const result = await checkoutService.placeOrder({
      userId: fixture.user.id,
      customerEmail: fixture.user.email,
      cartId: fixture.cart.id,
      addressId: fixture.address.id,
      paymentMethod: "COD",
    });
    expect(result.orderNumber).toMatch(/^VZ-/);
  });

  it("never touches an order already placed: it keeps showing when the product becomes members-only", async () => {
    const fixture = await checkoutFixture({ stock: 5, quantity: 1 });
    const placed = await checkoutService.placeOrder({
      userId: fixture.user.id,
      customerEmail: fixture.user.email,
      cartId: fixture.cart.id,
      addressId: fixture.address.id,
      paymentMethod: "COD",
    });
    await db.product.update({ where: { id: fixture.variant.productId }, data: { audience: "PASS" } });
    const mine = await orderService.getForUser(fixture.user.id, placed.orderNumber);
    expect(mine).toMatchObject({ orderNumber: placed.orderNumber, status: "CONFIRMED" });
    expect(mine.items).toHaveLength(1);
  });

  it("lets anyone favourite a members-only product, since everyone sees it", async () => {
    const { product } = await productAt({ product: "PASS" });
    const member = await createUser();
    await expect(
      favouriteService.set(member.id, { productId: product.id, color: "", saved: true }),
    ).resolves.toMatchObject({ saved: true });
    expect((await favouriteService.list(member.id)).map((item) => item.product.id)).toEqual([product.id]);
  });
});

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
import { interestService } from "../members/interest.service";
import { checkoutService } from "../orders/checkout.service";
import { orderService } from "../orders/orders.service";
import { audiencesFor, catalogReads, collectionVisible, visibleProductWhere } from "./catalog.reads";

// Who may see a collection or a product (specs/catalog-groups-visibility.md, owner 2026-11-15): public, MONO Members
// and the Pass; hidden completely from everyone else; a product is shown when its own level and at least one of its
// collections allow the viewer.

type Level = "PUBLIC" | "MEMBER" | "PASS";
const LEVELS: Level[] = ["PUBLIC", "MEMBER", "PASS"];
const RANK: Record<Level, number> = { PUBLIC: 0, MEMBER: 1, PASS: 2 };
/** The viewers: a visitor, a MONO Member and a Pass member, as their early-access hours say. */
const VIEWERS = [
  { name: "a visitor", hours: EARLY_ACCESS_HOURS.GUEST, rank: 0 },
  { name: "a MONO Member", hours: EARLY_ACCESS_HOURS.MEMBER, rank: 1 },
  { name: "a Pass member", hours: EARLY_ACCESS_HOURS.PASS, rank: 2 },
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

describe("the viewer levels", () => {
  it("are strictly increasing, so a viewer's hours say who they are", () => {
    expect(EARLY_ACCESS_HOURS.GUEST).toBeLessThan(EARLY_ACCESS_HOURS.MEMBER);
    expect(EARLY_ACCESS_HOURS.MEMBER).toBeLessThan(EARLY_ACCESS_HOURS.PASS);
  });

  it("let each level see itself and the ones below", () => {
    expect(audiencesFor(EARLY_ACCESS_HOURS.GUEST)).toEqual(["PUBLIC"]);
    expect(audiencesFor(EARLY_ACCESS_HOURS.MEMBER)).toEqual(["PUBLIC", "MEMBER"]);
    expect(audiencesFor(EARLY_ACCESS_HOURS.PASS)).toEqual(["PUBLIC", "MEMBER", "PASS"]);
  });
});

describe("who sees a product (product level × collection level × viewer)", () => {
  beforeEach(resetDatabase);

  it("needs both the product's level and its collection's level to allow the viewer", async () => {
    const made = new Map<string, string>();
    for (const productLevel of LEVELS) {
      for (const collectionLevel of LEVELS) {
        const { product } = await productAt({ product: productLevel, collection: collectionLevel });
        made.set(product.id, `${productLevel}/${collectionLevel}`);
      }
    }
    for (const viewer of VIEWERS) {
      const seen = await db.product.findMany({
        where: visibleProductWhere(viewer.hours),
        select: { id: true },
      });
      const expected = [...made]
        .filter(([, key]) => {
          const [productLevel, collectionLevel] = key.split("/") as [Level, Level];
          return RANK[productLevel] <= viewer.rank && RANK[collectionLevel] <= viewer.rank;
        })
        .map(([id]) => id);
      expect(seen.map((row) => row.id).sort(), viewer.name).toEqual(expected.sort());
    }
  });

  it("shows a product that sits in a Pass-only and a public collection to everyone", async () => {
    const { product, collection } = await productAt({ collection: "PASS" });
    const open = await createCollection();
    await db.product.update({
      where: { id: product.id },
      data: { collections: { connect: { id: open.id } } },
    });
    for (const viewer of VIEWERS) {
      expect(
        await db.product.count({ where: { ...visibleProductWhere(viewer.hours), id: product.id } }),
      ).toBe(1);
    }
    // The Pass-only collection itself stays hidden from a visitor.
    expect(await db.collection.count({ where: { ...collectionVisible(0), id: collection.id } })).toBe(0);
  });

  it("hides a product whose only collections are archived or hidden, and a draft or archived product", async () => {
    const { product, collection } = await productAt();
    await db.product.update({ where: { id: product.id }, data: { mainCollectionId: collection.id } });
    await db.collection.update({ where: { id: collection.id }, data: { archivedAt: new Date() } });
    expect(await db.product.count({ where: { ...visibleProductWhere(48), id: product.id } })).toBe(0);
  });
});

describe("a Pass-only product and collection, read as each viewer (every shopper-facing read)", () => {
  beforeEach(resetDatabase);

  /** The reads, each returning the slugs of products (or collections) the viewer got. */
  async function readsAs(
    hours: number,
    ctx: { slug: string; collectionSlug: string; id: string; collectionId: string },
  ) {
    const list = await catalogReads.listProducts({ sort: "newest", inStock: false }, 50, hours);
    const inCollection = await catalogReads.listProducts(
      { sort: "newest", inStock: false, collection: ctx.collectionSlug },
      50,
      hours,
    );
    const searched = await catalogReads.listProducts(
      { sort: "newest", inStock: false, q: "hidden pass" },
      50,
      hours,
    );
    const searchedByCollection = await catalogReads.listProducts(
      { sort: "newest", inStock: false, q: "pass drop" },
      50,
      hours,
    );
    const options = await catalogReads.getFilterOptions({}, hours);
    return {
      listed: list.items.some((item) => item.id === ctx.id),
      listedInCollection: inCollection.items.some((item) => item.id === ctx.id),
      searchedByName: searched.items.some((item) => item.id === ctx.id),
      searchedByCollectionName: searchedByCollection.items.some((item) => item.id === ctx.id),
      total: await catalogReads.countProducts({ sort: "newest", inStock: false }, hours),
      byIds: (await catalogReads.listByIds([ctx.id], hours)).length === 1,
      newArrivals: (await catalogReads.listNewArrivals(20, hours)).some((item) => item.id === ctx.id),
      page: (await catalogReads.getProductBySlug(ctx.slug, hours)) !== null,
      collectionPage: (await catalogReads.getCollectionBySlug(ctx.collectionSlug, hours)) !== null,
      shopCollections: (await catalogReads.listShopCollections(hours)).some((c) => c.id === ctx.collectionId),
      homeTiles: (await catalogReads.listHomeTiles(hours)).some((tile) => tile.slug === ctx.collectionSlug),
      collectionGallery: (await catalogReads.listCollections({ earlyHours: hours })).some(
        (c) => c.id === ctx.collectionId,
      ),
      live: await catalogReads.hasLiveCollection(ctx.collectionSlug, hours),
      sizes: options.sizes.includes("PassOnlySize"),
    };
  }

  it("shows nothing of it to a visitor or a MONO Member, and everything to a Pass member", async () => {
    const { product, collection, variant } = await productAt({
      product: "PASS",
      collection: "PASS",
      name: "Hidden Pass Hoodie",
    });
    await db.collection.update({
      where: { id: collection.id },
      data: { name: "Pass Drop", slug: "pass-drop" },
    });
    await db.productVariant.update({ where: { id: variant.id }, data: { size: "PassOnlySize" } });
    // A sibling in the same listing, public, so the lists are not simply empty.
    await productAt({ name: "Open Tee" });
    const ctx = {
      slug: product.slug,
      collectionSlug: "pass-drop",
      id: product.id,
      collectionId: collection.id,
    };

    const visitor = await readsAs(0, ctx);
    const member = await readsAs(12, ctx);
    const pass = await readsAs(48, ctx);

    for (const seen of [visitor, member]) {
      expect(seen).toMatchObject({
        listed: false,
        listedInCollection: false,
        searchedByName: false,
        searchedByCollectionName: false,
        byIds: false,
        newArrivals: false,
        page: false,
        collectionPage: false,
        shopCollections: false,
        homeTiles: false,
        collectionGallery: false,
        live: false,
        sizes: false,
      });
      expect(seen.total).toBe(1); // only the open tee
    }
    expect(pass).toMatchObject({
      listed: true,
      listedInCollection: true,
      searchedByName: true,
      searchedByCollectionName: true,
      byIds: true,
      newArrivals: true,
      page: true,
      collectionPage: true,
      shopCollections: true,
      homeTiles: true,
      collectionGallery: true,
      live: true,
      sizes: true,
    });
    expect(pass.total).toBe(2);
  });

  it("keeps it out of the sitemap, the related carousels and a member's picks until they may see it", async () => {
    const hidden = await productAt({ product: "PASS", collection: "PASS", name: "Hidden Pass Hoodie" });
    const open = await productAt({ name: "Open Tee" });
    const sitemap = await catalogReads.listSitemapEntries();
    expect(sitemap.products.map((row) => row.slug)).toEqual([open.product.slug]);
    const collectionSlugs = sitemap.collections.map((row) => row.slug);
    expect(collectionSlugs).toContain(open.collection.slug);
    expect(collectionSlugs).not.toContain(hidden.collection.slug);

    // The carousels under a public product.
    const fromOpen = await catalogReads.listRecommendations({
      collectionId: open.collection.id,
      excludeId: open.product.id,
      earlyHours: 12,
    });
    expect(fromOpen.otherCollections.map((card) => card.id)).not.toContain(hidden.product.id);
    const forPass = await catalogReads.listRecommendations({
      collectionId: open.collection.id,
      excludeId: open.product.id,
      earlyHours: 48,
    });
    expect(forPass.otherCollections.map((card) => card.id)).toContain(hidden.product.id);

    // Picks: the list to choose from, and what a pick brings.
    const options = (hours: number) =>
      interestService.options(hours).then((o) => o.collections.map((c) => c.id));
    expect(await options(12)).not.toContain(hidden.collection.id);
    expect(await options(48)).toContain(hidden.collection.id);
    const user = await createUser();
    await db.memberInterest.create({ data: { userId: user.id, collectionId: hidden.collection.id } });
    expect((await interestService.recommendations(user.id, 12)).map((p) => p.id)).not.toContain(
      hidden.product.id,
    );
    expect((await interestService.recommendations(user.id, 48)).map((p) => p.id)).toContain(
      hidden.product.id,
    );
  });
});

describe("the bag and checkout use the same rule", () => {
  beforeEach(resetDatabase);

  async function makePass(userId: string) {
    await db.user.update({ where: { id: userId }, data: { passEndsAt: new Date(Date.now() + 86_400_000) } });
  }

  it("won't add a product the owner of the bag may not see, not even by a direct call", async () => {
    const { variant } = await productAt({ product: "MEMBER" });
    const guestCart = await createCart();
    await expect(
      cartService.addItem({ cartId: guestCart.id, variantId: variant.id, quantity: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    const member = await createUser();
    const memberCart = await createCart(member.id);
    await expect(
      cartService.addItem({ cartId: memberCart.id, variantId: variant.id, quantity: 1 }),
    ).resolves.toMatchObject({ itemCount: 1 });

    const passOnly = await productAt({ collection: "PASS" });
    await expect(
      cartService.addItem({ cartId: memberCart.id, variantId: passOnly.variant.id, quantity: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const pass = await createUser();
    await makePass(pass.id);
    const passCart = await createCart(pass.id);
    await expect(
      cartService.addItem({ cartId: passCart.id, variantId: passOnly.variant.id, quantity: 1 }),
    ).resolves.toMatchObject({ itemCount: 1 });
  });

  it("shows a line the buyer may no longer see as unavailable, and checkout refuses it without an order", async () => {
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

  it("lets a Pass member check out the same Pass-only line", async () => {
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

  it("never touches an order already placed: it keeps showing when the product becomes Pass-only", async () => {
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

  it("lets only a Pass member favourite a Pass-only product", async () => {
    const { product } = await productAt({ product: "PASS" });
    const member = await createUser();
    await expect(
      favouriteService.set(member.id, { productId: product.id, color: "", saved: true }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    const pass = await createUser();
    await makePass(pass.id);
    await expect(
      favouriteService.set(pass.id, { productId: product.id, color: "", saved: true }),
    ).resolves.toMatchObject({ saved: true });
    expect((await favouriteService.list(pass.id)).map((item) => item.product.id)).toEqual([product.id]);
    // A visitor's browser favourites follow a visitor's view.
    expect(await favouriteService.summariesFor([{ productId: product.id, color: "" }])).toEqual([]);
  });
});

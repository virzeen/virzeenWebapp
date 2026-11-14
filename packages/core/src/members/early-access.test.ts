import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { createCart, createUser, createVariant, resetDatabase } from "../../test/factories";
import { cartService } from "../cart/cart.service";
import { catalogReads } from "../catalog/catalog.reads";
import { catalogService } from "../catalog/catalog.service";

// Early access (docs/specs/member-perks.md): a product with a public time in the future is hidden, except for members
// inside their window (MONO Member 12 hours, Pass 48 hours).

const HOUR = 3_600_000;

async function productPublicIn(hours: number) {
  const variant = await createVariant({ stock: 5, pricePaisa: 100_000 });
  const product = await db.product.update({
    where: { id: variant.productId },
    data: { publicAt: new Date(Date.now() + hours * HOUR) },
    select: { id: true, slug: true },
  });
  return { ...product, variant };
}

describe("early access in the shop", () => {
  beforeEach(resetDatabase);

  it("hides a product from the public until its public time, and shows it to a member inside their window", async () => {
    const { slug } = await productPublicIn(6);
    expect(await catalogReads.getProductBySlug(slug)).toBeNull();
    expect(await catalogReads.getProductBySlug(slug, 12)).not.toBeNull();
    expect((await catalogReads.listProducts({ sort: "newest", inStock: false })).items).toHaveLength(0);
    expect((await catalogReads.listProducts({ sort: "newest", inStock: false }, 12, 12)).items).toHaveLength(
      1,
    );
    expect(await catalogReads.countProducts({ sort: "newest", inStock: false })).toBe(0);
    expect(await catalogReads.countProducts({ sort: "newest", inStock: false }, 12)).toBe(1);
  });

  it("gives the Pass 48 hours and a MONO Member 12", async () => {
    const { slug } = await productPublicIn(30);
    expect(await catalogReads.getProductBySlug(slug, 12)).toBeNull();
    expect(await catalogReads.getProductBySlug(slug, 48)).not.toBeNull();
  });

  it("shows everyone a product whose public time has come, and one with none", async () => {
    const past = await productPublicIn(-1);
    const none = await createVariant({ stock: 5, pricePaisa: 100_000 });
    expect(await catalogReads.getProductBySlug(past.slug)).not.toBeNull();
    const page = await catalogReads.listProducts({ sort: "newest", inStock: false });
    expect(page.items.map((item) => item.id)).toContain(none.productId);
  });

  it("keeps a search from showing an early product", async () => {
    const { slug } = await productPublicIn(6);
    const product = await db.product.findUniqueOrThrow({ where: { slug }, select: { name: true } });
    const found = await catalogReads.listProducts({ q: product.name, sort: "newest", inStock: false });
    expect(found.items).toHaveLength(0);
  });
});

describe("early access for a collection", () => {
  beforeEach(resetDatabase);

  it("hides a collection until its public time, except for a member inside their window", async () => {
    const variant = await createVariant({ stock: 5, pricePaisa: 100_000 });
    const collection = await db.collection.create({
      data: {
        slug: "festival",
        name: "Festival",
        publicAt: new Date(Date.now() + 6 * HOUR),
        products: { connect: { id: variant.productId } },
      },
    });
    expect(await catalogReads.getCollectionBySlug(collection.slug)).toBeNull();
    expect(await catalogReads.getCollectionBySlug(collection.slug, 12)).not.toBeNull();
    expect(await catalogReads.hasLiveCollection(collection.slug)).toBe(false);
    expect(await catalogReads.hasLiveCollection(collection.slug, 12)).toBe(true);
    expect(await catalogReads.listCollections()).toHaveLength(0);
    expect(await catalogReads.listCollections({ earlyHours: 12 })).toHaveLength(1);
    // Past its time it is for everyone.
    await db.collection.update({
      where: { id: collection.id },
      data: { publicAt: new Date(Date.now() - HOUR) },
    });
    expect(await catalogReads.getCollectionBySlug(collection.slug)).not.toBeNull();
  });
});

describe("early access in the bag", () => {
  beforeEach(resetDatabase);

  async function cartFor(passEndsAt: Date | null) {
    const user = await createUser();
    if (passEndsAt) await db.user.update({ where: { id: user.id }, data: { passEndsAt } });
    return createCart(user.id);
  }

  it("lets a MONO Member add a product 6 hours before it opens, but not one 30 hours before", async () => {
    const soon = await productPublicIn(6);
    const later = await productPublicIn(30);
    const cart = await cartFor(null);
    await expect(
      cartService.addItem({ cartId: cart.id, variantId: soon.variant.id, quantity: 1 }),
    ).resolves.toBeDefined();
    await expect(
      cartService.addItem({ cartId: cart.id, variantId: later.variant.id, quantity: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lets the Pass add one 30 hours before it opens", async () => {
    const later = await productPublicIn(30);
    const cart = await cartFor(new Date(Date.now() + 30 * 24 * HOUR));
    await expect(
      cartService.addItem({ cartId: cart.id, variantId: later.variant.id, quantity: 1 }),
    ).resolves.toBeDefined();
  });

  it("refuses a guest's bag before the public time", async () => {
    const soon = await productPublicIn(6);
    const { cartId } = await cartService.ensureCart({ guest: true });
    await expect(
      cartService.addItem({ cartId, variantId: soon.variant.id, quantity: 1 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("setting the public time", () => {
  beforeEach(resetDatabase);

  it("saves and clears it, and audits the change", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { id } = await productPublicIn(-1);
    const when = new Date(Date.now() + 5 * HOUR);
    await catalogService.setPublicAt(admin.id, id, when);
    expect((await db.product.findUniqueOrThrow({ where: { id } })).publicAt?.getTime()).toBe(when.getTime());
    await catalogService.setPublicAt(admin.id, id, null);
    expect((await db.product.findUniqueOrThrow({ where: { id } })).publicAt).toBeNull();
    expect(await db.auditLog.count({ where: { action: "product.public-at", entityId: id } })).toBe(2);
    await expect(catalogService.setPublicAt(admin.id, "missing", null)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

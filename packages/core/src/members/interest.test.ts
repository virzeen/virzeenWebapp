import { db } from "@virzeen/db";
import { MAX_INTERESTS } from "@virzeen/validators";
import { beforeEach, describe, expect, it } from "vitest";
import { createCollection, createUser, createVariant, resetDatabase } from "../../test/factories";
import { interestService } from "./interest.service";

// Picks and "Find your next favourite" (docs/specs/member-area-nike-layout.md).

async function productIn(collectionId: string, options: { publicAt?: Date; name?: string } = {}) {
  const variant = await createVariant();
  await db.product.update({
    where: { id: variant.productId },
    data: {
      mainCollectionId: collectionId,
      collections: { set: [{ id: collectionId }] },
      name: options.name ?? "Item",
      publicAt: options.publicAt ?? null,
    },
  });
  return variant.productId;
}

describe("saving picks", () => {
  beforeEach(resetDatabase);

  it("replaces the member's set and leaves other members alone", async () => {
    const [me, other] = [await createUser(), await createUser()];
    const [shirts, trousers] = [await createCollection(), await createCollection()];
    const festival = await db.collection.create({ data: { slug: "festival", name: "Festival" } });
    await interestService.save(other.id, { collectionIds: [shirts.id] });
    await interestService.save(me.id, { collectionIds: [shirts.id, festival.id] });
    expect((await interestService.list(me.id)).collections.map((row) => row.id)).toEqual([
      shirts.id,
      festival.id,
    ]);

    await interestService.save(me.id, { collectionIds: [trousers.id] });
    const mine = await interestService.list(me.id);
    expect(mine.collections.map((row) => row.id)).toEqual([trousers.id]);
    expect((await interestService.list(other.id)).collections.map((row) => row.id)).toEqual([shirts.id]);
  });

  it("refuses an unknown or archived collection, and too many picks", async () => {
    const me = await createUser();
    const archived = await db.collection.create({
      data: { slug: "old", name: "Old", archivedAt: new Date() },
    });
    await expect(interestService.save(me.id, { collectionIds: ["nope"] })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    await expect(interestService.save(me.id, { collectionIds: [archived.id] })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    const many = await Promise.all(Array.from({ length: MAX_INTERESTS + 1 }, () => createCollection()));
    await expect(
      interestService.save(me.id, { collectionIds: many.map((row) => row.id) }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect((await interestService.list(me.id)).collections).toEqual([]);
  });

  it("clears them when an empty set is saved", async () => {
    const me = await createUser();
    const shirts = await createCollection();
    await interestService.save(me.id, { collectionIds: [shirts.id] });
    await interestService.save(me.id, { collectionIds: [] });
    expect(await db.memberInterest.count({ where: { userId: me.id } })).toBe(0);
  });
});

describe("find your next favourite", () => {
  beforeEach(resetDatabase);

  it("shows products in the member's interests and none already favourited", async () => {
    const me = await createUser();
    const [shirts, trousers] = [await createCollection(), await createCollection()];
    const shirtId = await productIn(shirts.id, { name: "Shirt" });
    const savedShirtId = await productIn(shirts.id, { name: "Saved shirt" });
    await productIn(trousers.id, { name: "Trousers" });
    await db.favourite.create({ data: { userId: me.id, productId: savedShirtId, color: "" } });
    await interestService.save(me.id, { collectionIds: [shirts.id] });
    const found = await interestService.recommendations(me.id);
    expect(found.map((product) => product.id)).toEqual([shirtId]);
  });

  it("includes products in a chosen collection", async () => {
    const me = await createUser();
    const category = await createCollection();
    const inCollection = await productIn(category.id, { name: "Festival kurta" });
    await productIn(category.id, { name: "Other" });
    const festival = await db.collection.create({
      data: { slug: "festival", name: "Festival", products: { connect: { id: inCollection } } },
    });
    await interestService.save(me.id, { collectionIds: [festival.id] });
    expect((await interestService.recommendations(me.id)).map((product) => product.id)).toEqual([
      inCollection,
    ]);
  });

  it("falls back to the newest live products with no interests", async () => {
    const me = await createUser();
    const category = await createCollection();
    const first = await productIn(category.id);
    expect((await interestService.recommendations(me.id)).map((product) => product.id)).toEqual([first]);
  });

  it("never shows a hidden draft or an early-access drop before the viewer's time", async () => {
    const me = await createUser();
    const category = await createCollection();
    const live = await productIn(category.id, { name: "Live" });
    const drop = await productIn(category.id, {
      name: "Drop",
      publicAt: new Date(Date.now() + 6 * 3_600_000),
    });
    const draft = await productIn(category.id, { name: "Draft" });
    await db.product.update({ where: { id: draft }, data: { isPublished: false } });
    await interestService.save(me.id, { collectionIds: [category.id] });

    const publicView = (await interestService.recommendations(me.id, 0)).map((product) => product.id);
    expect(publicView).toEqual([live]);
    // A MONO Member (12 hours early) sees the drop; the draft stays hidden for everyone.
    const memberView = (await interestService.recommendations(me.id, 12)).map((product) => product.id);
    expect(memberView.sort()).toEqual([live, drop].sort());
  });
});

describe("the list of picks to choose from", () => {
  beforeEach(resetDatabase);

  it("shows a collection's photo from a live product, never a draft or an early drop", async () => {
    const category = await createCollection();
    const empty = await createCollection();
    const live = await productIn(category.id, { name: "Live" });
    const draft = await productIn(category.id, { name: "Draft" });
    await db.product.update({ where: { id: draft }, data: { isPublished: false, publishedAt: new Date() } });
    const drop = await productIn(category.id, { publicAt: new Date(Date.now() + 6 * 3_600_000) });
    await db.productImage.deleteMany({ where: { productId: { in: [live, draft, drop] } } });
    await db.productImage.create({ data: { productId: live, url: "live.jpg", alt: "Live shirt" } });
    await db.productImage.create({ data: { productId: draft, url: "draft.jpg", alt: "Draft" } });
    await db.productImage.create({ data: { productId: drop, url: "drop.jpg", alt: "Drop" } });

    const photoOf = async (hours: number, id: string) =>
      (await interestService.options(hours)).collections.find((row) => row.id === id)?.imageUrl;
    expect(await photoOf(0, category.id)).toBe("live.jpg");
    expect(await photoOf(0, empty.id)).toBeNull();
    // The drop is the newest product, so a MONO Member's list may use its photo; the draft is never used.
    expect(["live.jpg", "drop.jpg"]).toContain(await photoOf(12, category.id));
  });
});

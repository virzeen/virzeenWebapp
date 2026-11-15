import "server-only";
import { db } from "@virzeen/db";
import { MAX_INTERESTS, type InterestsInput } from "@virzeen/validators";
import {
  collectionVisible,
  summarySelect,
  toSummary,
  visibleProductWhere,
  type ProductSummary,
} from "../catalog/catalog.reads";
import { AppError } from "../errors";

// Picks (docs/specs/member-area-nike-layout.md): the collections a member likes (categories and collections are one
// thing: specs/catalog-groups-visibility.md). They choose the products in "Find your next favourite" on the profile.

export type InterestChoice = { id: string; slug: string; name: string };
export type MemberInterests = { collections: InterestChoice[] };
/** A choice in the "Choose your picks" list: the name and a photo (the newest visible product's first), if it has one. */
export type PickOption = InterestChoice & { imageUrl: string | null; imageAlt: string };
export type PickOptions = { collections: PickOption[] };

export const RECOMMENDATIONS_SHOWN = 12;

export const interestService = {
  /** The member's saved picks (a collection archived since is left out). */
  async list(userId: string): Promise<MemberInterests> {
    const rows = await db.memberInterest.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { collection: { select: { id: true, slug: true, name: true, archivedAt: true } } },
    });
    return {
      collections: rows.flatMap(({ collection }) =>
        !collection.archivedAt ? [{ id: collection.id, slug: collection.slug, name: collection.name }] : [],
      ),
    };
  },

  /**
   * What a member can choose from: the collections they may see (early access included), each with the first photo
   * of its newest product the member may see (so a hidden draft or an early drop never shows).
   */
  async options(earlyHours = 0): Promise<PickOptions> {
    const collections = await db.collection.findMany({
      where: { archivedAt: null, ...collectionVisible(earlyHours) },
      select: {
        id: true,
        slug: true,
        name: true,
        products: {
          where: visibleProductWhere(earlyHours),
          orderBy: [{ publishedAt: "desc" as const }, { id: "asc" as const }],
          take: 1,
          select: {
            images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" as const }, take: 1 },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return {
      collections: collections.map((row): PickOption => {
        const image = row.products[0]?.images[0];
        return {
          id: row.id,
          slug: row.slug,
          name: row.name,
          imageUrl: image?.url ?? null,
          imageAlt: image?.alt ?? "",
        };
      }),
    };
  },

  /** Replaces the member's picks with exactly these (at most MAX_INTERESTS in all, each one live). */
  async save(userId: string, input: InterestsInput): Promise<void> {
    const collectionIds = [...new Set(input.collectionIds)];
    if (collectionIds.length > MAX_INTERESTS) {
      throw new AppError("VALIDATION_FAILED", `Choose up to ${MAX_INTERESTS} picks.`);
    }
    await db.$transaction(async (tx) => {
      const live = await tx.collection.count({ where: { id: { in: collectionIds }, archivedAt: null } });
      if (live !== collectionIds.length) {
        throw new AppError(
          "VALIDATION_FAILED",
          "One of those is no longer available. Refresh and try again.",
        );
      }
      await tx.memberInterest.deleteMany({ where: { userId } });
      await tx.memberInterest.createMany({
        data: collectionIds.map((collectionId) => ({ userId, collectionId })),
      });
    });
  },

  /**
   * "Find your next favourite": live products in the member's picked collections that they have not saved as a
   * favourite, newest first. With no picks, or nothing left to show, the newest live products. Only products the
   * viewer may see (`earlyHours` brings in early-access drops for a member).
   */
  async recommendations(
    userId: string,
    earlyHours = 0,
    limit = RECOMMENDATIONS_SHOWN,
  ): Promise<ProductSummary[]> {
    const [interests, favourites] = await Promise.all([
      db.memberInterest.findMany({ where: { userId }, select: { collectionId: true } }),
      db.favourite.findMany({ where: { userId }, select: { productId: true } }),
    ]);
    const saved = [...new Set(favourites.map((favourite) => favourite.productId))];
    const collectionIds = interests.map((row) => row.collectionId);
    const base = {
      ...visibleProductWhere(earlyHours),
      variants: { some: { isActive: true } },
      ...(saved.length > 0 ? { id: { notIn: saved } } : {}),
    };
    const find = (where: typeof base & { collections?: unknown }) =>
      db.product.findMany({
        where: where as typeof base,
        select: summarySelect,
        orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
        take: limit,
      });
    if (collectionIds.length > 0) {
      const matched = await find({ ...base, collections: { some: { id: { in: collectionIds } } } });
      if (matched.length > 0) return matched.map(toSummary);
    }
    return (await find(base)).map(toSummary);
  },
};

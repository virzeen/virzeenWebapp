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

// Interests (docs/specs/member-area-nike-layout.md): the categories and collections a member likes. They choose the
// products in "Find your next favourite" on the profile.

export type InterestChoice = { id: string; slug: string; name: string };
export type MemberInterests = { categories: InterestChoice[]; collections: InterestChoice[] };
/** A choice in the "Choose your picks" list: the name and a photo (the newest visible product's first), if it has one. */
export type PickOption = InterestChoice & { imageUrl: string | null; imageAlt: string };
export type PickOptions = { categories: PickOption[]; collections: PickOption[] };

export const RECOMMENDATIONS_SHOWN = 12;

export const interestService = {
  /** The member's saved interests (a category or collection archived since is left out). */
  async list(userId: string): Promise<MemberInterests> {
    const rows = await db.memberInterest.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        category: { select: { id: true, slug: true, name: true, archivedAt: true } },
        collection: { select: { id: true, slug: true, name: true, archivedAt: true } },
      },
    });
    const pick = (
      row: { id: string; slug: string; name: string; archivedAt: Date | null } | null | undefined,
    ) => (row && !row.archivedAt ? [{ id: row.id, slug: row.slug, name: row.name }] : []);
    return {
      categories: rows.flatMap((row) => pick(row.category)),
      collections: rows.flatMap((row) => pick(row.collection)),
    };
  },

  /**
   * What a member can choose from: live categories, and the collections they may see (early access included), each with
   * the first photo of its newest product the member may see (so a hidden draft or an early drop never shows).
   */
  async options(earlyHours = 0): Promise<PickOptions> {
    const photo = {
      products: {
        where: visibleProductWhere(earlyHours),
        orderBy: [{ publishedAt: "desc" as const }, { id: "asc" as const }],
        take: 1,
        select: {
          images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" as const }, take: 1 },
        },
      },
    };
    const [categories, collections] = await Promise.all([
      db.category.findMany({
        where: { archivedAt: null },
        select: { id: true, slug: true, name: true, ...photo },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      db.collection.findMany({
        where: { archivedAt: null, ...collectionVisible(earlyHours) },
        select: { id: true, slug: true, name: true, ...photo },
        orderBy: { name: "asc" },
      }),
    ]);
    const shape = (row: (typeof categories)[number]): PickOption => {
      const image = row.products[0]?.images[0];
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        imageUrl: image?.url ?? null,
        imageAlt: image?.alt ?? "",
      };
    };
    return { categories: categories.map(shape), collections: collections.map(shape) };
  },

  /** Replaces the member's interests with exactly these (at most MAX_INTERESTS in all, each one live). */
  async save(userId: string, input: InterestsInput): Promise<void> {
    const categoryIds = [...new Set(input.categoryIds)];
    const collectionIds = [...new Set(input.collectionIds)];
    if (categoryIds.length + collectionIds.length > MAX_INTERESTS) {
      throw new AppError("VALIDATION_FAILED", `Choose up to ${MAX_INTERESTS} picks.`);
    }
    await db.$transaction(async (tx) => {
      const [categories, collections] = await Promise.all([
        tx.category.count({ where: { id: { in: categoryIds }, archivedAt: null } }),
        tx.collection.count({ where: { id: { in: collectionIds }, archivedAt: null } }),
      ]);
      if (categories !== categoryIds.length || collections !== collectionIds.length) {
        throw new AppError(
          "VALIDATION_FAILED",
          "One of those is no longer available. Refresh and try again.",
        );
      }
      await tx.memberInterest.deleteMany({ where: { userId } });
      await tx.memberInterest.createMany({
        data: [
          ...categoryIds.map((categoryId) => ({ userId, categoryId })),
          ...collectionIds.map((collectionId) => ({ userId, collectionId })),
        ],
      });
    });
  },

  /**
   * "Find your next favourite": live products in the member's categories and collections that they have not saved as
   * a favourite, newest first. With no interests, or nothing left to show, the newest live products. Only products
   * the viewer may see (`earlyHours` brings in early-access drops for a member).
   */
  async recommendations(
    userId: string,
    earlyHours = 0,
    limit = RECOMMENDATIONS_SHOWN,
  ): Promise<ProductSummary[]> {
    const [interests, favourites] = await Promise.all([
      db.memberInterest.findMany({ where: { userId }, select: { categoryId: true, collectionId: true } }),
      db.favourite.findMany({ where: { userId }, select: { productId: true } }),
    ]);
    const saved = [...new Set(favourites.map((favourite) => favourite.productId))];
    const categoryIds = interests.flatMap((row) => (row.categoryId ? [row.categoryId] : []));
    const collectionIds = interests.flatMap((row) => (row.collectionId ? [row.collectionId] : []));
    const base = {
      ...visibleProductWhere(earlyHours),
      variants: { some: { isActive: true } },
      ...(saved.length > 0 ? { id: { notIn: saved } } : {}),
    };
    const find = (where: typeof base & { AND?: unknown }) =>
      db.product.findMany({
        where: where as typeof base,
        select: summarySelect,
        orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
        take: limit,
      });
    if (categoryIds.length + collectionIds.length > 0) {
      const matched = await find({
        ...base,
        AND: [
          {
            OR: [
              ...(categoryIds.length > 0 ? [{ categoryId: { in: categoryIds } }] : []),
              ...(collectionIds.length > 0 ? [{ collections: { some: { id: { in: collectionIds } } } }] : []),
            ],
          },
        ],
      });
      if (matched.length > 0) return matched.map(toSummary);
    }
    return (await find(base)).map(toSummary);
  },
};

import "server-only";
import { db } from "@virzeen/db";
import type { AdminReviewFilters, ReviewData, ReviewVisibilityInput } from "@virzeen/validators";
import { recordAudit } from "../audit/audit";
import { AppError, isUniqueViolation } from "../errors";

// Product reviews (specs/reviews.md): only customers whose order with the product was delivered may write one.

/** How many reviews the product page lists (newest first). */
export const REVIEWS_SHOWN = 10;
/** Admin reviews list page size. */
export const ADMIN_REVIEWS_PAGE_SIZE = 25;

export type ReviewView = {
  id: string;
  rating: number;
  title: string;
  body: string;
  variantLabel: string;
  /** The reviewer's first name only (privacy), "Customer" without one. */
  authorName: string;
  createdAt: Date;
};

/** `average` is rounded to one decimal; null without visible reviews. */
export type ReviewSummary = { count: number; average: number | null };

export const firstName = (name: string | null) => name?.trim().split(/\s+/)[0] || "Customer";

const reviewSelect = {
  id: true,
  rating: true,
  title: true,
  body: true,
  variantLabel: true,
  createdAt: true,
  user: { select: { name: true } },
} as const;

/** The customer's latest delivered order line for the product, or null: what makes them able to review it. */
function deliveredLine(userId: string, productId: string) {
  return db.orderItem.findFirst({
    where: { variant: { productId }, order: { userId, status: "DELIVERED" } },
    orderBy: { order: { deliveredAt: { sort: "desc", nulls: "last" } } },
    select: { variantLabel: true },
  });
}

export const reviewService = {
  /** Count and average of the product's visible reviews. */
  async summary(productId: string): Promise<ReviewSummary> {
    const result = await db.review.aggregate({
      where: { productId, hiddenAt: null },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const average = result._avg.rating;
    return { count: result._count._all, average: average === null ? null : Math.round(average * 10) / 10 };
  },

  /** The product's visible reviews, newest first. */
  async listForProduct(productId: string, limit = REVIEWS_SHOWN): Promise<ReviewView[]> {
    const rows = await db.review.findMany({
      where: { productId, hiddenAt: null },
      select: reviewSelect,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: limit,
    });
    return rows.map(({ user, ...row }) => ({ ...row, authorName: firstName(user.name) }));
  },

  /** The review page: the product (published), whether this customer may review it, and their review if any. */
  async forCustomer(userId: string, productSlug: string) {
    const product = await db.product.findFirst({
      where: { slug: productSlug, isPublished: true, archivedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        images: { select: { url: true, alt: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });
    if (!product) return null;
    const [line, review] = await Promise.all([
      deliveredLine(userId, product.id),
      db.review.findUnique({
        where: { userId_productId: { userId, productId: product.id } },
        select: { rating: true, title: true, body: true, hiddenAt: true },
      }),
    ]);
    const { images, ...rest } = product;
    return {
      product: { ...rest, imageUrl: images[0]?.url ?? null, imageAlt: images[0]?.alt ?? product.name },
      canReview: line !== null,
      review: review && { rating: review.rating, title: review.title, body: review.body },
      isHidden: Boolean(review?.hiddenAt),
    };
  },

  /**
   * Saves the customer's review of a product delivered to them (one per product: a second save edits it). An edit
   * keeps an admin's hiding, so editing can't bring a hidden review back.
   */
  async save(userId: string, input: ReviewData): Promise<{ id: string; productSlug: string }> {
    const product = await db.product.findFirst({
      where: { id: input.productId, archivedAt: null },
      select: { id: true, slug: true },
    });
    if (!product) throw new AppError("NOT_FOUND", "We couldn't find that product.");
    const line = await deliveredLine(userId, product.id);
    if (!line) throw new AppError("FORBIDDEN", "You can review a product once it has been delivered to you.");

    const data = {
      rating: input.rating,
      title: input.title,
      body: input.body,
      variantLabel: line.variantLabel,
    };
    const where = { userId_productId: { userId, productId: product.id } };
    try {
      const saved = await db.review.upsert({
        where,
        create: { userId, productId: product.id, ...data },
        update: data,
        select: { id: true },
      });
      return { id: saved.id, productSlug: product.slug };
    } catch (error) {
      // Two saves at once: both tried to create; the second one edits the row the first made.
      if (!isUniqueViolation(error)) throw error;
      const saved = await db.review.update({ where, data, select: { id: true } });
      return { id: saved.id, productSlug: product.slug };
    }
  },

  /** Admin list, newest first, with the product and the customer. */
  async listForAdmin({ status, page }: AdminReviewFilters) {
    const where =
      status === "hidden" ? { hiddenAt: { not: null } } : status === "shown" ? { hiddenAt: null } : {};
    const [rows, total] = await Promise.all([
      db.review.findMany({
        where,
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          variantLabel: true,
          hiddenAt: true,
          createdAt: true,
          product: { select: { name: true, slug: true } },
          user: { select: { name: true, email: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        skip: (page - 1) * ADMIN_REVIEWS_PAGE_SIZE,
        take: ADMIN_REVIEWS_PAGE_SIZE,
      }),
      db.review.count({ where }),
    ]);
    return { rows, total, pageCount: Math.max(1, Math.ceil(total / ADMIN_REVIEWS_PAGE_SIZE)) };
  },

  /** Admin: hides a review from the shop (and its average), or shows it again. Audited. */
  async setHidden(actorId: string, { reviewId, hidden }: ReviewVisibilityInput) {
    return db.$transaction(async (tx) => {
      const review = await tx.review.findUnique({
        where: { id: reviewId },
        select: { hiddenAt: true, product: { select: { slug: true } } },
      });
      if (!review) throw new AppError("NOT_FOUND", "That review no longer exists.");
      await tx.review.update({
        where: { id: reviewId },
        data: { hiddenAt: hidden ? (review.hiddenAt ?? new Date()) : null },
      });
      await recordAudit(tx, {
        actorId,
        action: hidden ? "review.hide" : "review.show",
        entity: "Review",
        entityId: reviewId,
      });
      return { productSlug: review.product.slug };
    });
  },
};

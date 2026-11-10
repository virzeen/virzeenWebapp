import "server-only";
import { db, type Prisma } from "@virzeen/db";
import { MAX_STOCK_ALERTS } from "@virzeen/validators";
import { variantLabelOf } from "../cart/cart-summary";
import { publishedProductWhere } from "../catalog/catalog.reads";
import { imageForColor } from "../catalog/style-images";
import { getCoreConfig } from "../config";
import { AppError, isUniqueViolation } from "../errors";
import { notifications } from "../notifications/notifications";
import { nepalDateOf } from "../pricing/discounts";

// "Notify me when it's back" (specs/notify-me.md): a signed-in customer waits for a sold-out variant and gets one
// email when it's back in stock. Every customer method takes the signed-in userId and only touches their requests.

/** A variant a customer can wait for: still for sale, its product in the shop. */
const waitableVariant = {
  isActive: true,
  product: publishedProductWhere,
} satisfies Prisma.ProductVariantWhereInput;

/** Requests that end without an email: the size was switched off or the product archived (not just unpublished). */
const droppedVariant = {
  OR: [{ isActive: false }, { product: { archivedAt: { not: null } } }],
} satisfies Prisma.ProductVariantWhereInput;

/** Most "back in stock" emails one run sends; the next run sends the rest. */
export const STOCK_ALERT_EMAILS_PER_RUN = 40;

/**
 * Most "back in stock" emails a day (Nepal time), so they never use up the daily quota that sign-in codes and order
 * emails share (Resend's free plan sends 100 a day). Raise it when the plan is upgraded (specs/notify-me.md).
 */
export const STOCK_ALERT_EMAILS_PER_DAY = 40;

/** Resend takes 2 requests a second: one email every 600 ms leaves room for a sign-in code sent meanwhile. */
const SEND_SPACING_MS = 600;

/** Midnight in Nepal (UTC+5:45) at the start of the day `now` falls in. */
const startOfNepalDay = (now: Date) => new Date(`${nepalDateOf(now)}T00:00:00+05:45`);

/** A waiting request as the account shows it. */
export type StockAlertItem = {
  variantId: string;
  productName: string;
  productSlug: string;
  /** The variant's style ("" for a product without styles) and size (null without sizes), for the product link. */
  color: string;
  size: string | null;
  /** "Black / M", like a bag line. */
  variantLabel: string;
  imageUrl: string | null;
  imageAlt: string;
  /** When it was asked for (again, after an earlier email). */
  requestedAt: Date;
};

/**
 * The product page link that opens the variant's style and size. Spaces become %20, not "+": the sign-in page's `next`
 * check (safeRedirectSchema) doesn't take "+".
 */
export function variantPath(slug: string, color: string | null, size: string | null) {
  const query = [
    ...(color ? [`style=${encodeURIComponent(color)}`] : []),
    ...(size ? [`size=${encodeURIComponent(size)}`] : []),
  ].join("&");
  return `/product/${slug}${query ? `?${query}` : ""}`;
}

export const stockAlertService = {
  /**
   * Starts waiting for a sold-out variant. Idempotent: asking again while waiting changes nothing; asking again after
   * the email starts a new wait. Refused when the variant isn't for sale, is in stock, or the customer already waits
   * for MAX_STOCK_ALERTS variants.
   */
  async request(userId: string, variantId: string): Promise<void> {
    const variant = await db.productVariant.findFirst({
      where: { id: variantId, ...waitableVariant },
      select: { stock: true },
    });
    if (!variant) throw new AppError("NOT_FOUND", "This product isn't available.");
    if (variant.stock > 0) throw new AppError("CONFLICT", "It's back in stock. Add it to your bag.");
    try {
      await db.$transaction(async (tx) => {
        const existing = await tx.stockAlert.findUnique({
          where: { userId_variantId: { userId, variantId } },
          select: { id: true, notifiedAt: true },
        });
        if (existing?.notifiedAt === null) return;
        // Requests for products out of the shop show nowhere, so they don't count.
        const waiting = await tx.stockAlert.count({
          where: { userId, notifiedAt: null, variant: waitableVariant },
        });
        if (waiting >= MAX_STOCK_ALERTS) {
          throw new AppError(
            "CONFLICT",
            `You can wait for up to ${MAX_STOCK_ALERTS} sizes. Remove one to add another.`,
          );
        }
        if (existing) {
          // Emailed before: a new wait, listed as the newest.
          await tx.stockAlert.update({
            where: { id: existing.id },
            data: { notifiedAt: null, createdAt: new Date() },
          });
        } else {
          await tx.stockAlert.create({ data: { userId, variantId } });
        }
      });
    } catch (error) {
      // The same request pressed twice at once: it's saved, which is what was asked.
      if (!isUniqueViolation(error)) throw error;
    }
  },

  /** Stops waiting. Idempotent; an already-sent email can't be taken back, so only a waiting request goes. */
  async cancel(userId: string, variantId: string): Promise<void> {
    await db.stockAlert.deleteMany({ where: { userId, variantId, notifiedAt: null } });
  },

  /** The customer's waiting requests, newest first; ones for products out of the shop are left out. */
  async listForUser(userId: string): Promise<StockAlertItem[]> {
    const rows = await db.stockAlert.findMany({
      where: { userId, notifiedAt: null, variant: waitableVariant },
      select: {
        createdAt: true,
        variant: {
          select: {
            id: true,
            size: true,
            color: true,
            product: {
              select: {
                name: true,
                slug: true,
                images: { select: { url: true, alt: true, color: true }, orderBy: { sortOrder: "asc" } },
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MAX_STOCK_ALERTS,
    });
    return rows.map(({ createdAt, variant }) => {
      const image = imageForColor(variant.product.images, variant.color);
      return {
        variantId: variant.id,
        productName: variant.product.name,
        productSlug: variant.product.slug,
        color: variant.color ?? "",
        size: variant.size,
        variantLabel: variantLabelOf(variant),
        imageUrl: image?.url ?? null,
        imageAlt: image?.alt ?? variant.product.name,
        requestedAt: createdAt,
      };
    });
  },

  /** Which of these variants the customer is waiting for (the product page's button state). */
  async waitingVariantIds(userId: string, variantIds: readonly string[]): Promise<string[]> {
    if (variantIds.length === 0) return [];
    const rows = await db.stockAlert.findMany({
      where: { userId, notifiedAt: null, variantId: { in: [...variantIds] } },
      select: { variantId: true },
    });
    return rows.map((row) => row.variantId);
  },

  /** How many customers wait for each of a product's variants (the admin editor's "{n} waiting"); absent = none. */
  async waitingCounts(productId: string): Promise<Record<string, number>> {
    const rows = await db.stockAlert.groupBy({
      by: ["variantId"],
      where: { notifiedAt: null, variant: { productId } },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((row) => [row.variantId, row._count._all]));
  },

  /**
   * Sends the "back in stock" emails that are due: every waiting request whose variant is for sale and in stock again,
   * oldest first, at most STOCK_ALERT_EMAILS_PER_RUN per call and STOCK_ALERT_EMAILS_PER_DAY per Nepal day, one every
   * SEND_SPACING_MS. Each request is claimed (`notifiedAt` set with a conditional update) before its email goes, so
   * two runs at once can't send it twice; an email that fails puts its request back to waiting and stops the run (a
   * full quota or an outage), so the next run tries again. Requests for a size switched off or an archived product end
   * without an email; an unpublished product's wait. Runs after the reply, from every request that can return stock
   * (`after()` in the web app: admin saves and order changes, payment returns, checkout, reconciliation). Never throws.
   * Returns how many emails went.
   */
  async sendDue(options: { now?: Date; spacingMs?: number } = {}): Promise<number> {
    const { logger, siteUrl } = getCoreConfig();
    const now = options.now ?? new Date();
    const spacingMs = options.spacingMs ?? SEND_SPACING_MS;
    try {
      await db.stockAlert.deleteMany({ where: { notifiedAt: null, variant: droppedVariant } });
      const sentToday = await db.stockAlert.count({
        where: { notifiedAt: { gte: startOfNepalDay(now) } },
      });
      const room = Math.min(STOCK_ALERT_EMAILS_PER_RUN, STOCK_ALERT_EMAILS_PER_DAY - sentToday);
      if (room <= 0) return 0;
      const due = await db.stockAlert.findMany({
        where: { notifiedAt: null, variant: { ...waitableVariant, stock: { gt: 0 } } },
        select: {
          id: true,
          user: { select: { email: true } },
          variant: {
            select: { size: true, color: true, product: { select: { name: true, slug: true } } },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: room,
      });
      let sent = 0;
      for (const alert of due) {
        if (sent > 0 && spacingMs > 0) await new Promise((resolve) => setTimeout(resolve, spacingMs));
        // The run's time: the day count above reads it, and only this run can put it back.
        const claimedAt = now;
        const claimed = await db.stockAlert.updateMany({
          where: { id: alert.id, notifiedAt: null },
          data: { notifiedAt: claimedAt },
        });
        if (claimed.count === 0) continue; // another run is emailing this one
        const { variant } = alert;
        const delivered = await notifications.backInStock(alert.user.email, {
          productName: variant.product.name,
          variantLabel: variantLabelOf(variant),
          url: `${siteUrl}${variantPath(variant.product.slug, variant.color, variant.size)}`,
        });
        if (!delivered) {
          await db.stockAlert.updateMany({
            where: { id: alert.id, notifiedAt: claimedAt },
            data: { notifiedAt: null },
          });
          logger.warn("stock alerts paused: an email failed", { sent });
          break;
        }
        sent += 1;
      }
      if (sent > 0) logger.info("stock alerts sent", { sent });
      return sent;
    } catch (error) {
      logger.error("stock alerts failed", { error: String(error) });
      return 0;
    }
  },
};

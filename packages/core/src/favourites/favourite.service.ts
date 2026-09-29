import "server-only";
import { db, type Prisma } from "@virzeen/db";
import { MAX_FAVOURITES, type FavouriteKey, type SetFavouriteInput } from "@virzeen/validators";
import {
  publishedProductWhere,
  summarySelect,
  toSummary,
  type ProductSummary,
} from "../catalog/catalog.reads";
import { imageForColor } from "../catalog/style-images";
import { AppError, isUniqueViolation } from "../errors";

// Favourites (specs/favourites.md): a product plus the style picked when saved (`color`, "" without styles).
// Guests keep theirs in the browser; these methods serve signed-in customers, plus the guest product lookup.

/** A saved favourite with the product card it shows. */
export type FavouriteItem = {
  productId: string;
  /** The saved style (variant colour); "" for a product without styles. */
  color: string;
  /** When the account saved it; null for a guest's browser favourites (summariesFor), which keep their own time. */
  savedAt: Date | null;
  /** The card, showing the saved style's photos when that style has its own. */
  product: ProductSummary;
};

/** The card fields plus every photo with its style, to show the saved style's photo. */
const favouriteProductSelect = {
  ...summarySelect,
  images: { select: { url: true, alt: true, color: true }, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductSelect;

type FavouriteProductRow = Prisma.ProductGetPayload<{ select: typeof favouriteProductSelect }>;

/** The product card, with the saved style's first photo (and its second on hover) when the style has its own. */
function summaryForStyle(row: FavouriteProductRow, color: string): ProductSummary {
  const summary = toSummary(row);
  const own = color ? row.images.filter((image) => image.color === color) : [];
  const photo = own.length > 0 ? imageForColor(own, color) : undefined;
  if (!photo) return summary;
  return { ...summary, imageUrl: photo.url, imageAlt: photo.alt, hoverImageUrl: own[1]?.url ?? null };
}

const keyOf = (key: FavouriteKey) => `${key.productId}:${key.color}`;

/** The keys once each, first one kept. */
function uniqueKeys(keys: readonly FavouriteKey[]) {
  const seen = new Set<string>();
  return keys.filter((key) => {
    if (seen.has(keyOf(key))) return false;
    seen.add(keyOf(key));
    return true;
  });
}

const newestFirst = [
  { createdAt: "desc" },
  { id: "desc" },
] satisfies Prisma.FavouriteOrderByWithRelationInput[];

/**
 * Deletes the account's favourites of products no longer on sale and says how many went. They show nowhere, so a
 * customer with a full list couldn't remove them by hand: only called when the list is full.
 */
async function dropHidden(tx: Prisma.TransactionClient, userId: string) {
  const { count } = await tx.favourite.deleteMany({
    where: { userId, NOT: { product: publishedProductWhere } },
  });
  return count;
}

/** Every method takes the signed-in userId and only ever reads or changes that customer's favourites. */
export const favouriteService = {
  /**
   * Saves or removes one favourite. Idempotent: saving a saved one or removing a missing one changes nothing,
   * so double clicks and retries are harmless. Only products on sale can be saved, up to MAX_FAVOURITES; a full
   * list first makes room by dropping favourites of products no longer on sale.
   */
  async set(userId: string, input: SetFavouriteInput): Promise<SetFavouriteInput> {
    const key = { userId, productId: input.productId, color: input.color };
    if (!input.saved) {
      await db.favourite.deleteMany({ where: key });
      return { productId: input.productId, color: input.color, saved: false };
    }
    const product = await db.product.findFirst({
      where: { ...publishedProductWhere, id: input.productId },
      select: { id: true },
    });
    if (!product) throw new AppError("NOT_FOUND", "This product isn't available.");
    try {
      await db.$transaction(async (tx) => {
        const existing = await tx.favourite.findUnique({
          where: { userId_productId_color: key },
          select: { id: true },
        });
        if (existing) return;
        let count = await tx.favourite.count({ where: { userId } });
        if (count >= MAX_FAVOURITES) count -= await dropHidden(tx, userId);
        if (count >= MAX_FAVOURITES) {
          throw new AppError(
            "CONFLICT",
            `You can save up to ${MAX_FAVOURITES} favourites. Remove one to add another.`,
          );
        }
        // The time comes from the app, like merge's, so both order the list by the same clock.
        await tx.favourite.upsert({
          where: { userId_productId_color: key },
          create: { ...key, createdAt: new Date() },
          update: {},
        });
      });
    } catch (error) {
      // Another request saved the same favourite at the same moment: it's saved, which is what was asked.
      if (!isUniqueViolation(error)) throw error;
    }
    return { productId: input.productId, color: input.color, saved: true };
  },

  /** The account's favourite keys, newest first (the product page's Favourite button state). */
  async listKeys(userId: string): Promise<FavouriteKey[]> {
    return db.favourite.findMany({
      where: { userId },
      select: { productId: true, color: true },
      orderBy: newestFirst,
      take: MAX_FAVOURITES,
    });
  },

  /** The account's favourites for the Favourites page, newest first; products no longer on sale are left out. */
  async list(userId: string): Promise<FavouriteItem[]> {
    const rows = await db.favourite.findMany({
      where: { userId, product: publishedProductWhere },
      select: {
        productId: true,
        color: true,
        createdAt: true,
        product: { select: favouriteProductSelect },
      },
      orderBy: newestFirst,
      take: MAX_FAVOURITES,
    });
    return rows.map((row) => ({
      productId: row.productId,
      color: row.color,
      savedAt: row.createdAt,
      product: summaryForStyle(row.product, row.color),
    }));
  },

  /**
   * Adds a guest's browser favourites to the account after sign-in, in one transaction. `keys` are newest first
   * and stay in that order above the account's own; ones the account has, repeats, and products not on sale are
   * skipped, and the total never goes over MAX_FAVOURITES (the account's own ones are kept first, except those of
   * products no longer on sale when room is short).
   * Returns the account's keys afterwards, like listKeys.
   */
  async merge(userId: string, keys: readonly FavouriteKey[]): Promise<FavouriteKey[]> {
    const wanted = uniqueKeys(keys);
    if (wanted.length > 0) {
      await db.$transaction(async (tx) => {
        const own = { where: { userId }, select: { productId: true, color: true } } as const;
        let existing = await tx.favourite.findMany(own);
        if (existing.length + wanted.length > MAX_FAVOURITES && (await dropHidden(tx, userId)) > 0) {
          existing = await tx.favourite.findMany(own);
        }
        const room = MAX_FAVOURITES - existing.length;
        if (room <= 0) return;
        const onSale = await tx.product.findMany({
          where: { ...publishedProductWhere, id: { in: [...new Set(wanted.map((key) => key.productId))] } },
          select: { id: true },
        });
        const onSaleIds = new Set(onSale.map((product) => product.id));
        const have = new Set(existing.map(keyOf));
        const added = wanted
          .filter((key) => onSaleIds.has(key.productId) && !have.has(keyOf(key)))
          .slice(0, room);
        // One millisecond apart, so the first key is the newest and the list keeps the browser's order.
        const now = Date.now();
        await tx.favourite.createMany({
          data: added.map((key, index) => ({
            userId,
            productId: key.productId,
            color: key.color,
            createdAt: new Date(now - index),
          })),
          skipDuplicates: true,
        });
      });
    }
    return favouriteService.listKeys(userId);
  },

  /**
   * Product cards for a guest's browser favourites, in the given order (newest first); repeats and products no
   * longer on sale are left out. `savedAt` is null: the browser keeps the time.
   */
  async summariesFor(keys: readonly FavouriteKey[]): Promise<FavouriteItem[]> {
    const wanted = uniqueKeys(keys).slice(0, MAX_FAVOURITES);
    if (wanted.length === 0) return [];
    const rows = await db.product.findMany({
      where: { ...publishedProductWhere, id: { in: [...new Set(wanted.map((key) => key.productId))] } },
      select: favouriteProductSelect,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return wanted.flatMap((key) => {
      const row = byId.get(key.productId);
      return row
        ? [
            {
              productId: key.productId,
              color: key.color,
              savedAt: null,
              product: summaryForStyle(row, key.color),
            },
          ]
        : [];
    });
  },
};

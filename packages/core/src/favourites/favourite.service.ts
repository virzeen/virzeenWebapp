import "server-only";
import { db, type Prisma } from "@virzeen/db";
import { MAX_FAVOURITES, sortSizes, type FavouriteKey, type SetFavouriteInput } from "@virzeen/validators";
import {
  publishedProductWhere,
  summarySelect,
  toSummary,
  type ProductSummary,
} from "../catalog/catalog.reads";
import { AppError, isUniqueViolation } from "../errors";

// Favourites (specs/favourites.md): a product plus the style picked when saved (`color`, "" without styles).
// Guests keep theirs in the browser; these methods serve signed-in customers, plus the guest product lookup.

/** A size of the saved style for sale (sold out ones too, with stock 0): the card's Add to bag and Select size. */
export type FavouriteVariant = {
  id: string;
  /** null when the product has no sizes. */
  size: string | null;
  stock: number;
  pricePaisa: number;
};

/** A saved favourite with the product card it shows. */
export type FavouriteItem = {
  productId: string;
  /** The saved style (variant colour); "" for a product without styles. With productId, the favourite's key. */
  color: string;
  /**
   * The style the card names and opens: `color`, or "" when the product has no styles or that style isn't sold any
   * more (removed since it was saved), so the card shows the product as a whole.
   */
  style: string;
  /** When the account saved it; null for a guest's browser favourites (summariesFor), which keep their own time. */
  savedAt: Date | null;
  /** The card: the saved style's photos, price (the lowest of its sizes) and stock. */
  product: ProductSummary;
  /** The product's category name, shown with the style ("Tops · Black"). */
  category: string;
  /**
   * The saved style's variants for sale, sizes in shop order (sortSizes, like the product page); a product without
   * styles: all of them. [] when the style isn't sold any more.
   */
  variants: FavouriteVariant[];
};

/** The card fields plus the category, every photo with its style, and every variant for sale with its price. */
const favouriteProductSelect = {
  ...summarySelect,
  category: { select: { name: true } },
  images: { select: { url: true, alt: true, color: true }, orderBy: { sortOrder: "asc" } },
  variants: {
    where: { isActive: true },
    select: { id: true, size: true, stock: true, color: true, pricePaisa: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.ProductSelect;

type FavouriteProductRow = Prisma.ProductGetPayload<{ select: typeof favouriteProductSelect }>;

/**
 * The photos the product page's gallery shows for a style (galleryFor in the web app): its own; else the ones shared
 * by every style (a photo of a style not sold any more counts as shared); else the first style's that has some.
 */
function photosForStyle(images: FavouriteProductRow["images"], style: string, styles: readonly string[]) {
  const own = images.filter((image) => image.color === style);
  if (own.length > 0) return own;
  const shared = images.filter((image) => image.color === null || !styles.includes(image.color));
  if (shared.length > 0) return shared;
  const firstWithPhotos = styles.find((name) => images.some((image) => image.color === name));
  return images.filter((image) => image.color === firstWithPhotos);
}

/**
 * The variants a favourite can add to the bag: the saved style's ("" = the ones without a style, i.e. every variant
 * of a product without styles), sizes in the product page's order; admin order among the rest.
 */
function variantsForStyle(row: FavouriteProductRow, color: string): FavouriteVariant[] {
  const own = row.variants.filter((variant) => (variant.color ?? "") === color);
  const order = sortSizes(own.flatMap((variant) => (variant.size ? [variant.size] : [])));
  const rank = (size: string | null) => (size ? order.indexOf(size) : order.length);
  return own
    .map((variant) => ({
      id: variant.id,
      size: variant.size || null,
      stock: variant.stock,
      pricePaisa: variant.pricePaisa,
    }))
    .sort((a, b) => rank(a.size) - rank(b.size));
}

/**
 * The card for a favourite, like the product page opened in the saved style: that style's first photo (its second on
 * hover), the lowest price of its sizes, and in stock when any size is, plus the category and the style's variants.
 * A product without styles, or a style not sold any more, shows the product's usual card.
 */
function summaryForStyle(
  row: FavouriteProductRow,
  color: string,
): Pick<FavouriteItem, "style" | "product" | "category" | "variants"> {
  const summary = toSummary(row);
  const card = { category: row.category.name, variants: variantsForStyle(row, color) };
  const variants = color ? row.variants.filter((variant) => variant.color === color) : [];
  if (variants.length === 0) return { style: "", product: summary, ...card };
  const styles = [...new Set(row.variants.flatMap((variant) => (variant.color ? [variant.color] : [])))];
  const [photo, hover] = photosForStyle(row.images, color, styles);
  return {
    style: color,
    product: {
      ...summary,
      fromPricePaisa: Math.min(...variants.map((variant) => variant.pricePaisa)),
      inStock: variants.some((variant) => variant.stock > 0),
      ...(photo ? { imageUrl: photo.url, imageAlt: photo.alt, hoverImageUrl: hover?.url ?? null } : {}),
    },
    ...card,
  };
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
      ...summaryForStyle(row.product, row.color),
    }));
  },

  /**
   * Adds a guest's browser favourites to the account after sign-in, in one transaction. `keys` are newest first
   * and stay in that order above the account's own; ones the account has, repeats, and products not on sale are
   * skipped, and the total never goes over MAX_FAVOURITES. The account's own ones are kept first; favourites of
   * products no longer on sale make room only when the new ones wouldn't all fit.
   * Returns the account's keys afterwards, like listKeys.
   */
  async merge(userId: string, keys: readonly FavouriteKey[]): Promise<FavouriteKey[]> {
    const wanted = uniqueKeys(keys);
    if (wanted.length > 0) {
      await db.$transaction(async (tx) => {
        const existing = await tx.favourite.findMany({
          where: { userId },
          select: { productId: true, color: true },
        });
        const onSale = await tx.product.findMany({
          where: { ...publishedProductWhere, id: { in: [...new Set(wanted.map((key) => key.productId))] } },
          select: { id: true },
        });
        const onSaleIds = new Set(onSale.map((product) => product.id));
        const have = new Set(existing.map(keyOf));
        // The ones really added. They're all on sale, so making room below can't change which.
        const additions = wanted.filter((key) => onSaleIds.has(key.productId) && !have.has(keyOf(key)));
        if (additions.length === 0) return;
        let count = existing.length;
        if (count + additions.length > MAX_FAVOURITES) count -= await dropHidden(tx, userId);
        const added = additions.slice(0, Math.max(MAX_FAVOURITES - count, 0));
        if (added.length === 0) return;
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
              ...summaryForStyle(row, key.color),
            },
          ]
        : [];
    });
  },
};

/** Longer than any style name (40 characters at most), so a favourite on its way to a new name clashes with none. */
const movingColor = (index: number) => `${"~".repeat(41)}${index}`;

/**
 * Favourites follow a product's renamed styles (catalogService.saveProduct, in its transaction): `renames` are the
 * style rows whose name changed, old name to new (saveStyles). A customer who already has the new name keeps that
 * favourite instead. Each first moves to a placeholder, so two styles can swap names without a clash.
 */
export async function moveFavouritesToRenamedStyles(
  tx: Prisma.TransactionClient,
  productId: string,
  renames: readonly { from: string; to: string }[],
) {
  const moves = renames.filter(({ from, to }) => from !== to);
  for (const [index, { from }] of moves.entries()) {
    await tx.favourite.updateMany({ where: { productId, color: from }, data: { color: movingColor(index) } });
  }
  for (const [index, { to }] of moves.entries()) {
    const already = await tx.favourite.findMany({
      where: { productId, color: to },
      select: { userId: true },
    });
    if (already.length > 0) {
      await tx.favourite.deleteMany({
        where: { productId, color: movingColor(index), userId: { in: already.map((row) => row.userId) } },
      });
    }
    await tx.favourite.updateMany({ where: { productId, color: movingColor(index) }, data: { color: to } });
  }
}

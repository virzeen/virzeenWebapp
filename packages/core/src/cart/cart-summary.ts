import "server-only";
import type { Prisma, PrismaClient } from "@virzeen/db";
import { MAX_QTY_PER_LINE } from "@virzeen/validators";
import { EARLY_ACCESS_HOURS } from "@virzeen/validators/limits";
import { levelOf } from "@virzeen/validators/membership";
import { visibleProductWhere } from "../catalog/catalog.reads";
import { imageForColor } from "../catalog/style-images";
import { calculateSubtotal } from "../pricing/calculate-totals";

type Client = Prisma.TransactionClient | PrismaClient;

/** Cart line as seen by the customer (docs/backend/api-contract.md `CartItem`). */
export type CartLine = {
  id: string;
  variantId: string;
  /** With `color`, the favourite this line matches (the bag's heart button). */
  productId: string;
  /** The style bought; "" for a product without styles. */
  color: string;
  productName: string;
  productSlug: string;
  variantLabel: string;
  /** Current price from the database. */
  unitPricePaisa: number;
  quantity: number;
  lineTotalPaisa: number;
  imageUrl: string | null;
  imageAlt: string;
  /** Most the customer can have of this line right now (stock and per-line cap). */
  maxQuantity: number;
  /** False when the product was unpublished/archived or the variant deactivated. */
  isAvailable: boolean;
};

export type CartSummary = {
  id: string;
  items: CartLine[];
  subtotalPaisa: number;
  itemCount: number;
};

export function variantLabelOf(variant: { size: string | null; color: string | null }): string {
  return [variant.color, variant.size].filter(Boolean).join(" / ") || "One size";
}

export const cartLineSelect = {
  id: true,
  quantity: true,
  unitPricePaisa: true,
  variant: {
    select: {
      id: true,
      sku: true,
      size: true,
      color: true,
      pricePaisa: true,
      stock: true,
      isActive: true,
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          isPublished: true,
          archivedAt: true,
          // All of them: the line shows the photo of the style bought (imageForColor).
          images: { select: { url: true, alt: true, color: true }, orderBy: { sortOrder: "asc" } },
        },
      },
    },
  },
} satisfies Prisma.CartItemSelect;

export type CartLineRow = Prisma.CartItemGetPayload<{ select: typeof cartLineSelect }>;

/**
 * The ids, among these lines' products, that the bag's owner may see (the shop's rule, `visibleProductWhere`: their
 * level, members-only collections and early access; specs/catalog-groups-visibility.md). A guest's bag is a visitor's.
 * A line whose product they may no longer see is unavailable, like one that was unpublished. Read-only: an order
 * already placed never goes through this.
 */
export async function visibleProductIds(
  client: Client,
  cartId: string,
  rows: readonly CartLineRow[],
): Promise<Set<string>> {
  const productIds = [...new Set(rows.map((row) => row.variant.product.id))];
  if (productIds.length === 0) return new Set();
  const owner = await client.cart.findUnique({
    where: { id: cartId },
    select: { user: { select: { passEndsAt: true } } },
  });
  const hours = owner?.user
    ? EARLY_ACCESS_HOURS[levelOf(owner.user.passEndsAt) === "PASS" ? "PASS" : "MEMBER"]
    : EARLY_ACCESS_HOURS.GUEST;
  const seen = await client.product.findMany({
    where: { ...visibleProductWhere(hours), id: { in: productIds } },
    select: { id: true },
  });
  return new Set(seen.map((product) => product.id));
}

/** `visible` (from `visibleProductIds`): when given, a product the owner may not see makes the line unavailable. */
export function isLineAvailable(row: CartLineRow, visible?: ReadonlySet<string>): boolean {
  const product = row.variant.product;
  const live = row.variant.isActive && product.isPublished && product.archivedAt === null;
  return live && (visible === undefined || visible.has(product.id));
}

export function toCartLine(row: CartLineRow, visible?: ReadonlySet<string>): CartLine {
  const { variant } = row;
  const image = imageForColor(variant.product.images, variant.color);
  const isAvailable = isLineAvailable(row, visible);
  return {
    id: row.id,
    variantId: variant.id,
    productId: variant.product.id,
    color: variant.color ?? "",
    productName: variant.product.name,
    productSlug: variant.product.slug,
    variantLabel: variantLabelOf(variant),
    unitPricePaisa: variant.pricePaisa,
    quantity: row.quantity,
    lineTotalPaisa: variant.pricePaisa * row.quantity,
    imageUrl: image?.url ?? null,
    imageAlt: image?.alt ?? variant.product.name,
    maxQuantity: isAvailable ? Math.min(variant.stock, MAX_QTY_PER_LINE) : 0,
    isAvailable,
  };
}

/** Builds the cart summary from the database. Prices always come from current variant prices. */
export async function getCartSummary(client: Client, cartId: string): Promise<CartSummary> {
  const rows = await client.cartItem.findMany({
    where: { cartId },
    select: cartLineSelect,
    orderBy: { createdAt: "asc" },
  });
  const visible = await visibleProductIds(client, cartId, rows);
  const items = rows.map((row) => toCartLine(row, visible));
  const available = items.filter((item) => item.isAvailable);
  return {
    id: cartId,
    items,
    subtotalPaisa: calculateSubtotal(available),
    itemCount: available.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function emptyCart(): CartSummary {
  return { id: "", items: [], subtotalPaisa: 0, itemCount: 0 };
}

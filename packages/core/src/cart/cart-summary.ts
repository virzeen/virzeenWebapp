import "server-only";
import type { Prisma, PrismaClient } from "@virzeen/db";
import { MAX_QTY_PER_LINE } from "@virzeen/validators";
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

export function isLineAvailable(row: CartLineRow): boolean {
  const product = row.variant.product;
  return row.variant.isActive && product.isPublished && product.archivedAt === null;
}

export function toCartLine(row: CartLineRow): CartLine {
  const { variant } = row;
  const image = imageForColor(variant.product.images, variant.color);
  const isAvailable = isLineAvailable(row);
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
  const items = rows.map(toCartLine);
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

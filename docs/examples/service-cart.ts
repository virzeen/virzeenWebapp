// packages/core/src/cart/cart.service.ts
import "server-only";
import { db, type Prisma } from "@virzeen/db";
import { AppError } from "../errors";
import { getCartSummary } from "./cart-summary";

export const MAX_QTY_PER_LINE = 10;

type AddItemInput = { cartId: string; variantId: string; quantity: number };

export const cartService = {
  /** Adds a variant to the cart or increases its quantity. Enforces stock and per-line limits. */
  async addItem(input: AddItemInput) {
    return db.$transaction(async (tx: Prisma.TransactionClient) => {
      // Use `tx` (not `db`) for every query inside the transaction.
      const variant = await tx.productVariant.findFirst({
        where: { id: input.variantId, isActive: true, product: { isPublished: true, archivedAt: null } },
        select: { id: true, stock: true },
      });
      if (!variant) throw new AppError("NOT_FOUND", "This item is no longer available.");

      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: input.cartId, variantId: input.variantId } },
        select: { quantity: true },
      });

      const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
      const limit = Math.min(variant.stock, MAX_QTY_PER_LINE);
      if (nextQuantity > limit) {
        throw new AppError("OUT_OF_STOCK", `Only ${limit} available.`, { available: limit });
      }

      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: input.cartId, variantId: input.variantId } },
        create: { cartId: input.cartId, variantId: input.variantId, quantity: input.quantity },
        update: { quantity: nextQuantity },
      });

      return getCartSummary(tx, input.cartId); // prices recomputed from DB, never from input
    });
  },
};

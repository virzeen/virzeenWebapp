import "server-only";
import { randomBytes } from "node:crypto";
import { db, type Prisma } from "@virzeen/db";
import { MAX_QTY_PER_LINE } from "@virzeen/validators";
import { AppError } from "../errors";
import { cartLineSelect, emptyCart, getCartSummary, isLineAvailable, type CartSummary } from "./cart-summary";

export { MAX_QTY_PER_LINE };

const CART_LIFETIME_DAYS = 30;
const expiry = (now = new Date()) => new Date(now.getTime() + CART_LIFETIME_DAYS * 24 * 60 * 60 * 1000);

export type CartOwner = { userId: string } | { guestToken: string };

export type CheckoutRefresh = { changed: "PRICE_CHANGED" | "OUT_OF_STOCK" | null; isEmpty: boolean };

async function findCartId(owner: CartOwner): Promise<string | null> {
  const cart = await db.cart.findUnique({
    where: "userId" in owner ? { userId: owner.userId } : { guestToken: owner.guestToken },
    select: { id: true },
  });
  return cart?.id ?? null;
}

async function mergeLines(
  tx: Prisma.TransactionClient,
  targetCartId: string,
  lines: readonly { variantId: string; quantity: number; unitPricePaisa: number }[],
) {
  for (const line of lines) {
    const variant = await tx.productVariant.findFirst({
      where: { id: line.variantId, isActive: true, product: { isPublished: true, archivedAt: null } },
      select: { stock: true, pricePaisa: true },
    });
    if (!variant) continue;
    const existing = await tx.cartItem.findUnique({
      where: { cartId_variantId: { cartId: targetCartId, variantId: line.variantId } },
      select: { quantity: true },
    });
    const limit = Math.min(variant.stock, MAX_QTY_PER_LINE);
    const quantity = Math.min((existing?.quantity ?? 0) + line.quantity, limit);
    if (quantity <= 0) continue;
    await tx.cartItem.upsert({
      where: { cartId_variantId: { cartId: targetCartId, variantId: line.variantId } },
      create: {
        cartId: targetCartId,
        variantId: line.variantId,
        quantity,
        unitPricePaisa: variant.pricePaisa,
      },
      update: { quantity },
    });
  }
}

export const cartService = {
  /** Summary for the header/drawer. Returns an empty cart when the owner has none yet. */
  async getSummary(owner: CartOwner | null): Promise<CartSummary> {
    if (!owner) return emptyCart();
    const cartId = await findCartId(owner);
    return cartId ? getCartSummary(db, cartId) : emptyCart();
  },

  /** Finds or creates the cart for a signed-in user, or a guest cart with a new random token. */
  async ensureCart(owner: CartOwner | { guest: true }): Promise<{ cartId: string; guestToken?: string }> {
    if ("userId" in owner) {
      const cart = await db.cart.upsert({
        where: { userId: owner.userId },
        create: { userId: owner.userId, expiresAt: expiry() },
        update: { expiresAt: expiry() },
        select: { id: true },
      });
      return { cartId: cart.id };
    }
    if ("guestToken" in owner) {
      const existing = await findCartId(owner);
      if (existing) return { cartId: existing };
    }
    const guestToken = randomBytes(32).toString("base64url");
    const cart = await db.cart.create({ data: { guestToken, expiresAt: expiry() }, select: { id: true } });
    return { cartId: cart.id, guestToken };
  },

  /** Adds a variant or increases its quantity. Enforces stock and the per-line limit. */
  async addItem(input: { cartId: string; variantId: string; quantity: number }): Promise<CartSummary> {
    return db.$transaction(async (tx) => {
      const variant = await tx.productVariant.findFirst({
        where: { id: input.variantId, isActive: true, product: { isPublished: true, archivedAt: null } },
        select: { id: true, stock: true, pricePaisa: true },
      });
      if (!variant) throw new AppError("NOT_FOUND", "This item is no longer available.");

      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: input.cartId, variantId: input.variantId } },
        select: { quantity: true },
      });
      const nextQuantity = (existing?.quantity ?? 0) + input.quantity;
      const limit = Math.min(variant.stock, MAX_QTY_PER_LINE);
      if (nextQuantity > limit) {
        throw new AppError("OUT_OF_STOCK", limit === 0 ? "Out of stock" : `Only ${limit} left`, {
          meta: { available: limit },
        });
      }

      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: input.cartId, variantId: input.variantId } },
        create: {
          cartId: input.cartId,
          variantId: input.variantId,
          quantity: input.quantity,
          unitPricePaisa: variant.pricePaisa,
        },
        // Re-adding confirms the customer has seen the current price.
        update: { quantity: nextQuantity, unitPricePaisa: variant.pricePaisa },
      });
      await tx.cart.update({ where: { id: input.cartId }, data: { expiresAt: expiry() } });
      return getCartSummary(tx, input.cartId);
    });
  },

  /** Sets a line's quantity. The line must belong to this cart (ownership check). */
  async updateQuantity(input: { cartId: string; itemId: string; quantity: number }): Promise<CartSummary> {
    return db.$transaction(async (tx) => {
      const line = await tx.cartItem.findFirst({
        where: { id: input.itemId, cartId: input.cartId },
        select: cartLineSelect,
      });
      if (!line) throw new AppError("NOT_FOUND", "This item is no longer in your bag.");
      if (!isLineAvailable(line)) throw new AppError("NOT_FOUND", "This item is no longer available.");
      const limit = Math.min(line.variant.stock, MAX_QTY_PER_LINE);
      if (input.quantity > limit) {
        throw new AppError("OUT_OF_STOCK", limit === 0 ? "Out of stock" : `Only ${limit} left`, {
          meta: { available: limit },
        });
      }
      await tx.cartItem.update({ where: { id: input.itemId }, data: { quantity: input.quantity } });
      return getCartSummary(tx, input.cartId);
    });
  },

  /** Removes a line and returns what was removed so the UI can offer Undo. */
  async removeItem(input: { cartId: string; itemId: string }) {
    return db.$transaction(async (tx) => {
      const line = await tx.cartItem.findFirst({
        where: { id: input.itemId, cartId: input.cartId },
        select: { variantId: true, quantity: true },
      });
      if (!line) throw new AppError("NOT_FOUND", "This item is no longer in your bag.");
      await tx.cartItem.delete({ where: { id: input.itemId } });
      return { removed: line, cart: await getCartSummary(tx, input.cartId) };
    });
  },

  /**
   * Moves a guest cart into the user's cart after sign-in (quantities capped by stock), then deletes it.
   * Safe to call repeatedly: a missing guest cart is a no-op.
   */
  async mergeGuestCart(input: { guestToken: string; userId: string }): Promise<void> {
    await db.$transaction(async (tx) => {
      const guest = await tx.cart.findUnique({
        where: { guestToken: input.guestToken },
        select: {
          id: true,
          userId: true,
          items: { select: { variantId: true, quantity: true, unitPricePaisa: true } },
        },
      });
      if (!guest || guest.userId) return;
      // Claim the guest cart first: a concurrent merge (layout and page rendering at once) waits on this row,
      // then deletes nothing and stops, so the lines are merged exactly once.
      const claimed = await tx.cart.deleteMany({ where: { id: guest.id, userId: null } });
      if (claimed.count === 0) return;
      const target = await tx.cart.upsert({
        where: { userId: input.userId },
        create: { userId: input.userId, expiresAt: expiry() },
        update: { expiresAt: expiry() },
        select: { id: true },
      });
      await mergeLines(tx, target.id, guest.items);
    });
  },

  /**
   * Before checkout: drops unavailable lines, caps quantities to stock and updates changed prices, committing
   * the fixes so the customer sees the refreshed bag (checkout.md "price or stock change").
   */
  async refreshForCheckout(cartId: string): Promise<CheckoutRefresh> {
    return db.$transaction(async (tx) => {
      const rows = await tx.cartItem.findMany({ where: { cartId }, select: cartLineSelect });
      let stockChanged = false;
      let priceChanged = false;
      for (const row of rows) {
        const limit = isLineAvailable(row) ? Math.min(row.variant.stock, MAX_QTY_PER_LINE) : 0;
        if (limit === 0) {
          await tx.cartItem.delete({ where: { id: row.id } });
          stockChanged = true;
          continue;
        }
        const data: Prisma.CartItemUpdateInput = {};
        if (row.quantity > limit) {
          data.quantity = limit;
          stockChanged = true;
        }
        if (row.unitPricePaisa !== row.variant.pricePaisa) {
          data.unitPricePaisa = row.variant.pricePaisa;
          priceChanged = true;
        }
        if (Object.keys(data).length > 0) await tx.cartItem.update({ where: { id: row.id }, data });
      }
      const remaining = await tx.cartItem.count({ where: { cartId } });
      const changed = stockChanged ? "OUT_OF_STOCK" : priceChanged ? "PRICE_CHANGED" : null;
      return { changed, isEmpty: remaining === 0 };
    });
  },

  /** Puts an unpaid order's items back in the customer's bag ("Your bag is saved"). Inside the cancel transaction. */
  async restoreOrderItems(
    tx: Prisma.TransactionClient,
    input: {
      userId: string;
      items: readonly { variantId: string; quantity: number; unitPricePaisa: number }[];
    },
  ): Promise<void> {
    const cart = await tx.cart.upsert({
      where: { userId: input.userId },
      create: { userId: input.userId, expiresAt: expiry() },
      update: { expiresAt: expiry() },
      select: { id: true },
    });
    await mergeLines(tx, cart.id, input.items);
  },
};

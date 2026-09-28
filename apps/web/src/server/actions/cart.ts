"use server";

import "server-only";
import { cartService, type CartSummary } from "@virzeen/core";
import { addToCartSchema, removeCartItemSchema, updateCartItemSchema } from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction } from "@/server/actions/result";
import { ensureCart } from "@/server/auth/session";
import { rateLimit } from "@/server/security/rate-limit";

/** Serializable cart for client components (docs/backend/api-contract.md `Cart`). */
export type CartView = Pick<CartSummary, "items" | "subtotalPaisa" | "itemCount">;

const toView = (cart: CartSummary): CartView => ({
  items: cart.items,
  subtotalPaisa: cart.subtotalPaisa,
  itemCount: cart.itemCount,
});

export async function addToCartAction(input: unknown) {
  return runAction("addToCart", async () => {
    const actor = await ensureCart(); // 1. authenticate (guest or user)
    await rateLimit("cart:add", actor.key); // 2. rate-limit
    const data = addToCartSchema.parse(input); // 3. validate
    const cart = await cartService.addItem({ cartId: actor.cartId, ...data }); // 4. core
    revalidatePath("/", "layout"); // 5. refresh header count / bag
    return toView(cart);
  });
}

export async function updateCartItemAction(input: unknown) {
  return runAction("updateCartItem", async () => {
    const actor = await ensureCart();
    await rateLimit("cart:write", actor.key);
    const data = updateCartItemSchema.parse(input);
    const cart = await cartService.updateQuantity({ cartId: actor.cartId, ...data });
    revalidatePath("/", "layout");
    return toView(cart);
  });
}

export async function removeCartItemAction(input: unknown) {
  return runAction("removeCartItem", async () => {
    const actor = await ensureCart();
    await rateLimit("cart:write", actor.key);
    const data = removeCartItemSchema.parse(input);
    const result = await cartService.removeItem({ cartId: actor.cartId, ...data });
    revalidatePath("/", "layout");
    return { cart: toView(result.cart), removed: result.removed };
  });
}

const undoSchema = z.strictObject({ variantId: z.cuid2(), quantity: z.int().min(1).max(10) });

/** "Removed from bag — Undo": puts the line back (stock is re-checked). */
export async function undoRemoveAction(input: unknown) {
  return runAction("undoRemove", async () => {
    const actor = await ensureCart();
    await rateLimit("cart:write", actor.key);
    const data = undoSchema.parse(input);
    const cart = await cartService.addItem({ cartId: actor.cartId, ...data });
    revalidatePath("/", "layout");
    return toView(cart);
  });
}

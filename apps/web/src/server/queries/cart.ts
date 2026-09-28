import "server-only";
import "@/server/bootstrap";
import { cartService } from "@virzeen/core";
import type { CartView } from "@/server/actions/cart";
import { getCartOwner } from "@/server/auth/session";

/** The current visitor's bag (guest or signed in), shaped for client components. */
export async function getCartView(): Promise<CartView> {
  const cart = await cartService.getSummary(await getCartOwner());
  return { items: cart.items, subtotalPaisa: cart.subtotalPaisa, itemCount: cart.itemCount };
}

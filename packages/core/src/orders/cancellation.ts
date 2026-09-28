import "server-only";
import type { Prisma } from "@virzeen/db";
import { cartService } from "../cart/cart.service";
import { restoreStock } from "../inventory/stock";
import { transitionOrder } from "./order-state";

/**
 * Cancels an order and returns its stock in the same transaction (payment-policy.md §4).
 * `restoreToCart` puts the items back in the customer's bag (unpaid online orders: "Your bag is saved").
 * Idempotent: an already-cancelled order is left untouched.
 */
export async function cancelOrderAndRestock(
  tx: Prisma.TransactionClient,
  input: { orderId: string; actor: string; reason: string; restoreToCart: boolean },
) {
  const result = await transitionOrder(tx, {
    orderId: input.orderId,
    to: "CANCELLED",
    actor: input.actor,
    reason: input.reason,
    data: { cancelReason: input.reason, reservedUntil: null },
  });
  if (!result.changed) return result;

  const order = await tx.order.findUniqueOrThrow({
    where: { id: input.orderId },
    select: { userId: true, items: { select: { variantId: true, quantity: true, unitPricePaisa: true } } },
  });
  await restoreStock(tx, order.items);
  if (input.restoreToCart)
    await cartService.restoreOrderItems(tx, { userId: order.userId, items: order.items });
  return result;
}

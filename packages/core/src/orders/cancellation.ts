import "server-only";
import type { OrderStatus, Prisma } from "@virzeen/db";
import { cartService } from "../cart/cart.service";
import { releaseDiscountUse } from "../discounts/discount.service";
import { restoreStock } from "../inventory/stock";
import { transitionOrder } from "./order-state";

/**
 * Cancels an order and returns its stock, and its discount code's use, in the same transaction (payment-policy.md
 * §2, §4). Every cancellation goes through here: customer, admin, refused at the door, failed or expired payment.
 * `restoreToCart` puts the items back in the customer's bag (unpaid online orders: "Your bag is saved").
 * Idempotent: an already-cancelled order is left untouched.
 */
export async function cancelOrderAndRestock(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    actor: string;
    reason: string;
    restoreToCart: boolean;
    /** Only cancel from these statuses (e.g. admins can't cancel a shipped order the ordinary way). */
    expectFrom?: readonly OrderStatus[];
  },
) {
  const result = await transitionOrder(tx, {
    orderId: input.orderId,
    to: "CANCELLED",
    actor: input.actor,
    reason: input.reason,
    ...(input.expectFrom ? { expectFrom: input.expectFrom } : {}),
    data: { cancelReason: input.reason, reservedUntil: null },
  });
  if (!result.changed) return result;

  const order = await tx.order.findUniqueOrThrow({
    where: { id: input.orderId },
    select: {
      userId: true,
      discountCodeId: true,
      items: { select: { variantId: true, quantity: true, unitPricePaisa: true } },
    },
  });
  // The code before the stock: checkout locks them in that order too, so the two can't deadlock.
  if (order.discountCodeId) await releaseDiscountUse(tx, order.discountCodeId);
  await restoreStock(tx, order.items);
  if (input.restoreToCart)
    await cartService.restoreOrderItems(tx, { userId: order.userId, items: order.items });
  return result;
}

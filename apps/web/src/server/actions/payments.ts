"use server";

import "server-only";
import { AppError, orderService, paymentService } from "@virzeen/core";
import { orderRefSchema, retryPaymentSchema } from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { runAction } from "@/server/actions/result";
import { requireUser } from "@/server/auth/session";
import { features } from "@/server/env";
import { rateLimit } from "@/server/security/rate-limit";
import { sendDueStockAlerts } from "@/server/services/stock-alerts";

// The 15 minutes to pay (specs/payment-window.md): Pay now and Cancel order on the customer's own waiting order.

const ONLINE_ENABLED = { ESEWA: () => features.esewa, KHALTI: () => features.khalti } as const;

/** Pay now: a new attempt with eSewa or Khalti. Returns where the browser goes next, like Place order. */
export async function payNowAction(input: unknown) {
  return runAction("payNow", async () => {
    const user = await requireUser();
    await rateLimit("checkout", `user:${user.id}`);
    const { orderNumber, paymentMethod } = retryPaymentSchema.parse(input);
    if (!ONLINE_ENABLED[paymentMethod]()) {
      throw new AppError("VALIDATION_FAILED", "This payment method isn't available right now.", {
        fields: { paymentMethod: "Choose another payment method" },
      });
    }
    const result = await paymentService.startAttempt({ userId: user.id, orderNumber, method: paymentMethod });
    revalidatePath(`/account/orders/${orderNumber}`);
    return result;
  });
}

/** Cancel order: cancels the customer's unpaid online order; its items go back to the bag. */
export async function cancelUnpaidOrderAction(input: unknown) {
  return runAction("cancelUnpaidOrder", async () => {
    const user = await requireUser();
    await rateLimit("account", `user:${user.id}`);
    const { orderNumber } = orderRefSchema.parse(input);
    // Its stock comes back: "Notify me" emails (specs/notify-me.md).
    sendDueStockAlerts();
    const result = await orderService.cancelUnpaidForCustomer(user.id, orderNumber);
    revalidatePath("/", "layout");
    return result;
  });
}

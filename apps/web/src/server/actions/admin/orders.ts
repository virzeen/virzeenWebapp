"use server";

import "server-only";
import { orderService } from "@virzeen/core";
import {
  advanceOrderSchema,
  orderAttemptWithReasonSchema,
  orderRefSchema,
  orderWithReasonSchema,
} from "@virzeen/validators";
import { revalidatePath } from "next/cache";
import { sendDueStockAlerts } from "@/server/services/stock-alerts";
import { runAdminAction } from "./guard";

const refresh = (orderNumber: string) => {
  revalidatePath(`/admin/orders/${orderNumber}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
};

/** Fulfilment: processing → shipped (courier + tracking) → delivered, or cancel / return. */
export async function advanceOrderAction(input: unknown) {
  return runAdminAction("advanceOrder", async (admin) => {
    const data = advanceOrderSchema.parse(input);
    const result = await orderService.advance(admin.id, data);
    refresh(data.orderNumber);
    // A cancelled order returns its stock: "Notify me" emails (specs/notify-me.md).
    if (data.to === "CANCELLED") sendDueStockAlerts();
    return result;
  });
}

export async function markCodCollectedAction(input: unknown) {
  return runAdminAction("markCodCollected", async (admin) => {
    const { orderNumber } = orderRefSchema.parse(input);
    const result = await orderService.markCodCollected(admin.id, orderNumber);
    refresh(orderNumber);
    return result;
  });
}

/** A shipped COD parcel refused at the door: cancel, fail the cash payment, restock (payment-policy.md §7). */
export async function markRefusedAtDoorAction(input: unknown) {
  return runAdminAction("markRefusedAtDoor", async (admin) => {
    const { orderNumber, reason } = orderWithReasonSchema.parse(input);
    const result = await orderService.markRefusedAtDoor(admin.id, orderNumber, reason);
    refresh(orderNumber);
    sendDueStockAlerts();
    return result;
  });
}

/** Records a refund already made in the eSewa/Khalti dashboard (payment-policy.md §10). */
export async function recordRefundAction(input: unknown) {
  return runAdminAction("recordRefund", async (admin) => {
    const { orderNumber, reason } = orderWithReasonSchema.parse(input);
    const result = await orderService.recordRefund(admin.id, orderNumber, reason);
    refresh(orderNumber);
    return result;
  });
}

/** Re-checks the latest payment with the provider (same code path as callbacks). */
export async function reverifyPaymentAction(input: unknown) {
  return runAdminAction("reverifyPayment", async (admin) => {
    const { orderNumber } = orderRefSchema.parse(input);
    const result = await orderService.reverifyPayment(admin.id, orderNumber);
    refresh(orderNumber);
    return result;
  });
}

/**
 * Last resort from runbooks/payment-stuck-pending.md step 6, on the one attempt whose money the owner confirmed in
 * the provider dashboard.
 */
export async function markPaidManuallyAction(input: unknown) {
  return runAdminAction("markPaidManually", async (admin) => {
    const { orderNumber, paymentId, reason } = orderAttemptWithReasonSchema.parse(input);
    const result = await orderService.markPaidManually(admin.id, orderNumber, paymentId, reason);
    refresh(orderNumber);
    return result;
  });
}

/** Records the refund of a late or second payment, made in the eSewa/Khalti dashboard (specs/payment-window.md). */
export async function refundAttemptAction(input: unknown) {
  return runAdminAction("refundAttempt", async (admin) => {
    const { orderNumber, paymentId, reason } = orderAttemptWithReasonSchema.parse(input);
    const result = await orderService.refundAttempt(admin.id, orderNumber, paymentId, reason);
    refresh(orderNumber);
    return result;
  });
}

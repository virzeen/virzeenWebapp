"use server";

import "server-only";
import { orderService } from "@virzeen/core";
import { advanceOrderSchema, orderRefSchema, orderWithReasonSchema } from "@virzeen/validators";
import { revalidatePath } from "next/cache";
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

/** Last resort from runbooks/payment-stuck-pending.md step 6, after the owner confirmed the money arrived. */
export async function markPaidManuallyAction(input: unknown) {
  return runAdminAction("markPaidManually", async (admin) => {
    const { orderNumber, reason } = orderWithReasonSchema.parse(input);
    const result = await orderService.markPaidManually(admin.id, orderNumber, reason);
    refresh(orderNumber);
    return result;
  });
}

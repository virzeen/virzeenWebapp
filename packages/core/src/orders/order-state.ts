import "server-only";
import type { OrderStatus, PaymentStatus, Prisma } from "@virzeen/db";
import { AppError } from "../errors";

// The ONLY place order and payment statuses change (CLAUDE.md §5.4, payment-policy.md §3).
// Transitions are conditional updates: a duplicate request finds the status already moved and becomes a no-op.

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  // CANCELLED only for a COD parcel refused at the door (orderService.markRefusedAtDoor, payment-policy.md §7).
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  UNPAID: ["PENDING", "COD_DUE"],
  PENDING: ["PAID", "FAILED", "EXPIRED"],
  PAID: ["REFUNDED", "PARTIALLY_REFUNDED"],
  COD_DUE: ["COD_COLLECTED", "FAILED"],
  FAILED: [],
  EXPIRED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: [],
  COD_COLLECTED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

const ORDER_TIMESTAMPS: Partial<Record<OrderStatus, keyof Prisma.OrderUpdateManyMutationInput>> = {
  CONFIRMED: "confirmedAt",
  SHIPPED: "shippedAt",
  DELIVERED: "deliveredAt",
  CANCELLED: "cancelledAt",
};

export type TransitionResult<S> = { changed: boolean; from: S };

type OrderTransitionInput = {
  orderId: string;
  to: OrderStatus;
  /** "system", "customer:<id>", "admin:<id>", "provider:esewa", "cron:reconcile" */
  actor: string;
  reason?: string;
  /** Only allow the move from these statuses (in addition to the state machine). */
  expectFrom?: readonly OrderStatus[];
  /** Extra fields written with the status (e.g. courierName, trackingNumber, cancelReason). */
  data?: Prisma.OrderUpdateManyMutationInput;
  now?: Date;
};

/**
 * Moves an order to `to`. Returns `{ changed: false }` when it is already there (idempotent),
 * throws INVALID_STATE_TRANSITION when the move isn't allowed. Must run inside a transaction.
 */
export async function transitionOrder(
  tx: Prisma.TransactionClient,
  input: OrderTransitionInput,
): Promise<TransitionResult<OrderStatus>> {
  const order = await tx.order.findUnique({ where: { id: input.orderId }, select: { status: true } });
  if (!order) throw new AppError("NOT_FOUND", "Order not found.");
  const from = order.status;
  if (from === input.to) return { changed: false, from };
  if (!canTransitionOrder(from, input.to) || (input.expectFrom && !input.expectFrom.includes(from))) {
    throw new AppError("INVALID_STATE_TRANSITION", `An order can't move from ${from} to ${input.to}.`, {
      meta: { from, to: input.to },
    });
  }

  const timestampField = ORDER_TIMESTAMPS[input.to];
  const updated = await tx.order.updateMany({
    where: { id: input.orderId, status: from },
    data: {
      ...input.data,
      status: input.to,
      ...(timestampField ? { [timestampField]: input.now ?? new Date() } : {}),
    },
  });
  if (updated.count === 0) {
    throw new AppError("CONFLICT", "The order changed while we were updating it. Please try again.");
  }

  await tx.orderEvent.create({
    data: {
      orderId: input.orderId,
      type: "ORDER_STATUS",
      from,
      to: input.to,
      actor: input.actor,
      reason: input.reason ?? null,
    },
  });
  return { changed: true, from };
}

type PaymentTransitionInput = {
  orderId: string;
  /** The payment attempt row to move with the order's payment status. */
  paymentId?: string;
  to: PaymentStatus;
  actor: string;
  reason?: string;
  paymentData?: Prisma.PaymentUpdateManyMutationInput;
};

/**
 * Moves the order's payment status (and the payment attempt row) to `to`.
 * Idempotent: if the payment is already in `to`, returns `{ changed: false }` without side effects.
 */
export async function transitionPayment(
  tx: Prisma.TransactionClient,
  input: PaymentTransitionInput,
): Promise<TransitionResult<PaymentStatus>> {
  const order = await tx.order.findUnique({ where: { id: input.orderId }, select: { paymentStatus: true } });
  if (!order) throw new AppError("NOT_FOUND", "Order not found.");
  const from = order.paymentStatus;
  if (from === input.to) return { changed: false, from };
  if (!canTransitionPayment(from, input.to)) {
    throw new AppError("INVALID_STATE_TRANSITION", `A payment can't move from ${from} to ${input.to}.`, {
      meta: { from, to: input.to },
    });
  }

  const updated = await tx.order.updateMany({
    where: { id: input.orderId, paymentStatus: from },
    data: { paymentStatus: input.to },
  });
  if (updated.count === 0) {
    throw new AppError("CONFLICT", "The payment changed while we were updating it. Please try again.");
  }

  if (input.paymentId) {
    const paymentUpdated = await tx.payment.updateMany({
      where: { id: input.paymentId, orderId: input.orderId },
      data: { ...input.paymentData, status: input.to },
    });
    if (paymentUpdated.count === 0) throw new AppError("NOT_FOUND", "Payment not found.");
  }

  await tx.orderEvent.create({
    data: {
      orderId: input.orderId,
      type: "PAYMENT_STATUS",
      from,
      to: input.to,
      actor: input.actor,
      reason: input.reason ?? null,
    },
  });
  return { changed: true, from };
}

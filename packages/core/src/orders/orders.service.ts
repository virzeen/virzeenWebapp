import "server-only";
import { db, type OrderStatus, type PaymentStatus, type Prisma } from "@virzeen/db";
import type { AdminOrderFilters, AdvanceOrderInput } from "@virzeen/validators";
import { recordAudit } from "../audit/audit";
import { AppError } from "../errors";
import { notifications } from "../notifications/notifications";
import { paymentService, type VerifyOutcome } from "../payments/payment.service";
import { cancelOrderAndRestock } from "./cancellation";
import { transitionAttempt, transitionOrder, transitionPayment } from "./order-state";

export type AddressSnapshot = {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  city: string;
  street: string;
  landmark: string | null;
};

const summarySelect = {
  orderNumber: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  totalPaisa: true,
  createdAt: true,
  items: { select: { id: true, productName: true, imageUrl: true, quantity: true }, take: 3 },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

const detailSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  subtotalPaisa: true,
  shippingPaisa: true,
  discountPaisa: true,
  discountCode: true,
  totalPaisa: true,
  shippingZone: true,
  addressSnapshot: true,
  customerEmail: true,
  courierName: true,
  trackingNumber: true,
  cancelReason: true,
  reservedUntil: true,
  createdAt: true,
  items: {
    select: {
      id: true,
      productName: true,
      productSlug: true,
      sku: true,
      variantLabel: true,
      imageUrl: true,
      unitPricePaisa: true,
      quantity: true,
    },
  },
  events: {
    select: { id: true, type: true, from: true, to: true, actor: true, reason: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.OrderSelect;

type DetailRow = Prisma.OrderGetPayload<{ select: typeof detailSelect }>;

function toDetail(row: DetailRow) {
  return { ...row, address: row.addressSnapshot as AddressSnapshot };
}

export type OrderDetail = ReturnType<typeof toDetail>;

const ADMIN_PAGE_SIZE = 20;

async function latestPaymentIdIn(tx: Prisma.TransactionClient, orderId: string) {
  const payment = await tx.payment.findFirst({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return payment ? { paymentId: payment.id } : {};
}

/**
 * A payment that arrived after the order closed unpaid (its 15 minutes ran out, or the customer cancelled;
 * specs/payment-window.md): the owner refunds it. Null for every other order, including a paid order an admin
 * cancelled (that's an ordinary refund).
 */
export type LatePayment = "TO_REFUND" | "REFUNDED" | null;

async function latePaymentOf(order: {
  id: string;
  status: string;
  paymentStatus: string;
}): Promise<LatePayment> {
  if (order.status !== "CANCELLED" || !["EXPIRED", "FAILED"].includes(order.paymentStatus)) return null;
  const attempts = await db.payment.findMany({
    where: { orderId: order.id, provider: { not: "COD" }, status: { in: ["PAID", "REFUNDED"] } },
    select: { status: true },
  });
  if (attempts.some((attempt) => attempt.status === "PAID")) return "TO_REFUND";
  return attempts.length > 0 ? "REFUNDED" : null;
}

async function findOrderId(orderNumber: string) {
  const order = await db.order.findUnique({ where: { orderNumber }, select: { id: true } });
  if (!order) throw new AppError("NOT_FOUND", "Order not found.");
  return order.id;
}

export const orderService = {
  // ── Customer ──

  async listForUser(userId: string, options: { cursor?: string | undefined; limit?: number } = {}) {
    const limit = options.limit ?? 20;
    const rows = await db.order.findMany({
      where: { userId },
      select: { id: true, ...summarySelect },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, limit);
    return { items: page, nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null };
  },

  /** Another customer's order is "not found" (security-policy.md §3). */
  async getForUser(userId: string, orderNumber: string): Promise<OrderDetail & { latePayment: LatePayment }> {
    const row = await db.order.findFirst({ where: { orderNumber, userId }, select: detailSelect });
    if (!row) throw new AppError("NOT_FOUND", "Order not found.");
    return { ...toDetail(row), latePayment: await latePaymentOf(row) };
  },

  /**
   * "Cancel order" on the customer's own online order that still waits for payment (specs/payment-window.md): first
   * re-checks its open attempts (paid → refused), then cancels it with the stock, the discount's use and the items
   * back in the bag. Open attempts stay watched, so a payment made anyway still reaches the owner for a refund.
   */
  async cancelUnpaidForCustomer(userId: string, orderNumber: string, now = new Date()) {
    const actor = `customer:${userId}`;
    const order = await db.order.findFirst({
      where: { orderNumber, userId },
      select: { id: true, status: true, paymentMethod: true },
    });
    if (!order) throw new AppError("NOT_FOUND", "Order not found.");
    if (order.status === "CANCELLED") return { orderNumber };
    if (order.status !== "PENDING" || order.paymentMethod === "COD") {
      throw new AppError("CONFLICT", "This order can't be cancelled here. Contact us and we'll help.");
    }
    const checked = await paymentService.verifyOpenAttempts(order.id, { actor, now, trigger: "cancel" });
    if (checked.paid) throw new AppError("CONFLICT", "This order has just been paid.");
    // eSewa or Khalti couldn't say whether money was taken: keep the order (payment-policy.md §1.5).
    if (!checked.answered) {
      throw new AppError("CONFLICT", "We're still checking your payment. Please try again in a few minutes.");
    }
    await db.$transaction(async (tx) => {
      const current = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        select: { status: true, paymentStatus: true },
      });
      if (current.status === "CANCELLED") return;
      if (current.status !== "PENDING") throw new AppError("CONFLICT", "This order has just been paid.");
      const reason = "Cancelled by the customer";
      if (current.paymentStatus === "PENDING") {
        await transitionPayment(tx, { orderId: order.id, to: "FAILED", actor, reason });
      }
      await cancelOrderAndRestock(tx, {
        orderId: order.id,
        actor,
        reason,
        restoreToCart: true,
        expectFrom: ["PENDING"],
      });
    });
    return { orderNumber };
  },

  // ── Admin ──

  async listForAdmin(filters: AdminOrderFilters) {
    const where: Prisma.OrderWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.q
        ? {
            OR: [
              { orderNumber: { contains: filters.q.toUpperCase() } },
              { customerEmail: { contains: filters.q.toLowerCase() } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({
        where,
        select: { id: true, ...summarySelect, customerEmail: true },
        orderBy: { createdAt: "desc" },
        skip: (filters.page - 1) * ADMIN_PAGE_SIZE,
        take: ADMIN_PAGE_SIZE,
      }),
    ]);
    return { rows, total, page: filters.page, pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
  },

  async getForAdmin(orderNumber: string) {
    const row = await db.order.findUnique({
      where: { orderNumber },
      select: {
        ...detailSelect,
        user: { select: { id: true, name: true, email: true } },
        paidPaymentId: true,
        payments: {
          select: {
            id: true,
            provider: true,
            providerRef: true,
            attempt: true,
            amountPaisa: true,
            status: true,
            providerTxnId: true,
            verifiedAt: true,
            lastCheckedAt: true,
            lastIssue: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!row) throw new AppError("NOT_FOUND", "Order not found.");
    // The attempt that paid the order, while it's paid; any other paid attempt is a payment to refund.
    const payingPaymentId = row.paymentStatus === "PAID" ? row.paidPaymentId : null;
    return { ...toDetail(row), user: row.user, payments: row.payments, payingPaymentId };
  },

  /** Fulfilment steps (payment-policy.md §3). Every step is audited; shipping emails the customer. */
  async advance(actorId: string, input: AdvanceOrderInput) {
    const orderId = await findOrderId(input.orderNumber);
    const actor = `admin:${actorId}`;
    const effects = await db.$transaction(async (tx) => {
      const current = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { status: true, paymentStatus: true },
      });
      let emailCancelled: string | null = null;
      switch (input.to) {
        case "PROCESSING":
          await transitionOrder(tx, { orderId, to: "PROCESSING", actor, reason: "Packing started" });
          break;
        case "SHIPPED":
          await transitionOrder(tx, {
            orderId,
            to: "SHIPPED",
            actor,
            reason: `Shipped with ${input.courierName}`,
            data: { courierName: input.courierName, trackingNumber: input.trackingNumber },
          });
          break;
        case "DELIVERED":
          await transitionOrder(tx, { orderId, to: "DELIVERED", actor, reason: "Delivered" });
          break;
        case "RETURNED":
          await transitionOrder(tx, { orderId, to: "RETURNED", actor, reason: input.reason });
          break;
        case "CANCELLED": {
          if (current.paymentStatus === "PENDING") {
            throw new AppError(
              "CONFLICT",
              "This order has an online payment in progress. Re-verify the payment first; unpaid orders expire on their own.",
            );
          }
          const result = await cancelOrderAndRestock(tx, {
            orderId,
            actor,
            reason: input.reason,
            restoreToCart: false,
            // A shipped order can only be cancelled as a COD refusal (markRefusedAtDoor).
            expectFrom: ["PENDING", "CONFIRMED", "PROCESSING"],
          });
          if (result.changed && current.paymentStatus === "COD_DUE") {
            await transitionPayment(tx, {
              orderId,
              ...(await latestPaymentIdIn(tx, orderId)),
              to: "FAILED",
              actor,
              reason: "Order cancelled before delivery",
            });
          }
          if (result.changed) emailCancelled = input.reason;
          break;
        }
      }
      await recordAudit(tx, {
        actorId,
        action: `order.${input.to.toLowerCase()}`,
        entity: "Order",
        entityId: orderId,
        diff: { from: current.status, to: input.to },
      });
      return { emailCancelled };
    });

    if (input.to === "SHIPPED") await notifications.orderShipped(orderId);
    if (effects.emailCancelled) await notifications.orderCancelled(orderId, effects.emailCancelled);
    return { orderNumber: input.orderNumber };
  },

  async markCodCollected(actorId: string, orderNumber: string) {
    const orderId = await findOrderId(orderNumber);
    await db.$transaction(async (tx) => {
      await transitionPayment(tx, {
        orderId,
        ...(await latestPaymentIdIn(tx, orderId)),
        to: "COD_COLLECTED",
        actor: `admin:${actorId}`,
        reason: "Cash collected",
        paymentData: { verifiedAt: new Date() },
      });
      await recordAudit(tx, { actorId, action: "order.cod_collected", entity: "Order", entityId: orderId });
    });
    return { orderNumber };
  },

  /**
   * A COD parcel the customer refused at the door (payment-policy.md §7, owner decision 2026-09-28): the order
   * is cancelled, the cash payment fails and the stock goes back, in one transaction. No customer email.
   */
  async markRefusedAtDoor(actorId: string, orderNumber: string, note: string) {
    const orderId = await findOrderId(orderNumber);
    const actor = `admin:${actorId}`;
    await db.$transaction(async (tx) => {
      const current = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { status: true, paymentMethod: true, paymentStatus: true },
      });
      if (current.status === "CANCELLED") return; // already recorded (double click)
      if (
        current.status !== "SHIPPED" ||
        current.paymentMethod !== "COD" ||
        current.paymentStatus !== "COD_DUE"
      ) {
        throw new AppError(
          "INVALID_STATE_TRANSITION",
          "Only a shipped cash-on-delivery order whose cash hasn't been collected can be marked as refused.",
          { meta: { from: current.status, paymentStatus: current.paymentStatus } },
        );
      }
      await cancelOrderAndRestock(tx, {
        orderId,
        actor,
        reason: `Refused at delivery: ${note}`,
        restoreToCart: false,
        expectFrom: ["SHIPPED"],
      });
      await transitionPayment(tx, {
        orderId,
        ...(await latestPaymentIdIn(tx, orderId)),
        to: "FAILED",
        actor,
        reason: "Refused at delivery",
      });
      await recordAudit(tx, {
        actorId,
        action: "order.refused_at_door",
        entity: "Order",
        entityId: orderId,
        diff: { from: current.status, to: "CANCELLED" },
      });
    });
    return { orderNumber };
  },

  /**
   * Phase 1: the refund itself is done in the provider dashboard; this records it (payment-policy.md §10). Refunds
   * the order's payment, marking the attempt that paid it (`paidPaymentId`; never a second payment, which
   * `refundAttempt` records).
   */
  async recordRefund(actorId: string, orderNumber: string, reason: string) {
    const orderId = await findOrderId(orderNumber);
    await db.$transaction(async (tx) => {
      const { paidPaymentId } = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { paidPaymentId: true },
      });
      await transitionPayment(tx, {
        orderId,
        ...(paidPaymentId ? { paymentId: paidPaymentId } : {}),
        to: "REFUNDED",
        actor: `admin:${actorId}`,
        reason,
      });
      await recordAudit(tx, {
        actorId,
        action: "order.refund_recorded",
        entity: "Order",
        entityId: orderId,
        diff: { reason },
      });
    });
    return { orderNumber };
  },

  /**
   * "Re-verify payment" button (runbooks/payment-stuck-pending.md step 4): same code path as callbacks. Checks every
   * open attempt (Pay now can make several), else the newest one, even one we stopped waiting for.
   */
  async reverifyPayment(actorId: string, orderNumber: string) {
    const orderId = await findOrderId(orderNumber);
    const attempts = await db.payment.findMany({
      where: { orderId, provider: { in: ["ESEWA", "KHALTI"] } },
      select: { id: true, status: true },
      orderBy: { createdAt: "desc" },
    });
    const newest = attempts[0];
    if (!newest) throw new AppError("NOT_FOUND", "This order has no online payment attempt.");
    const open = attempts.filter((attempt) => attempt.status === "PENDING");
    let result = { outcome: "OTHER" as VerifyOutcome, orderNumber, answered: true };
    for (const attempt of open.length > 0 ? open : [newest]) {
      result = await paymentService.verifyPayment(attempt.id, {
        actor: `admin:${actorId}`,
        trigger: "admin",
      });
      if (result.outcome === "PAID") break;
    }
    await db.auditLog.create({
      data: {
        actorId,
        action: "order.reverify_payment",
        entity: "Order",
        entityId: orderId,
        diff: { outcome: result.outcome },
      },
    });
    return result;
  },

  /**
   * "Mark paid" on one payment attempt (runbook step 6), only after the owner confirmed that attempt's money in the
   * provider dashboard. The owner picks the attempt: an order can have several open at once (Pay now), and marking
   * the wrong one would later send the real payment for a refund. Only while the order still waits for payment. The
   * reason must include the provider reference; it is stored on the timeline and in the audit log.
   */
  async markPaidManually(actorId: string, orderNumber: string, paymentId: string, reason: string) {
    const orderId = await findOrderId(orderNumber);
    const actor = `admin:${actorId}`;
    const confirmedNow = await db.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, orderId },
        select: { id: true, provider: true, status: true },
      });
      if (!payment) throw new AppError("NOT_FOUND", "Payment not found.");
      if (payment.provider === "COD" || !["PENDING", "FAILED", "EXPIRED"].includes(payment.status)) {
        throw new AppError(
          "INVALID_STATE_TRANSITION",
          "Only an unpaid online payment attempt can be marked paid.",
        );
      }
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { status: true, paymentStatus: true },
      });
      if (order.status !== "PENDING" || order.paymentStatus !== "PENDING") {
        throw new AppError(
          "INVALID_STATE_TRANSITION",
          "This order isn't waiting for payment. A payment made for it now needs a refund.",
        );
      }
      const paid = await transitionPayment(tx, {
        orderId,
        paymentId: payment.id,
        to: "PAID",
        actor,
        reason: `Manual: ${reason}`,
        paymentData: { verifiedAt: new Date(), lastIssue: "MANUAL" },
      });
      // Paid by a callback a moment ago: nothing to mark, and the customer already has their email.
      if (!paid.changed) throw new AppError("CONFLICT", "This order has just been paid.");
      const confirmed = await transitionOrder(tx, {
        orderId,
        to: "CONFIRMED",
        actor,
        reason: "Payment confirmed manually",
        data: { reservedUntil: null, paymentMethod: payment.provider },
      });
      await recordAudit(tx, {
        actorId,
        action: "order.mark_paid_manual",
        entity: "Order",
        entityId: orderId,
        diff: { paymentId: payment.id, reason },
      });
      return confirmed.changed;
    });
    if (confirmedNow) await notifications.orderConfirmed(orderId);
    return { orderNumber };
  },

  /**
   * Records the refund of one payment attempt the order didn't need: a payment that came after the order closed, or a
   * second payment for a paid order (specs/payment-window.md). The refund itself is done in the provider dashboard
   * (payment-policy.md §10). The order is unchanged; the attempt that paid it is refunded with `recordRefund`.
   */
  async refundAttempt(actorId: string, orderNumber: string, paymentId: string, reason: string) {
    const orderId = await findOrderId(orderNumber);
    await db.$transaction(async (tx) => {
      const order = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: {
          paymentStatus: true,
          paidPaymentId: true,
          payments: { where: { id: paymentId }, select: { id: true, provider: true, status: true } },
        },
      });
      const payment = order.payments[0];
      if (!payment || payment.provider === "COD") throw new AppError("NOT_FOUND", "Payment not found.");
      if (payment.status !== "PAID") {
        throw new AppError("INVALID_STATE_TRANSITION", "Only a paid attempt can be refunded.");
      }
      // An order paid before `paidPaymentId` existed can't say which attempt paid it: never guess.
      if (order.paymentStatus === "PAID" && (order.paidPaymentId === payment.id || !order.paidPaymentId)) {
        throw new AppError(
          "INVALID_STATE_TRANSITION",
          "This attempt paid the order. Refund the order with Record refund instead.",
        );
      }
      await transitionAttempt(tx, {
        orderId,
        paymentId: payment.id,
        to: "REFUNDED",
        actor: `admin:${actorId}`,
        reason: `Refunded: ${reason}`,
      });
      await recordAudit(tx, {
        actorId,
        action: "order.attempt_refund_recorded",
        entity: "Order",
        entityId: orderId,
        diff: { paymentId: payment.id, reason },
      });
    });
    return { orderNumber };
  },

  /**
   * Numbers for the admin dashboard. Each to-do tile links to the orders list filtered by that status, and
   * counts with the same filter as listForAdmin, so the number matches the list it opens.
   */
  async dashboardStats(now = new Date()) {
    const nepalOffset = 345 * 60_000; // Nepal is UTC+5:45
    const nepalMidnight = new Date(now.getTime() + nepalOffset);
    nepalMidnight.setUTCHours(0, 0, 0, 0);
    const startOfDay = new Date(nepalMidnight.getTime() - nepalOffset);
    const paidStatuses: PaymentStatus[] = ["PAID", "COD_DUE", "COD_COLLECTED"];
    const countWithStatus = (status: OrderStatus) => db.order.count({ where: { status } });
    const [toPack, toShip, awaitingPayment, today] = await Promise.all([
      countWithStatus("CONFIRMED"),
      countWithStatus("PROCESSING"),
      countWithStatus("PENDING"),
      db.order.aggregate({
        where: { createdAt: { gte: startOfDay }, paymentStatus: { in: paidStatuses } },
        _sum: { totalPaisa: true },
        _count: { _all: true },
      }),
    ]);
    return {
      toPack,
      toShip,
      awaitingPayment,
      todayOrders: today._count._all,
      todayRevenuePaisa: today._sum.totalPaisa ?? 0,
    };
  },
};

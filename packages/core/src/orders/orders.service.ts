import "server-only";
import { db, type OrderStatus, type PaymentStatus, type Prisma } from "@virzeen/db";
import type { AdminOrderFilters, AdvanceOrderInput } from "@virzeen/validators";
import { recordAudit } from "../audit/audit";
import { AppError } from "../errors";
import { notifications } from "../notifications/notifications";
import { paymentService } from "../payments/payment.service";
import { cancelOrderAndRestock } from "./cancellation";
import { transitionOrder, transitionPayment } from "./order-state";

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
  async getForUser(userId: string, orderNumber: string): Promise<OrderDetail> {
    const row = await db.order.findFirst({ where: { orderNumber, userId }, select: detailSelect });
    if (!row) throw new AppError("NOT_FOUND", "Order not found.");
    return toDetail(row);
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
    return { ...toDetail(row), user: row.user, payments: row.payments };
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

  /** Phase 1: the refund itself is done in the provider dashboard; this records it (payment-policy.md §10). */
  async recordRefund(actorId: string, orderNumber: string, reason: string) {
    const orderId = await findOrderId(orderNumber);
    await db.$transaction(async (tx) => {
      const paymentId = await tx.payment.findFirst({
        where: { orderId, status: "PAID" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      await transitionPayment(tx, {
        orderId,
        ...(paymentId ? { paymentId: paymentId.id } : {}),
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

  /** "Re-verify payment" button (runbooks/payment-stuck-pending.md step 4): same code path as callbacks. */
  async reverifyPayment(actorId: string, orderNumber: string) {
    const orderId = await findOrderId(orderNumber);
    const paymentId = await paymentService.latestPaymentId(orderId);
    if (!paymentId) throw new AppError("NOT_FOUND", "This order has no payment attempt.");
    const result = await paymentService.verifyPayment(paymentId, { actor: `admin:${actorId}` });
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
   * "Mark paid (manual)" (runbook step 6) — only after the owner confirmed the money in the provider dashboard.
   * The reason must include the provider reference; it is stored on the timeline and in the audit log.
   */
  async markPaidManually(actorId: string, orderNumber: string, reason: string) {
    const orderId = await findOrderId(orderNumber);
    const confirmed = await db.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { orderId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (!payment)
        throw new AppError("INVALID_STATE_TRANSITION", "Only a pending online payment can be marked paid.");
      const actor = `admin:${actorId}`;
      await transitionPayment(tx, {
        orderId,
        paymentId: payment.id,
        to: "PAID",
        actor,
        reason: `Manual: ${reason}`,
        paymentData: { verifiedAt: new Date(), lastIssue: "MANUAL" },
      });
      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } });
      let didConfirm = false;
      if (order.status === "PENDING") {
        await transitionOrder(tx, {
          orderId,
          to: "CONFIRMED",
          actor,
          reason: "Payment confirmed manually",
          data: { reservedUntil: null },
        });
        didConfirm = true;
      }
      await recordAudit(tx, {
        actorId,
        action: "order.mark_paid_manual",
        entity: "Order",
        entityId: orderId,
        diff: { reason },
      });
      return didConfirm;
    });
    if (confirmed) await notifications.orderConfirmed(orderId);
    return { orderNumber };
  },

  /** Numbers for the admin dashboard. */
  async dashboardStats(now = new Date()) {
    const nepalOffset = 345 * 60_000; // Nepal is UTC+5:45
    const nepalMidnight = new Date(now.getTime() + nepalOffset);
    nepalMidnight.setUTCHours(0, 0, 0, 0);
    const startOfDay = new Date(nepalMidnight.getTime() - nepalOffset);
    const paidStatuses: PaymentStatus[] = ["PAID", "COD_DUE", "COD_COLLECTED"];
    const openStatuses: OrderStatus[] = ["CONFIRMED", "PROCESSING"];
    const [toFulfil, shipped, pendingPayments, today] = await Promise.all([
      db.order.count({ where: { status: { in: openStatuses } } }),
      db.order.count({ where: { status: "SHIPPED" } }),
      db.payment.count({ where: { status: "PENDING" } }),
      db.order.aggregate({
        where: { createdAt: { gte: startOfDay }, paymentStatus: { in: paidStatuses } },
        _sum: { totalPaisa: true },
        _count: { _all: true },
      }),
    ]);
    return {
      toFulfil,
      shipped,
      pendingPayments,
      todayOrders: today._count._all,
      todayRevenuePaisa: today._sum.totalPaisa ?? 0,
    };
  },
};

import "server-only";
import { db, type PaymentMethod, type Prisma } from "@virzeen/db";
import { getCoreConfig } from "../config";
import { AppError, isAppError } from "../errors";
import { notifications } from "../notifications/notifications";
import { cancelOrderAndRestock } from "../orders/cancellation";
import { transitionOrder, transitionPayment } from "../orders/order-state";
import { decodeEsewaCallback, esewaProvider } from "./esewa";
import { khaltiProvider } from "./khalti";
import type { PaymentProvider, ProviderVerdict } from "./provider";

// The single verification path used by callbacks, reconciliation and admin re-verify (payment-policy.md §8).

export type VerifyOutcome =
  | "PAID" // verified now or earlier
  | "PENDING" // still waiting on the provider
  | "FAILED" // cancelled/abandoned; order cancelled, stock restored
  | "EXPIRED" // reservation ran out; order cancelled, stock restored
  | "MISMATCH" // provider amount ≠ order total; left unpaid, owner alerted
  | "OTHER"; // any other final state (refunded, COD...)

export type VerifyResult = { outcome: VerifyOutcome; orderNumber: string };

export function providerFor(method: PaymentMethod): PaymentProvider {
  if (method === "ESEWA") return esewaProvider;
  if (method === "KHALTI") return khaltiProvider;
  throw new AppError("INTERNAL", "Cash on delivery has no online provider.");
}

const paymentSelect = {
  id: true,
  provider: true,
  providerRef: true,
  amountPaisa: true,
  status: true,
  flaggedAt: true,
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalPaisa: true,
      reservedUntil: true,
      userId: true,
    },
  },
} satisfies Prisma.PaymentSelect;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

function outcomeOfStatus(status: PaymentRow["status"]): VerifyOutcome {
  if (status === "PAID") return "PAID";
  if (status === "PENDING") return "PENDING";
  if (status === "FAILED") return "FAILED";
  if (status === "EXPIRED") return "EXPIRED";
  return "OTHER";
}

const toJson = (raw: unknown) => JSON.parse(JSON.stringify(raw ?? null)) as Prisma.InputJsonValue;

async function recordCheck(payment: PaymentRow, now: Date, issue: string, raw?: unknown) {
  await db.payment.update({
    where: { id: payment.id },
    data: {
      lastCheckedAt: now,
      lastIssue: issue,
      ...(raw === undefined ? {} : { rawResponse: toJson(raw) }),
    },
  });
}

async function markPaid(
  payment: PaymentRow,
  verdict: Extract<ProviderVerdict, { kind: "COMPLETED" }>,
  actor: string,
  now: Date,
) {
  const result = await db.$transaction(async (tx) => {
    const paid = await transitionPayment(tx, {
      orderId: payment.order.id,
      paymentId: payment.id,
      to: "PAID",
      actor,
      reason: `Verified with ${payment.provider} (${verdict.providerStatus})`,
      paymentData: {
        verifiedAt: now,
        lastCheckedAt: now,
        lastIssue: null,
        providerTxnId: verdict.providerTxnId,
        rawResponse: toJson(verdict.raw),
      },
    });
    if (!paid.changed) return { confirmed: false, orderWasOpen: true };
    const order = await tx.order.findUniqueOrThrow({
      where: { id: payment.order.id },
      select: { status: true },
    });
    if (order.status !== "PENDING") return { confirmed: false, orderWasOpen: false };
    await transitionOrder(tx, {
      orderId: payment.order.id,
      to: "CONFIRMED",
      actor,
      reason: "Payment verified",
      data: { reservedUntil: null },
      now,
    });
    return { confirmed: true, orderWasOpen: true };
  });

  if (result.confirmed) await notifications.orderConfirmed(payment.order.id);
  if (!result.orderWasOpen) {
    await notifications.alertOwner("Payment received for a closed order", [
      `Order ${payment.order.orderNumber} was already closed when ${payment.provider} confirmed payment.`,
      `Provider reference: ${payment.providerRef}. Refund or re-open it manually.`,
    ]);
  }
}

async function markUnsuccessful(
  payment: PaymentRow,
  to: "FAILED" | "EXPIRED",
  actor: string,
  reason: string,
  raw: unknown,
  now: Date,
) {
  await db.$transaction(async (tx) => {
    const moved = await transitionPayment(tx, {
      orderId: payment.order.id,
      paymentId: payment.id,
      to,
      actor,
      reason,
      paymentData: { lastCheckedAt: now, lastIssue: to, rawResponse: toJson(raw) },
    });
    if (!moved.changed) return;
    const order = await tx.order.findUniqueOrThrow({
      where: { id: payment.order.id },
      select: { status: true },
    });
    if (order.status === "PENDING") {
      await cancelOrderAndRestock(tx, { orderId: payment.order.id, actor, reason, restoreToCart: true });
    }
  });
}

async function flagOnce(payment: PaymentRow, title: string, lines: string[]) {
  const flagged = await db.payment.updateMany({
    where: { id: payment.id, flaggedAt: null },
    data: { flaggedAt: new Date() },
  });
  if (flagged.count > 0) await notifications.alertOwner(title, lines);
}

type VerifyOptions = {
  actor: string;
  now?: Date;
  /** The customer came back through the provider's failure/cancel URL (their own session). */
  customerAbandoned?: boolean;
};

async function verifyRow(payment: PaymentRow, options: VerifyOptions): Promise<VerifyResult> {
  const now = options.now ?? new Date();
  const orderNumber = payment.order.orderNumber;
  if (payment.status !== "PENDING" || payment.provider === "COD") {
    return { outcome: outcomeOfStatus(payment.status), orderNumber };
  }
  const { logger } = getCoreConfig();
  const verdict = await providerFor(payment.provider).verify({
    providerRef: payment.providerRef,
    amountPaisa: payment.amountPaisa,
  });
  logger.info("payment verified with provider", {
    orderNumber,
    provider: payment.provider,
    providerRef: payment.providerRef,
    verdict: verdict.kind,
  });

  const reservationOver = payment.order.reservedUntil !== null && payment.order.reservedUntil <= now;

  switch (verdict.kind) {
    case "COMPLETED": {
      if (verdict.amountPaisa !== payment.order.totalPaisa || verdict.amountPaisa !== payment.amountPaisa) {
        await recordCheck(payment, now, "AMOUNT_MISMATCH", verdict.raw);
        await flagOnce(payment, "Payment amount mismatch", [
          `Order ${orderNumber}: ${payment.provider} reports ${verdict.amountPaisa} paisa, order total is ${payment.order.totalPaisa} paisa.`,
          `Provider reference: ${payment.providerRef}. The order is NOT marked paid. Check the merchant dashboard.`,
        ]);
        logger.error("payment amount mismatch", { orderNumber, providerRef: payment.providerRef });
        return { outcome: "MISMATCH", orderNumber };
      }
      await markPaid(payment, verdict, options.actor, now);
      return { outcome: "PAID", orderNumber };
    }
    case "CANCELLED":
      await markUnsuccessful(payment, "FAILED", options.actor, "Payment was cancelled", verdict.raw, now);
      return { outcome: "FAILED", orderNumber };
    case "EXPIRED":
      await markUnsuccessful(payment, "EXPIRED", options.actor, "Payment link expired", verdict.raw, now);
      return { outcome: "EXPIRED", orderNumber };
    case "PENDING":
    case "NOT_FOUND":
      if (options.customerAbandoned) {
        await markUnsuccessful(
          payment,
          "FAILED",
          options.actor,
          "Customer left the payment page",
          verdict.raw,
          now,
        );
        return { outcome: "FAILED", orderNumber };
      }
      if (reservationOver) {
        await markUnsuccessful(
          payment,
          "EXPIRED",
          options.actor,
          "Payment was not completed in time",
          verdict.raw,
          now,
        );
        return { outcome: "EXPIRED", orderNumber };
      }
      await recordCheck(payment, now, verdict.providerStatus, verdict.raw);
      return { outcome: "PENDING", orderNumber };
    case "AMBIGUOUS":
      await recordCheck(payment, now, verdict.providerStatus, verdict.raw);
      return { outcome: "PENDING", orderNumber };
    case "REFUNDED":
      await recordCheck(payment, now, verdict.providerStatus, verdict.raw);
      await flagOnce(payment, "Refund reported for an unpaid order", [
        `Order ${orderNumber}: ${payment.provider} reports "${verdict.providerStatus}" for ${payment.providerRef}.`,
      ]);
      return { outcome: "PENDING", orderNumber };
    case "ERROR":
      await recordCheck(payment, now, "PROVIDER_ERROR");
      logger.warn("payment provider error", {
        orderNumber,
        provider: payment.provider,
        message: verdict.message,
      });
      return { outcome: "PENDING", orderNumber };
  }
}

export const paymentService = {
  /** Re-checks one payment attempt with its provider and applies the result. Safe to call repeatedly. */
  async verifyPayment(paymentId: string, options: VerifyOptions): Promise<VerifyResult> {
    const payment = await db.payment.findUnique({ where: { id: paymentId }, select: paymentSelect });
    if (!payment) throw new AppError("NOT_FOUND", "Payment not found.");
    try {
      return await verifyRow(payment, options);
    } catch (error) {
      // A concurrent callback/reconciliation won the race: report whatever state it left behind.
      if (isAppError(error) && error.code === "CONFLICT") {
        const latest = await db.payment.findUniqueOrThrow({
          where: { id: paymentId },
          select: { status: true },
        });
        return { outcome: outcomeOfStatus(latest.status), orderNumber: payment.order.orderNumber };
      }
      throw error;
    }
  },

  /** eSewa success redirect: check the signature, then verify with the status API (never trust the redirect). */
  async handleEsewaSuccess(data: string): Promise<VerifyResult> {
    const payload = decodeEsewaCallback(data);
    const payment = await db.payment.findUnique({
      where: { providerRef: payload.transaction_uuid },
      select: { id: true, provider: true },
    });
    if (!payment || payment.provider !== "ESEWA") throw new AppError("NOT_FOUND", "Payment not found.");
    return paymentService.verifyPayment(payment.id, { actor: "provider:esewa" });
  },

  /**
   * eSewa failure redirect. Only the order's own customer can end the attempt early; anyone else just gets the
   * order number back and reconciliation settles it (so a guessed URL can't cancel someone's order).
   */
  async handleEsewaFailure(
    transactionUuid: string,
    sessionUserId: string | null,
  ): Promise<VerifyResult | null> {
    const payment = await db.payment.findUnique({
      where: { providerRef: transactionUuid },
      select: { id: true, provider: true, order: { select: { userId: true, orderNumber: true } } },
    });
    if (!payment || payment.provider !== "ESEWA") return null;
    if (payment.order.userId !== sessionUserId)
      return { outcome: "PENDING", orderNumber: payment.order.orderNumber };
    return paymentService.verifyPayment(payment.id, { actor: "provider:esewa", customerAbandoned: true });
  },

  /** Khalti return URL: the pidx only tells us which payment to look up. */
  async handleKhaltiReturn(pidx: string): Promise<VerifyResult | null> {
    const payment = await db.payment.findUnique({
      where: { providerRef: pidx },
      select: { id: true, provider: true },
    });
    if (!payment || payment.provider !== "KHALTI") return null;
    return paymentService.verifyPayment(payment.id, { actor: "provider:khalti" });
  },

  /** Latest payment attempt for an order, for admin re-verify. */
  async latestPaymentId(orderId: string): Promise<string | null> {
    const payment = await db.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    return payment?.id ?? null;
  },
};

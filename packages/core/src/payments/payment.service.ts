import "server-only";
import { db, type PaymentMethod, type Prisma } from "@virzeen/db";
import { getCoreConfig } from "../config";
import { AppError, isAppError, isUniqueViolation } from "../errors";
import { notifications } from "../notifications/notifications";
import { cancelOrderAndRestock } from "../orders/cancellation";
import { transitionAttempt, transitionOrder, transitionPayment } from "../orders/order-state";
import { decodeEsewaCallback, esewaProvider } from "./esewa";
import { khaltiProvider } from "./khalti";
import type { CheckoutNext, PaymentProvider, ProviderVerdict } from "./provider";

// The single verification path used by callbacks, reconciliation, Pay now and admin re-verify (payment-policy.md §8).
// An online order waits for payment for 15 minutes (specs/payment-window.md): its payment status stays PENDING
// while attempts come and go, and only the order's end (paid, cancelled, time up) moves it. Each attempt row is
// watched on its own until its provider gives a final answer or ATTEMPT_WATCH_MINUTES pass, so a payment that
// arrives after the order closed is still seen (and refunded by the owner).

const MINUTE = 60_000;
/** Provider links last about 60 minutes; an attempt still unpaid after this is expired. */
export const ATTEMPT_WATCH_MINUTES = 70;
/** Pay now needs at least this much of the 15 minutes left. */
export const PAY_NOW_MIN_LEFT_MINUTES = 2;
/** Most payment attempts one order takes. */
export const MAX_PAYMENT_ATTEMPTS = 5;

export type VerifyOutcome =
  | "PAID" // the order is paid (now or earlier)
  | "PENDING" // the provider hasn't settled it; the order still waits
  | "RETRY" // this attempt didn't go through; the order still waits for payment (Pay now)
  | "FAILED" // the order is closed unpaid (cancelled)
  | "EXPIRED" // the order is closed unpaid: the 15 minutes ran out
  | "LATE" // paid, but the order was already closed or paid: the owner refunds it
  | "MISMATCH" // provider amount ≠ order total; left unpaid, owner alerted
  | "OTHER"; // any other final state (refunded, COD...)

export type VerifyResult = {
  outcome: VerifyOutcome;
  orderNumber: string;
  /** False when the provider gave no usable answer (an error, a "halt" state): never treat it as unpaid. */
  answered: boolean;
};

/** Why the verification runs: decides what "not paid yet" means for the customer coming back. */
export type VerifyTrigger = "return-success" | "return-failure" | "cron" | "admin" | "pay-now" | "cancel";

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
  attempt: true,
  createdAt: true,
  flaggedAt: true,
  order: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      totalPaisa: true,
      userId: true,
    },
  },
} satisfies Prisma.PaymentSelect;

type PaymentRow = Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>;

const toJson = (raw: unknown) => JSON.parse(JSON.stringify(raw ?? null)) as Prisma.InputJsonValue;

/** The order is still waiting for its online payment. */
const isWaiting = (order: { status: string; paymentStatus: string }) =>
  order.status === "PENDING" && order.paymentStatus === "PENDING";

/** What the order's state means for the customer when this attempt isn't paid (now). */
async function orderOutcome(orderId: string, notPaid: "PENDING" | "RETRY"): Promise<VerifyOutcome> {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { status: true, paymentStatus: true },
  });
  if (order.paymentStatus === "PAID") return "PAID";
  if (order.status === "CANCELLED") return order.paymentStatus === "EXPIRED" ? "EXPIRED" : "FAILED";
  if (order.status === "PENDING") return notPaid;
  return "OTHER";
}

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

async function flagOnce(payment: PaymentRow, title: string, lines: string[]) {
  const flagged = await db.payment.updateMany({
    where: { id: payment.id, flaggedAt: null },
    data: { flaggedAt: new Date() },
  });
  if (flagged.count > 0) await notifications.alertOwner(title, lines);
}

/**
 * A verified, exact payment. The order still waiting → paid and confirmed. Already closed (cancelled, or paid by
 * another attempt) → the attempt is recorded as paid, the order stays as it is, and the owner is told once to refund.
 */
async function settlePaid(
  payment: PaymentRow,
  verdict: Extract<ProviderVerdict, { kind: "COMPLETED" }>,
  actor: string,
  now: Date,
): Promise<"PAID" | "LATE"> {
  const paymentData = {
    verifiedAt: now,
    lastCheckedAt: now,
    lastIssue: null,
    providerTxnId: verdict.providerTxnId,
    rawResponse: toJson(verdict.raw),
  };
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: payment.order.id },
      select: { status: true, paymentStatus: true },
    });
    if (isWaiting(order)) {
      const paid = await transitionPayment(tx, {
        orderId: payment.order.id,
        paymentId: payment.id,
        to: "PAID",
        actor,
        reason: `Verified with ${payment.provider} (${verdict.providerStatus})`,
        paymentData,
      });
      if (paid.changed) {
        const confirmed = await transitionOrder(tx, {
          orderId: payment.order.id,
          to: "CONFIRMED",
          actor,
          reason: "Payment verified",
          data: { reservedUntil: null },
          now,
        });
        return { confirmed: confirmed.changed, late: false };
      }
      // Paid meanwhile: by this same attempt (a duplicate callback, nothing to do) or by another one (this one is
      // a second payment, recorded below for a refund).
    }
    const moved = await transitionAttempt(tx, {
      orderId: payment.order.id,
      paymentId: payment.id,
      to: "PAID",
      actor,
      reason: `Verified with ${payment.provider} after the order closed`,
      paymentData,
    });
    return { confirmed: false, late: moved.changed };
  });

  if (result.confirmed) {
    await notifications.orderConfirmed(payment.order.id);
    return "PAID";
  }
  if (result.late) {
    await flagOnce(payment, "Payment received for a closed order", [
      `Order ${payment.order.orderNumber} was already closed when ${payment.provider} confirmed a payment of ${payment.amountPaisa} paisa.`,
      `Provider reference: ${payment.providerRef}. Refund it in the ${payment.provider} merchant dashboard, then record it in admin.`,
    ]);
  }
  const paid = await db.order.findUniqueOrThrow({
    where: { id: payment.order.id },
    select: { paymentStatus: true },
  });
  // Another attempt paid this order and this one paid too, or the order was closed: both need a refund of this one.
  return paid.paymentStatus === "PAID" && !result.late ? "PAID" : "LATE";
}

/** Ends one attempt with the provider's final "not paid" answer. The order keeps waiting until its time is up. */
async function endAttempt(
  payment: PaymentRow,
  to: "FAILED" | "EXPIRED",
  actor: string,
  reason: string,
  raw: unknown,
  now: Date,
) {
  await db.$transaction((tx) =>
    transitionAttempt(tx, {
      orderId: payment.order.id,
      paymentId: payment.id,
      to,
      actor,
      reason,
      paymentData: { lastCheckedAt: now, lastIssue: to, rawResponse: toJson(raw) },
    }),
  );
}

type VerifyOptions = { actor: string; trigger: VerifyTrigger; now?: Date };

async function verifyRow(payment: PaymentRow, options: VerifyOptions): Promise<VerifyResult> {
  const now = options.now ?? new Date();
  const orderNumber = payment.order.orderNumber;
  const notPaid = options.trigger === "return-failure" ? "RETRY" : "PENDING";
  const answered = (outcome: VerifyOutcome): VerifyResult => ({ outcome, orderNumber, answered: true });

  // A customer coming back from the provider's success page, or an admin's re-verify, checks the attempt even after we
  // gave up on it (a late payment).
  const checkable =
    payment.status === "PENDING" ||
    ((options.trigger === "return-success" || options.trigger === "admin") &&
      (payment.status === "FAILED" || payment.status === "EXPIRED"));
  if (payment.provider === "COD" || !checkable) {
    if (payment.status === "PAID") {
      return answered(
        payment.order.paymentStatus === "PAID" && payment.order.status !== "CANCELLED" ? "PAID" : "LATE",
      );
    }
    return answered(await orderOutcome(payment.order.id, notPaid));
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

  switch (verdict.kind) {
    case "COMPLETED": {
      if (verdict.amountPaisa !== payment.order.totalPaisa || verdict.amountPaisa !== payment.amountPaisa) {
        await recordCheck(payment, now, "AMOUNT_MISMATCH", verdict.raw);
        await flagOnce(payment, "Payment amount mismatch", [
          `Order ${orderNumber}: ${payment.provider} reports ${verdict.amountPaisa} paisa, order total is ${payment.order.totalPaisa} paisa.`,
          `Provider reference: ${payment.providerRef}. The order is NOT marked paid. Check the merchant dashboard.`,
        ]);
        logger.error("payment amount mismatch", { orderNumber, providerRef: payment.providerRef });
        return answered("MISMATCH");
      }
      return answered(await settlePaid(payment, verdict, options.actor, now));
    }
    case "CANCELLED":
      if (payment.status === "PENDING") {
        await endAttempt(payment, "FAILED", options.actor, "Payment was cancelled", verdict.raw, now);
      }
      return answered(await orderOutcome(payment.order.id, "RETRY"));
    case "EXPIRED":
      if (payment.status === "PENDING") {
        await endAttempt(payment, "EXPIRED", options.actor, "Payment link expired", verdict.raw, now);
      }
      return answered(await orderOutcome(payment.order.id, "RETRY"));
    case "PENDING":
    case "NOT_FOUND": {
      const watchOver = now.getTime() - payment.createdAt.getTime() >= ATTEMPT_WATCH_MINUTES * MINUTE;
      if (payment.status === "PENDING" && watchOver) {
        await endAttempt(payment, "EXPIRED", options.actor, "No payment was made", verdict.raw, now);
      } else {
        await recordCheck(payment, now, verdict.providerStatus, verdict.raw);
      }
      return answered(await orderOutcome(payment.order.id, notPaid));
    }
    case "AMBIGUOUS":
      await recordCheck(payment, now, verdict.providerStatus, verdict.raw);
      return { outcome: await orderOutcome(payment.order.id, "PENDING"), orderNumber, answered: false };
    case "REFUNDED":
      await recordCheck(payment, now, verdict.providerStatus, verdict.raw);
      await flagOnce(payment, "Refund reported for an unpaid order", [
        `Order ${orderNumber}: ${payment.provider} reports "${verdict.providerStatus}" for ${payment.providerRef}.`,
      ]);
      return { outcome: await orderOutcome(payment.order.id, "PENDING"), orderNumber, answered: false };
    case "ERROR":
      await recordCheck(payment, now, "PROVIDER_ERROR");
      logger.warn("payment provider error", {
        orderNumber,
        provider: payment.provider,
        message: verdict.message,
      });
      return { outcome: await orderOutcome(payment.order.id, "PENDING"), orderNumber, answered: false };
  }
}

type AddressSnapshot = { fullName: string; phone: string };

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
        return {
          outcome: await orderOutcome(payment.order.id, "PENDING"),
          orderNumber: payment.order.orderNumber,
          answered: false,
        };
      }
      throw error;
    }
  },

  /**
   * Re-checks every open attempt of an order (Pay now, Cancel order, admin re-verify, the 15-minute end). Stops at the
   * first that confirms the order. `answered` is false when any provider couldn't answer.
   */
  async verifyOpenAttempts(
    orderId: string,
    options: VerifyOptions,
  ): Promise<{ paid: boolean; answered: boolean }> {
    const open = await db.payment.findMany({
      where: { orderId, status: "PENDING", provider: { in: ["ESEWA", "KHALTI"] } },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    let answered = true;
    for (const { id } of open) {
      const result = await paymentService.verifyPayment(id, options);
      if (result.outcome === "PAID") return { paid: true, answered: true };
      if (!result.answered) answered = false;
    }
    return { paid: false, answered };
  },

  /**
   * The 15 minutes are up (specs/payment-window.md): re-checks the open attempts first; paid → confirmed. A provider
   * that couldn't answer keeps the order waiting (payment-policy.md §1.5). Otherwise the order is cancelled, its
   * payment EXPIRED, its stock and discount use returned and its items put back in the bag; open attempts stay
   * watched for a late payment. Idempotent.
   */
  async expireIfOverdue(
    orderId: string,
    options: { now: Date; actor: string },
  ): Promise<"PAID" | "KEPT" | "EXPIRED" | "NOT_DUE"> {
    const due = (order: { status: string; paymentMethod: string; reservedUntil: Date | null } | null) =>
      order !== null &&
      order.status === "PENDING" &&
      order.paymentMethod !== "COD" &&
      order.reservedUntil !== null &&
      order.reservedUntil <= options.now;
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { status: true, paymentMethod: true, reservedUntil: true },
    });
    if (!due(order)) return "NOT_DUE";
    const checked = await paymentService.verifyOpenAttempts(orderId, { ...options, trigger: "cron" });
    if (checked.paid) return "PAID";
    if (!checked.answered) return "KEPT";
    try {
      return await db.$transaction(async (tx) => {
        const current = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          select: { status: true, paymentMethod: true, paymentStatus: true, reservedUntil: true },
        });
        if (!due(current)) return "NOT_DUE";
        const reason = "Payment was not completed in time";
        if (current.paymentStatus === "PENDING") {
          await transitionPayment(tx, { orderId, to: "EXPIRED", actor: options.actor, reason });
        }
        const cancelled = await cancelOrderAndRestock(tx, {
          orderId,
          actor: options.actor,
          reason,
          restoreToCart: true,
          expectFrom: ["PENDING"],
        });
        return cancelled.changed ? "EXPIRED" : "NOT_DUE";
      });
    } catch (error) {
      // Paid at this very moment: the payment won.
      if (isAppError(error) && error.code === "CONFLICT") return "KEPT";
      throw error;
    }
  },

  /**
   * Pay now (specs/payment-window.md): a new attempt for the customer's own order that's still waiting, with the
   * same total, sent to the chosen provider. First re-checks the open attempts: one already paid → done.
   */
  async startAttempt(input: {
    userId: string;
    orderNumber: string;
    method: "ESEWA" | "KHALTI";
    now?: Date;
  }): Promise<{ orderNumber: string; next: CheckoutNext }> {
    const now = input.now ?? new Date();
    const actor = `customer:${input.userId}`;
    const found = await db.order.findFirst({
      where: { orderNumber: input.orderNumber, userId: input.userId },
      select: { id: true },
    });
    if (!found) throw new AppError("NOT_FOUND", "Order not found.");
    const checked = await paymentService.verifyOpenAttempts(found.id, { actor, now, trigger: "pay-now" });
    if (checked.paid) return { orderNumber: input.orderNumber, next: { type: "done" } };

    const order = await db.order.findUniqueOrThrow({
      where: { id: found.id },
      select: {
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        reservedUntil: true,
        subtotalPaisa: true,
        shippingPaisa: true,
        discountPaisa: true,
        totalPaisa: true,
        customerEmail: true,
        addressSnapshot: true,
        payments: { select: { attempt: true }, orderBy: { attempt: "desc" }, take: 1 },
      },
    });
    if (!isWaiting(order) || order.paymentMethod === "COD") {
      throw new AppError("CONFLICT", "This order isn't waiting for payment.");
    }
    if (
      !order.reservedUntil ||
      order.reservedUntil.getTime() - now.getTime() < PAY_NOW_MIN_LEFT_MINUTES * MINUTE
    ) {
      throw new AppError(
        "CONFLICT",
        "There isn't enough time left to pay. This order will be cancelled shortly.",
      );
    }
    const attempt = (order.payments[0]?.attempt ?? 0) + 1;
    if (attempt > MAX_PAYMENT_ATTEMPTS) {
      throw new AppError(
        "CONFLICT",
        "This order can't take more payment attempts. Cancel it and order again.",
      );
    }
    const address = order.addressSnapshot as AddressSnapshot;
    const { logger } = getCoreConfig();
    let initiated: Awaited<ReturnType<PaymentProvider["initiate"]>>;
    try {
      initiated = await providerFor(input.method).initiate(
        {
          orderNumber: input.orderNumber,
          subtotalPaisa: order.subtotalPaisa,
          shippingPaisa: order.shippingPaisa,
          discountPaisa: order.discountPaisa,
          totalPaisa: order.totalPaisa,
          customer: { name: address.fullName, email: order.customerEmail, phone: address.phone },
        },
        attempt,
      );
    } catch (error) {
      logger.error("payment initiation failed", {
        orderNumber: input.orderNumber,
        attempt,
        error: String(error),
      });
      throw new AppError("PAYMENT_FAILED", "Payment couldn't be started. Please try again.");
    }
    try {
      await db.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            orderId: found.id,
            provider: input.method,
            providerRef: initiated.providerRef,
            attempt,
            amountPaisa: order.totalPaisa,
            status: "UNPAID",
          },
          select: { id: true },
        });
        await transitionAttempt(tx, {
          orderId: found.id,
          paymentId: payment.id,
          to: "PENDING",
          actor,
          reason: `Sent to ${input.method}`,
        });
        if (input.method !== order.paymentMethod) {
          await tx.order.updateMany({
            where: { id: found.id, status: "PENDING" },
            data: { paymentMethod: input.method },
          });
        }
      });
    } catch (error) {
      // Pay now pressed twice at once: the other press already started this attempt (eSewa's reference is unique).
      if (isUniqueViolation(error)) {
        throw new AppError(
          "CONFLICT",
          "A payment for this order is already starting. Please wait a moment and try again.",
        );
      }
      throw error;
    }
    logger.info("payment attempt started", { orderNumber: input.orderNumber, attempt, method: input.method });
    return { orderNumber: input.orderNumber, next: initiated.next };
  },

  /** eSewa success redirect: check the signature, then verify with the status API (never trust the redirect). */
  async handleEsewaSuccess(data: string): Promise<VerifyResult> {
    const payload = decodeEsewaCallback(data);
    const payment = await db.payment.findUnique({
      where: { providerRef: payload.transaction_uuid },
      select: { id: true, provider: true },
    });
    if (!payment || payment.provider !== "ESEWA") throw new AppError("NOT_FOUND", "Payment not found.");
    return paymentService.verifyPayment(payment.id, { actor: "provider:esewa", trigger: "return-success" });
  },

  /**
   * eSewa failure redirect: re-checks the attempt (it may have been paid after all). Nothing ends early here, so
   * anyone hitting the URL changes nothing; the customer lands on their order with Pay now.
   */
  async handleEsewaFailure(transactionUuid: string): Promise<VerifyResult | null> {
    const payment = await db.payment.findUnique({
      where: { providerRef: transactionUuid },
      select: { id: true, provider: true },
    });
    if (!payment || payment.provider !== "ESEWA") return null;
    return paymentService.verifyPayment(payment.id, { actor: "provider:esewa", trigger: "return-failure" });
  },

  /** Khalti return URL: the pidx only tells us which payment to look up. */
  async handleKhaltiReturn(pidx: string): Promise<VerifyResult | null> {
    const payment = await db.payment.findUnique({
      where: { providerRef: pidx },
      select: { id: true, provider: true },
    });
    if (!payment || payment.provider !== "KHALTI") return null;
    return paymentService.verifyPayment(payment.id, { actor: "provider:khalti", trigger: "return-success" });
  },
};

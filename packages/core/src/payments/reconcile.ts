import "server-only";
import { db } from "@virzeen/db";
import { getCoreConfig } from "../config";
import { notifications } from "../notifications/notifications";
import { cancelOrderAndRestock } from "../orders/cancellation";
import { paymentService, type VerifyOutcome } from "./payment.service";

// Reconciliation cron, every 10 minutes (payment-policy.md §8). Idempotent and safe to run concurrently:
// every change goes through the same conditional transitions as the callbacks.

const MINUTE = 60_000;
export const RECHECK_AFTER_MINUTES = 5;
export const FLAG_AFTER_HOURS = 24;
const BATCH = 100;

export type ReconcileSummary = {
  checked: number;
  outcomes: Partial<Record<VerifyOutcome | "ERROR", number>>;
  expiredUnpaid: number;
  flagged: number;
};

export async function reconcilePayments(now = new Date()): Promise<ReconcileSummary> {
  const { logger } = getCoreConfig();
  const summary: ReconcileSummary = { checked: 0, outcomes: {}, expiredUnpaid: 0, flagged: 0 };
  const count = (key: VerifyOutcome | "ERROR") => {
    summary.outcomes[key] = (summary.outcomes[key] ?? 0) + 1;
  };

  // 1. Re-verify online payments that have been pending for a while (shared code path with callbacks).
  const pending = await db.payment.findMany({
    where: {
      status: "PENDING",
      provider: { in: ["ESEWA", "KHALTI"] },
      createdAt: { lt: new Date(now.getTime() - RECHECK_AFTER_MINUTES * MINUTE) },
    },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });
  for (const { id } of pending) {
    summary.checked += 1;
    try {
      const result = await paymentService.verifyPayment(id, { actor: "cron:reconcile", now });
      count(result.outcome);
    } catch (error) {
      count("ERROR");
      logger.error("reconcile: verify failed", { paymentId: id, error: String(error) });
    }
  }

  // 2. Orders whose reservation ran out before a payment attempt even started.
  const unpaid = await db.order.findMany({
    where: { status: "PENDING", paymentStatus: "UNPAID", reservedUntil: { lt: now } },
    select: { id: true, orderNumber: true },
    take: BATCH,
  });
  for (const order of unpaid) {
    const result = await db.$transaction((tx) =>
      cancelOrderAndRestock(tx, {
        orderId: order.id,
        actor: "cron:reconcile",
        reason: "Payment was not completed in time",
        restoreToCart: true,
      }),
    );
    if (result.changed) summary.expiredUnpaid += 1;
  }

  // 3. Payments still unresolved after 24h go to the owner once — never auto-resolved.
  const stuck = await db.payment.findMany({
    where: {
      status: "PENDING",
      flaggedAt: null,
      createdAt: { lt: new Date(now.getTime() - FLAG_AFTER_HOURS * 60 * MINUTE) },
    },
    select: {
      id: true,
      provider: true,
      providerRef: true,
      lastIssue: true,
      order: { select: { orderNumber: true } },
    },
    take: BATCH,
  });
  for (const payment of stuck) {
    const flagged = await db.payment.updateMany({
      where: { id: payment.id, flaggedAt: null },
      data: { flaggedAt: now },
    });
    if (flagged.count === 0) continue;
    summary.flagged += 1;
    await notifications.alertOwner("Payment still unresolved after 24 hours", [
      `Order ${payment.order.orderNumber} (${payment.provider} ${payment.providerRef}) is still pending.`,
      `Last provider answer: ${payment.lastIssue ?? "none"}. See docs/runbooks/payment-stuck-pending.md.`,
    ]);
  }

  logger.info("reconcile finished", summary);
  return summary;
}

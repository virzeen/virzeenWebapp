import "server-only";
import { db } from "@virzeen/db";
import { getCoreConfig } from "../config";
import { notifications } from "../notifications/notifications";
import { paymentService, type VerifyOutcome } from "./payment.service";

// Reconciliation cron, every 5 minutes (payment-policy.md §8, specs/payment-window.md). Idempotent and safe to run
// concurrently: every change goes through the same conditional transitions as the callbacks.

const MINUTE = 60_000;
export const RECHECK_AFTER_MINUTES = 5;
export const FLAG_AFTER_HOURS = 24;
/** The one "waiting for payment" email goes this long after the order is placed... */
export const REMINDER_AFTER_MINUTES = 5;
/** ...while at least this much of its 15 minutes is left. */
export const REMINDER_MIN_LEFT_MINUTES = 3;
const BATCH = 100;

export type ReconcileSummary = {
  checked: number;
  outcomes: Partial<Record<VerifyOutcome | "ERROR", number>>;
  /** Orders cancelled because their 15 minutes ran out. */
  expiredUnpaid: number;
  /** Orders past their 15 minutes kept waiting: a provider couldn't answer. */
  kept: number;
  reminded: number;
  flagged: number;
};

export async function reconcilePayments(now = new Date()): Promise<ReconcileSummary> {
  const { logger } = getCoreConfig();
  const summary: ReconcileSummary = {
    checked: 0,
    outcomes: {},
    expiredUnpaid: 0,
    kept: 0,
    reminded: 0,
    flagged: 0,
  };
  const count = (key: VerifyOutcome | "ERROR") => {
    summary.outcomes[key] = (summary.outcomes[key] ?? 0) + 1;
  };

  // 1. Re-verify open payment attempts that have been pending for a while (shared code path with callbacks), also
  //    those of orders already closed, so a late payment is still seen.
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
      const result = await paymentService.verifyPayment(id, {
        actor: "cron:reconcile",
        trigger: "cron",
        now,
      });
      count(result.outcome);
    } catch (error) {
      count("ERROR");
      logger.error("reconcile: verify failed", { paymentId: id, error: String(error) });
    }
  }

  // 2. Online orders whose 15 minutes are up: re-checked, then cancelled unless paid or a provider couldn't answer.
  const overdue = await db.order.findMany({
    where: { status: "PENDING", paymentMethod: { in: ["ESEWA", "KHALTI"] }, reservedUntil: { lt: now } },
    select: { id: true },
    orderBy: { reservedUntil: "asc" },
    take: BATCH,
  });
  for (const { id } of overdue) {
    try {
      const result = await paymentService.expireIfOverdue(id, { now, actor: "cron:reconcile" });
      if (result === "EXPIRED") summary.expiredUnpaid += 1;
      if (result === "KEPT") summary.kept += 1;
    } catch (error) {
      logger.error("reconcile: expiry failed", { orderId: id, error: String(error) });
    }
  }

  // 3. One "waiting for payment" email per order, claimed before it goes.
  const due = await db.order.findMany({
    where: {
      status: "PENDING",
      paymentStatus: "PENDING",
      paymentMethod: { in: ["ESEWA", "KHALTI"] },
      paymentReminderSentAt: null,
      createdAt: { lte: new Date(now.getTime() - REMINDER_AFTER_MINUTES * MINUTE) },
      reservedUntil: { gte: new Date(now.getTime() + REMINDER_MIN_LEFT_MINUTES * MINUTE) },
    },
    select: { id: true },
    take: BATCH,
  });
  for (const { id } of due) {
    const claimed = await db.order.updateMany({
      where: { id, paymentReminderSentAt: null, status: "PENDING" },
      data: { paymentReminderSentAt: now },
    });
    if (claimed.count === 0) continue;
    await notifications.paymentReminder(id);
    summary.reminded += 1;
  }

  // 4. Payments still unresolved after 24h go to the owner once — never auto-resolved.
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

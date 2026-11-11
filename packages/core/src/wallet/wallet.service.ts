import "server-only";
import { db, type Prisma, type WalletEntry, type WalletKind } from "@virzeen/db";
import { POINTS_EXPIRY_DAYS, pointsEarned } from "@virzeen/validators/limits";
import { recordAudit } from "../audit/audit";
import { AppError } from "../errors";

// The points and credit ledger (docs/specs/wallet.md). Balance = the sum of `remaining` on the lines that added to it.
// Spending takes from the oldest lines first and expiry takes what is left of lines past their date, so a member
// never loses points they already spent. Every change that must be atomic with an order runs in that order's
// transaction and locks the member's row first, so two checkouts can't spend the same points twice.

type Tx = Prisma.TransactionClient;
const DAY_MS = 24 * 60 * 60 * 1000;

export type WalletBalances = { points: number; creditPaisa: number };

export type WalletSummary = WalletBalances & {
  /** Points that expire first, and when; null when none will. */
  expiringSoon: { points: number; at: Date } | null;
  /** The newest lines, for the account page. */
  history: Pick<WalletEntry, "id" | "kind" | "type" | "amount" | "reason" | "createdAt">[];
};

async function lockUser(tx: Tx, userId: string) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
}

/** Zeroes what is left of points past their date and writes one EXPIRE line for each (idempotent). */
async function expireDue(tx: Tx, userId: string, now: Date) {
  const due = await tx.walletEntry.findMany({
    where: { userId, kind: "POINTS", remaining: { gt: 0 }, expiresAt: { lte: now } },
    select: { id: true, remaining: true },
  });
  for (const entry of due) {
    const cleared = await tx.walletEntry.updateMany({
      where: { id: entry.id, remaining: entry.remaining },
      data: { remaining: 0 },
    });
    if (cleared.count === 1) {
      await tx.walletEntry.create({
        data: {
          userId,
          kind: "POINTS",
          type: "EXPIRE",
          amount: -entry.remaining,
          reason: "Points expired",
          createdAt: now,
        },
      });
    }
  }
}

async function sumRemaining(tx: Tx, userId: string, kind: WalletKind): Promise<number> {
  const total = await tx.walletEntry.aggregate({
    where: { userId, kind, remaining: { gt: 0 } },
    _sum: { remaining: true },
  });
  return total._sum.remaining ?? 0;
}

async function balancesIn(tx: Tx, userId: string, now: Date): Promise<WalletBalances> {
  await expireDue(tx, userId, now);
  const [points, creditPaisa] = await Promise.all([
    sumRemaining(tx, userId, "POINTS"),
    sumRemaining(tx, userId, "CREDIT"),
  ]);
  return { points, creditPaisa };
}

/** Takes `amount` from the oldest lines that still have some left (soonest to expire first). */
async function consume(tx: Tx, userId: string, kind: WalletKind, amount: number) {
  let needed = amount;
  const lines = await tx.walletEntry.findMany({
    where: { userId, kind, remaining: { gt: 0 } },
    orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    select: { id: true, remaining: true },
  });
  for (const line of lines) {
    if (needed === 0) break;
    const take = Math.min(line.remaining, needed);
    const updated = await tx.walletEntry.updateMany({
      where: { id: line.id, remaining: { gte: take } },
      data: { remaining: { decrement: take } },
    });
    if (updated.count !== 1)
      throw new AppError("CONFLICT", "Your points or credit changed. Please try again.");
    needed -= take;
  }
  if (needed > 0) {
    throw new AppError("VALIDATION_FAILED", "You don't have enough points or credit for this order.");
  }
}

export const walletService = {
  /** The balances now (points past their date are expired first). */
  async balances(userId: string, now: Date = new Date()): Promise<WalletBalances> {
    return db.$transaction((tx) => balancesIn(tx, userId, now));
  },

  /** Inside an order's transaction: locks the member, expires what is due and returns the balances. */
  async lockedBalances(tx: Tx, userId: string, now: Date): Promise<WalletBalances> {
    await lockUser(tx, userId);
    return balancesIn(tx, userId, now);
  },

  /**
   * Spends points and credit on an order, inside that order's transaction (the caller has locked the member through
   * `lockedBalances`). Writes one SPEND line per kind, once per order.
   */
  async spendForOrder(
    tx: Tx,
    input: {
      userId: string;
      orderId: string;
      orderNumber: string;
      pointsUsed: number;
      creditUsedPaisa: number;
      now: Date;
    },
  ) {
    const reason = `Order ${input.orderNumber}`;
    for (const [kind, amount] of [
      ["POINTS", input.pointsUsed],
      ["CREDIT", input.creditUsedPaisa],
    ] as const) {
      if (amount <= 0) continue;
      await consume(tx, input.userId, kind, amount);
      await tx.walletEntry.create({
        data: {
          userId: input.userId,
          kind,
          type: "SPEND",
          amount: -amount,
          orderId: input.orderId,
          reason,
          createdAt: input.now,
        },
      });
    }
  },

  /**
   * Gives back what an order spent when it is cancelled (customer, admin, refused, failed or expired payment): one
   * REFUND line per kind, with no expiry. Idempotent.
   */
  async restoreForOrder(tx: Tx, orderId: string, now: Date = new Date()) {
    const spends = await tx.walletEntry.findMany({
      where: { orderId, type: "SPEND" },
      select: { userId: true, kind: true, amount: true },
    });
    for (const spend of spends) {
      const exists = await tx.walletEntry.findFirst({
        where: { orderId, type: "REFUND", kind: spend.kind },
        select: { id: true },
      });
      if (exists) continue;
      await tx.walletEntry.create({
        data: {
          userId: spend.userId,
          kind: spend.kind,
          type: "REFUND",
          amount: -spend.amount,
          remaining: -spend.amount,
          orderId,
          reason: "Order cancelled",
          createdAt: now,
        },
      });
    }
  },

  /**
   * Points for a delivered order: 1 per Rs 1,200 paid (Pass 2). MONO Member points expire after a year, Pass points
   * never. Once per order (a repeat does nothing); guests earn none.
   */
  async earnForOrder(tx: Tx, orderId: string, now: Date = new Date()) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { userId: true, tier: true, totalPaisa: true, orderNumber: true, status: true },
    });
    if (!order?.userId || order.status !== "DELIVERED") return 0;
    const points = pointsEarned(order.totalPaisa, order.tier);
    if (points <= 0) return 0;
    const already = await tx.walletEntry.findFirst({
      where: { orderId, type: "EARN", kind: "POINTS" },
      select: { id: true },
    });
    if (already) return 0;
    await tx.walletEntry.create({
      data: {
        userId: order.userId,
        kind: "POINTS",
        type: "EARN",
        amount: points,
        remaining: points,
        expiresAt: order.tier === "PASS" ? null : new Date(now.getTime() + POINTS_EXPIRY_DAYS * DAY_MS),
        orderId,
        reason: `Order ${order.orderNumber}`,
        createdAt: now,
      },
    });
    return points;
  },

  /** What the account page shows: balances, what expires first, and the newest lines. */
  async summary(userId: string, now: Date = new Date()): Promise<WalletSummary> {
    return db.$transaction(async (tx) => {
      const balances = await balancesIn(tx, userId, now);
      const soonest = await tx.walletEntry.findFirst({
        where: { userId, kind: "POINTS", remaining: { gt: 0 }, expiresAt: { not: null } },
        orderBy: { expiresAt: "asc" },
        select: { expiresAt: true },
      });
      const expiring = soonest?.expiresAt
        ? await tx.walletEntry.aggregate({
            where: { userId, kind: "POINTS", remaining: { gt: 0 }, expiresAt: soonest.expiresAt },
            _sum: { remaining: true },
          })
        : null;
      const history = await tx.walletEntry.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, kind: true, type: true, amount: true, reason: true, createdAt: true },
      });
      return {
        ...balances,
        expiringSoon:
          soonest?.expiresAt && expiring
            ? { points: expiring._sum.remaining ?? 0, at: soonest.expiresAt }
            : null,
        history,
      };
    });
  },

  /** Admin: adds points or credit to a customer (a gift, a goodwill credit). Audited. */
  async adminAdd(
    actorId: string,
    input: { userId: string; kind: WalletKind; amount: number; reason: string },
    now: Date = new Date(),
  ): Promise<void> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new AppError("VALIDATION_FAILED", "Enter an amount above zero.", {
        fields: { amount: "Enter an amount above zero" },
      });
    }
    await db.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: input.userId, role: "CUSTOMER" },
        select: { id: true },
      });
      if (!user) throw new AppError("NOT_FOUND", "Customer not found.");
      await tx.walletEntry.create({
        data: {
          userId: user.id,
          kind: input.kind,
          type: "ADJUST",
          amount: input.amount,
          remaining: input.amount,
          reason: input.reason,
          createdAt: now,
        },
      });
      await recordAudit(tx, {
        actorId,
        action: "wallet.add",
        entity: "User",
        entityId: user.id,
        diff: { kind: input.kind, amount: input.amount, reason: input.reason },
      });
    });
  },
};

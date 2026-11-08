import "server-only";
import { db, type Prisma } from "@virzeen/db";
import type { DiscountCodeInput } from "@virzeen/validators";
import { recordAudit } from "../audit/audit";
import { AppError, isUniqueViolation } from "../errors";
import {
  discountRefusal,
  discountRefusalError,
  endOfNepalDay,
  nepalDateOf,
  type DiscountRule,
} from "../pricing/discounts";

// Discount codes (docs/specs/discount-codes.md, payment-policy.md §2). Checkout checks a code with checkDiscount,
// takes a use inside the order transaction with claimDiscount, and every cancellation gives it back with
// releaseDiscountUse (orders/cancellation.ts).

const codeSelect = {
  id: true,
  code: true,
  kind: true,
  percentOff: true,
  amountOffPaisa: true,
  minSubtotalPaisa: true,
  endsAt: true,
  maxUses: true,
  usedCount: true,
  oncePerCustomer: true,
  isActive: true,
} satisfies Prisma.DiscountCodeSelect;

type Client = Prisma.TransactionClient | typeof db;

/** A code that passed every check for this bag: what the totals and the order need. */
export type AppliedDiscount = DiscountRule & { id: string; code: string };

type CheckInput = { code: string; userId: string; subtotalPaisa: number; now: Date };

/** The customer's orders with this code that aren't cancelled (a cancelled order gave its use back). */
function customerUses(client: Client, codeId: string, userId: string) {
  return client.order.count({ where: { userId, discountCodeId: codeId, status: { not: "CANCELLED" } } });
}

/** Checks a code against a bag without using it. Throws the reason as a field error for the code. */
export async function checkDiscount(client: Client, input: CheckInput): Promise<AppliedDiscount> {
  const row = await client.discountCode.findUnique({ where: { code: input.code }, select: codeSelect });
  const uses = row?.oncePerCustomer ? await customerUses(client, row.id, input.userId) : 0;
  const refusal = discountRefusal(row, {
    subtotalPaisa: input.subtotalPaisa,
    now: input.now,
    customerUses: uses,
  });
  if (refusal || !row) throw discountRefusalError(refusal ?? "INVALID", row);
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    percentOff: row.percentOff,
    amountOffPaisa: row.amountOffPaisa,
  };
}

/**
 * Inside the order transaction: takes one use with a conditional update first, so two orders can't take the last
 * use (the second waits for the first's lock, then finds none left). Then it checks the row as it is now, locked by
 * this transaction, so an edit made a moment earlier can't slip through; a refusal rolls the use back.
 */
export async function claimDiscount(
  tx: Prisma.TransactionClient,
  input: CheckInput,
): Promise<AppliedDiscount> {
  const found = await tx.discountCode.findUnique({ where: { code: input.code }, select: { id: true } });
  if (!found) throw discountRefusalError("INVALID", null);
  const claimed = await tx.discountCode.updateMany({
    where: {
      id: found.id,
      isActive: true,
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gte: input.now } }] },
        { OR: [{ maxUses: null }, { usedCount: { lt: tx.discountCode.fields.maxUses } }] },
      ],
    },
    data: { usedCount: { increment: 1 } },
  });
  const row = await tx.discountCode.findUnique({ where: { id: found.id }, select: codeSelect });
  if (claimed.count === 0 || !row) {
    // Switched off, ended, or another order took the last use: say why.
    const refusal = discountRefusal(row, {
      subtotalPaisa: input.subtotalPaisa,
      now: input.now,
      customerUses: 0,
    });
    throw discountRefusalError(refusal ?? "USED_UP", row);
  }
  const uses = row.oncePerCustomer ? await customerUses(tx, row.id, input.userId) : 0;
  // The count now includes this order's use; the limits apply to the count before it.
  const refusal = discountRefusal(
    { ...row, usedCount: row.usedCount - 1 },
    { subtotalPaisa: input.subtotalPaisa, now: input.now, customerUses: uses },
  );
  if (refusal) throw discountRefusalError(refusal, row);
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    percentOff: row.percentOff,
    amountOffPaisa: row.amountOffPaisa,
  };
}

/** A cancelled order gives its use back (same transaction as the cancellation). Never below 0. */
export async function releaseDiscountUse(
  tx: Prisma.TransactionClient,
  discountCodeId: string,
): Promise<void> {
  await tx.discountCode.updateMany({
    where: { id: discountCodeId, usedCount: { gt: 0 } },
    data: { usedCount: { decrement: 1 } },
  });
}

export type DiscountStatus = "ACTIVE" | "OFF" | "ENDED" | "USED_UP";

export type AdminDiscountRow = {
  id: string;
  code: string;
  kind: "PERCENT" | "FIXED";
  percentOff: number | null;
  amountOffPaisa: number | null;
  minSubtotalPaisa: number | null;
  /** The Nepal date it ends on, "YYYY-MM-DD", or null. */
  endsOn: string | null;
  maxUses: number | null;
  usedCount: number;
  oncePerCustomer: boolean;
  isActive: boolean;
  status: DiscountStatus;
};

/** How many codes the admin list shows (newest first). */
export const ADMIN_DISCOUNTS_SHOWN = 200;

function statusOf(
  row: { isActive: boolean; endsAt: Date | null; maxUses: number | null; usedCount: number },
  now: Date,
): DiscountStatus {
  if (!row.isActive) return "OFF";
  if (row.endsAt && row.endsAt.getTime() < now.getTime()) return "ENDED";
  if (row.maxUses !== null && row.usedCount >= row.maxUses) return "USED_UP";
  return "ACTIVE";
}

export const discountService = {
  /** Every code for /admin/discounts, newest first, with its status now. */
  async listForAdmin(now = new Date()): Promise<AdminDiscountRow[]> {
    const rows = await db.discountCode.findMany({
      orderBy: { createdAt: "desc" },
      take: ADMIN_DISCOUNTS_SHOWN,
      select: codeSelect,
    });
    return rows.map(({ endsAt, ...row }) => ({
      ...row,
      endsOn: endsAt ? nepalDateOf(endsAt) : null,
      status: statusOf({ ...row, endsAt }, now),
    }));
  },

  /**
   * Adds a code, or edits one. An edit changes only the limits and the switch: the code and what it takes off are
   * fixed once made, so a customer who applied it is never charged a different total at Place order. Audited in
   * the same transaction.
   */
  async save(actorId: string, input: DiscountCodeInput): Promise<{ id: string; code: string }> {
    const value = {
      kind: input.kind,
      percentOff: input.kind === "PERCENT" ? (input.percentOff ?? null) : null,
      amountOffPaisa: input.kind === "FIXED" ? (input.amountOffPaisa ?? null) : null,
    };
    const limits = {
      minSubtotalPaisa: input.minSubtotalPaisa ?? null,
      endsAt: input.endsOn ? endOfNepalDay(input.endsOn) : null,
      maxUses: input.maxUses ?? null,
      oncePerCustomer: input.oncePerCustomer,
      isActive: input.isActive,
    };
    try {
      return await db.$transaction(async (tx) => {
        let saved: { id: string; code: string };
        if (input.id) {
          const existing = await tx.discountCode.findUnique({
            where: { id: input.id },
            select: { id: true },
          });
          if (!existing) throw new AppError("NOT_FOUND", "Discount code not found.");
          saved = await tx.discountCode.update({
            where: { id: input.id },
            data: limits,
            select: { id: true, code: true },
          });
        } else {
          saved = await tx.discountCode.create({
            data: { ...value, ...limits, code: input.code },
            select: { id: true, code: true },
          });
        }
        await recordAudit(tx, {
          actorId,
          action: input.id ? "discount.update" : "discount.create",
          entity: "DiscountCode",
          entityId: saved.id,
          diff: {
            ...(input.id ? {} : value),
            ...limits,
            code: saved.code,
            endsAt: limits.endsAt?.toISOString() ?? null,
          },
        });
        return saved;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError("VALIDATION_FAILED", "This code is already used.", {
          fields: { code: "This code is already used" },
        });
      }
      throw error;
    }
  },
};

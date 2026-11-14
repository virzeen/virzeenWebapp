import "server-only";
import { db, type CustomerTier, type Prisma } from "@virzeen/db";
import {
  EXPRESS_DISTRICTS,
  EXPRESS_PER_MONTH,
  isBirthdayMonth,
  isExpressHours,
  nepalMonthStart,
} from "@virzeen/validators/limits";
import { AppError } from "../errors";

// Member perks that need a look at the member's own record: the birthday month and the monthly Express Delivery
// quota (docs/specs/member-perks.md). The prices themselves are in `calculateTotals`.

type OrderClient = Pick<Prisma.TransactionClient, "order">;

export type ExpressStatus = {
  /** The member may pick Express Delivery for this order. */
  available: boolean;
  /** Why not: a guest, an address outside the Valley and Pokhara, or this month's uses are spent. */
  reason: "GUEST" | "AREA" | "USED" | null;
  /** Uses a month for this tier, how many are spent this month and how many are left. */
  allowed: number;
  used: number;
  left: number;
  /** Ordered 9 AM to 6 PM Nepal time: the 3-hour promise holds; otherwise the order ships by 11 AM tomorrow. */
  withinHours: boolean;
};

/** Express Delivery for this buyer and address, from the orders they made this month (cancelled ones don't count). */
export async function expressStatusIn(
  client: OrderClient,
  input: { userId: string | null; tier: CustomerTier; district: string; now: Date },
): Promise<ExpressStatus> {
  const allowed = EXPRESS_PER_MONTH[input.tier];
  const withinHours = isExpressHours(input.now);
  if (!input.userId || allowed === 0) {
    return { available: false, reason: "GUEST", allowed, used: 0, left: 0, withinHours };
  }
  const used = await client.order.count({
    where: {
      userId: input.userId,
      express: true,
      status: { not: "CANCELLED" },
      createdAt: { gte: nepalMonthStart(input.now) },
    },
  });
  const left = Math.max(0, allowed - used);
  if (!EXPRESS_DISTRICTS.includes(input.district)) {
    return { available: false, reason: "AREA", allowed, used, left, withinHours };
  }
  if (left === 0) return { available: false, reason: "USED", allowed, used, left, withinHours };
  return { available: true, reason: null, allowed, used, left, withinHours };
}

export const perksService = {
  /** Whether it is the member's birthday month now (Nepal time). */
  async isBirthdayMonth(userId: string | null, now: Date = new Date()): Promise<boolean> {
    if (!userId) return false;
    const user = await db.user.findUnique({ where: { id: userId }, select: { birthday: true } });
    return isBirthdayMonth(user?.birthday, now);
  },

  /** Whether the member has saved a birthday. */
  async hasBirthday(userId: string): Promise<boolean> {
    const user = await db.user.findUnique({ where: { id: userId }, select: { birthday: true } });
    return user?.birthday != null;
  },

  /** Express Delivery status for the checkout and the portal (a read, no lock). */
  expressStatus(input: {
    userId: string | null;
    tier: CustomerTier;
    district: string;
    now?: Date;
  }): Promise<ExpressStatus> {
    return expressStatusIn(db, { ...input, now: input.now ?? new Date() });
  },

  /**
   * Takes one Express Delivery use for an order being made: the member's row is locked first so two checkouts can't
   * use the same one, then the quota is checked again. Call inside the order transaction.
   */
  async claimExpress(
    tx: Prisma.TransactionClient,
    input: { userId: string | null; tier: CustomerTier; district: string; now: Date },
  ): Promise<void> {
    if (input.userId) await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${input.userId} FOR UPDATE`;
    const status = await expressStatusIn(tx, input);
    if (status.available) return;
    const message =
      status.reason === "USED"
        ? "You have used your Express Delivery for this month."
        : status.reason === "AREA"
          ? "Express Delivery is for the Kathmandu Valley and Pokhara."
          : "Express Delivery is for MONO Members. Log in to use it.";
    throw new AppError("VALIDATION_FAILED", message, { fields: { express: message } });
  },
};

import "server-only";
import { randomInt } from "node:crypto";
import { db, type Prisma } from "@virzeen/db";
import { REFERRAL_FRIEND_PASS_MONTHS, REFERRAL_REWARD_PAISA } from "@virzeen/validators/limits";
import { levelOf } from "@virzeen/validators/membership";
import { AppError } from "../errors";

// Referral codes (docs/specs/member-perks.md): each member has one code; a friend enters it before their first order;
// when that order is delivered the member gets credit, once.

type Tx = Prisma.TransactionClient;
const DAY_MS = 24 * 60 * 60 * 1000;

/** No 0, O, 1, I or L: codes are read aloud and typed from a phone. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

function newCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export type ReferralSummary = {
  code: string;
  /** Friends who joined with this member's code, and how many of them have had the reward paid. */
  friends: number;
  rewarded: number;
  earnedPaisa: number;
  /** The code this member entered (the friend who invited them), or null. */
  invitedBy: { name: string } | null;
  /** The member can still enter a friend's code: none entered yet and no order placed. */
  canEnterCode: boolean;
};

export const referralService = {
  /** The member's own code, made the first time it is needed. */
  async codeFor(userId: string): Promise<string> {
    const user = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    if (!user) throw new AppError("NOT_FOUND", "Account not found.");
    if (user.referralCode) return user.referralCode;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = newCode();
      try {
        // Only while it is still empty, so two requests at once end up with the same code.
        const result = await db.user.updateMany({
          where: { id: userId, referralCode: null },
          data: { referralCode: code },
        });
        if (result.count === 1) return code;
        const again = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
        if (again?.referralCode) return again.referralCode;
      } catch {
        // Another member has this code: try a new one.
      }
    }
    throw new AppError("INTERNAL", "Couldn't make your referral code. Try again.");
  },

  async summary(userId: string): Promise<ReferralSummary> {
    const code = await this.codeFor(userId);
    const [made, invited, orders] = await Promise.all([
      db.referral.findMany({
        where: { referrerId: userId },
        select: { rewardedAt: true, rewardPaisa: true, reversedAt: true },
      }),
      db.referral.findUnique({
        where: { referredId: userId },
        select: { referrer: { select: { name: true } } },
      }),
      db.order.count({ where: { userId, status: { not: "CANCELLED" } } }),
    ]);
    return {
      code,
      friends: made.length,
      rewarded: made.filter((row) => row.rewardedAt !== null && row.reversedAt === null).length,
      earnedPaisa: made.reduce((sum, row) => sum + (row.reversedAt ? 0 : row.rewardPaisa), 0),
      invitedBy: invited ? { name: invited.referrer.name.trim().split(/\s+/)[0] || "A friend" } : null,
      canEnterCode: !invited && orders === 0,
    };
  },

  /** A friend enters a member's code, before their first order. Once only. */
  async applyCode(userId: string, rawCode: string): Promise<void> {
    const code = rawCode.trim().toUpperCase();
    const referrer = code
      ? await db.user.findUnique({ where: { referralCode: code }, select: { id: true } })
      : null;
    if (!referrer) {
      throw new AppError("VALIDATION_FAILED", "That code doesn't match anyone.", {
        fields: { code: "That code doesn't match anyone." },
      });
    }
    if (referrer.id === userId) {
      throw new AppError("VALIDATION_FAILED", "You can't use your own code.", {
        fields: { code: "You can't use your own code." },
      });
    }
    const orders = await db.order.count({ where: { userId, status: { not: "CANCELLED" } } });
    if (orders > 0) {
      throw new AppError("VALIDATION_FAILED", "A friend's code works before your first order.", {
        fields: { code: "A friend's code works before your first order." },
      });
    }
    try {
      await db.referral.create({ data: { referrerId: referrer.id, referredId: userId } });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        throw new AppError("VALIDATION_FAILED", "You have already used a friend's code.", {
          fields: { code: "You have already used a friend's code." },
        });
      }
      throw error;
    }
  },

  /**
   * Call when an order is delivered (inside its transaction). If it is the friend's first delivered order and a referral
   * is waiting, pays the referrer once: Rs 200 credit (Rs 300 with a running Pass, whose friend also gets a month of
   * the Pass). Returns the credit paid, or 0.
   */
  async rewardForDelivered(tx: Tx, orderId: string, now: Date = new Date()): Promise<number> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { userId: true, status: true, orderNumber: true },
    });
    if (!order?.userId || order.status !== "DELIVERED") return 0;
    const referral = await tx.referral.findUnique({
      where: { referredId: order.userId },
      select: { id: true, referrerId: true, rewardedAt: true },
    });
    if (!referral || referral.rewardedAt) return 0;
    const delivered = await tx.order.count({ where: { userId: order.userId, status: "DELIVERED" } });
    if (delivered !== 1) return 0;
    const referrer = await tx.user.findUnique({
      where: { id: referral.referrerId },
      select: { passEndsAt: true },
    });
    if (!referrer) return 0;
    const isPass = levelOf(referrer.passEndsAt, now) === "PASS";
    const rewardPaisa = REFERRAL_REWARD_PAISA[isPass ? "PASS" : "MEMBER"];
    // Claim the referral first, so two deliveries at once pay once.
    const claimed = await tx.referral.updateMany({
      where: { id: referral.id, rewardedAt: null },
      data: { rewardedAt: now, rewardPaisa, passGranted: isPass },
    });
    if (claimed.count !== 1) return 0;
    // No order id on the line: its once-only guard is the claim above, and an order's own credit lines stay free.
    const entry = await tx.walletEntry.create({
      data: {
        userId: referral.referrerId,
        kind: "CREDIT",
        type: "EARN",
        amount: rewardPaisa,
        remaining: rewardPaisa,
        expiresAt: null,
        reason: `A friend's first order ${order.orderNumber} was delivered`,
        createdAt: now,
      },
      select: { id: true },
    });
    await tx.referral.update({ where: { id: referral.id }, data: { rewardEntryId: entry.id } });
    if (isPass) {
      const friend = await tx.user.findUnique({
        where: { id: order.userId },
        select: { passEndsAt: true },
      });
      const running = friend?.passEndsAt && friend.passEndsAt > now;
      const from = running ? (friend?.passEndsAt as Date) : now;
      await tx.user.update({
        where: { id: order.userId },
        data: {
          ...(running ? {} : { passStartsAt: now }),
          passEndsAt: new Date(from.getTime() + REFERRAL_FRIEND_PASS_MONTHS * 30 * DAY_MS),
        },
      });
    }
    return rewardPaisa;
  },

  /**
   * Call when an order is returned (inside its transaction). If it was the friend's only delivered order and its
   * referral reward was paid, takes back what of the credit is still unspent. The friend keeps the Pass month.
   * Returns the credit taken back.
   */
  async reverseForReturn(tx: Tx, orderId: string, now: Date = new Date()): Promise<number> {
    const order = await tx.order.findUnique({ where: { id: orderId }, select: { userId: true } });
    if (!order?.userId) return 0;
    const referral = await tx.referral.findUnique({
      where: { referredId: order.userId },
      select: { id: true, referrerId: true, rewardedAt: true, reversedAt: true, rewardEntryId: true },
    });
    if (!referral?.rewardedAt || referral.reversedAt) return 0;
    const stillDelivered = await tx.order.count({ where: { userId: order.userId, status: "DELIVERED" } });
    if (stillDelivered > 0) return 0;
    const claimed = await tx.referral.updateMany({
      where: { id: referral.id, reversedAt: null },
      data: { reversedAt: now },
    });
    if (claimed.count !== 1) return 0;
    const entry = referral.rewardEntryId
      ? await tx.walletEntry.findUnique({
          where: { id: referral.rewardEntryId },
          select: { id: true, remaining: true },
        })
      : null;
    const taken = entry?.remaining ?? 0;
    if (entry && taken > 0) {
      await tx.walletEntry.update({ where: { id: entry.id }, data: { remaining: 0 } });
      await tx.walletEntry.create({
        data: {
          userId: referral.referrerId,
          kind: "CREDIT",
          type: "ADJUST",
          amount: -taken,
          remaining: 0,
          reason: "Referral reward taken back: the friend's first order was returned",
          createdAt: now,
        },
      });
    }
    return taken;
  },

  /** Admin: every referral, newest first, with who invited whom and whether the reward was paid. */
  async adminList(limit = 100) {
    return db.referral.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        rewardedAt: true,
        rewardPaisa: true,
        passGranted: true,
        reversedAt: true,
        referrer: { select: { name: true, email: true } },
        referred: { select: { name: true, email: true } },
      },
    });
  },
};

import "server-only";
import { db, type CustomerTier, type ShoppingPreference } from "@virzeen/db";
import { emailSchema } from "@virzeen/validators";
import { deliveryFeeFor } from "@virzeen/validators/limits";
import { levelOf } from "@virzeen/validators/membership";
import { recordAudit } from "../audit/audit";
import { AppError } from "../errors";

// Member accounts: the email check at the top of sign-in, the create-account details, and whether a password is set
// (docs/checkoutfeatures.md §3.2–3.4, specs/sign-in-v2.md). Sign-in itself (codes, sessions, passwords) is Better Auth's.

export type SignupProfile = {
  preference: ShoppingPreference;
  /** "YYYY-MM-DD" or null/empty when the customer left it out. */
  birthday?: string | null | undefined;
  marketingOptIn: boolean;
  now?: Date;
};

const CREDENTIAL = "credential";

export type Membership = {
  /** The Monochrome Pass while it runs, otherwise a free MONO Member. */
  level: "FREE" | "PASS";
  passStartsAt: Date | null;
  passEndsAt: Date | null;
  /** Whole days until the Pass ends, rounded up; 0 without a running Pass. */
  daysLeft: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const memberService = {
  /** The member's level for the account pages (specs/membership-portal.md). */
  async membership(userId: string, now: Date = new Date()): Promise<Membership> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { passStartsAt: true, passEndsAt: true },
    });
    if (!user) throw new AppError("NOT_FOUND", "Account not found.");
    const level = levelOf(user.passEndsAt, now);
    const daysLeft =
      level === "PASS" && user.passEndsAt
        ? Math.ceil((user.passEndsAt.getTime() - now.getTime()) / DAY_MS)
        : 0;
    return { level, ...user, daysLeft };
  },

  /** Who is buying, for the price rules: a guest, a MONO Member, or a member with a running Pass. */
  async tierFor(userId: string | null, now: Date = new Date()): Promise<CustomerTier> {
    if (!userId) return "GUEST";
    const user = await db.user.findUnique({ where: { id: userId }, select: { passEndsAt: true } });
    return levelOf(user?.passEndsAt, now) === "PASS" ? "PASS" : "MEMBER";
  },

  /**
   * What the Pass has saved this member so far, from their Pass orders that weren't cancelled: the 10% (only when no
   * code replaced it) and the delivery fee a MONO Member would have paid on that bag.
   */
  async passSavings(userId: string): Promise<{ orders: number; savedPaisa: number }> {
    const orders = await db.order.findMany({
      where: { userId, tier: "PASS", status: { not: "CANCELLED" } },
      select: { subtotalPaisa: true, discountPaisa: true, discountCode: true },
    });
    let savedPaisa = 0;
    for (const order of orders) {
      const passDiscount = order.discountCode ? 0 : order.discountPaisa;
      savedPaisa +=
        passDiscount +
        deliveryFeeFor("MEMBER", order.subtotalPaisa - (order.discountCode ? order.discountPaisa : 0));
    }
    return { orders: orders.length, savedPaisa };
  },

  /**
   * Admin: gives a customer the Pass for 6 or 12 months from now (from the end date if one is running, so renewing
   * early loses nothing). Audited.
   */
  async adminGrantPass(
    actorId: string,
    userId: string,
    months: 6 | 12,
    now: Date = new Date(),
  ): Promise<{ passEndsAt: Date }> {
    return db.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: userId, role: "CUSTOMER" },
        select: { id: true, email: true, passEndsAt: true },
      });
      if (!user) throw new AppError("NOT_FOUND", "Customer not found.");
      const running = user.passEndsAt !== null && user.passEndsAt > now;
      const from = running ? (user.passEndsAt as Date) : now;
      const passEndsAt = new Date(from.getTime() + months * 30 * DAY_MS);
      await tx.user.update({
        where: { id: user.id },
        data: { ...(running ? {} : { passStartsAt: now }), passEndsAt },
      });
      await recordAudit(tx, {
        actorId,
        action: "member.grant-pass",
        entity: "User",
        entityId: user.id,
        diff: { months, passEndsAt: passEndsAt.toISOString(), extended: running },
      });
      return { passEndsAt };
    });
  },

  /** Admin: ends a customer's Pass now; they become a free MONO Member again. Audited. */
  async adminEndPass(actorId: string, userId: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id: userId, role: "CUSTOMER", passEndsAt: { not: null } },
        data: { passStartsAt: null, passEndsAt: null },
      });
      if (result.count === 0) throw new AppError("NOT_FOUND", "That customer has no Pass to end.");
      await recordAudit(tx, { actorId, action: "member.end-pass", entity: "User", entityId: userId });
    });
  },

  /**
   * Gives an account the Pass for 6 or 12 months from now (or from when the current one ends, so renewing early
   * loses nothing). Used by `pnpm admin pass` until the Pass can be bought online.
   */
  async grantPass(email: string, months: 6 | 12, now: Date = new Date()): Promise<{ passEndsAt: Date }> {
    const user = await db.user.findUnique({
      where: { email: emailSchema.parse(email) },
      select: { id: true, passEndsAt: true },
    });
    if (!user) throw new AppError("NOT_FOUND", `No account uses ${email}.`);
    const from = user.passEndsAt && user.passEndsAt > now ? user.passEndsAt : now;
    const passEndsAt = new Date(from.getTime() + months * 30 * DAY_MS);
    await db.user.update({
      where: { id: user.id },
      data: { passStartsAt: from === now ? now : undefined, passEndsAt },
    });
    return { passEndsAt };
  },

  /** Ends the Pass now (the account becomes a free MONO Member again). */
  async endPass(email: string): Promise<void> {
    const result = await db.user.updateMany({
      where: { email: emailSchema.parse(email) },
      data: { passStartsAt: null, passEndsAt: null },
    });
    if (result.count === 0) throw new AppError("NOT_FOUND", `No account uses ${email}.`);
  },

  /**
   * Whether an account uses this email and whether it has a password (so sign-in can offer "Use password"). Admins never
   * have a password sign-in: their way in is the code plus the authenticator step-up, so they report `false`. The
   * caller rate-limits this (the answer says whether an email is registered; docs/checkoutfeatures.md §8).
   */
  async identify(email: string): Promise<{ registered: boolean; hasPassword: boolean }> {
    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { role: true, accounts: { where: { providerId: CREDENTIAL }, select: { id: true } } },
    });
    if (!user) return { registered: false, hasPassword: false };
    return { registered: true, hasPassword: user.role !== "ADMIN" && user.accounts.length > 0 };
  },

  /** Whether this member has set a password (Settings shows "Set password" or "Change password"). */
  async hasPassword(userId: string): Promise<boolean> {
    return (await db.account.count({ where: { userId, providerId: CREDENTIAL } })) > 0;
  },

  /**
   * Saves what the create-account step collected on the account the code just made: the shopping preference, the
   * optional birthday, the marketing tick, and when the terms were agreed (the tick is required, so this is the time of
   * the submit).
   */
  async saveSignupProfile(userId: string, profile: SignupProfile): Promise<void> {
    const birthday = profile.birthday ? new Date(`${profile.birthday}T00:00:00.000Z`) : null;
    if (birthday && Number.isNaN(birthday.getTime())) {
      throw new AppError("VALIDATION_FAILED", "Enter a valid date.", {
        fields: { birthday: "Enter a valid date" },
      });
    }
    await db.user.update({
      where: { id: userId },
      data: {
        shoppingPreference: profile.preference,
        birthday,
        marketingOptIn: profile.marketingOptIn,
        termsAcceptedAt: profile.now ?? new Date(),
      },
    });
  },
};

import "server-only";
import { db, type ShoppingPreference } from "@virzeen/db";
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

export const memberService = {
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

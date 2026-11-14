import "server-only";
import { db } from "@virzeen/db";
import type { CommunicationInput, ReviewNameInput, ShopPreferencesInput } from "@virzeen/validators";
import { recordAudit } from "../audit/audit";
import { AppError } from "../errors";

// The member's Settings (docs/specs/member-area-nike-layout.md): shop preferences, the email tick, the name shown on
// reviews, the sign-in methods and a copy of their data.

export type MemberSettings = {
  preference: "HOME" | "CLOTHING" | "BOTH" | null;
  size: string;
  unit: "METRIC" | "IMPERIAL";
  marketingOptIn: boolean;
  reviewNameStyle: "FIRST_NAME" | "FULL_NAME" | "ANONYMOUS";
  /** "YYYY-MM-DD", or null until they add it (it is locked once set: specs/member-perks.md). */
  birthday: string | null;
};

export const settingsService = {
  async get(userId: string): Promise<MemberSettings> {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        shoppingPreference: true,
        preferredSize: true,
        measureUnit: true,
        marketingOptIn: true,
        reviewNameStyle: true,
        birthday: true,
      },
    });
    if (!user) throw new AppError("NOT_FOUND", "Account not found.");
    return {
      preference: user.shoppingPreference,
      size: user.preferredSize ?? "",
      unit: user.measureUnit,
      marketingOptIn: user.marketingOptIn,
      reviewNameStyle: user.reviewNameStyle,
      birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : null,
    };
  },

  async saveShopPreferences(userId: string, input: ShopPreferencesInput): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: {
        shoppingPreference: input.preference,
        preferredSize: input.size === "" ? null : input.size,
        measureUnit: input.unit,
      },
    });
  },

  async saveCommunication(userId: string, input: CommunicationInput): Promise<void> {
    await db.user.update({ where: { id: userId }, data: { marketingOptIn: input.marketingOptIn } });
  },

  async saveReviewName(userId: string, input: ReviewNameInput): Promise<void> {
    await db.user.update({ where: { id: userId }, data: { reviewNameStyle: input.style } });
  },

  /**
   * How the member signs in, other than the code we email: just the provider names ("google"). Never the account rows
   * themselves, which hold the sign-in tokens.
   */
  async linkedProviders(userId: string): Promise<string[]> {
    const rows = await db.account.findMany({
      where: { userId, providerId: { not: "credential" } },
      select: { providerId: true },
      orderBy: { createdAt: "asc" },
    });
    return [...new Set(rows.map((row) => row.providerId))];
  },

  /**
   * Everything the member gave us, for "Download your data". Explicit selects only: no password hash, sessions,
   * tokens or two-factor secrets, and nothing about other members.
   */
  async exportData(userId: string, now: Date = new Date()) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        birthday: true,
        shoppingPreference: true,
        preferredSize: true,
        measureUnit: true,
        marketingOptIn: true,
        reviewNameStyle: true,
        passStartsAt: true,
        passEndsAt: true,
        referralCode: true,
        createdAt: true,
        addresses: {
          select: {
            fullName: true,
            phone: true,
            province: true,
            district: true,
            city: true,
            street: true,
            landmark: true,
            isDefault: true,
          },
        },
        favourites: {
          select: { color: true, createdAt: true, product: { select: { name: true, slug: true } } },
        },
        reviews: {
          select: {
            rating: true,
            title: true,
            body: true,
            variantLabel: true,
            createdAt: true,
            product: { select: { name: true } },
          },
        },
        stockAlerts: {
          select: {
            createdAt: true,
            variant: { select: { size: true, color: true, product: { select: { name: true } } } },
          },
        },
        interests: {
          select: { category: { select: { name: true } }, collection: { select: { name: true } } },
        },
        walletEntries: {
          select: { kind: true, type: true, amount: true, reason: true, expiresAt: true, createdAt: true },
          orderBy: { createdAt: "asc" },
        },
        orders: {
          select: {
            orderNumber: true,
            status: true,
            paymentMethod: true,
            subtotalPaisa: true,
            shippingPaisa: true,
            discountPaisa: true,
            giftWrapPaisa: true,
            totalPaisa: true,
            createdAt: true,
            items: {
              select: { productName: true, variantLabel: true, unitPricePaisa: true, quantity: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!user) throw new AppError("NOT_FOUND", "Account not found.");
    return { exportedAt: now.toISOString(), ...user };
  },
  /**
   * Delete account (Settings > Account details; the owner's go-ahead of 2026-11-14, specs/member-area-nike-layout.md).
   * Orders and the points and credit ledger are the shop's records and stay, so the account is anonymised, not erased:
   * everything personal that is not a record is deleted (sign-in methods, sessions, addresses, favourites, reviews,
   * notify-me requests, interests, the bag, any sign-in codes) and the account row loses its name, email, birthday and
   * preferences, so the email can be used for a new account. Refused while an order is still open, and for admins.
   */
  async deleteAccount(userId: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
      if (!user) throw new AppError("NOT_FOUND", "Account not found.");
      if (user.role === "ADMIN") {
        throw new AppError("FORBIDDEN", "An admin account can't be deleted here.");
      }
      const open = await tx.order.count({
        where: { userId, status: { in: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED"] } },
      });
      if (open > 0) {
        throw new AppError(
          "CONFLICT",
          "You have an order that isn't finished yet. You can delete your account once it is delivered or cancelled.",
        );
      }
      await tx.verification.deleteMany({ where: { identifier: user.email } });
      await tx.session.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.twoFactor.deleteMany({ where: { userId } });
      await tx.address.deleteMany({ where: { userId } });
      await tx.favourite.deleteMany({ where: { userId } });
      await tx.stockAlert.deleteMany({ where: { userId } });
      await tx.review.deleteMany({ where: { userId } });
      await tx.memberInterest.deleteMany({ where: { userId } });
      await tx.cart.deleteMany({ where: { userId } });
      await tx.user.update({
        where: { id: userId },
        data: {
          name: "Deleted member",
          email: `deleted-${userId}@deleted.invalid`,
          emailVerified: false,
          image: null,
          birthday: null,
          shoppingPreference: null,
          preferredSize: null,
          marketingOptIn: false,
          referralCode: null,
          passStartsAt: null,
          passEndsAt: null,
          twoFactorEnabled: false,
        },
      });
      await recordAudit(tx, { actorId: userId, action: "account.delete", entity: "user", entityId: userId });
    });
  },
};

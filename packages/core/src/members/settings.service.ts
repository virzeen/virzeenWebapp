import "server-only";
import { db } from "@virzeen/db";
import type { CommunicationInput, ReviewNameInput, ShopPreferencesInput } from "@virzeen/validators";
import { AppError } from "../errors";

// The member's Settings (docs/specs/member-area-nike-layout.md): shop preferences, the email tick, the name shown on
// reviews, the sign-in methods and a copy of their data.

export type MemberSettings = {
  preference: "HOME" | "CLOTHING" | "BOTH" | null;
  size: string;
  unit: "METRIC" | "IMPERIAL";
  marketingOptIn: boolean;
  reviewNameStyle: "FIRST_NAME" | "FULL_NAME" | "ANONYMOUS";
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
      },
    });
    if (!user) throw new AppError("NOT_FOUND", "Account not found.");
    return {
      preference: user.shoppingPreference,
      size: user.preferredSize ?? "",
      unit: user.measureUnit,
      marketingOptIn: user.marketingOptIn,
      reviewNameStyle: user.reviewNameStyle,
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
};

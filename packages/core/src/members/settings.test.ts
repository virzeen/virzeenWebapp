import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser, createVariant, resetDatabase } from "../../test/factories";
import { authorLabel, reviewService } from "../reviews/review.service";
import { settingsService } from "./settings.service";

// Settings (docs/specs/member-area-nike-layout.md).

describe("shop, communication and review-name settings", () => {
  beforeEach(resetDatabase);

  it("starts with today's behaviour and saves each choice", async () => {
    const me = await createUser();
    expect(await settingsService.get(me.id)).toMatchObject({
      size: "",
      unit: "METRIC",
      marketingOptIn: false,
      reviewNameStyle: "FIRST_NAME",
    });
    await settingsService.saveShopPreferences(me.id, { preference: "CLOTHING", size: "L", unit: "IMPERIAL" });
    await settingsService.saveCommunication(me.id, { marketingOptIn: true });
    await settingsService.saveReviewName(me.id, { style: "ANONYMOUS" });
    expect(await settingsService.get(me.id)).toEqual({
      preference: "CLOTHING",
      size: "L",
      unit: "IMPERIAL",
      marketingOptIn: true,
      reviewNameStyle: "ANONYMOUS",
    });
    await settingsService.saveShopPreferences(me.id, { preference: "BOTH", size: "", unit: "METRIC" });
    expect((await settingsService.get(me.id)).size).toBe("");
  });

  it("shows the review author by the member's choice", async () => {
    expect(authorLabel("Asha Rai", "FIRST_NAME")).toBe("Asha");
    expect(authorLabel("Asha  Rai", "FULL_NAME")).toBe("Asha Rai");
    expect(authorLabel("Asha Rai", "ANONYMOUS")).toBe("Anonymous");
    expect(authorLabel("", "FULL_NAME")).toBe("Customer");

    const me = await createUser();
    const variant = await createVariant();
    await db.user.update({ where: { id: me.id }, data: { name: "Asha Rai", reviewNameStyle: "FULL_NAME" } });
    await db.review.create({
      data: { userId: me.id, productId: variant.productId, rating: 5, title: "", body: "Lovely" },
    });
    const [review] = await reviewService.listForProduct(variant.productId);
    expect(review?.authorName).toBe("Asha Rai");
  });
});

describe("linked accounts and the data download", () => {
  beforeEach(resetDatabase);

  it("lists only sign-in providers, never the account rows or tokens", async () => {
    const me = await createUser();
    await db.account.create({
      data: {
        id: "acc-1-" + me.id,
        userId: me.id,
        accountId: "g-1",
        providerId: "google",
        accessToken: "secret-access",
        refreshToken: "secret-refresh",
      },
    });
    await db.account.create({
      data: {
        id: "acc-2-" + me.id,
        userId: me.id,
        accountId: me.id,
        providerId: "credential",
        password: "hash",
      },
    });
    expect(await settingsService.linkedProviders(me.id)).toEqual(["google"]);
  });

  it("exports the member's own data and no secrets", async () => {
    const me = await createUser();
    const other = await createUser();
    await db.account.create({
      data: {
        id: "acc-3-" + me.id,
        userId: me.id,
        accountId: me.id,
        providerId: "credential",
        password: "super-secret-hash",
        accessToken: "tok-123",
      },
    });
    await db.session.create({
      data: {
        id: "s1",
        userId: me.id,
        token: "session-token-xyz",
        expiresAt: new Date(Date.now() + 1000),
      },
    });
    await db.address.create({
      data: {
        userId: me.id,
        fullName: "Me",
        phone: "9800000000",
        province: "Bagmati",
        district: "Lalitpur",
        city: "Lalitpur",
        street: "Pulchowk",
      },
    });
    await db.address.create({
      data: {
        userId: other.id,
        fullName: "Someone Else",
        phone: "9811111111",
        province: "Bagmati",
        district: "Lalitpur",
        city: "Lalitpur",
        street: "Elsewhere",
      },
    });
    const data = await settingsService.exportData(me.id);
    const text = JSON.stringify(data);
    expect(data.email).toBe(me.email);
    expect(data.addresses).toHaveLength(1);
    expect(text).not.toContain("super-secret-hash");
    expect(text).not.toContain("tok-123");
    expect(text).not.toContain("session-token-xyz");
    expect(text).not.toContain("Someone Else");
    expect(text).not.toMatch(/"(password|token|accessToken|refreshToken|twoFactor)/i);
  });
});

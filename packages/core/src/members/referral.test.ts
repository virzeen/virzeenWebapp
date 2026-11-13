import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { checkoutFixture, createUser, resetDatabase } from "../../test/factories";
import { checkoutService } from "../orders/checkout.service";
import { walletService } from "../wallet/wallet.service";
import { referralService } from "./referral.service";

// Referral codes (docs/specs/member-perks.md).

const NOW = new Date("2026-11-11T06:00:00Z");

async function deliveredFirstOrder(friend: Awaited<ReturnType<typeof checkoutFixture>>) {
  const { orderNumber } = await checkoutService.placeOrder({
    userId: friend.user.id,
    customerEmail: friend.user.email,
    cartId: friend.cart.id,
    addressId: friend.address.id,
    paymentMethod: "COD",
    now: NOW,
  });
  const order = await db.order.update({
    where: { orderNumber },
    data: { status: "DELIVERED", deliveredAt: NOW },
  });
  return db.$transaction((tx) => referralService.rewardForDelivered(tx, order.id, NOW));
}

describe("referral codes", () => {
  beforeEach(resetDatabase);

  it("gives each member one code and keeps it", async () => {
    const user = await createUser();
    const code = await referralService.codeFor(user.id);
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    expect(await referralService.codeFor(user.id)).toBe(code);
    expect((await referralService.summary(user.id)).code).toBe(code);
  });

  it("refuses an unknown code, your own code, a second code, and a code after your first order", async () => {
    const referrer = await createUser();
    const code = await referralService.codeFor(referrer.id);
    const friend = await checkoutFixture();

    await expect(referralService.applyCode(friend.user.id, "NOPE9999")).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    await expect(referralService.applyCode(referrer.id, code)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    // Typed in lower case with spaces around it.
    await referralService.applyCode(friend.user.id, `  ${code.toLowerCase()} `);
    await expect(referralService.applyCode(friend.user.id, code)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });

    const late = await checkoutFixture();
    await checkoutService.placeOrder({
      userId: late.user.id,
      customerEmail: late.user.email,
      cartId: late.cart.id,
      addressId: late.address.id,
      paymentMethod: "COD",
      now: NOW,
    });
    await expect(referralService.applyCode(late.user.id, code)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });

  it("pays a MONO Member Rs 200 credit once, when the friend's first order is delivered", async () => {
    const referrer = await createUser();
    const code = await referralService.codeFor(referrer.id);
    const friend = await checkoutFixture();
    await referralService.applyCode(friend.user.id, code);

    expect((await referralService.summary(referrer.id)).friends).toBe(1);
    expect(await deliveredFirstOrder(friend)).toBe(20_000);
    expect((await walletService.balances(referrer.id, NOW)).creditPaisa).toBe(20_000);

    // Paid once: delivering again pays nothing more.
    const order = await db.order.findFirstOrThrow({ where: { userId: friend.user.id } });
    expect(await db.$transaction((tx) => referralService.rewardForDelivered(tx, order.id, NOW))).toBe(0);
    expect((await walletService.balances(referrer.id, NOW)).creditPaisa).toBe(20_000);
    expect(await referralService.summary(referrer.id)).toMatchObject({ rewarded: 1, earnedPaisa: 20_000 });
    // The friend is not given the Pass by a MONO Member's code.
    expect((await db.user.findUniqueOrThrow({ where: { id: friend.user.id } })).passEndsAt).toBeNull();
  });

  it("pays a Pass member Rs 300 and gives the friend a month of the Pass", async () => {
    const referrer = await createUser();
    await db.user.update({
      where: { id: referrer.id },
      data: { passStartsAt: NOW, passEndsAt: new Date("2027-05-10T00:00:00Z") },
    });
    const code = await referralService.codeFor(referrer.id);
    const friend = await checkoutFixture();
    await referralService.applyCode(friend.user.id, code);

    expect(await deliveredFirstOrder(friend)).toBe(30_000);
    expect((await walletService.balances(referrer.id, NOW)).creditPaisa).toBe(30_000);
    const after = await db.user.findUniqueOrThrow({ where: { id: friend.user.id } });
    expect(after.passEndsAt?.getTime()).toBe(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);
  });

  it("pays nothing for a friend with no referral", async () => {
    const friend = await checkoutFixture();
    expect(await deliveredFirstOrder(friend)).toBe(0);
  });
});

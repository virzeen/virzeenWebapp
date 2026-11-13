import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { checkoutFixture, createUser, resetDatabase } from "../../test/factories";
import { checkoutService } from "../orders/checkout.service";
import { dispatchPromiseAt } from "../pricing/shipping-rates";
import { walletService } from "../wallet/wallet.service";
import { referralService } from "./referral.service";

// The dispatch promise, the Pass's missed-dispatch credit, and taking back a referral reward on a return
// (docs/specs/member-perks.md).

const HOUR = 3_600_000;
const NOW = new Date("2026-11-11T06:00:00Z"); // 11:45 in Nepal, inside Express hours

describe("the dispatch promise", () => {
  it("is 48 hours for a guest, 24 for a member and the Pass", () => {
    expect(dispatchPromiseAt("GUEST", false, NOW).getTime()).toBe(NOW.getTime() + 48 * HOUR);
    expect(dispatchPromiseAt("MEMBER", false, NOW).getTime()).toBe(NOW.getTime() + 24 * HOUR);
    expect(dispatchPromiseAt("PASS", false, NOW).getTime()).toBe(NOW.getTime() + 24 * HOUR);
  });

  it("is 3 hours for Express ordered 9 AM to 6 PM Nepal time, and 11 AM the next day after that", () => {
    expect(dispatchPromiseAt("MEMBER", true, NOW).getTime()).toBe(NOW.getTime() + 3 * HOUR);
    // 20:00 in Nepal = 14:15 UTC: promised by 11 AM Nepal the next day = 05:15 UTC on the 12th.
    const evening = new Date("2026-11-11T14:15:00Z");
    expect(dispatchPromiseAt("PASS", true, evening).toISOString()).toBe("2026-11-12T05:15:00.000Z");
  });
});

describe("the missed-dispatch credit", () => {
  beforeEach(resetDatabase);

  async function passOrder(tier: "PASS" | "MEMBER" = "PASS") {
    const fixture = await checkoutFixture({ pricePaisa: 100_000 });
    if (tier === "PASS") {
      await db.user.update({
        where: { id: fixture.user.id },
        data: { passStartsAt: NOW, passEndsAt: new Date("2027-05-10T00:00:00Z") },
      });
    }
    const { orderNumber } = await checkoutService.placeOrder({
      userId: fixture.user.id,
      customerEmail: fixture.user.email,
      cartId: fixture.cart.id,
      addressId: fixture.address.id,
      paymentMethod: "COD",
      now: NOW,
    });
    const order = await db.order.findUniqueOrThrow({ where: { orderNumber } });
    return { fixture, order };
  }

  it("stores the promise on the order", async () => {
    const { order } = await passOrder();
    expect(order.dispatchPromisedAt?.getTime()).toBe(NOW.getTime() + 24 * HOUR);
  });

  it("gives a Pass member Rs 100 credit for an order shipped late, once", async () => {
    const { fixture, order } = await passOrder();
    await db.order.update({
      where: { id: order.id },
      data: { status: "SHIPPED", shippedAt: new Date(NOW.getTime() + 30 * HOUR) },
    });
    const later = new Date(NOW.getTime() + 31 * HOUR);
    expect(await db.$transaction((tx) => walletService.creditMissedDispatch(tx, order.id, later))).toBe(
      10_000,
    );
    expect(await db.$transaction((tx) => walletService.creditMissedDispatch(tx, order.id, later))).toBe(0);
    expect((await walletService.balances(fixture.user.id, later)).creditPaisa).toBe(10_000);
  });

  it("gives nothing for an order shipped on time, or to a MONO Member", async () => {
    const onTime = await passOrder();
    await db.order.update({
      where: { id: onTime.order.id },
      data: { status: "SHIPPED", shippedAt: new Date(NOW.getTime() + 5 * HOUR) },
    });
    expect(await db.$transaction((tx) => walletService.creditMissedDispatch(tx, onTime.order.id, NOW))).toBe(
      0,
    );

    const member = await passOrder("MEMBER");
    await db.order.update({
      where: { id: member.order.id },
      data: { status: "SHIPPED", shippedAt: new Date(NOW.getTime() + 60 * HOUR) },
    });
    expect(await db.$transaction((tx) => walletService.creditMissedDispatch(tx, member.order.id, NOW))).toBe(
      0,
    );
  });

  it("credits a Pass order that is still waiting past its promise, when the sweep runs", async () => {
    const { fixture, order } = await passOrder();
    const early = new Date(NOW.getTime() + 10 * HOUR);
    expect(await walletService.sweepMissedDispatch(early)).toBe(0);
    const late = new Date(NOW.getTime() + 25 * HOUR);
    expect(await walletService.sweepMissedDispatch(late)).toBe(1);
    expect(await walletService.sweepMissedDispatch(late)).toBe(0);
    expect((await walletService.balances(fixture.user.id, late)).creditPaisa).toBe(10_000);
    // The line points at the order.
    const lines = await db.walletEntry.findMany({ where: { orderId: order.id, kind: "CREDIT" } });
    expect(lines).toHaveLength(1);
  });

  it("gives nothing for a cancelled order", async () => {
    const { order } = await passOrder();
    await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    expect(await walletService.sweepMissedDispatch(new Date(NOW.getTime() + 48 * HOUR))).toBe(0);
  });
});

describe("taking back a referral reward on a return", () => {
  beforeEach(resetDatabase);

  async function rewarded() {
    const referrer = await createUser();
    const code = await referralService.codeFor(referrer.id);
    const friend = await checkoutFixture();
    await referralService.applyCode(friend.user.id, code);
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
    await db.$transaction((tx) => referralService.rewardForDelivered(tx, order.id, NOW));
    return { referrer, friend, order };
  }

  it("takes back the unspent credit when the friend's only delivered order is returned, once", async () => {
    const { referrer, order } = await rewarded();
    expect((await walletService.balances(referrer.id, NOW)).creditPaisa).toBe(20_000);
    await db.order.update({ where: { id: order.id }, data: { status: "RETURNED" } });
    expect(await db.$transaction((tx) => referralService.reverseForReturn(tx, order.id, NOW))).toBe(20_000);
    expect((await walletService.balances(referrer.id, NOW)).creditPaisa).toBe(0);
    expect(await db.$transaction((tx) => referralService.reverseForReturn(tx, order.id, NOW))).toBe(0);
    expect(await referralService.summary(referrer.id)).toMatchObject({ rewarded: 0, earnedPaisa: 0 });
  });

  it("takes back only what is left when some of the credit was spent", async () => {
    const { referrer, order } = await rewarded();
    const entry = await db.walletEntry.findFirstOrThrow({ where: { userId: referrer.id, kind: "CREDIT" } });
    await db.walletEntry.update({ where: { id: entry.id }, data: { remaining: 5_000 } });
    await db.order.update({ where: { id: order.id }, data: { status: "RETURNED" } });
    expect(await db.$transaction((tx) => referralService.reverseForReturn(tx, order.id, NOW))).toBe(5_000);
    expect((await walletService.balances(referrer.id, NOW)).creditPaisa).toBe(0);
  });

  it("leaves the reward when the friend has another delivered order", async () => {
    const { referrer, friend, order } = await rewarded();
    await db.order.create({
      data: {
        orderNumber: "VZ-261111-9999",
        userId: friend.user.id,
        customerEmail: friend.user.email,
        paymentMethod: "COD",
        subtotalPaisa: 100_000,
        shippingPaisa: 0,
        totalPaisa: 100_000,
        shippingZone: "KATHMANDU_VALLEY",
        addressSnapshot: {},
        status: "DELIVERED",
      },
    });
    await db.order.update({ where: { id: order.id }, data: { status: "RETURNED" } });
    expect(await db.$transaction((tx) => referralService.reverseForReturn(tx, order.id, NOW))).toBe(0);
    expect((await walletService.balances(referrer.id, NOW)).creditPaisa).toBe(20_000);
  });
});

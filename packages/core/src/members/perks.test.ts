import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import {
  addToCart,
  checkoutFixture,
  createAddress,
  createVariant,
  resetDatabase,
} from "../../test/factories";
import { checkoutService } from "../orders/checkout.service";
import { cancelOrderAndRestock } from "../orders/cancellation";
import { calculateTotals } from "../pricing/calculate-totals";

// Gift wrapping, the birthday reward and Express Delivery (docs/specs/member-perks.md).

const NOW = new Date("2026-11-11T06:00:00Z"); // 11:45 in Nepal: inside Express hours, in November
const LINES = [{ unitPricePaisa: 100_000, quantity: 2 }]; // Rs 2,000

describe("perks in the totals", () => {
  it("prices gift wrapping by tier: Rs 150 guest, Rs 100 MONO Member, free for the Pass, nothing unless asked", () => {
    expect(calculateTotals(LINES, "GUEST", null, { giftWrap: true }).giftWrapPaisa).toBe(15_000);
    expect(calculateTotals(LINES, "MEMBER", null, { giftWrap: true }).giftWrapPaisa).toBe(10_000);
    expect(calculateTotals(LINES, "PASS", null, { giftWrap: true }).giftWrapPaisa).toBe(0);
    expect(calculateTotals(LINES, "MEMBER").giftWrapPaisa).toBe(0);
    // Delivery Rs 150 + wrapping Rs 100 on Rs 2,000.
    expect(calculateTotals(LINES, "MEMBER", null, { giftWrap: true }).totalPaisa).toBe(
      200_000 + 15_000 + 10_000,
    );
  });

  it("takes 5% off for a MONO Member in their birthday month and 15% for the Pass instead of 10%", () => {
    const member = calculateTotals(LINES, "MEMBER", null, { birthday: true });
    expect(member).toMatchObject({ discountPaisa: 10_000, isBirthdayDiscount: true, isPassDiscount: false });
    const pass = calculateTotals(LINES, "PASS", null, { birthday: true });
    expect(pass).toMatchObject({ discountPaisa: 30_000, isBirthdayDiscount: true, isPassDiscount: false });
    expect(calculateTotals(LINES, "PASS")).toMatchObject({ discountPaisa: 20_000, isPassDiscount: true });
  });

  it("gives guests no birthday reward, and a promo code replaces it", () => {
    expect(calculateTotals(LINES, "GUEST", null, { birthday: true }).discountPaisa).toBe(0);
    const withCode = calculateTotals(
      LINES,
      "MEMBER",
      { kind: "FIXED", percentOff: null, amountOffPaisa: 5_000 },
      { birthday: true },
    );
    expect(withCode).toMatchObject({ discountPaisa: 5_000, isBirthdayDiscount: false });
  });
});

describe("perks at checkout", () => {
  beforeEach(resetDatabase);

  type Fixture = Awaited<ReturnType<typeof checkoutFixture>>;
  function place(fixture: Fixture, extra: { giftWrap?: boolean; express?: boolean } = {}) {
    return checkoutService.placeOrder({
      userId: fixture.user.id,
      customerEmail: fixture.user.email,
      cartId: fixture.cart.id,
      addressId: fixture.address.id,
      paymentMethod: "COD",
      ...(extra.giftWrap ? { giftWrap: true } : {}),
      ...(extra.express ? { express: true } : {}),
      now: NOW,
    });
  }

  async function refill(fixture: Fixture) {
    // The bag was emptied by the first order: put one more item in it.
    const variant = await createVariant({ stock: 5, pricePaisa: 100_000 });
    await addToCart(fixture.cart.id, variant.id, 1);
    return { ...fixture, variant };
  }

  it("adds gift wrapping to the order total and records it", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 100_000 }); // Rs 1,000: delivery Rs 150
    const { orderNumber } = await place(fixture, { giftWrap: true });
    const order = await db.order.findUniqueOrThrow({ where: { orderNumber } });
    expect(order).toMatchObject({
      giftWrap: true,
      giftWrapPaisa: 10_000,
      totalPaisa: 100_000 + 15_000 + 10_000,
    });
  });

  it("gives the birthday reward in the birthday month only", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 100_000 });
    await db.user.update({ where: { id: fixture.user.id }, data: { birthday: new Date("1995-11-30") } });
    const preview = await checkoutService.preview({
      userId: fixture.user.id,
      cartId: fixture.cart.id,
      addressId: fixture.address.id,
      now: NOW,
    });
    expect(preview).toMatchObject({ isBirthdayDiscount: true, discountPaisa: 5_000 });
    await db.user.update({ where: { id: fixture.user.id }, data: { birthday: new Date("1995-03-02") } });
    const other = await checkoutService.preview({
      userId: fixture.user.id,
      cartId: fixture.cart.id,
      addressId: fixture.address.id,
      now: NOW,
    });
    expect(other).toMatchObject({ isBirthdayDiscount: false, discountPaisa: 0 });
  });

  it("lets a MONO Member use Express Delivery once a month, then says it is used", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 100_000 });
    const before = await checkoutService.preview({
      userId: fixture.user.id,
      cartId: fixture.cart.id,
      addressId: fixture.address.id,
      now: NOW,
    });
    expect(before.express).toMatchObject({
      available: true,
      allowed: 1,
      used: 0,
      left: 1,
      withinHours: true,
    });

    const { orderNumber } = await place(fixture, { express: true });
    expect((await db.order.findUniqueOrThrow({ where: { orderNumber } })).express).toBe(true);

    const second = await refill(fixture);
    const after = await checkoutService.preview({
      userId: second.user.id,
      cartId: second.cart.id,
      addressId: second.address.id,
      now: NOW,
    });
    expect(after.express).toMatchObject({ available: false, reason: "USED", used: 1, left: 0 });
    await expect(place(second, { express: true })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    // A normal delivery still works.
    await expect(place(second)).resolves.toMatchObject({ next: { type: "done" } });
  });

  it("gives a cancelled Express order's use back", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 100_000 });
    const { orderNumber } = await place(fixture, { express: true });
    const order = await db.order.findUniqueOrThrow({ where: { orderNumber }, select: { id: true } });
    await db.$transaction((tx) =>
      cancelOrderAndRestock(tx, { orderId: order.id, actor: "system", reason: "test", restoreToCart: false }),
    );
    const second = await refill(fixture);
    await expect(place(second, { express: true })).resolves.toMatchObject({ next: { type: "done" } });
  });

  it("gives the Pass 3 a month, and refuses an address outside the Valley and Pokhara", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 100_000 });
    await db.user.update({
      where: { id: fixture.user.id },
      data: { passStartsAt: NOW, passEndsAt: new Date("2027-05-10T00:00:00Z") },
    });
    const status = await checkoutService.preview({
      userId: fixture.user.id,
      cartId: fixture.cart.id,
      addressId: fixture.address.id,
      now: NOW,
    });
    expect(status.express).toMatchObject({ available: true, allowed: 3, left: 3 });

    const far = await createAddress(fixture.user.id, "Dolakha");
    const farPreview = await checkoutService.preview({
      userId: fixture.user.id,
      cartId: fixture.cart.id,
      addressId: far.id,
      now: NOW,
    });
    expect(farPreview.express).toMatchObject({ available: false, reason: "AREA" });
    await expect(
      checkoutService.placeOrder({
        userId: fixture.user.id,
        customerEmail: fixture.user.email,
        cartId: fixture.cart.id,
        addressId: far.id,
        paymentMethod: "COD",
        express: true,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});

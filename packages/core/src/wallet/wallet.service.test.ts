import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { checkoutFixture, createUser, resetDatabase } from "../../test/factories";
import { cancelOrderAndRestock } from "../orders/cancellation";
import { checkoutService } from "../orders/checkout.service";
import { walletService } from "./wallet.service";

const NOW = new Date("2026-11-11T06:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

async function addLine(
  userId: string,
  kind: "POINTS" | "CREDIT",
  amount: number,
  options: { expiresAt?: Date | null; createdAt?: Date } = {},
) {
  return db.walletEntry.create({
    data: {
      userId,
      kind,
      type: "ADJUST",
      amount,
      remaining: amount,
      expiresAt: options.expiresAt ?? null,
      reason: "test",
      createdAt: options.createdAt ?? NOW,
    },
  });
}

type Fixture = Awaited<ReturnType<typeof checkoutFixture>>;
function place(
  fixture: Fixture,
  extra: { usePoints?: boolean; useCredit?: boolean; paymentMethod?: "COD" | "ESEWA" } = {},
) {
  return checkoutService.placeOrder({
    userId: fixture.user.id,
    customerEmail: fixture.user.email,
    cartId: fixture.cart.id,
    addressId: fixture.address.id,
    paymentMethod: extra.paymentMethod ?? "COD",
    ...(extra.usePoints ? { usePoints: true } : {}),
    ...(extra.useCredit ? { useCredit: true } : {}),
    now: NOW,
  });
}

describe("wallet: earning points on a delivered order", () => {
  beforeEach(resetDatabase);

  async function deliveredOrder(tier: "MEMBER" | "PASS") {
    const fixture = await checkoutFixture({ pricePaisa: 250_000, quantity: 2 }); // Rs. 5,000
    const { orderNumber } = await place(fixture);
    const order = await db.order.update({
      where: { orderNumber },
      data: { tier, status: "DELIVERED", deliveredAt: NOW },
    });
    return { fixture, order };
  }

  it("gives a MONO Member 1 point per Rs. 2,999 paid, expiring after a year, and only once", async () => {
    const { fixture, order } = await deliveredOrder("MEMBER");
    // Rs. 5,000 paid, delivery free from Rs. 3,000: floor(5000 / 2999) = 1 point.
    expect(await db.$transaction((tx) => walletService.earnForOrder(tx, order.id, NOW))).toBe(1);
    expect(await db.$transaction((tx) => walletService.earnForOrder(tx, order.id, NOW))).toBe(0);
    const lines = await db.walletEntry.findMany({ where: { userId: fixture.user.id } });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ kind: "POINTS", type: "EARN", amount: 1, remaining: 1 });
    expect(lines[0]?.expiresAt?.getTime()).toBe(NOW.getTime() + 365 * DAY_MS);
  });

  it("gives a Pass member 2 points per Rs. 2,999 that never expire", async () => {
    const { fixture, order } = await deliveredOrder("PASS");
    expect(await db.$transaction((tx) => walletService.earnForOrder(tx, order.id, NOW))).toBe(2);
    const line = await db.walletEntry.findFirstOrThrow({ where: { userId: fixture.user.id } });
    expect(line.expiresAt).toBeNull();
  });

  it("earns nothing until the order is delivered, and nothing for a guest", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 250_000, quantity: 2 });
    const { orderNumber } = await place(fixture);
    const order = await db.order.findUniqueOrThrow({ where: { orderNumber } });
    expect(await db.$transaction((tx) => walletService.earnForOrder(tx, order.id, NOW))).toBe(0);
    await db.order.update({ where: { id: order.id }, data: { status: "DELIVERED", userId: null } });
    expect(await db.$transaction((tx) => walletService.earnForOrder(tx, order.id, NOW))).toBe(0);
  });
});

describe("wallet: balances, expiry and spending order", () => {
  beforeEach(resetDatabase);

  it("expires points past their date, once, and keeps the rest", async () => {
    const user = await createUser();
    await addLine(user.id, "POINTS", 50, { expiresAt: new Date(NOW.getTime() - DAY_MS) });
    await addLine(user.id, "POINTS", 30, { expiresAt: new Date(NOW.getTime() + 10 * DAY_MS) });
    await addLine(user.id, "POINTS", 20); // Pass points: no date
    expect(await walletService.balances(user.id, NOW)).toEqual({ points: 50, creditPaisa: 0 });
    expect(await walletService.balances(user.id, NOW)).toEqual({ points: 50, creditPaisa: 0 });
    const expired = await db.walletEntry.findMany({ where: { userId: user.id, type: "EXPIRE" } });
    expect(expired).toMatchObject([{ amount: -50 }]);
  });

  it("takes the soonest-expiring line first when only some points are spent", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 250_000 }); // Rs. 2,500: 20% is 500 points
    const soon = await addLine(fixture.user.id, "POINTS", 300, {
      expiresAt: new Date(NOW.getTime() + 5 * DAY_MS),
    });
    const never = await addLine(fixture.user.id, "POINTS", 300);
    await place(fixture, { usePoints: true });
    const left = async (id: string) => (await db.walletEntry.findUniqueOrThrow({ where: { id } })).remaining;
    expect([await left(soon.id), await left(never.id)]).toEqual([0, 100]); // 500 used: 300 soon, 200 never
  });
});

describe("wallet: points and credit at checkout", () => {
  beforeEach(resetDatabase);

  it("caps points at 20% of the products' price and takes the order total down", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 250_000 });
    await addLine(fixture.user.id, "POINTS", 2_000);
    const preview = await checkoutService.preview({
      userId: fixture.user.id,
      cartId: fixture.cart.id,
      addressId: fixture.address.id,
      usePoints: true,
      now: NOW,
    });
    // Rs. 2,500 + Rs. 150 delivery; 20% of Rs. 2,500 is Rs. 500, so 500 of the 2,000 points are used.
    expect(preview).toMatchObject({
      pointsUsed: 500,
      creditUsedPaisa: 0,
      totalPaisa: 215_000,
      walletPoints: 2_000,
    });

    const { orderNumber } = await place(fixture, { usePoints: true });
    const order = await db.order.findUniqueOrThrow({ where: { orderNumber } });
    expect(order).toMatchObject({ pointsUsed: 500, creditUsedPaisa: 0, totalPaisa: 215_000 });
    expect((await walletService.balances(fixture.user.id, NOW)).points).toBe(1_500);
    const spend = await db.walletEntry.findFirstOrThrow({ where: { orderId: order.id, kind: "POINTS" } });
    expect(spend).toMatchObject({ type: "SPEND", amount: -500 });
  });

  it("uses credit for what is left, never more than the total, and nothing unless asked", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 250_000 });
    await addLine(fixture.user.id, "CREDIT", 10_000_000);
    const withoutAsking = await checkoutService.preview({
      userId: fixture.user.id,
      cartId: fixture.cart.id,
      addressId: fixture.address.id,
      now: NOW,
    });
    expect(withoutAsking).toMatchObject({ creditUsedPaisa: 0, totalPaisa: 265_000 });
    const asked = await checkoutService.preview({
      userId: fixture.user.id,
      cartId: fixture.cart.id,
      addressId: fixture.address.id,
      useCredit: true,
      now: NOW,
    });
    expect(asked).toMatchObject({ creditUsedPaisa: 265_000, totalPaisa: 0 });
  });

  it("refuses online payment when credit covers the whole order, but COD works", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 250_000 });
    await addLine(fixture.user.id, "CREDIT", 10_000_000);
    await expect(place(fixture, { useCredit: true, paymentMethod: "ESEWA" })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
    const { orderNumber } = await place(fixture, { useCredit: true });
    expect(await db.order.findUniqueOrThrow({ where: { orderNumber } })).toMatchObject({
      totalPaisa: 0,
      creditUsedPaisa: 265_000,
    });
  });

  it("gives points and credit back when the order is cancelled, once", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 250_000 });
    await addLine(fixture.user.id, "POINTS", 1_000);
    await addLine(fixture.user.id, "CREDIT", 50_000);
    const { orderNumber } = await place(fixture, { usePoints: true, useCredit: true });
    const order = await db.order.findUniqueOrThrow({ where: { orderNumber } });
    expect(await walletService.balances(fixture.user.id, NOW)).toEqual({ points: 500, creditPaisa: 0 });

    for (let attempt = 0; attempt < 2; attempt++) {
      await db.$transaction((tx) =>
        cancelOrderAndRestock(tx, {
          orderId: order.id,
          actor: "admin",
          reason: "Test",
          restoreToCart: false,
        }),
      );
    }
    expect(await walletService.balances(fixture.user.id, NOW)).toEqual({
      points: 1_000,
      creditPaisa: 50_000,
    });
    expect(await db.walletEntry.count({ where: { orderId: order.id, type: "REFUND" } })).toBe(2);
  });
});

describe("wallet: admin credit", () => {
  beforeEach(resetDatabase);

  it("adds credit or points to a customer and records it in the audit log", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const customer = await createUser();
    await walletService.adminAdd(
      admin.id,
      { userId: customer.id, kind: "CREDIT", amount: 20_000, reason: "Goodwill" },
      NOW,
    );
    expect(await walletService.balances(customer.id, NOW)).toEqual({ points: 0, creditPaisa: 20_000 });
    expect(await db.auditLog.count({ where: { action: "wallet.add", entityId: customer.id } })).toBe(1);
  });

  it("refuses zero, negative or fractional amounts and unknown customers", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const customer = await createUser();
    for (const amount of [0, -5, 1.5]) {
      await expect(
        walletService.adminAdd(admin.id, { userId: customer.id, kind: "POINTS", amount, reason: "x" }),
      ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    }
    await expect(
      walletService.adminAdd(admin.id, { userId: "nobody", kind: "POINTS", amount: 5, reason: "x" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

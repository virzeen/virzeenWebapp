import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { addToCart, checkoutFixture, createCart, createUser, resetDatabase } from "../../test/factories";
import { json, mockProvider, sentEmails } from "../../test/setup";
import { checkoutService } from "../orders/checkout.service";
import { orderService } from "../orders/orders.service";
import { paymentService } from "../payments/payment.service";
import { reconcilePayments } from "../payments/reconcile";
import { discountService } from "./discount.service";

// Discount codes against the test database (docs/specs/discount-codes.md, payment-policy.md §2).

const NOW = new Date("2026-11-09T06:00:00Z");
// Every order in this file is a member order of Rs. 3,000 or more, so delivery is free.
const SHIPPING = 0;

type CodeOptions = {
  code?: string;
  kind?: "PERCENT" | "FIXED";
  percentOff?: number | null;
  amountOffPaisa?: number | null;
  minSubtotalPaisa?: number | null;
  endsAt?: Date | null;
  maxUses?: number | null;
  usedCount?: number;
  oncePerCustomer?: boolean;
  isActive?: boolean;
};

function createCode(options: CodeOptions = {}) {
  return db.discountCode.create({
    data: {
      code: options.code ?? "WELCOME10",
      kind: options.kind ?? "PERCENT",
      percentOff: options.percentOff === undefined ? 10 : options.percentOff,
      amountOffPaisa: options.amountOffPaisa ?? null,
      minSubtotalPaisa: options.minSubtotalPaisa ?? null,
      endsAt: options.endsAt ?? null,
      maxUses: options.maxUses ?? null,
      usedCount: options.usedCount ?? 0,
      oncePerCustomer: options.oncePerCustomer ?? false,
      isActive: options.isActive ?? true,
    },
  });
}

type Fixture = Awaited<ReturnType<typeof checkoutFixture>>;

function preview(fixture: Fixture, discountCode?: string) {
  return checkoutService.preview({
    userId: fixture.user.id,
    cartId: fixture.cart.id,
    addressId: fixture.address.id,
    ...(discountCode ? { discountCode } : {}),
    now: NOW,
  });
}

function place(fixture: Fixture, discountCode?: string, paymentMethod: "COD" | "ESEWA" | "KHALTI" = "COD") {
  return checkoutService.placeOrder({
    userId: fixture.user.id,
    customerEmail: fixture.user.email,
    cartId: fixture.cart.id,
    addressId: fixture.address.id,
    paymentMethod,
    ...(discountCode ? { discountCode } : {}),
    now: NOW,
  });
}

const usedCount = async (code = "WELCOME10") =>
  (await db.discountCode.findUniqueOrThrow({ where: { code } })).usedCount;

/** A refusal: a field error under the code, with the checkout's words. */
const refusedWith = (message: string) => ({
  code: "VALIDATION_FAILED",
  message,
  fields: { discountCode: message },
});

describe("checkoutService.preview with a discount code", () => {
  beforeEach(resetDatabase);

  it("takes the discount off and names the code", async () => {
    await createCode();
    const fixture = await checkoutFixture({ pricePaisa: 450_000 });

    const totals = await preview(fixture, "WELCOME10");

    expect(totals).toMatchObject({
      subtotalPaisa: 450_000,
      discountPaisa: 45_000,
      totalPaisa: 405_000 + SHIPPING,
      discountCode: "WELCOME10",
    });
    expect(await usedCount()).toBe(0); // only placing an order uses it
  });

  it("refuses with each reason and changes nothing", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 450_000 });
    await createCode({ code: "OFF", isActive: false });
    await createCode({ code: "OLD", endsAt: new Date(NOW.getTime() - 60_000) });
    await createCode({ code: "GONE", maxUses: 3, usedCount: 3 });
    await createCode({ code: "BIG", minSubtotalPaisa: 500_000 });

    await expect(preview(fixture, "NOPE")).rejects.toMatchObject(refusedWith("This code isn't valid."));
    await expect(preview(fixture, "OFF")).rejects.toMatchObject(refusedWith("This code isn't valid."));
    await expect(preview(fixture, "OLD")).rejects.toMatchObject(refusedWith("This code has ended."));
    await expect(preview(fixture, "GONE")).rejects.toMatchObject(
      refusedWith("This code has been fully used."),
    );
    await expect(preview(fixture, "BIG")).rejects.toMatchObject(
      refusedWith("Spend Rs 5,000 or more to use this code."),
    );
  });
});

describe("checkoutService.placeOrder with a discount code", () => {
  beforeEach(resetDatabase);

  it("saves the code and the discount on the order, charges the discounted total and counts a use", async () => {
    await createCode({ code: "LAUNCH", kind: "FIXED", percentOff: null, amountOffPaisa: 50_000 });
    const fixture = await checkoutFixture({ pricePaisa: 450_000 });

    const { orderNumber } = await place(fixture, "LAUNCH");

    const order = await db.order.findUniqueOrThrow({ where: { orderNumber }, include: { payments: true } });
    expect(order).toMatchObject({
      status: "CONFIRMED",
      subtotalPaisa: 450_000,
      discountPaisa: 50_000,
      discountCode: "LAUNCH",
      totalPaisa: 400_000 + SHIPPING,
    });
    expect(order.discountCodeId).not.toBeNull();
    expect(order.payments).toMatchObject([{ provider: "COD", amountPaisa: 400_000 + SHIPPING }]);
    expect(await usedCount("LAUNCH")).toBe(1);
    expect(sentEmails).toHaveLength(1);
  });

  it("keeps the order's discount when the code is edited later", async () => {
    const code = await createCode();
    const fixture = await checkoutFixture({ pricePaisa: 450_000 });
    const { orderNumber } = await place(fixture, "WELCOME10");

    await db.discountCode.update({ where: { id: code.id }, data: { percentOff: 50 } });

    const order = await db.order.findUniqueOrThrow({ where: { orderNumber } });
    expect(order).toMatchObject({ discountPaisa: 45_000, totalPaisa: 405_000 + SHIPPING });
  });

  it("orders nothing when the code stopped working after it was applied", async () => {
    const code = await createCode();
    const fixture = await checkoutFixture({ pricePaisa: 450_000, stock: 5 });
    await preview(fixture, "WELCOME10");
    await db.discountCode.update({ where: { id: code.id }, data: { isActive: false } });

    await expect(place(fixture, "WELCOME10")).rejects.toMatchObject(refusedWith("This code isn't valid."));

    expect(await db.order.count()).toBe(0);
    expect(await db.cartItem.count({ where: { cartId: fixture.cart.id } })).toBe(1);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(5);
    expect(await usedCount()).toBe(0);
  });

  it("lets a customer use a once-per-customer code once, and again after that order is cancelled", async () => {
    await createCode({ oncePerCustomer: true });
    const fixture = await checkoutFixture({ pricePaisa: 450_000 });
    const admin = await createUser({ role: "ADMIN" });
    const first = await place(fixture, "WELCOME10");

    await addToCart(fixture.cart.id, fixture.variant.id, 1);
    await expect(place(fixture, "WELCOME10")).rejects.toMatchObject(
      refusedWith("You've already used this code."),
    );

    await orderService.advance(admin.id, {
      orderNumber: first.orderNumber,
      to: "CANCELLED",
      reason: "Customer asked to cancel",
    });
    await expect(place(fixture, "WELCOME10")).resolves.toMatchObject({ next: { type: "done" } });
    expect(await usedCount()).toBe(1);
  });

  it("gives the last use to one of two customers ordering at the same time", async () => {
    await createCode({ maxUses: 1 });
    const one = await checkoutFixture({ pricePaisa: 450_000 });
    const two = await checkoutFixture({ pricePaisa: 450_000 });

    const results = await Promise.allSettled([place(one, "WELCOME10"), place(two, "WELCOME10")]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const refused = results.find((r) => r.status === "rejected");
    expect(refused?.status === "rejected" && refused.reason).toMatchObject(
      refusedWith("This code has been fully used."),
    );
    expect(await db.order.count()).toBe(1);
    expect(await usedCount()).toBe(1);
  });

  it("lets one of two simultaneous orders from the same bag use a once-per-customer code", async () => {
    await createCode({ oncePerCustomer: true });
    const fixture = await checkoutFixture({ pricePaisa: 450_000, stock: 5 });

    const results = await Promise.allSettled([place(fixture, "WELCOME10"), place(fixture, "WELCOME10")]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.order.count()).toBe(1);
    expect(await usedCount()).toBe(1);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(4);
  });

  it("still charges the delivery fee when a 100% code makes the goods free (threshold is after the discount)", async () => {
    await createCode({ code: "FREE", percentOff: 100 });
    const fixture = await checkoutFixture({ pricePaisa: 450_000 });

    const { orderNumber } = await place(fixture, "FREE", "COD");
    expect(await db.order.findUniqueOrThrow({ where: { orderNumber } })).toMatchObject({
      discountPaisa: 450_000,
      shippingPaisa: 15_000, // member fee: Rs. 0 is below the Rs. 3,000 free-delivery line
      totalPaisa: 15_000,
    });
  });
});

describe("cancelled orders give the code's use back", () => {
  beforeEach(resetDatabase);

  it("when an admin cancels, and when a shipped COD parcel is refused at the door", async () => {
    await createCode();
    const admin = await createUser({ role: "ADMIN" });
    const cancelled = await place(await checkoutFixture(), "WELCOME10");
    const refused = await place(await checkoutFixture(), "WELCOME10");
    expect(await usedCount()).toBe(2);

    await orderService.advance(admin.id, {
      orderNumber: cancelled.orderNumber,
      to: "CANCELLED",
      reason: "Asked",
    });
    expect(await usedCount()).toBe(1);
    // A second cancel of the same order (double click) gives nothing back twice.
    await orderService
      .advance(admin.id, { orderNumber: cancelled.orderNumber, to: "CANCELLED", reason: "Again" })
      .catch(() => undefined);
    expect(await usedCount()).toBe(1);

    await orderService.advance(admin.id, { orderNumber: refused.orderNumber, to: "PROCESSING" });
    await orderService.advance(admin.id, {
      orderNumber: refused.orderNumber,
      to: "SHIPPED",
      courierName: "NCM",
      trackingNumber: "1",
    });
    await orderService.markRefusedAtDoor(admin.id, refused.orderNumber, "Not home");
    expect(await usedCount()).toBe(0);
  });

  it("but a returned order keeps its use", async () => {
    await createCode();
    const admin = await createUser({ role: "ADMIN" });
    const { orderNumber } = await place(await checkoutFixture(), "WELCOME10");
    await orderService.advance(admin.id, { orderNumber, to: "PROCESSING" });
    await orderService.advance(admin.id, {
      orderNumber,
      to: "SHIPPED",
      courierName: "NCM",
      trackingNumber: "1",
    });
    await orderService.advance(admin.id, { orderNumber, to: "DELIVERED" });
    await orderService.advance(admin.id, { orderNumber, to: "RETURNED", reason: "Too small" });
    expect(await usedCount()).toBe(1);
  });
});

describe("online payments with a discount code (switched off until about March 2027)", () => {
  const PLACED_AT = new Date("2026-09-28T06:00:00Z");
  const DISCOUNTED_TOTAL = 405_000 + SHIPPING;

  beforeEach(async () => {
    await resetDatabase();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(PLACED_AT.getTime() + 5 * 60_000));
  });

  async function placeKhalti() {
    await createCode();
    const fixture = await checkoutFixture({ pricePaisa: 450_000 });
    let initiated: Record<string, unknown> = {};
    mockProvider(async (_url, init) => {
      initiated = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return json({ pidx: "PIDXD1", payment_url: "https://test-pay.khalti.com/?pidx=PIDXD1" });
    });
    const { orderNumber } = await checkoutService.placeOrder({
      userId: fixture.user.id,
      customerEmail: fixture.user.email,
      cartId: fixture.cart.id,
      addressId: fixture.address.id,
      paymentMethod: "KHALTI",
      discountCode: "WELCOME10",
      now: PLACED_AT,
    });
    return { orderNumber, initiated };
  }

  it("asks Khalti for the discounted total and marks PAID only for that exact amount", async () => {
    const { orderNumber, initiated } = await placeKhalti();
    expect(initiated).toMatchObject({ amount: DISCOUNTED_TOTAL });
    mockProvider(() => json({ pidx: "PIDXD1", status: "Completed", total_amount: DISCOUNTED_TOTAL }));

    await expect(paymentService.handleKhaltiReturn("PIDXD1")).resolves.toEqual({
      outcome: "PAID",
      orderNumber,
    });
  });

  it("treats the price before the discount as an amount mismatch", async () => {
    const { orderNumber } = await placeKhalti();
    mockProvider(() => json({ pidx: "PIDXD1", status: "Completed", total_amount: 450_000 + SHIPPING }));

    await expect(paymentService.handleKhaltiReturn("PIDXD1")).resolves.toEqual({
      outcome: "MISMATCH",
      orderNumber,
    });
    expect((await db.order.findUniqueOrThrow({ where: { orderNumber } })).paymentStatus).toBe("PENDING");
  });

  it("gives the use back when the payment can't be started", async () => {
    await createCode();
    const fixture = await checkoutFixture({ pricePaisa: 450_000 });
    mockProvider(() => json({ detail: "Invalid token." }, 401));

    await expect(place(fixture, "WELCOME10", "KHALTI")).rejects.toMatchObject({ code: "PAYMENT_FAILED" });

    expect(await usedCount()).toBe(0);
    expect(await db.order.findFirstOrThrow()).toMatchObject({ status: "CANCELLED" });
    expect(await db.cartItem.count({ where: { cartId: fixture.cart.id } })).toBe(1); // "Your bag is saved"
  });

  it("gives the use back when the payment is cancelled or expires", async () => {
    await placeKhalti();
    expect(await usedCount()).toBe(1);
    mockProvider(() => json({ pidx: "PIDXD1", status: "User canceled", total_amount: DISCOUNTED_TOTAL }));
    await paymentService.handleKhaltiReturn("PIDXD1");
    expect(await usedCount()).toBe(0);
  });

  it("gives the use back when reconciliation cancels an expired reservation", async () => {
    const { orderNumber } = await placeKhalti();
    await db.payment.updateMany({ where: { order: { orderNumber } }, data: { createdAt: PLACED_AT } });
    mockProvider(() => json({ pidx: "PIDXD1", status: "Expired", total_amount: DISCOUNTED_TOTAL }));

    await reconcilePayments(new Date(PLACED_AT.getTime() + 61 * 60_000));

    expect((await db.order.findUniqueOrThrow({ where: { orderNumber } })).status).toBe("CANCELLED");
    expect(await usedCount()).toBe(0);
  });
});

describe("discountService (admin)", () => {
  beforeEach(resetDatabase);

  const base = { kind: "PERCENT" as const, percentOff: 10, oncePerCustomer: false, isActive: true };

  it("adds a code with its limits and records it in the audit log", async () => {
    const admin = await createUser({ role: "ADMIN" });

    const saved = await discountService.save(admin.id, {
      ...base,
      code: "WELCOME10",
      minSubtotalPaisa: 200_000,
      endsOn: "2026-12-31",
      maxUses: 100,
    });

    const row = await db.discountCode.findUniqueOrThrow({ where: { id: saved.id } });
    expect(row).toMatchObject({
      code: "WELCOME10",
      percentOff: 10,
      amountOffPaisa: null,
      minSubtotalPaisa: 200_000,
      maxUses: 100,
      endsAt: new Date("2026-12-31T18:14:59.999Z"),
    });
    expect(await db.auditLog.findMany({ where: { entityId: saved.id } })).toMatchObject([
      { actorId: admin.id, action: "discount.create", entity: "DiscountCode" },
    ]);
  });

  it("refuses a code that already exists", async () => {
    const admin = await createUser({ role: "ADMIN" });
    await discountService.save(admin.id, { ...base, code: "WELCOME10" });

    await expect(discountService.save(admin.id, { ...base, code: "WELCOME10" })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      fields: { code: "This code is already used" },
    });
  });

  it("edits the limits and the switch, never the code or what it takes off", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const { id } = await discountService.save(admin.id, { ...base, code: "WELCOME10" });

    await discountService.save(admin.id, {
      id,
      code: "SOMETHING-ELSE",
      kind: "FIXED",
      percentOff: 10,
      amountOffPaisa: 50_000,
      minSubtotalPaisa: 100_000,
      maxUses: 5,
      oncePerCustomer: true,
      isActive: false,
    });

    expect(await db.discountCode.findUniqueOrThrow({ where: { id } })).toMatchObject({
      code: "WELCOME10",
      kind: "PERCENT",
      percentOff: 10,
      amountOffPaisa: null,
      minSubtotalPaisa: 100_000,
      maxUses: 5,
      oncePerCustomer: true,
      isActive: false,
    });
    expect((await db.auditLog.findMany({ where: { entityId: id } })).map((a) => a.action)).toEqual([
      "discount.create",
      "discount.update",
    ]);
    await expect(
      discountService.save(admin.id, { ...base, id: "tz4a98xxat96iws9zmbrgj3a", code: "X-1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lists codes newest first with their status", async () => {
    await createCode({ code: "ON" });
    await createCode({ code: "PAUSED", isActive: false });
    await createCode({ code: "OVER", endsAt: new Date(NOW.getTime() - 1) });
    await createCode({ code: "FULL", maxUses: 2, usedCount: 2 });

    const rows = await discountService.listForAdmin(NOW);

    expect(rows.map((r) => [r.code, r.status])).toEqual([
      ["FULL", "USED_UP"],
      ["OVER", "ENDED"],
      ["PAUSED", "OFF"],
      ["ON", "ACTIVE"],
    ]);
  });
});

describe("an empty bag", () => {
  beforeEach(resetDatabase);

  it("orders nothing and uses nothing", async () => {
    await createCode();
    const fixture = await checkoutFixture();
    const otherCart = await createCart((await createUser()).id);

    await expect(
      checkoutService.placeOrder({
        userId: fixture.user.id,
        customerEmail: fixture.user.email,
        cartId: otherCart.id,
        addressId: fixture.address.id,
        paymentMethod: "COD",
        discountCode: "WELCOME10",
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "CART_EMPTY" });
    expect(await usedCount()).toBe(0);
  });
});

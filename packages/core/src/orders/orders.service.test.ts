import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { checkoutFixture, createUser, resetDatabase } from "../../test/factories";
import { sentEmails } from "../../test/setup";
import { checkoutService } from "./checkout.service";
import { orderService } from "./orders.service";

async function placeCod(options: { stock?: number; quantity?: number } = {}) {
  const fixture = await checkoutFixture({ stock: options.stock ?? 5, quantity: options.quantity ?? 1 });
  const { orderNumber } = await checkoutService.placeOrder({
    userId: fixture.user.id,
    customerEmail: fixture.user.email,
    cartId: fixture.cart.id,
    addressId: fixture.address.id,
    paymentMethod: "COD",
  });
  sentEmails.length = 0;
  return { ...fixture, orderNumber, admin: await createUser({ role: "ADMIN" }) };
}

describe("orderService — customer access", () => {
  beforeEach(resetDatabase);

  it("returns NOT_FOUND for another customer's order", async () => {
    const { orderNumber } = await placeCod();
    const stranger = await createUser();

    await expect(orderService.getForUser(stranger.id, orderNumber)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("lists a customer's orders newest first", async () => {
    const { user, orderNumber } = await placeCod();

    const page = await orderService.listForUser(user.id);

    expect(page.items.map((o) => o.orderNumber)).toEqual([orderNumber]);
  });
});

describe("orderService.advance — fulfilment", () => {
  beforeEach(resetDatabase);

  it("walks CONFIRMED → PROCESSING → SHIPPED → DELIVERED, emailing on ship and auditing each step", async () => {
    const { orderNumber, admin } = await placeCod();

    await orderService.advance(admin.id, { orderNumber, to: "PROCESSING" });
    await orderService.advance(admin.id, {
      orderNumber,
      to: "SHIPPED",
      courierName: "Pathao Parcel",
      trackingNumber: "PX-123",
    });
    await orderService.advance(admin.id, { orderNumber, to: "DELIVERED" });

    const order = await db.order.findUniqueOrThrow({ where: { orderNumber } });
    expect(order).toMatchObject({
      status: "DELIVERED",
      courierName: "Pathao Parcel",
      trackingNumber: "PX-123",
    });
    expect(sentEmails.map((e) => e.subject)).toEqual([`Order ${orderNumber} is on its way`]);
    expect(await db.auditLog.count({ where: { actorId: admin.id } })).toBe(3);
  });

  it("refuses to skip steps", async () => {
    const { orderNumber, admin } = await placeCod();

    await expect(orderService.advance(admin.id, { orderNumber, to: "DELIVERED" })).rejects.toMatchObject({
      code: "INVALID_STATE_TRANSITION",
    });
  });

  it("cancelling restores stock, fails the COD payment and emails the customer", async () => {
    const { orderNumber, admin, variant } = await placeCod({ stock: 5, quantity: 2 });

    await orderService.advance(admin.id, {
      orderNumber,
      to: "CANCELLED",
      reason: "Customer asked to cancel",
    });

    const order = await db.order.findUniqueOrThrow({ where: { orderNumber } });
    expect(order).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "FAILED",
      cancelReason: "Customer asked to cancel",
    });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stock).toBe(5);
    expect(sentEmails.map((e) => e.subject)).toEqual([`Order ${orderNumber} was cancelled`]);
  });

  it("can't cancel a shipped order", async () => {
    const { orderNumber, admin } = await placeCod();
    await orderService.advance(admin.id, { orderNumber, to: "PROCESSING" });
    await orderService.advance(admin.id, {
      orderNumber,
      to: "SHIPPED",
      courierName: "NCM",
      trackingNumber: "1",
    });

    await expect(
      orderService.advance(admin.id, { orderNumber, to: "CANCELLED", reason: "Too late" }),
    ).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" });
  });
});

describe("orderService — payments", () => {
  beforeEach(resetDatabase);

  it("marks COD collected", async () => {
    const { orderNumber, admin } = await placeCod();

    await orderService.markCodCollected(admin.id, orderNumber);

    const order = await db.order.findUniqueOrThrow({ where: { orderNumber }, include: { payments: true } });
    expect(order.paymentStatus).toBe("COD_COLLECTED");
    expect(order.payments[0]?.status).toBe("COD_COLLECTED");
  });

  it("won't record a refund for an order that wasn't paid online", async () => {
    const { orderNumber, admin } = await placeCod();

    await expect(orderService.recordRefund(admin.id, orderNumber, "Returned item")).rejects.toMatchObject({
      code: "INVALID_STATE_TRANSITION",
    });
  });

  it("won't mark a COD order paid manually", async () => {
    const { orderNumber, admin } = await placeCod();

    await expect(orderService.markPaidManually(admin.id, orderNumber, "ref 123")).rejects.toMatchObject({
      code: "INVALID_STATE_TRANSITION",
    });
  });
});

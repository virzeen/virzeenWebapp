import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { checkoutFixture, resetDatabase } from "../../test/factories";
import { json, mockProvider, sentEmails } from "../../test/setup";
import { COD_MAX_TOTAL_PAISA } from "../pricing/cod-rules";
import { SHIPPING_RATES_PAISA } from "../pricing/shipping-rates";
import { checkoutService } from "./checkout.service";

const NOW = new Date("2026-09-28T06:00:00Z"); // 11:45 in Kathmandu

function place(
  fixture: Awaited<ReturnType<typeof checkoutFixture>>,
  paymentMethod: "COD" | "ESEWA" | "KHALTI",
) {
  return checkoutService.placeOrder({
    userId: fixture.user.id,
    customerEmail: fixture.user.email,
    cartId: fixture.cart.id,
    addressId: fixture.address.id,
    paymentMethod,
    now: NOW,
  });
}

describe("checkoutService.placeOrder — COD", () => {
  beforeEach(resetDatabase);

  it("confirms the order, marks COD due, decrements stock, clears the bag and emails once", async () => {
    const fixture = await checkoutFixture({ stock: 5, pricePaisa: 450_000, quantity: 2 });

    const result = await place(fixture, "COD");

    expect(result).toEqual({ orderNumber: "VZ-260928-0001", next: { type: "done" } });
    const order = await db.order.findUniqueOrThrow({
      where: { orderNumber: result.orderNumber },
      include: { items: true, payments: true },
    });
    expect(order).toMatchObject({
      status: "CONFIRMED",
      paymentStatus: "COD_DUE",
      subtotalPaisa: 900_000,
      shippingPaisa: SHIPPING_RATES_PAISA.KATHMANDU_VALLEY,
      totalPaisa: 900_000 + SHIPPING_RATES_PAISA.KATHMANDU_VALLEY,
      shippingZone: "KATHMANDU_VALLEY",
      reservedUntil: null,
    });
    expect(order.items).toMatchObject([
      { productName: "Linen Overshirt", sku: fixture.variant.sku, unitPricePaisa: 450_000, quantity: 2 },
    ]);
    expect(order.payments).toMatchObject([
      { provider: "COD", status: "COD_DUE", amountPaisa: order.totalPaisa },
    ]);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(3);
    expect(await db.cartItem.count({ where: { cartId: fixture.cart.id } })).toBe(0);
    expect(sentEmails.map((e) => e.subject)).toEqual([`Order ${result.orderNumber} confirmed`]);
  });

  it("uses the outside-valley rate for other districts", async () => {
    const fixture = await checkoutFixture({ district: "Kaski" });
    await db.address.update({ where: { id: fixture.address.id }, data: { province: "Gandaki" } });

    const { orderNumber } = await place(fixture, "COD");

    const order = await db.order.findUniqueOrThrow({ where: { orderNumber } });
    expect(order.shippingPaisa).toBe(SHIPPING_RATES_PAISA.OUTSIDE_VALLEY);
  });

  it.runIf(COD_MAX_TOTAL_PAISA !== null)(
    "refuses COD above the limit without creating an order",
    async () => {
      const fixture = await checkoutFixture({ pricePaisa: COD_MAX_TOTAL_PAISA ?? 0, stock: 5 });

      await expect(place(fixture, "COD")).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
      expect(await db.order.count()).toBe(0);
    },
  );

  it.runIf(COD_MAX_TOTAL_PAISA === null)("accepts COD for a large order when there is no limit", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 5_000_000, stock: 5, quantity: 2 }); // Rs 1,00,000

    await expect(place(fixture, "COD")).resolves.toMatchObject({ orderNumber: expect.any(String) });
  });

  it("creates only one order when submitted twice (double click)", async () => {
    const fixture = await checkoutFixture({ stock: 5 });

    const results = await Promise.allSettled([place(fixture, "COD"), place(fixture, "COD")]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected && "reason" in rejected ? rejected.reason : null).toMatchObject({ code: "CART_EMPTY" });
    expect(await db.order.count()).toBe(1);
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(4);
  });
});

describe("checkoutService.placeOrder — bag changes", () => {
  beforeEach(resetDatabase);

  it("stops with PRICE_CHANGED, refreshes the bag and creates no order", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 450_000 });
    await db.productVariant.update({ where: { id: fixture.variant.id }, data: { pricePaisa: 480_000 } });

    await expect(place(fixture, "COD")).rejects.toMatchObject({ code: "PRICE_CHANGED" });
    expect(await db.order.count()).toBe(0);
    const line = await db.cartItem.findFirstOrThrow({ where: { cartId: fixture.cart.id } });
    expect(line.unitPricePaisa).toBe(480_000);
  });

  it("stops with OUT_OF_STOCK when stock dropped below the bag quantity", async () => {
    const fixture = await checkoutFixture({ stock: 5, quantity: 3 });
    await db.productVariant.update({ where: { id: fixture.variant.id }, data: { stock: 1 } });

    await expect(place(fixture, "COD")).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
    expect(await db.order.count()).toBe(0);
  });

  it("stops with CART_EMPTY for an empty bag", async () => {
    const fixture = await checkoutFixture();
    await db.cartItem.deleteMany({ where: { cartId: fixture.cart.id } });

    await expect(place(fixture, "COD")).rejects.toMatchObject({ code: "CART_EMPTY" });
  });

  it("won't use another customer's address", async () => {
    const mine = await checkoutFixture();
    const theirs = await checkoutFixture();

    await expect(
      checkoutService.placeOrder({
        userId: mine.user.id,
        customerEmail: mine.user.email,
        cartId: mine.cart.id,
        addressId: theirs.address.id,
        paymentMethod: "COD",
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("checkoutService.placeOrder — online payments", () => {
  beforeEach(resetDatabase);

  it("eSewa: holds stock for 60 minutes and returns a signed form", async () => {
    const fixture = await checkoutFixture({ pricePaisa: 450_000 });

    const result = await place(fixture, "ESEWA");

    expect(result.next).toMatchObject({
      type: "form",
      action: "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
      fields: {
        transaction_uuid: "VZ-260928-0001-1",
        total_amount: ((450_000 + SHIPPING_RATES_PAISA.KATHMANDU_VALLEY) / 100).toFixed(2),
        product_code: "EPAYTEST",
      },
    });
    const order = await db.order.findUniqueOrThrow({
      where: { orderNumber: result.orderNumber },
      include: { payments: true },
    });
    expect(order).toMatchObject({ status: "PENDING", paymentStatus: "PENDING" });
    expect(order.reservedUntil?.toISOString()).toBe("2026-09-28T07:00:00.000Z");
    expect(order.payments).toMatchObject([
      { provider: "ESEWA", providerRef: "VZ-260928-0001-1", status: "PENDING" },
    ]);
    expect(sentEmails).toHaveLength(0);
  });

  it("Khalti: initiates server-side and redirects to the payment URL", async () => {
    const fixture = await checkoutFixture();
    mockProvider(() => json({ pidx: "PIDX123", payment_url: "https://test-pay.khalti.com/?pidx=PIDX123" }));

    const result = await place(fixture, "KHALTI");

    expect(result.next).toEqual({ type: "redirect", url: "https://test-pay.khalti.com/?pidx=PIDX123" });
    const payment = await db.payment.findUniqueOrThrow({ where: { providerRef: "PIDX123" } });
    expect(payment).toMatchObject({
      provider: "KHALTI",
      status: "PENDING",
      amountPaisa: 450_000 + SHIPPING_RATES_PAISA.KATHMANDU_VALLEY,
    });
  });

  it("Khalti down: cancels the order, restores stock and puts the items back in the bag", async () => {
    const fixture = await checkoutFixture({ stock: 5, quantity: 2 });
    mockProvider(() => new Response("error", { status: 500 }));

    await expect(place(fixture, "KHALTI")).rejects.toMatchObject({ code: "PAYMENT_FAILED" });

    const order = await db.order.findFirstOrThrow();
    expect(order).toMatchObject({ status: "CANCELLED", paymentStatus: "UNPAID" });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(5);
    expect(await db.cartItem.findFirst({ where: { cartId: fixture.cart.id } })).toMatchObject({
      quantity: 2,
    });
  });
});

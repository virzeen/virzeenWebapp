import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutFixture, createUser, resetDatabase } from "../../test/factories";
import { json, mockProvider, sentEmails, TEST_ESEWA } from "../../test/setup";
import { checkoutService } from "../orders/checkout.service";
import { SHIPPING_RATES_PAISA } from "../pricing/shipping-rates";
import { signEsewa } from "./esewa";
import { paymentService } from "./payment.service";
import { reconcilePayments } from "./reconcile";

// The fixture order: one Rs 4,500 item delivered inside the valley.
const TOTAL_PAISA = 450_000 + SHIPPING_RATES_PAISA.KATHMANDU_VALLEY;
const TOTAL_RUPEES = TOTAL_PAISA / 100;

const PLACED_AT = new Date("2026-09-28T06:00:00Z");
const minutesLater = (minutes: number) => new Date(PLACED_AT.getTime() + minutes * 60_000);

async function placeOnline(method: "ESEWA" | "KHALTI", options: { stock?: number; quantity?: number } = {}) {
  const fixture = await checkoutFixture({
    pricePaisa: 450_000,
    stock: options.stock ?? 5,
    quantity: options.quantity ?? 1,
  });
  if (method === "KHALTI")
    mockProvider(() => json({ pidx: "PIDX123", payment_url: "https://test-pay.khalti.com/?pidx=PIDX123" }));
  const result = await checkoutService.placeOrder({
    userId: fixture.user.id,
    customerEmail: fixture.user.email,
    cartId: fixture.cart.id,
    addressId: fixture.address.id,
    paymentMethod: method,
    now: PLACED_AT,
  });
  const payment = await db.payment.findFirstOrThrow({
    where: { order: { orderNumber: result.orderNumber } },
  });
  // Make the attempt old enough for reconciliation.
  await db.payment.update({ where: { id: payment.id }, data: { createdAt: PLACED_AT } });
  return { ...fixture, orderNumber: result.orderNumber, payment };
}

function esewaSuccessData(
  transactionUuid: string,
  totalAmount = `${TOTAL_RUPEES.toLocaleString("en-US")}.0`,
) {
  const payload: Record<string, string> = {
    transaction_code: "000AWEO",
    status: "COMPLETE",
    total_amount: totalAmount,
    transaction_uuid: transactionUuid,
    product_code: TEST_ESEWA.productCode,
    signed_field_names:
      "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
  };
  const message = payload
    .signed_field_names!.split(",")
    .map((name) => `${name}=${payload[name]}`)
    .join(",");
  payload.signature = signEsewa(message, TEST_ESEWA.secretKey);
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

const esewaStatus = (status: string, totalAmount = TOTAL_RUPEES) =>
  mockProvider(() => json({ status, total_amount: totalAmount, ref_id: "REF-1" }));

async function orderState(orderNumber: string) {
  return db.order.findUniqueOrThrow({
    where: { orderNumber },
    select: {
      status: true,
      paymentStatus: true,
      payments: { select: { status: true, flaggedAt: true, lastIssue: true } },
    },
  });
}

describe("eSewa success callback", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(minutesLater(5));
  });

  it("marks the order PAID and CONFIRMED only after the status API says COMPLETE with the exact amount", async () => {
    const { orderNumber, payment } = await placeOnline("ESEWA");
    esewaStatus("COMPLETE");

    const result = await paymentService.handleEsewaSuccess(esewaSuccessData(payment.providerRef));

    expect(result).toEqual({ outcome: "PAID", orderNumber });
    expect(await orderState(orderNumber)).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
    expect(sentEmails.map((e) => e.subject)).toEqual([`Order ${orderNumber} confirmed`]);
  });

  it("rejects a forged callback (invalid signature) without changing anything", async () => {
    const { orderNumber, payment } = await placeOnline("ESEWA");
    const forged = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(esewaSuccessData(payment.providerRef), "base64").toString()),
        total_amount: "1.0",
      }),
    ).toString("base64");

    await expect(paymentService.handleEsewaSuccess(forged)).rejects.toMatchObject({ code: "PAYMENT_FAILED" });
    expect(await orderState(orderNumber)).toMatchObject({ status: "PENDING", paymentStatus: "PENDING" });
  });

  it("leaves the order unpaid and alerts the owner once when the amount doesn't match", async () => {
    const { orderNumber, payment } = await placeOnline("ESEWA");
    esewaStatus("COMPLETE", 100);

    const first = await paymentService.handleEsewaSuccess(esewaSuccessData(payment.providerRef));
    const second = await paymentService.handleEsewaSuccess(esewaSuccessData(payment.providerRef));

    expect(first.outcome).toBe("MISMATCH");
    expect(second.outcome).toBe("MISMATCH");
    const state = await orderState(orderNumber);
    expect(state).toMatchObject({ status: "PENDING", paymentStatus: "PENDING" });
    expect(state.payments[0]).toMatchObject({ lastIssue: "AMOUNT_MISMATCH" });
    expect(state.payments[0]?.flaggedAt).not.toBeNull();
    expect(sentEmails.map((e) => e.subject)).toEqual(["[Virzeen admin] Payment amount mismatch"]);
  });

  it("processes a duplicate callback without side effects", async () => {
    const { orderNumber, payment } = await placeOnline("ESEWA");
    esewaStatus("COMPLETE");
    const data = esewaSuccessData(payment.providerRef);

    await paymentService.handleEsewaSuccess(data);
    const replay = await paymentService.handleEsewaSuccess(data);

    expect(replay).toEqual({ outcome: "PAID", orderNumber });
    expect(sentEmails).toHaveLength(1);
    expect(await db.orderEvent.count({ where: { order: { orderNumber }, to: "PAID" } })).toBe(1);
  });

  it("handles two simultaneous callbacks with a single confirmation", async () => {
    const { payment, orderNumber } = await placeOnline("ESEWA");
    esewaStatus("COMPLETE");
    const data = esewaSuccessData(payment.providerRef);

    const results = await Promise.all([
      paymentService.handleEsewaSuccess(data),
      paymentService.handleEsewaSuccess(data),
    ]);

    expect(results.map((r) => r.outcome)).toEqual(["PAID", "PAID"]);
    expect(await db.orderEvent.count({ where: { order: { orderNumber }, to: "CONFIRMED" } })).toBe(1);
    expect(sentEmails).toHaveLength(1);
  });
});

describe("eSewa failure redirect", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(minutesLater(5));
  });

  it("cancels the attempt for the order's own customer, restoring stock and the bag", async () => {
    const fixture = await placeOnline("ESEWA", { stock: 5, quantity: 2 });
    esewaStatus("NOT_FOUND");

    const result = await paymentService.handleEsewaFailure(fixture.payment.providerRef, fixture.user.id);

    expect(result?.outcome).toBe("FAILED");
    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "FAILED",
    });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(5);
    expect(await db.cartItem.findFirst({ where: { cart: { userId: fixture.user.id } } })).toMatchObject({
      quantity: 2,
    });
  });

  it("does nothing when someone else hits the failure URL", async () => {
    const fixture = await placeOnline("ESEWA");
    const stranger = await createUser();

    const result = await paymentService.handleEsewaFailure(fixture.payment.providerRef, stranger.id);

    expect(result?.outcome).toBe("PENDING");
    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "PENDING",
      paymentStatus: "PENDING",
    });
  });

  it("still marks PAID if eSewa actually completed the payment", async () => {
    const fixture = await placeOnline("ESEWA");
    esewaStatus("COMPLETE");

    const result = await paymentService.handleEsewaFailure(fixture.payment.providerRef, fixture.user.id);

    expect(result?.outcome).toBe("PAID");
  });
});

describe("Khalti return", () => {
  beforeEach(async () => {
    await resetDatabase();
    // Customer returns 5 minutes after placing the order (inside the 60-minute reservation).
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(minutesLater(5));
  });

  it.each([
    ["Completed", "PAID", "CONFIRMED", "PAID"],
    ["User canceled", "FAILED", "CANCELLED", "FAILED"],
    ["Expired", "EXPIRED", "CANCELLED", "EXPIRED"],
    ["Pending", "PENDING", "PENDING", "PENDING"],
  ])("lookup %s → %s", async (khaltiStatus, outcome, orderStatus, paymentStatus) => {
    const { orderNumber } = await placeOnline("KHALTI");
    mockProvider(() =>
      json({ pidx: "PIDX123", status: khaltiStatus, total_amount: TOTAL_PAISA, transaction_id: "T1" }),
    );

    const result = await paymentService.handleKhaltiReturn("PIDX123");

    expect(result).toEqual({ outcome, orderNumber });
    expect(await orderState(orderNumber)).toMatchObject({ status: orderStatus, paymentStatus });
  });

  it("ignores an unknown pidx", async () => {
    await expect(paymentService.handleKhaltiReturn("UNKNOWN")).resolves.toBeNull();
  });
});

describe("reconcilePayments", () => {
  beforeEach(resetDatabase);

  it("pending → reconciliation → paid", async () => {
    const { orderNumber } = await placeOnline("KHALTI");
    mockProvider(() => json({ pidx: "PIDX123", status: "Completed", total_amount: TOTAL_PAISA }));

    const summary = await reconcilePayments(minutesLater(10));

    expect(summary.outcomes).toEqual({ PAID: 1 });
    expect(await orderState(orderNumber)).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
  });

  it("leaves a still-pending payment alone inside the reservation window", async () => {
    const { orderNumber } = await placeOnline("ESEWA");
    esewaStatus("PENDING");

    await reconcilePayments(minutesLater(30));

    expect(await orderState(orderNumber)).toMatchObject({ status: "PENDING", paymentStatus: "PENDING" });
  });

  it("pending → expired → stock restored once the reservation has passed", async () => {
    const fixture = await placeOnline("ESEWA", { stock: 5, quantity: 2 });
    esewaStatus("NOT_FOUND");
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(3);

    const summary = await reconcilePayments(minutesLater(61));

    expect(summary.outcomes).toEqual({ EXPIRED: 1 });
    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "EXPIRED",
    });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(5);
  });

  it("never auto-resolves an AMBIGUOUS payment and flags it to the owner after 24h", async () => {
    const { orderNumber } = await placeOnline("ESEWA");
    esewaStatus("AMBIGUOUS");

    await reconcilePayments(minutesLater(61));
    expect(await orderState(orderNumber)).toMatchObject({ status: "PENDING", paymentStatus: "PENDING" });

    const summary = await reconcilePayments(minutesLater(24 * 60 + 1));
    expect(summary.flagged).toBe(1);
    expect(sentEmails.map((e) => e.subject)).toContain(
      "[Virzeen admin] Payment still unresolved after 24 hours",
    );

    const again = await reconcilePayments(minutesLater(24 * 60 + 20));
    expect(again.flagged).toBe(0);
  });

  it("keeps reconciling when the provider is down", async () => {
    const { orderNumber } = await placeOnline("KHALTI");
    mockProvider(() => new Response("down", { status: 502 }));

    const summary = await reconcilePayments(minutesLater(10));

    expect(summary.outcomes).toEqual({ PENDING: 1 });
    expect(await orderState(orderNumber)).toMatchObject({ status: "PENDING" });
  });
});

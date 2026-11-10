import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutFixture, createUser, resetDatabase } from "../../test/factories";
import { json, mockProvider, sentEmails, TEST_ESEWA } from "../../test/setup";
import { checkoutService } from "../orders/checkout.service";
import { orderService } from "../orders/orders.service";
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
  // Make the order and its attempt as old as PLACED_AT says, for reconciliation and the reminder.
  await db.payment.update({ where: { id: payment.id }, data: { createdAt: PLACED_AT } });
  await db.order.update({ where: { orderNumber: result.orderNumber }, data: { createdAt: PLACED_AT } });
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

    expect(result).toEqual({ outcome: "PAID", orderNumber, answered: true });
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

    expect(replay).toMatchObject({ outcome: "PAID", orderNumber });
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

  it("keeps the order waiting for payment (Pay now) without ending anything, whoever opens the URL", async () => {
    const fixture = await placeOnline("ESEWA", { stock: 5, quantity: 2 });
    esewaStatus("NOT_FOUND");

    const result = await paymentService.handleEsewaFailure(fixture.payment.providerRef);

    expect(result).toMatchObject({ outcome: "RETRY", answered: true });
    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "PENDING",
      paymentStatus: "PENDING",
      payments: [{ status: "PENDING" }],
    });
    // The stock stays held for the order.
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(3);
  });

  it("still marks PAID if eSewa actually completed the payment", async () => {
    const fixture = await placeOnline("ESEWA");
    esewaStatus("COMPLETE");

    const result = await paymentService.handleEsewaFailure(fixture.payment.providerRef);

    expect(result?.outcome).toBe("PAID");
  });
});

describe("Khalti return", () => {
  beforeEach(async () => {
    await resetDatabase();
    // Customer returns 5 minutes after placing the order (inside its 15 minutes).
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(minutesLater(5));
  });

  // A cancelled or expired attempt ends only itself: the order keeps waiting for payment (Pay now).
  it.each([
    ["Completed", "PAID", "CONFIRMED", "PAID", "PAID"],
    ["User canceled", "RETRY", "PENDING", "PENDING", "FAILED"],
    ["Expired", "RETRY", "PENDING", "PENDING", "EXPIRED"],
    ["Pending", "PENDING", "PENDING", "PENDING", "PENDING"],
  ])("lookup %s → %s", async (khaltiStatus, outcome, orderStatus, paymentStatus, attemptStatus) => {
    const { orderNumber } = await placeOnline("KHALTI");
    mockProvider(() =>
      json({ pidx: "PIDX123", status: khaltiStatus, total_amount: TOTAL_PAISA, transaction_id: "T1" }),
    );

    const result = await paymentService.handleKhaltiReturn("PIDX123");

    expect(result).toEqual({ outcome, orderNumber, answered: true });
    expect(await orderState(orderNumber)).toMatchObject({
      status: orderStatus,
      paymentStatus,
      payments: [{ status: attemptStatus }],
    });
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

  it("leaves a still-pending payment alone inside the 15 minutes", async () => {
    const { orderNumber } = await placeOnline("ESEWA");
    esewaStatus("PENDING");

    await reconcilePayments(minutesLater(10));

    expect(await orderState(orderNumber)).toMatchObject({ status: "PENDING", paymentStatus: "PENDING" });
  });

  it("pending → expired → stock and bag restored once the 15 minutes have passed; the attempt stays watched", async () => {
    const fixture = await placeOnline("ESEWA", { stock: 5, quantity: 2 });
    esewaStatus("NOT_FOUND");
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(3);

    const summary = await reconcilePayments(minutesLater(16));

    expect(summary.expiredUnpaid).toBe(1);
    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "EXPIRED",
      payments: [{ status: "PENDING" }],
    });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(5);
    expect(await db.cartItem.findFirst({ where: { cart: { userId: fixture.user.id } } })).toMatchObject({
      quantity: 2,
    });

    // 70 minutes on, still nothing paid: the attempt expires too.
    await reconcilePayments(minutesLater(71));
    expect((await orderState(fixture.orderNumber)).payments).toEqual([
      expect.objectContaining({ status: "EXPIRED" }),
    ]);
  });

  it("never auto-resolves an AMBIGUOUS payment and flags it to the owner after 24h", async () => {
    const { orderNumber } = await placeOnline("ESEWA");
    esewaStatus("AMBIGUOUS");

    // Past its 15 minutes, but eSewa can't settle it: the order keeps waiting (payment-policy.md §1.5).
    const kept = await reconcilePayments(minutesLater(16));
    expect(kept.kept).toBe(1);
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

describe("late and second payments (specs/payment-window.md)", () => {
  beforeEach(resetDatabase);

  it("a payment made after the order expired is recorded and sent to the owner to refund, once", async () => {
    const fixture = await placeOnline("ESEWA");
    esewaStatus("NOT_FOUND");
    await reconcilePayments(minutesLater(16));
    sentEmails.length = 0;

    esewaStatus("COMPLETE");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(minutesLater(20));
    const result = await paymentService.handleEsewaSuccess(esewaSuccessData(fixture.payment.providerRef));
    const again = await paymentService.handleEsewaSuccess(esewaSuccessData(fixture.payment.providerRef));

    expect(result.outcome).toBe("LATE");
    expect(again.outcome).toBe("LATE");
    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "EXPIRED",
      payments: [{ status: "PAID" }],
    });
    expect(sentEmails.map((e) => e.subject)).toEqual(["[Virzeen admin] Payment received for a closed order"]);
    expect(await orderService.getForUser(fixture.user.id, fixture.orderNumber)).toMatchObject({
      paidLate: true,
    });
  });

  it("a customer coming back paid on an attempt we had already expired is still checked", async () => {
    const fixture = await placeOnline("ESEWA");
    esewaStatus("NOT_FOUND");
    await reconcilePayments(minutesLater(16));
    await reconcilePayments(minutesLater(71)); // the attempt itself expires

    esewaStatus("COMPLETE");
    const result = await paymentService.handleEsewaSuccess(esewaSuccessData(fixture.payment.providerRef));

    expect(result.outcome).toBe("LATE");
    expect((await orderState(fixture.orderNumber)).payments).toEqual([
      expect.objectContaining({ status: "PAID" }),
    ]);
  });
});

describe("Pay now (paymentService.startAttempt)", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(minutesLater(6));
  });

  it("starts attempt 2 with the same total, after checking the first one wasn't paid", async () => {
    const fixture = await placeOnline("ESEWA");
    esewaStatus("NOT_FOUND");

    const result = await paymentService.startAttempt({
      userId: fixture.user.id,
      orderNumber: fixture.orderNumber,
      method: "ESEWA",
      now: minutesLater(6),
    });

    expect(result.next.type).toBe("form");
    const attempts = await db.payment.findMany({
      where: { order: { orderNumber: fixture.orderNumber } },
      select: { attempt: true, providerRef: true, amountPaisa: true, status: true },
      orderBy: { attempt: "asc" },
    });
    expect(attempts).toEqual([
      expect.objectContaining({ attempt: 1, status: "PENDING" }),
      { attempt: 2, providerRef: `${fixture.orderNumber}-2`, amountPaisa: TOTAL_PAISA, status: "PENDING" },
    ]);
    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "PENDING",
      paymentStatus: "PENDING",
    });
  });

  it("switches to Khalti when chosen", async () => {
    const fixture = await placeOnline("ESEWA");
    mockProvider((url) =>
      url.pathname.includes("/epayment/initiate/")
        ? json({ pidx: "PIDX456", payment_url: "https://test-pay.khalti.com/?pidx=PIDX456" })
        : json({ status: "NOT_FOUND", total_amount: TOTAL_RUPEES }),
    );

    const result = await paymentService.startAttempt({
      userId: fixture.user.id,
      orderNumber: fixture.orderNumber,
      method: "KHALTI",
      now: minutesLater(6),
    });

    expect(result.next).toEqual({ type: "redirect", url: "https://test-pay.khalti.com/?pidx=PIDX456" });
    expect(
      await db.order.findUniqueOrThrow({
        where: { orderNumber: fixture.orderNumber },
        select: { paymentMethod: true },
      }),
    ).toEqual({ paymentMethod: "KHALTI" });
  });

  it("confirms the order instead when the first attempt was paid after all", async () => {
    const fixture = await placeOnline("ESEWA");
    esewaStatus("COMPLETE");

    const result = await paymentService.startAttempt({
      userId: fixture.user.id,
      orderNumber: fixture.orderNumber,
      method: "ESEWA",
      now: minutesLater(6),
    });

    expect(result.next).toEqual({ type: "done" });
    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "CONFIRMED",
      paymentStatus: "PAID",
    });
    expect(await db.payment.count({ where: { order: { orderNumber: fixture.orderNumber } } })).toBe(1);
  });

  it("refuses with under 2 minutes left, after 5 attempts, and for someone else's order", async () => {
    const fixture = await placeOnline("ESEWA");
    esewaStatus("NOT_FOUND");
    const start = (now: Date, userId = fixture.user.id) =>
      paymentService.startAttempt({ userId, orderNumber: fixture.orderNumber, method: "ESEWA", now });

    await expect(start(minutesLater(13.5))).rejects.toMatchObject({
      code: "CONFLICT",
      message: "There isn't enough time left to pay. This order will be cancelled shortly.",
    });
    const stranger = await createUser();
    await expect(start(minutesLater(6), stranger.id)).rejects.toMatchObject({ code: "NOT_FOUND" });

    for (let i = 0; i < 4; i += 1) await start(minutesLater(6));
    await expect(start(minutesLater(6))).rejects.toMatchObject({
      code: "CONFLICT",
      message: "This order can't take more payment attempts. Cancel it and order again.",
    });
  });

  it("a second payment for an already paid order is sent to the owner to refund", async () => {
    const fixture = await placeOnline("ESEWA");
    esewaStatus("NOT_FOUND");
    const second = await paymentService.startAttempt({
      userId: fixture.user.id,
      orderNumber: fixture.orderNumber,
      method: "ESEWA",
      now: minutesLater(6),
    });
    expect(second.next.type).toBe("form");
    esewaStatus("COMPLETE");

    const firstPaid = await paymentService.handleEsewaSuccess(esewaSuccessData(`${fixture.orderNumber}-2`));
    const alsoPaid = await paymentService.handleEsewaSuccess(esewaSuccessData(fixture.payment.providerRef));

    expect(firstPaid.outcome).toBe("PAID");
    expect(alsoPaid.outcome).toBe("LATE");
    expect(sentEmails.map((e) => e.subject)).toContain("[Virzeen admin] Payment received for a closed order");
  });
});

describe("Cancel order (orderService.cancelUnpaidForCustomer)", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(minutesLater(6));
  });

  it("cancels the waiting order, returning the stock and the bag", async () => {
    const fixture = await placeOnline("ESEWA", { stock: 5, quantity: 2 });
    esewaStatus("NOT_FOUND");

    await orderService.cancelUnpaidForCustomer(fixture.user.id, fixture.orderNumber, minutesLater(6));
    await orderService.cancelUnpaidForCustomer(fixture.user.id, fixture.orderNumber, minutesLater(6)); // twice

    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "FAILED",
    });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(5);
    expect(await db.cartItem.findFirst({ where: { cart: { userId: fixture.user.id } } })).toMatchObject({
      quantity: 2,
    });
  });

  it("refuses when the payment went through, and for someone else's order", async () => {
    const fixture = await placeOnline("ESEWA");
    const stranger = await createUser();
    await expect(
      orderService.cancelUnpaidForCustomer(stranger.id, fixture.orderNumber, minutesLater(6)),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    esewaStatus("COMPLETE");

    await expect(
      orderService.cancelUnpaidForCustomer(fixture.user.id, fixture.orderNumber, minutesLater(6)),
    ).rejects.toMatchObject({ code: "CONFLICT", message: "This order has just been paid." });
    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "CONFIRMED",
      paymentStatus: "PAID",
    });
  });
});

describe("payment reminder (specs/payment-window.md)", () => {
  beforeEach(resetDatabase);

  it("emails once 5 minutes or more after the order while 3 minutes or more are left", async () => {
    const { orderNumber } = await placeOnline("ESEWA");
    esewaStatus("NOT_FOUND");
    sentEmails.length = 0;

    await reconcilePayments(minutesLater(4)); // too early
    const first = await reconcilePayments(minutesLater(6));
    const second = await reconcilePayments(minutesLater(8));

    expect(first.reminded).toBe(1);
    expect(second.reminded).toBe(0);
    const reminders = sentEmails.filter(
      (e) => e.subject === `Your order ${orderNumber} is waiting for payment`,
    );
    expect(reminders).toHaveLength(1);
    expect(reminders[0]?.text).toContain("pay by 12:00 PM"); // 06:15 UTC in Nepal
    expect(reminders[0]?.text).toContain(`https://virzeen.test/account/orders/${orderNumber}`);
  });

  it("sends none when under 3 minutes are left or the order is paid", async () => {
    await placeOnline("ESEWA");
    esewaStatus("NOT_FOUND");
    sentEmails.length = 0;
    expect((await reconcilePayments(minutesLater(13))).reminded).toBe(0);

    await resetDatabase();
    await placeOnline("KHALTI");
    mockProvider(() => json({ pidx: "PIDX123", status: "Completed", total_amount: TOTAL_PAISA }));
    expect((await reconcilePayments(minutesLater(6))).reminded).toBe(0);
  });
});

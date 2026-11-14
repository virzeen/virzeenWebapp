import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutFixture, createUser, resetDatabase } from "../../test/factories";
import { json, mockProvider, sentEmails, TEST_ESEWA } from "../../test/setup";
import { checkoutService } from "../orders/checkout.service";
import { orderService } from "../orders/orders.service";
import { signEsewa } from "./esewa";
import { paymentService } from "./payment.service";
import { reconcilePayments } from "./reconcile";

// The fixture order: one Rs 4,500 item delivered inside the valley.
const TOTAL_PAISA = 450_000 + 0;
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

  it("keeps the order waiting for payment (Pay now) without ending anything", async () => {
    const fixture = await placeOnline("ESEWA", { stock: 5, quantity: 2 });
    esewaStatus("NOT_FOUND");

    const result = await paymentService.handleEsewaFailure(fixture.payment.providerRef, fixture.user.id);

    expect(result).toMatchObject({ outcome: "RETRY", answered: true });
    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "PENDING",
      paymentStatus: "PENDING",
      payments: [{ status: "PENDING" }],
    });
    // The stock stays held for the order.
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(3);
  });

  it("tells anyone but the order's customer nothing, and doesn't ask eSewa", async () => {
    const fixture = await placeOnline("ESEWA");
    const stranger = await createUser();
    let asked = false;
    mockProvider(() => {
      asked = true;
      return json({ status: "COMPLETE", total_amount: TOTAL_RUPEES, ref_id: "REF-1" });
    });

    // The reference is the order number plus the attempt: easy to guess.
    await expect(
      paymentService.handleEsewaFailure(fixture.payment.providerRef, stranger.id),
    ).resolves.toBeNull();
    await expect(paymentService.handleEsewaFailure(fixture.payment.providerRef, null)).resolves.toBeNull();

    expect(asked).toBe(false);
    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "PENDING",
      payments: [{ status: "PENDING", lastIssue: null }],
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
    // Customer returns 5 minutes after placing the order (inside its 15 minutes).
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(minutesLater(5));
  });

  // A cancelled or expired attempt ends only itself: the order keeps waiting for payment (Pay now).
  // Khalti "Pending" means "hold, do not provide service": not an answer, never read as unpaid.
  it.each([
    ["Completed", "PAID", true, "CONFIRMED", "PAID", "PAID"],
    ["User canceled", "RETRY", true, "PENDING", "PENDING", "FAILED"],
    ["Expired", "RETRY", true, "PENDING", "PENDING", "EXPIRED"],
    ["Initiated", "PENDING", true, "PENDING", "PENDING", "PENDING"],
    ["Pending", "PENDING", false, "PENDING", "PENDING", "PENDING"],
  ])("lookup %s → %s", async (khaltiStatus, outcome, answered, orderStatus, paymentStatus, attemptStatus) => {
    const { orderNumber } = await placeOnline("KHALTI");
    mockProvider(() =>
      json({ pidx: "PIDX123", status: khaltiStatus, total_amount: TOTAL_PAISA, transaction_id: "T1" }),
    );

    const result = await paymentService.handleKhaltiReturn("PIDX123");

    expect(result).toEqual({ outcome, orderNumber, answered });
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

  it("Khalti 'Pending' (hold) never cancels the order or ends the attempt, and reaches the owner after 24h", async () => {
    const { orderNumber } = await placeOnline("KHALTI");
    mockProvider(() => json({ pidx: "PIDX123", status: "Pending", total_amount: TOTAL_PAISA }));

    const kept = await reconcilePayments(minutesLater(16));
    await reconcilePayments(minutesLater(80)); // past the 70 minutes an unpaid attempt is watched

    expect(kept.kept).toBe(1);
    expect(await orderState(orderNumber)).toMatchObject({
      status: "PENDING",
      paymentStatus: "PENDING",
      payments: [{ status: "PENDING", lastIssue: "Pending" }],
    });
    expect((await reconcilePayments(minutesLater(24 * 60 + 1))).flagged).toBe(1);
  });

  it("checks never-checked attempts before ones it checked recently", async () => {
    const first = await placeOnline("KHALTI");
    await db.payment.update({ where: { id: first.payment.id }, data: { lastCheckedAt: minutesLater(9) } });
    const second = await placeOnline("ESEWA");
    const asked: string[] = [];
    mockProvider((url) => {
      asked.push(url.hostname);
      return url.hostname.includes("khalti")
        ? json({ pidx: "PIDX123", status: "Initiated", total_amount: TOTAL_PAISA })
        : json({ status: "PENDING", total_amount: TOTAL_RUPEES });
    });

    await reconcilePayments(minutesLater(10));

    expect(second.payment.lastCheckedAt).toBeNull();
    expect(asked[0]).not.toContain("khalti"); // the eSewa attempt, never checked, went first
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
    expect(sentEmails[0]?.text).toContain(`attempt 1 (ESEWA ${fixture.payment.providerRef})`);
    expect(await orderService.getForUser(fixture.user.id, fixture.orderNumber)).toMatchObject({
      latePayment: "TO_REFUND",
    });

    // The owner refunds it in eSewa's dashboard and records it on the attempt; the order stays cancelled.
    const admin = await createUser({ role: "ADMIN" });
    await orderService.refundAttempt(admin.id, fixture.orderNumber, fixture.payment.id, "eSewa refund R-1");

    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "CANCELLED",
      paymentStatus: "EXPIRED",
      payments: [{ status: "REFUNDED" }],
    });
    expect(await orderService.getForUser(fixture.user.id, fixture.orderNumber)).toMatchObject({
      latePayment: "REFUNDED",
    });
  });

  it("an earlier alert on the attempt (24 hours unresolved) doesn't swallow its refund email", async () => {
    const fixture = await placeOnline("KHALTI");
    mockProvider(() => json({ pidx: "PIDX123", status: "Pending", total_amount: TOTAL_PAISA }));
    await reconcilePayments(minutesLater(24 * 60 + 1)); // the order is kept (hold), the attempt flagged once
    expect((await orderState(fixture.orderNumber)).payments[0]?.flaggedAt).not.toBeNull();
    // The hold lifts without a payment and the customer cancels.
    mockProvider(() => json({ pidx: "PIDX123", status: "Initiated", total_amount: TOTAL_PAISA }));
    await orderService.cancelUnpaidForCustomer(
      fixture.user.id,
      fixture.orderNumber,
      minutesLater(24 * 60 + 2),
    );
    sentEmails.length = 0;

    // Khalti settles it as Completed after all: a payment for a closed order.
    mockProvider(() =>
      json({ pidx: "PIDX123", status: "Completed", total_amount: TOTAL_PAISA, transaction_id: "T1" }),
    );
    expect((await paymentService.handleKhaltiReturn("PIDX123"))?.outcome).toBe("LATE");

    expect(sentEmails.map((e) => e.subject)).toEqual(["[Virzeen admin] Payment received for a closed order"]);
  });

  it("a payment confirmed while the order is being cancelled ends up recorded, never lost or shown as failed", async () => {
    const fixture = await placeOnline("ESEWA");
    // eSewa takes a moment to answer the callback's check; meanwhile the customer presses Cancel order, whose own
    // check (the second call) doesn't see the payment yet. Every later check sees it, as eSewa would.
    let calls = 0;
    mockProvider(async () => {
      calls += 1;
      if (calls === 2) return json({ status: "NOT_FOUND", total_amount: TOTAL_RUPEES });
      if (calls === 1) await new Promise((resolve) => setTimeout(resolve, 100));
      return json({ status: "COMPLETE", total_amount: TOTAL_RUPEES, ref_id: "REF-1" });
    });

    const [paid, cancelled] = await Promise.allSettled([
      paymentService.handleEsewaSuccess(esewaSuccessData(fixture.payment.providerRef)),
      new Promise((resolve) => setTimeout(resolve, 30)).then(() =>
        orderService.cancelUnpaidForCustomer(fixture.user.id, fixture.orderNumber, minutesLater(6)),
      ),
    ]);

    const state = await orderState(fixture.orderNumber);
    expect(state.payments).toEqual([expect.objectContaining({ status: "PAID" })]);
    if (state.status === "CANCELLED") {
      // Cancel won: the payment is recorded as late and the owner is told to refund it.
      expect(paid).toMatchObject({ status: "fulfilled", value: { outcome: "LATE" } });
      expect(sentEmails.map((e) => e.subject)).toContain(
        "[Virzeen admin] Payment received for a closed order",
      );
    } else {
      expect(state).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
      expect(cancelled.status).toBe("rejected");
    }
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

  it("Pay now pressed twice at once starts one attempt and tells the other press to wait", async () => {
    const fixture = await placeOnline("ESEWA");
    esewaStatus("NOT_FOUND");
    const start = () =>
      paymentService.startAttempt({
        userId: fixture.user.id,
        orderNumber: fixture.orderNumber,
        method: "ESEWA",
        now: minutesLater(6),
      });

    const results = await Promise.allSettled([start(), start()]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const refused = results.find((r) => r.status === "rejected");
    expect(refused?.status === "rejected" && refused.reason).toMatchObject({
      code: "CONFLICT",
      message: "A payment for this order is already starting. Please wait a moment and try again.",
    });
    expect(await db.payment.count({ where: { order: { orderNumber: fixture.orderNumber } } })).toBe(2);
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
    // The alert names the attempt that paid the order and the one to refund, so the right one is refunded.
    const alert = sentEmails.find(
      (e) => e.subject === "[Virzeen admin] Second payment received for a paid order",
    );
    expect(alert?.text).toContain(`already paid by attempt 2 (ESEWA ${fixture.orderNumber}-2)`);
    expect(alert?.text).toContain(`Refund attempt 1 (ESEWA ${fixture.payment.providerRef})`);
  });

  it("refuses while the provider can't say whether the last attempt took the money", async () => {
    const fixture = await placeOnline("KHALTI");
    mockProvider(() => json({ pidx: "PIDX123", status: "Pending", total_amount: TOTAL_PAISA }));

    await expect(
      paymentService.startAttempt({
        userId: fixture.user.id,
        orderNumber: fixture.orderNumber,
        method: "ESEWA",
        now: minutesLater(6),
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "We're still checking your last payment. Please try again in a few minutes.",
    });
    expect(await db.payment.count({ where: { order: { orderNumber: fixture.orderNumber } } })).toBe(1);
  });

  it("Pay now with Khalti pressed twice at once also starts only one attempt", async () => {
    const fixture = await placeOnline("ESEWA");
    let pidx = 0;
    mockProvider((url) => {
      if (!url.pathname.includes("/epayment/initiate/")) {
        return json({ status: "NOT_FOUND", total_amount: TOTAL_RUPEES });
      }
      // Each press gets its own Khalti link, so only our own attempt numbers can tell them apart.
      pidx += 1;
      return json({ pidx: `PIDXK${pidx}`, payment_url: `https://test-pay.khalti.com/?pidx=PIDXK${pidx}` });
    });
    const start = () =>
      paymentService.startAttempt({
        userId: fixture.user.id,
        orderNumber: fixture.orderNumber,
        method: "KHALTI",
        now: minutesLater(6),
      });

    const results = await Promise.allSettled([start(), start()]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: { code: "CONFLICT" } });
    expect(
      await db.payment.findMany({
        where: { order: { orderNumber: fixture.orderNumber } },
        select: { attempt: true },
        orderBy: { attempt: "asc" },
      }),
    ).toEqual([{ attempt: 1 }, { attempt: 2 }]);
  });

  it("starts nothing when the order closes while the provider is being asked", async () => {
    const fixture = await placeOnline("ESEWA");
    mockProvider(async (url) => {
      if (url.pathname.includes("/epayment/initiate/")) {
        // The customer cancels in another tab while Khalti answers.
        await orderService.cancelUnpaidForCustomer(fixture.user.id, fixture.orderNumber, minutesLater(6));
        return json({ pidx: "PIDXLATE", payment_url: "https://test-pay.khalti.com/?pidx=PIDXLATE" });
      }
      return json({ status: "NOT_FOUND", total_amount: TOTAL_RUPEES });
    });

    await expect(
      paymentService.startAttempt({
        userId: fixture.user.id,
        orderNumber: fixture.orderNumber,
        method: "KHALTI",
        now: minutesLater(6),
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", message: "This order isn't waiting for payment." });
    expect(await db.payment.count({ where: { order: { orderNumber: fixture.orderNumber } } })).toBe(1);
    expect(await orderState(fixture.orderNumber)).toMatchObject({ status: "CANCELLED" });
  });

  it("the attempt that pays sets the order's method, even after Pay now switched provider", async () => {
    const fixture = await placeOnline("ESEWA");
    mockProvider((url) =>
      url.pathname.includes("/epayment/initiate/")
        ? json({ pidx: "PIDX456", payment_url: "https://test-pay.khalti.com/?pidx=PIDX456" })
        : json({ status: "NOT_FOUND", total_amount: TOTAL_RUPEES }),
    );
    await paymentService.startAttempt({
      userId: fixture.user.id,
      orderNumber: fixture.orderNumber,
      method: "KHALTI",
      now: minutesLater(6),
    });
    esewaStatus("COMPLETE");

    // The first (eSewa) attempt turns out paid after all.
    const result = await paymentService.handleEsewaSuccess(esewaSuccessData(fixture.payment.providerRef));

    expect(result.outcome).toBe("PAID");
    expect(
      await db.order.findUniqueOrThrow({
        where: { orderNumber: fixture.orderNumber },
        select: { paymentMethod: true, status: true },
      }),
    ).toEqual({ paymentMethod: "ESEWA", status: "CONFIRMED" });
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

  it.each([
    ["eSewa can't settle it", () => esewaStatus("AMBIGUOUS")],
    ["eSewa is down", () => mockProvider(() => new Response("down", { status: 502 }))],
  ])("refuses while %s, keeping the order and its stock", async (_case, provider) => {
    const fixture = await placeOnline("ESEWA", { stock: 5, quantity: 2 });
    provider();

    await expect(
      orderService.cancelUnpaidForCustomer(fixture.user.id, fixture.orderNumber, minutesLater(6)),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "We're still checking your payment. Please try again in a few minutes.",
    });
    expect(await orderState(fixture.orderNumber)).toMatchObject({
      status: "PENDING",
      paymentStatus: "PENDING",
    });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: fixture.variant.id } })).stock).toBe(3);
  });
});

describe("admin: Mark paid and refunds when an order has several attempts", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(minutesLater(6));
  });

  /** An eSewa order plus a second, Khalti attempt from Pay now: two attempts open at once. */
  async function twoOpenAttempts() {
    const fixture = await placeOnline("ESEWA");
    mockProvider((url) =>
      url.pathname.includes("/epayment/initiate/")
        ? json({ pidx: "PIDX2", payment_url: "https://test-pay.khalti.com/?pidx=PIDX2" })
        : json({ status: "NOT_FOUND", total_amount: TOTAL_RUPEES }),
    );
    await paymentService.startAttempt({
      userId: fixture.user.id,
      orderNumber: fixture.orderNumber,
      method: "KHALTI",
      now: minutesLater(6),
    });
    const second = await db.payment.findUniqueOrThrow({ where: { providerRef: "PIDX2" } });
    return { ...fixture, second, admin: await createUser({ role: "ADMIN" }) };
  }

  it("Mark paid marks the attempt the owner checked, not the newest one", async () => {
    const { orderNumber, payment, second, admin } = await twoOpenAttempts();

    await orderService.markPaidManually(admin.id, orderNumber, payment.id, "eSewa ref 000AWEO");

    expect(await orderState(orderNumber)).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });
    const attempts = await db.payment.findMany({
      where: { order: { orderNumber } },
      select: { id: true, status: true },
    });
    expect(attempts).toEqual(
      expect.arrayContaining([
        { id: payment.id, status: "PAID" },
        { id: second.id, status: "PENDING" },
      ]),
    );
    expect(
      await db.order.findUniqueOrThrow({ where: { orderNumber }, select: { paymentMethod: true } }),
    ).toEqual({ paymentMethod: "ESEWA" });
    expect(sentEmails.map((e) => e.subject)).toContain(`Order ${orderNumber} confirmed`);
  });

  it("Mark paid refuses another order's attempt, a paid attempt, and an order no longer waiting", async () => {
    const { orderNumber, payment, second, admin } = await twoOpenAttempts();
    const other = await placeOnline("ESEWA");

    await expect(
      orderService.markPaidManually(admin.id, orderNumber, other.payment.id, "ref"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await orderService.markPaidManually(admin.id, orderNumber, payment.id, "ref");
    await expect(
      orderService.markPaidManually(admin.id, orderNumber, payment.id, "ref"),
    ).rejects.toMatchObject({
      code: "INVALID_STATE_TRANSITION",
    });
    await expect(
      orderService.markPaidManually(admin.id, orderNumber, second.id, "ref"),
    ).rejects.toMatchObject({
      code: "INVALID_STATE_TRANSITION",
      message: "This order isn't waiting for payment. A payment made for it now needs a refund.",
    });
  });

  it("the order remembers which attempt paid it, even when a cron run stamps a second payment with an earlier time", async () => {
    const { orderNumber, payment, second, admin } = await twoOpenAttempts();
    mockProvider((url) =>
      url.hostname.includes("khalti")
        ? json({ pidx: "PIDX2", status: "Completed", total_amount: TOTAL_PAISA, transaction_id: "T2" })
        : json({ status: "COMPLETE", total_amount: TOTAL_RUPEES, ref_id: "REF-1" }),
    );
    // Khalti's callback confirms the order with attempt 2 at 6 minutes...
    expect((await paymentService.handleKhaltiReturn("PIDX2"))?.outcome).toBe("PAID");
    // ...while a reconciliation run that started at 5½ minutes finds attempt 1 paid too.
    await reconcilePayments(minutesLater(5.5));

    expect((await orderService.getForAdmin(orderNumber)).payingPaymentId).toBe(second.id);
    await expect(orderService.refundAttempt(admin.id, orderNumber, second.id, "no")).rejects.toMatchObject({
      code: "INVALID_STATE_TRANSITION",
    });
    await orderService.refundAttempt(admin.id, orderNumber, payment.id, "eSewa refund R-3");
    const attempts = await db.payment.findMany({
      where: { order: { orderNumber } },
      select: { id: true, status: true },
    });
    expect(attempts).toEqual(
      expect.arrayContaining([
        { id: payment.id, status: "REFUNDED" },
        { id: second.id, status: "PAID" },
      ]),
    );
  });

  it("Mark paid right after a callback paid the order changes nothing and sends no second email", async () => {
    const { orderNumber, second, admin } = await twoOpenAttempts();
    mockProvider(() =>
      json({ pidx: "PIDX2", status: "Completed", total_amount: TOTAL_PAISA, transaction_id: "T2" }),
    );
    await paymentService.handleKhaltiReturn("PIDX2");
    sentEmails.length = 0;

    await expect(
      orderService.markPaidManually(admin.id, orderNumber, second.id, "ref"),
    ).rejects.toMatchObject({
      code: "INVALID_STATE_TRANSITION",
    });
    expect(sentEmails).toHaveLength(0);
  });

  it("a second payment is refunded on its own attempt; Record refund on the order marks the attempt that paid it", async () => {
    const { orderNumber, payment, second, admin, user } = await twoOpenAttempts();
    await orderService.markPaidManually(admin.id, orderNumber, payment.id, "eSewa ref 000AWEO");
    mockProvider(() =>
      json({ pidx: "PIDX2", status: "Completed", total_amount: TOTAL_PAISA, transaction_id: "T2" }),
    );
    expect((await paymentService.handleKhaltiReturn("PIDX2"))?.outcome).toBe("LATE");

    // The attempt that paid the order can't be refunded on its own; the second payment can.
    await expect(orderService.refundAttempt(admin.id, orderNumber, payment.id, "no")).rejects.toMatchObject({
      code: "INVALID_STATE_TRANSITION",
    });
    await orderService.refundAttempt(admin.id, orderNumber, second.id, "Khalti refund K-1");
    expect(await orderState(orderNumber)).toMatchObject({ status: "CONFIRMED", paymentStatus: "PAID" });

    // Later the order is cancelled and refunded: the eSewa attempt that paid it is the one marked refunded.
    await orderService.advance(admin.id, { orderNumber, to: "CANCELLED", reason: "Out of stock" });
    await orderService.recordRefund(admin.id, orderNumber, "eSewa refund R-2");
    const attempts = await db.payment.findMany({
      where: { order: { orderNumber } },
      select: { id: true, status: true },
    });
    expect(attempts).toEqual(
      expect.arrayContaining([
        { id: payment.id, status: "REFUNDED" },
        { id: second.id, status: "REFUNDED" },
      ]),
    );
    expect(await orderState(orderNumber)).toMatchObject({ status: "CANCELLED", paymentStatus: "REFUNDED" });
    // An admin-cancelled paid order is an ordinary refund, not a late payment.
    expect(await orderService.getForUser(user.id, orderNumber)).toMatchObject({ latePayment: null });
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

  it("sends none while Khalti holds the last attempt ('Pending'): no nudge towards a second payment", async () => {
    await placeOnline("KHALTI");
    mockProvider(() => json({ pidx: "PIDX123", status: "Pending", total_amount: TOTAL_PAISA }));
    sentEmails.length = 0;

    expect((await reconcilePayments(minutesLater(6))).reminded).toBe(0);
    expect(sentEmails).toHaveLength(0);
  });
});

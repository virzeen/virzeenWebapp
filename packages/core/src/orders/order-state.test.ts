import { db } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { createUser, resetDatabase } from "../../test/factories";
import { canTransitionOrder, canTransitionPayment, transitionOrder, transitionPayment } from "./order-state";

async function createOrder(status: "PENDING" | "CONFIRMED" = "PENDING") {
  const user = await createUser();
  return db.order.create({
    data: {
      orderNumber: `VZ-260928-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
      userId: user.id,
      customerEmail: user.email,
      status,
      paymentMethod: "COD",
      subtotalPaisa: 100_000,
      shippingPaisa: 10_000,
      totalPaisa: 110_000,
      shippingZone: "KATHMANDU_VALLEY",
      addressSnapshot: {},
    },
  });
}

describe("state machine tables (payment-policy.md §3)", () => {
  it("allows exactly the documented order transitions", () => {
    expect(canTransitionOrder("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransitionOrder("PENDING", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("CONFIRMED", "PROCESSING")).toBe(true);
    expect(canTransitionOrder("PROCESSING", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("PROCESSING", "SHIPPED")).toBe(true);
    expect(canTransitionOrder("SHIPPED", "DELIVERED")).toBe(true);
    // COD refused at the door only; orderService guards who may use it.
    expect(canTransitionOrder("SHIPPED", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("DELIVERED", "RETURNED")).toBe(true);

    expect(canTransitionOrder("PENDING", "SHIPPED")).toBe(false);
    expect(canTransitionOrder("DELIVERED", "CANCELLED")).toBe(false);
    expect(canTransitionOrder("CANCELLED", "CONFIRMED")).toBe(false);
  });

  it("allows exactly the documented payment transitions", () => {
    expect(canTransitionPayment("UNPAID", "PENDING")).toBe(true);
    expect(canTransitionPayment("UNPAID", "COD_DUE")).toBe(true);
    expect(canTransitionPayment("PENDING", "PAID")).toBe(true);
    expect(canTransitionPayment("PAID", "REFUNDED")).toBe(true);
    expect(canTransitionPayment("COD_DUE", "COD_COLLECTED")).toBe(true);

    expect(canTransitionPayment("UNPAID", "PAID")).toBe(false);
    expect(canTransitionPayment("FAILED", "PAID")).toBe(false);
    expect(canTransitionPayment("EXPIRED", "PAID")).toBe(false);
  });
});

describe("transitionOrder", () => {
  beforeEach(resetDatabase);

  it("moves the order, stamps the time and writes a timeline event", async () => {
    const order = await createOrder();
    const result = await db.$transaction((tx) =>
      transitionOrder(tx, { orderId: order.id, to: "CONFIRMED", actor: "system", reason: "test" }),
    );
    expect(result).toEqual({ changed: true, from: "PENDING" });
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { events: true } });
    expect(saved.status).toBe("CONFIRMED");
    expect(saved.confirmedAt).not.toBeNull();
    expect(saved.events).toMatchObject([
      { type: "ORDER_STATUS", from: "PENDING", to: "CONFIRMED", actor: "system" },
    ]);
  });

  it("is a no-op when the order is already in the target status", async () => {
    const order = await createOrder("CONFIRMED");
    const result = await db.$transaction((tx) =>
      transitionOrder(tx, { orderId: order.id, to: "CONFIRMED", actor: "system" }),
    );
    expect(result.changed).toBe(false);
    expect(await db.orderEvent.count()).toBe(0);
  });

  it("rejects a transition the state machine doesn't allow", async () => {
    const order = await createOrder();
    await expect(
      db.$transaction((tx) => transitionOrder(tx, { orderId: order.id, to: "SHIPPED", actor: "system" })),
    ).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" });
  });
});

describe("transitionPayment", () => {
  beforeEach(resetDatabase);

  it("rejects marking an unpaid order paid without a pending attempt", async () => {
    const order = await createOrder();
    await expect(
      db.$transaction((tx) => transitionPayment(tx, { orderId: order.id, to: "PAID", actor: "system" })),
    ).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" });
  });

  it("records payment moves on the timeline", async () => {
    const order = await createOrder();
    await db.$transaction((tx) =>
      transitionPayment(tx, { orderId: order.id, to: "COD_DUE", actor: "system" }),
    );
    const saved = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { events: true } });
    expect(saved.paymentStatus).toBe("COD_DUE");
    expect(saved.events).toMatchObject([{ type: "PAYMENT_STATUS", from: "UNPAID", to: "COD_DUE" }]);
  });
});

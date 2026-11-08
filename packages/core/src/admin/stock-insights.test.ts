import { db, type OrderStatus, type PaymentStatus } from "@virzeen/db";
import { beforeEach, describe, expect, it } from "vitest";
import { createProduct, createUser, createVariant, resetDatabase } from "../../test/factories";
import { stockInsights } from "./stock-insights";

// specs/admin-stock-insights.md, against the test database.

const NOW = new Date("2026-11-08T06:00:00Z");
let orderSeq = 0;

/** An order row as checkout leaves it (test data only: status changes in the app go through order-state.ts). */
async function order(
  lines: { variantId: string; quantity: number; unitPricePaisa: number }[],
  options: { status?: OrderStatus; paymentStatus?: PaymentStatus; daysAgo?: number } = {},
) {
  const user = await createUser();
  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPricePaisa, 0);
  return db.order.create({
    data: {
      orderNumber: `VZ-TEST-${orderSeq++}`,
      userId: user.id,
      status: options.status ?? "CONFIRMED",
      paymentStatus: options.paymentStatus ?? "COD_DUE",
      paymentMethod: "COD",
      subtotalPaisa: total,
      shippingPaisa: 0,
      totalPaisa: total,
      shippingZone: "KATHMANDU_VALLEY",
      addressSnapshot: {},
      customerEmail: user.email,
      createdAt: new Date(NOW.getTime() - (options.daysAgo ?? 1) * 86_400_000),
      items: {
        create: lines.map((l) => ({
          variantId: l.variantId,
          productName: "snapshot",
          productSlug: "snapshot",
          sku: "SKU",
          variantLabel: "M",
          unitPricePaisa: l.unitPricePaisa,
          quantity: l.quantity,
        })),
      },
    },
  });
}

describe("stockInsights.lowStock", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("lists sizes at 3 or fewer, sold out first, and counts them all", async () => {
    const tee = await createProduct({ name: "Oversized Tee" });
    await createVariant({ productId: tee.id, size: "S", color: "Black", stock: 2 });
    await createVariant({ productId: tee.id, size: "M", color: "Black", stock: 0 });
    await createVariant({ productId: tee.id, size: "L", color: "Black", stock: 4 });
    await createVariant({ productId: tee.id, size: "XL", color: "Black", stock: 3 });

    const { rows, total } = await stockInsights.lowStock(2);

    expect(total).toBe(3);
    expect(rows).toMatchObject([
      { productName: "Oversized Tee", label: "Black / M", stock: 0 },
      { productName: "Oversized Tee", label: "Black / S", stock: 2 },
    ]);
  });

  it("skips sizes not for sale, drafts and archived products", async () => {
    await createVariant({ stock: 0, isActive: false });
    await createVariant({ stock: 0, productPublished: false });
    await createVariant({ stock: 0, productArchived: true });

    expect(await stockInsights.lowStock()).toEqual({ rows: [], total: 0 });
  });
});

describe("stockInsights.bestSellers", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("ranks products by pieces sold in the last 30 days, with their sales", async () => {
    const tee = await createProduct({ name: "Oversized Tee" });
    const teeS = await createVariant({ productId: tee.id, size: "S" });
    const teeM = await createVariant({ productId: tee.id, size: "M" });
    const shirt = await createProduct({ name: "Linen Overshirt" });
    const shirtM = await createVariant({ productId: shirt.id });

    await order([{ variantId: teeS.id, quantity: 1, unitPricePaisa: 245_000 }]);
    await order([
      { variantId: teeM.id, quantity: 2, unitPricePaisa: 245_000 },
      { variantId: shirtM.id, quantity: 1, unitPricePaisa: 450_000 },
    ]);

    expect(await stockInsights.bestSellers({ now: NOW })).toEqual([
      { productId: tee.id, productName: "Oversized Tee", unitsSold: 3, salesPaisa: 735_000 },
      { productId: shirt.id, productName: "Linen Overshirt", unitsSold: 1, salesPaisa: 450_000 },
    ]);
  });

  it("leaves out cancelled, unpaid, refunded and older orders", async () => {
    const variant = await createVariant();
    const line = [{ variantId: variant.id, quantity: 5, unitPricePaisa: 100_000 }];
    await order(line, { status: "CANCELLED", paymentStatus: "FAILED" });
    await order(line, { status: "PENDING", paymentStatus: "PENDING" });
    await order(line, { paymentStatus: "REFUNDED" });
    await order(line, { daysAgo: 31 });

    expect(await stockInsights.bestSellers({ now: NOW })).toEqual([]);
  });
});

import "server-only";
import { db, type PaymentMethod, type Prisma } from "@virzeen/db";
import { cartService } from "../cart/cart.service";
import { cartLineSelect, isLineAvailable, variantLabelOf } from "../cart/cart-summary";
import { getCoreConfig } from "../config";
import { AppError } from "../errors";
import { reserveStock } from "../inventory/stock";
import { notifications } from "../notifications/notifications";
import { COD_MAX_TOTAL_PAISA, isCodAvailable } from "../pricing/cod-rules";
import { calculateTotals, type Totals } from "../pricing/calculate-totals";
import { DELIVERY_ESTIMATES, shippingZoneFor } from "../pricing/shipping-rates";
import { providerFor } from "../payments/payment.service";
import type { CheckoutNext } from "../payments/provider";
import { cancelOrderAndRestock } from "./cancellation";
import { nextOrderNumber } from "./order-number";
import { transitionOrder, transitionPayment } from "./order-state";

// Checkout (docs/specs/checkout.md, payment-policy.md). Totals are computed here from the database only.

export const RESERVATION_MINUTES = 60;

export type PlaceOrderInput = {
  userId: string;
  customerEmail: string;
  cartId: string;
  addressId: string;
  paymentMethod: PaymentMethod;
  now?: Date;
};

export type PlaceOrderResult = { orderNumber: string; next: CheckoutNext };

export type CheckoutPreview = Totals & {
  zone: "KATHMANDU_VALLEY" | "OUTSIDE_VALLEY";
  deliveryEstimate: string;
  isCodAvailable: boolean;
  /** null = no limit. */
  codLimitPaisa: number | null;
};

async function loadAddress(userId: string, addressId: string) {
  const address = await db.address.findFirst({
    where: { id: addressId, userId },
    select: {
      fullName: true,
      phone: true,
      province: true,
      district: true,
      city: true,
      street: true,
      landmark: true,
    },
  });
  if (!address) throw new AppError("NOT_FOUND", "Address not found.");
  return address;
}

export const checkoutService = {
  /** Server-calculated totals for the checkout summary (shipping depends on the chosen address). */
  async preview(input: {
    userId: string;
    cartId: string;
    addressId: string | null;
  }): Promise<CheckoutPreview> {
    const summary = await cartService.getSummary({ userId: input.userId });
    const district = input.addressId
      ? (await loadAddress(input.userId, input.addressId)).district
      : "Kathmandu";
    const zone = shippingZoneFor(district);
    const totals = calculateTotals(
      summary.items.filter((item) => item.isAvailable),
      zone,
    );
    return {
      ...totals,
      zone,
      deliveryEstimate: DELIVERY_ESTIMATES[zone],
      isCodAvailable: isCodAvailable(totals.totalPaisa),
      codLimitPaisa: COD_MAX_TOTAL_PAISA,
    };
  },

  /**
   * Places an order from the customer's bag. One transaction creates the order, items and payment row and
   * decrements stock; the bag is emptied so a double submit fails with CART_EMPTY.
   */
  async placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
    const now = input.now ?? new Date();
    const { logger } = getCoreConfig();
    const address = await loadAddress(input.userId, input.addressId);

    // 1. Refresh the bag first so the customer sees what changed (committed even though checkout stops).
    const refresh = await cartService.refreshForCheckout(input.cartId);
    if (refresh.changed === "OUT_OF_STOCK")
      throw new AppError("OUT_OF_STOCK", "Some items just sold out. We've updated your bag.");
    if (refresh.changed === "PRICE_CHANGED") {
      throw new AppError(
        "PRICE_CHANGED",
        "A price changed since you added this item. Please review your bag.",
      );
    }
    if (refresh.isEmpty) throw new AppError("CART_EMPTY", "Your bag is empty.");

    // 2. Create the order atomically.
    const created = await db.$transaction(async (tx) => {
      const rows = await tx.cartItem.findMany({ where: { cartId: input.cartId }, select: cartLineSelect });
      if (rows.length === 0) throw new AppError("CART_EMPTY", "Your bag is empty.");
      for (const row of rows) {
        if (!isLineAvailable(row))
          throw new AppError("OUT_OF_STOCK", "Some items just sold out. We've updated your bag.");
        if (row.unitPricePaisa !== row.variant.pricePaisa) {
          throw new AppError(
            "PRICE_CHANGED",
            "A price changed since you added this item. Please review your bag.",
          );
        }
      }

      const zone = shippingZoneFor(address.district);
      const lines = rows.map((row) => ({ unitPricePaisa: row.variant.pricePaisa, quantity: row.quantity }));
      const totals = calculateTotals(lines, zone);
      if (input.paymentMethod === "COD" && !isCodAvailable(totals.totalPaisa)) {
        throw new AppError("VALIDATION_FAILED", "Cash on delivery isn't available for this order total.", {
          fields: { paymentMethod: "Choose eSewa or Khalti for this order" },
        });
      }

      await reserveStock(
        tx,
        rows.map((row) => ({ variantId: row.variant.id, quantity: row.quantity })),
      );

      const orderNumber = await nextOrderNumber(tx, now);
      const isOnline = input.paymentMethod !== "COD";
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId: input.userId,
          customerEmail: input.customerEmail,
          paymentMethod: input.paymentMethod,
          subtotalPaisa: totals.subtotalPaisa,
          shippingPaisa: totals.shippingPaisa,
          totalPaisa: totals.totalPaisa,
          shippingZone: zone,
          addressSnapshot: address as Prisma.InputJsonValue,
          reservedUntil: isOnline ? new Date(now.getTime() + RESERVATION_MINUTES * 60_000) : null,
          items: {
            create: rows.map((row) => ({
              variantId: row.variant.id,
              productName: row.variant.product.name,
              productSlug: row.variant.product.slug,
              sku: row.variant.sku,
              variantLabel: variantLabelOf(row.variant),
              imageUrl: row.variant.product.images[0]?.url ?? null,
              unitPricePaisa: row.variant.pricePaisa,
              quantity: row.quantity,
            })),
          },
          events: {
            create: {
              type: "ORDER_STATUS",
              from: null,
              to: "PENDING",
              actor: `customer:${input.userId}`,
              reason: "Order placed",
            },
          },
        },
        select: { id: true },
      });
      // Empty the bag. If another checkout already emptied it, this one must not create a second order.
      const cleared = await tx.cartItem.deleteMany({ where: { cartId: input.cartId } });
      if (cleared.count !== rows.length) throw new AppError("CART_EMPTY", "Your bag is empty.");

      const actor = `customer:${input.userId}`;
      if (input.paymentMethod === "COD") {
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            provider: "COD",
            providerRef: `COD-${orderNumber}`,
            amountPaisa: totals.totalPaisa,
            status: "UNPAID",
          },
          select: { id: true },
        });
        await transitionPayment(tx, {
          orderId: order.id,
          paymentId: payment.id,
          to: "COD_DUE",
          actor,
          reason: "Cash on delivery",
        });
        await transitionOrder(tx, {
          orderId: order.id,
          to: "CONFIRMED",
          actor,
          reason: "Cash on delivery order placed",
          now,
        });
      }
      return { orderId: order.id, orderNumber, totals };
    });

    logger.info("order created", { orderNumber: created.orderNumber, method: input.paymentMethod });

    if (input.paymentMethod === "COD") {
      await notifications.orderConfirmed(created.orderId);
      return { orderNumber: created.orderNumber, next: { type: "done" } };
    }

    // 3. Online payment: start the attempt with the provider (outside the DB transaction).
    try {
      const initiated = await providerFor(input.paymentMethod).initiate(
        {
          orderNumber: created.orderNumber,
          ...created.totals,
          customer: { name: address.fullName, email: input.customerEmail, phone: address.phone },
        },
        1,
      );
      await db.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            orderId: created.orderId,
            provider: input.paymentMethod,
            providerRef: initiated.providerRef,
            attempt: 1,
            amountPaisa: created.totals.totalPaisa,
            status: "UNPAID",
          },
          select: { id: true },
        });
        await transitionPayment(tx, {
          orderId: created.orderId,
          paymentId: payment.id,
          to: "PENDING",
          actor: `customer:${input.userId}`,
          reason: `Sent to ${input.paymentMethod}`,
        });
      });
      return { orderNumber: created.orderNumber, next: initiated.next };
    } catch (error) {
      logger.error("payment initiation failed", { orderNumber: created.orderNumber, error: String(error) });
      await db.$transaction((tx) =>
        cancelOrderAndRestock(tx, {
          orderId: created.orderId,
          actor: "system",
          reason: "Payment could not be started",
          restoreToCart: true,
        }),
      );
      throw new AppError(
        "PAYMENT_FAILED",
        "Payment didn't go through. Your bag is saved — try again or choose another method.",
      );
    }
  },
};

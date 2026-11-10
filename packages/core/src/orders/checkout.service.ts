import "server-only";
import { db, type PaymentMethod, type Prisma } from "@virzeen/db";
import { cartService } from "../cart/cart.service";
import { imageForColor } from "../catalog/style-images";
import { cartLineSelect, isLineAvailable, variantLabelOf } from "../cart/cart-summary";
import { getCoreConfig } from "../config";
import { checkDiscount, claimDiscount } from "../discounts/discount.service";
import { AppError } from "../errors";
import { reserveStock } from "../inventory/stock";
import { notifications } from "../notifications/notifications";
import { COD_MAX_TOTAL_PAISA, isCodAvailable } from "../pricing/cod-rules";
import { calculateSubtotal, calculateTotals, type Totals } from "../pricing/calculate-totals";
import { DELIVERY_ESTIMATES, shippingZoneFor } from "../pricing/shipping-rates";
import { providerFor } from "../payments/payment.service";
import type { CheckoutNext } from "../payments/provider";
import { cancelOrderAndRestock } from "./cancellation";
import { nextOrderNumber } from "./order-number";
import { transitionOrder, transitionPayment } from "./order-state";

// Checkout (docs/specs/checkout.md, payment-policy.md). Totals are computed here from the database only.

/** How long an online order waits for its payment, holding its stock (owner 2026-11-09, specs/payment-window.md). */
export const RESERVATION_MINUTES = 15;

export type PlaceOrderInput = {
  userId: string;
  customerEmail: string;
  cartId: string;
  addressId: string;
  paymentMethod: PaymentMethod;
  /** Upper-case, as checkoutSchema normalises it. Checked again and claimed inside the order transaction. */
  discountCode?: string;
  now?: Date;
};

export type PlaceOrderResult = { orderNumber: string; next: CheckoutNext };

export type CheckoutPreview = Totals & {
  /** The code whose discount is in these totals, or null. */
  discountCode: string | null;
  /** The total without shipping: what the summary shows before an address is chosen. */
  totalBeforeShippingPaisa: number;
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
  /**
   * Server-calculated totals for the checkout summary (shipping depends on the chosen address). With a discount
   * code, a code that can't be used throws its reason as a field error and nothing changes.
   */
  async preview(input: {
    userId: string;
    cartId: string;
    addressId: string | null;
    discountCode?: string;
    now?: Date;
  }): Promise<CheckoutPreview> {
    const summary = await cartService.getSummary({ userId: input.userId });
    const district = input.addressId
      ? (await loadAddress(input.userId, input.addressId)).district
      : "Kathmandu";
    const zone = shippingZoneFor(district);
    const lines = summary.items.filter((item) => item.isAvailable);
    const discount = input.discountCode
      ? await checkDiscount(db, {
          code: input.discountCode,
          userId: input.userId,
          subtotalPaisa: calculateSubtotal(lines),
          now: input.now ?? new Date(),
        })
      : null;
    const totals = calculateTotals(lines, zone, discount);
    return {
      ...totals,
      discountCode: discount?.code ?? null,
      totalBeforeShippingPaisa: totals.totalPaisa - totals.shippingPaisa,
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

      // Empty the bag first, by the lines read above: a second checkout from the same bag (another tab, a double
      // submit) then finds them gone and stops with CART_EMPTY before it can take stock or a discount code's use.
      // A line added meanwhile stays in the bag.
      const cleared = await tx.cartItem.deleteMany({
        where: { cartId: input.cartId, id: { in: rows.map((row) => row.id) } },
      });
      if (cleared.count !== rows.length) throw new AppError("CART_EMPTY", "Your bag is empty.");

      const zone = shippingZoneFor(address.district);
      const lines = rows.map((row) => ({ unitPricePaisa: row.variant.pricePaisa, quantity: row.quantity }));
      // The code is checked again here and one use is taken; if it stopped working, nothing is ordered.
      const discount = input.discountCode
        ? await claimDiscount(tx, {
            code: input.discountCode,
            userId: input.userId,
            subtotalPaisa: calculateSubtotal(lines),
            now,
          })
        : null;
      const totals = calculateTotals(lines, zone, discount);
      if (input.paymentMethod === "COD" && !isCodAvailable(totals.totalPaisa)) {
        throw new AppError("VALIDATION_FAILED", "Cash on delivery isn't available for this order total.", {
          fields: { paymentMethod: "Choose eSewa or Khalti for this order" },
        });
      }
      if (input.paymentMethod !== "COD" && totals.totalPaisa === 0) {
        throw new AppError("VALIDATION_FAILED", "Choose cash on delivery for this order.", {
          fields: { paymentMethod: "Choose cash on delivery for this order" },
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
          discountPaisa: totals.discountPaisa,
          totalPaisa: totals.totalPaisa,
          discountCodeId: discount?.id ?? null,
          discountCode: discount?.code ?? null,
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
              imageUrl: imageForColor(row.variant.product.images, row.variant.color)?.url ?? null,
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

    logger.info("order created", {
      orderNumber: created.orderNumber,
      method: input.paymentMethod,
      ...(created.totals.discountPaisa > 0 ? { discountPaisa: created.totals.discountPaisa } : {}),
    });

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

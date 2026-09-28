import "server-only";
import { db } from "@virzeen/db";
import {
  renderAdminAlertEmail,
  renderOrderCancelledEmail,
  renderOrderConfirmationEmail,
  renderOrderShippedEmail,
  renderOtpEmail,
  type RenderedEmail,
} from "@virzeen/emails";
import { getCoreConfig } from "../config";
import { vatIncluded } from "../pricing/calculate-totals";

// Emails are sent after the transaction commits, never inside it (backend-policies.md §9).
// A failed email never fails the business action; it is logged instead.

export const PAYMENT_METHOD_LABELS = {
  COD: "Cash on delivery",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
} as const;

async function send(to: string, email: RenderedEmail, context: Record<string, unknown>) {
  const { mailer, logger } = getCoreConfig();
  try {
    await mailer.send({ to, ...email });
    logger.info("email sent", { subject: email.subject, ...context });
  } catch (error) {
    logger.error("email failed", { subject: email.subject, error: String(error), ...context });
  }
}

type AddressSnapshot = {
  fullName: string;
  phone: string;
  province: string;
  district: string;
  city: string;
  street: string;
};

const firstName = (fullName: string) => fullName.split(" ")[0] ?? fullName;

export const notifications = {
  async sendOtp(email: string, otp: string) {
    const { siteUrl, mailer } = getCoreConfig();
    // OTP delivery must surface failures so the sign-in form can say so; never log the code.
    await mailer.send({ to: email, ...(await renderOtpEmail({ otp, siteUrl })) });
  },

  async orderConfirmed(orderId: string) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        customerEmail: true,
        paymentMethod: true,
        subtotalPaisa: true,
        shippingPaisa: true,
        totalPaisa: true,
        addressSnapshot: true,
        createdAt: true,
        items: {
          select: { id: true, productName: true, variantLabel: true, quantity: true, unitPricePaisa: true },
        },
      },
    });
    if (!order) return;
    const address = order.addressSnapshot as AddressSnapshot;
    const email = await renderOrderConfirmationEmail({
      siteUrl: getCoreConfig().siteUrl,
      orderNumber: order.orderNumber,
      customerName: firstName(address.fullName),
      placedAt: order.createdAt,
      paymentMethodLabel: PAYMENT_METHOD_LABELS[order.paymentMethod],
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        variantLabel: item.variantLabel,
        quantity: item.quantity,
        lineTotalPaisa: item.unitPricePaisa * item.quantity,
      })),
      subtotalPaisa: order.subtotalPaisa,
      shippingPaisa: order.shippingPaisa,
      totalPaisa: order.totalPaisa,
      vatPaisa: vatIncluded(order.totalPaisa),
      address,
    });
    await send(order.customerEmail, email, { orderNumber: order.orderNumber, kind: "order.confirmed" });
  },

  async orderShipped(orderId: string) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        customerEmail: true,
        addressSnapshot: true,
        courierName: true,
        trackingNumber: true,
      },
    });
    if (!order?.courierName || !order.trackingNumber) return;
    const email = await renderOrderShippedEmail({
      siteUrl: getCoreConfig().siteUrl,
      orderNumber: order.orderNumber,
      customerName: firstName((order.addressSnapshot as AddressSnapshot).fullName),
      courierName: order.courierName,
      trackingNumber: order.trackingNumber,
    });
    await send(order.customerEmail, email, { orderNumber: order.orderNumber, kind: "order.shipped" });
  },

  async orderCancelled(orderId: string, reason: string) {
    const order = await db.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, customerEmail: true, addressSnapshot: true, paymentStatus: true },
    });
    if (!order) return;
    const email = await renderOrderCancelledEmail({
      siteUrl: getCoreConfig().siteUrl,
      orderNumber: order.orderNumber,
      customerName: firstName((order.addressSnapshot as AddressSnapshot).fullName),
      reason,
      wasPaidOnline: order.paymentStatus === "PAID",
    });
    await send(order.customerEmail, email, { orderNumber: order.orderNumber, kind: "order.cancelled" });
  },

  /** Emails the owner (payment amount mismatch, payment still ambiguous after 24h...). */
  async alertOwner(title: string, lines: string[]) {
    const { ownerAlertEmail, siteUrl, logger } = getCoreConfig();
    logger.warn("owner alert", { title });
    await send(ownerAlertEmail, await renderAdminAlertEmail({ siteUrl, title, lines }), {
      kind: "owner.alert",
    });
  },
};

// Customer-facing names for statuses (glossary.md). Used by account pages, admin and emails.

type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger";

export const ORDER_STATUS_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  PENDING: { label: "Awaiting payment", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "accent" },
  PROCESSING: { label: "Being packed", variant: "accent" },
  SHIPPED: { label: "Shipped", variant: "accent" },
  DELIVERED: { label: "Delivered", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "neutral" },
  RETURNED: { label: "Returned", variant: "neutral" },
};

export const PAYMENT_STATUS_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  UNPAID: { label: "Unpaid", variant: "neutral" },
  PENDING: { label: "Confirming payment", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
  FAILED: { label: "Payment failed", variant: "danger" },
  EXPIRED: { label: "Payment expired", variant: "neutral" },
  REFUNDED: { label: "Refunded", variant: "neutral" },
  PARTIALLY_REFUNDED: { label: "Partly refunded", variant: "neutral" },
  COD_DUE: { label: "Pay on delivery", variant: "warning" },
  COD_COLLECTED: { label: "Paid on delivery", variant: "success" },
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  COD: "Cash on delivery",
  ESEWA: "eSewa",
  KHALTI: "Khalti",
};

export const orderStatus = (status: string) =>
  ORDER_STATUS_LABELS[status] ?? { label: status, variant: "neutral" as const };
export const paymentStatus = (status: string) =>
  PAYMENT_STATUS_LABELS[status] ?? { label: status, variant: "neutral" as const };

/** Timeline wording: the first event is the order being placed, whatever the payment method. */
export const timelineLabel = (status: string) =>
  status === "PENDING" ? "Order placed" : orderStatus(status).label;

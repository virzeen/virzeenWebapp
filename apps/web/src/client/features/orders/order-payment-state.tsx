import { Alert, ButtonLink } from "@virzeen/ui";
import { formatTime } from "@/client/lib/format";
import { PayNowPanel } from "./pay-now-panel";

type OrderPaymentStateProps = {
  order: {
    orderNumber: string;
    status: string;
    paymentMethod: string;
    reservedUntil: Date | null;
    /** A payment that arrived after the order was cancelled: still to refund, or refunded (the owner refunds it). */
    latePayment: "TO_REFUND" | "REFUNDED" | null;
  };
  /** eSewa and Khalti, when switched on. */
  methods: ("ESEWA" | "KHALTI")[];
  /** The customer just came back from a payment that didn't go through (`?payment=failed`). */
  failed: boolean;
  /** The request's time (ms), from the page. */
  now: number;
};

/**
 * What an online order's page says about paying (specs/payment-window.md): a late payment being (or already)
 * refunded; while the order waits, the Pay now panel; once its 15 minutes are up but reconciliation hasn't cancelled
 * it yet, that it's being cancelled. Nothing for paid, cash on delivery or closed orders.
 */
export function OrderPaymentState({ order, methods, failed, now }: OrderPaymentStateProps) {
  if (order.latePayment === "TO_REFUND") {
    return (
      <Alert variant="warning">
        Your payment arrived after this order was cancelled. We&apos;ll refund it in full.
      </Alert>
    );
  }
  if (order.latePayment === "REFUNDED") {
    return (
      <Alert variant="info">
        Your payment arrived after this order was cancelled. We&apos;ve refunded it in full.
      </Alert>
    );
  }
  if (order.status !== "PENDING" || order.paymentMethod === "COD" || !order.reservedUntil) return null;
  const msLeft = order.reservedUntil.getTime() - now;
  if (msLeft <= 0) {
    return (
      <Alert
        variant="info"
        action={
          <ButtonLink href="/cart" variant="secondary" shape="pill">
            View bag
          </ButtonLink>
        }
      >
        Payment time ran out, so we&apos;re cancelling this order. The items go back to your bag.
      </Alert>
    );
  }
  if (methods.length === 0) return null;
  const defaultMethod = order.paymentMethod === "KHALTI" ? "KHALTI" : "ESEWA";
  return (
    <PayNowPanel
      orderNumber={order.orderNumber}
      payBy={formatTime(order.reservedUntil)}
      minutesLeft={Math.floor(msLeft / 60_000)}
      methods={methods}
      defaultMethod={defaultMethod}
      failed={failed}
    />
  );
}

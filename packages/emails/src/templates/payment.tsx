import { Button, Heading, Text } from "@react-email/components";
import { formatPaisa, formatTime } from "../money";
import { EmailLayout } from "./layout";

export type PaymentReminderEmailData = {
  siteUrl: string;
  orderNumber: string;
  customerName: string;
  totalPaisa: number;
  /** When the order's 15 minutes run out. */
  payBy: Date;
};

/** One reminder while an online order waits for its payment (specs/payment-window.md). */
export function PaymentReminderEmail({ order }: { order: PaymentReminderEmailData }) {
  return (
    <EmailLayout
      preview={`Pay by ${formatTime(order.payBy)} to keep order ${order.orderNumber}`}
      siteUrl={order.siteUrl}
      invitesReply
    >
      <Heading as="h1" className="m-0 text-h1 font-normal">
        Your order is waiting for payment.
      </Heading>
      <Text className="text-body">
        Hi {order.customerName}, pay by <span className="whitespace-nowrap">{formatTime(order.payBy)}</span>{" "}
        to keep order <span className="whitespace-nowrap">{order.orderNumber}</span> (
        <span className="whitespace-nowrap">{formatPaisa(order.totalPaisa)}</span>). After that it&apos;s
        cancelled and the items go back to your bag.
      </Text>
      <Button
        href={`${order.siteUrl}/account/orders/${order.orderNumber}`}
        className="vz-button mt-4 rounded-full bg-ink px-6 py-3 text-body text-canvas"
      >
        Pay now
      </Button>
      <Text className="vz-muted mt-8 text-small text-ink-muted">
        Already paid? It can take a minute to show. You&apos;ll get a confirmation email.
      </Text>
    </EmailLayout>
  );
}

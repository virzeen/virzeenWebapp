import { Button, Column, Heading, Row, Section, Text } from "@react-email/components";
import { formatDate, formatPaisa } from "../money";
import { EmailLayout } from "./layout";

export type OrderEmailItem = {
  id: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  lineTotalPaisa: number;
};

export type OrderEmailData = {
  siteUrl: string;
  orderNumber: string;
  customerName: string;
  placedAt: Date;
  paymentMethodLabel: string;
  items: OrderEmailItem[];
  subtotalPaisa: number;
  shippingPaisa: number;
  totalPaisa: number;
  vatPaisa: number;
  address: {
    fullName: string;
    street: string;
    city: string;
    district: string;
    province: string;
    phone: string;
  };
};

function OrderSummary({ order }: { order: OrderEmailData }) {
  return (
    <Section className="mt-6">
      {order.items.map((item) => (
        <Row key={item.id} className="border-b border-line">
          <Column className="py-3">
            <Text className="m-0 text-body">{item.productName}</Text>
            <Text className="m-0 text-small text-ink-muted">
              {item.variantLabel} · Qty {item.quantity}
            </Text>
          </Column>
          <Column className="py-3 text-right align-top">
            <Text className="m-0 text-body">{formatPaisa(item.lineTotalPaisa)}</Text>
          </Column>
        </Row>
      ))}
      <Row className="pt-3">
        <Column>
          <Text className="m-0 text-body text-ink-muted">Subtotal</Text>
        </Column>
        <Column className="text-right">
          <Text className="m-0 text-body">{formatPaisa(order.subtotalPaisa)}</Text>
        </Column>
      </Row>
      <Row>
        <Column>
          <Text className="m-0 text-body text-ink-muted">Shipping</Text>
        </Column>
        <Column className="text-right">
          <Text className="m-0 text-body">
            {order.shippingPaisa === 0 ? "Free" : formatPaisa(order.shippingPaisa)}
          </Text>
        </Column>
      </Row>
      <Row>
        <Column>
          <Text className="m-0 text-h2">Total</Text>
        </Column>
        <Column className="text-right">
          <Text className="m-0 text-h2">{formatPaisa(order.totalPaisa)}</Text>
        </Column>
      </Row>
      <Text className="mt-1 text-small text-ink-muted">
        Includes {formatPaisa(order.vatPaisa)} VAT (13%). Paid by {order.paymentMethodLabel}.
      </Text>
    </Section>
  );
}

function AddressBlock({ address }: { address: OrderEmailData["address"] }) {
  return (
    <Section className="mt-6 rounded-md bg-surface px-6 py-4">
      <Text className="m-0 text-caption text-ink-muted uppercase">Delivering to</Text>
      <Text className="m-0 mt-2 text-body">
        {address.fullName}
        <br />
        {address.street}, {address.city}
        <br />
        {address.district}, {address.province}
        <br />
        {address.phone}
      </Text>
    </Section>
  );
}

export function OrderConfirmationEmail({ order }: { order: OrderEmailData }) {
  const url = `${order.siteUrl}/account/orders/${order.orderNumber}`;
  return (
    <EmailLayout preview={`Your order ${order.orderNumber} is confirmed`} siteUrl={order.siteUrl}>
      <Heading as="h1" className="m-0 text-h1 font-normal">
        Thank you — your order {order.orderNumber} is confirmed.
      </Heading>
      <Text className="text-body text-ink-muted">
        Hi {order.customerName}, we&apos;re getting your order ready. Placed on {formatDate(order.placedAt)}.
      </Text>
      <OrderSummary order={order} />
      <AddressBlock address={order.address} />
      <Button href={url} className="mt-8 rounded-full bg-ink px-6 py-3 text-body text-canvas">
        View your order
      </Button>
    </EmailLayout>
  );
}

export type OrderShippedEmailData = {
  siteUrl: string;
  orderNumber: string;
  customerName: string;
  courierName: string;
  trackingNumber: string;
};

export function OrderShippedEmail({ order }: { order: OrderShippedEmailData }) {
  return (
    <EmailLayout preview={`Your order ${order.orderNumber} is on its way`} siteUrl={order.siteUrl}>
      <Heading as="h1" className="m-0 text-h1 font-normal">
        Your order is on its way.
      </Heading>
      <Text className="text-body text-ink-muted">
        Hi {order.customerName}, order {order.orderNumber} has been handed to {order.courierName}.
      </Text>
      <Section className="mt-6 rounded-md bg-surface px-6 py-4">
        <Text className="m-0 text-caption text-ink-muted uppercase">Tracking number</Text>
        <Text className="m-0 mt-2 text-h2">{order.trackingNumber}</Text>
      </Section>
      <Button
        href={`${order.siteUrl}/account/orders/${order.orderNumber}`}
        className="mt-8 rounded-full bg-ink px-6 py-3 text-body text-canvas"
      >
        Track your order
      </Button>
    </EmailLayout>
  );
}

export type OrderCancelledEmailData = {
  siteUrl: string;
  orderNumber: string;
  customerName: string;
  reason: string;
  wasPaidOnline: boolean;
};

export function OrderCancelledEmail({ order }: { order: OrderCancelledEmailData }) {
  return (
    <EmailLayout preview={`Your order ${order.orderNumber} was cancelled`} siteUrl={order.siteUrl}>
      <Heading as="h1" className="m-0 text-h1 font-normal">
        Your order {order.orderNumber} was cancelled.
      </Heading>
      <Text className="text-body text-ink-muted">
        Hi {order.customerName}, {order.reason}
      </Text>
      {order.wasPaidOnline && (
        <Text className="text-body text-ink-muted">
          Your refund will be processed to your original payment method. We&apos;ll email you when it&apos;s
          done.
        </Text>
      )}
      <Button
        href={`${order.siteUrl}/shop`}
        className="mt-8 rounded-full bg-ink px-6 py-3 text-body text-canvas"
      >
        Continue shopping
      </Button>
    </EmailLayout>
  );
}

export type AdminAlertEmailData = { siteUrl: string; title: string; lines: string[] };

export function AdminAlertEmail({ alert }: { alert: AdminAlertEmailData }) {
  return (
    <EmailLayout preview={alert.title} siteUrl={alert.siteUrl}>
      <Heading as="h1" className="m-0 text-h2 font-normal">
        {alert.title}
      </Heading>
      {alert.lines.map((line) => (
        <Text key={line} className="m-0 mt-2 text-body">
          {line}
        </Text>
      ))}
      <Button
        href={`${alert.siteUrl}/admin/orders`}
        className="mt-8 rounded-sm bg-ink px-6 py-3 text-body text-canvas"
      >
        Open admin
      </Button>
    </EmailLayout>
  );
}

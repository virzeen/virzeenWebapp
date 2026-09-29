import { Badge, Link, Separator, Stack } from "@virzeen/ui";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price, ShippingPrice } from "@/client/components/shared/price";
import { formatDateTime } from "@/client/lib/format";
import { orderStatus, PAYMENT_METHOD_LABELS, paymentStatus, timelineLabel } from "@/client/lib/order-labels";

export type OrderDetailView = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotalPaisa: number;
  shippingPaisa: number;
  totalPaisa: number;
  courierName: string | null;
  trackingNumber: string | null;
  cancelReason: string | null;
  createdAt: Date;
  address: {
    fullName: string;
    phone: string;
    province: string;
    district: string;
    city: string;
    street: string;
    landmark: string | null;
  };
  items: {
    id: string;
    productName: string;
    variantLabel: string;
    imageUrl: string | null;
    unitPricePaisa: number;
    quantity: number;
  }[];
  events: { id: string; type: string; to: string; createdAt: Date; reason: string | null }[];
};

/** Order lines, totals, delivery address and status timeline (account, checkout success, admin). */
export function OrderDetail({ order }: { order: OrderDetailView }) {
  const status = orderStatus(order.status);
  const payment = paymentStatus(order.paymentStatus, order.paymentMethod);
  const timeline = order.events.filter((event) => event.type === "ORDER_STATUS");

  return (
    <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
      <Stack gap={8}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <Badge variant={payment.variant}>{payment.label}</Badge>
          <span className="text-small text-ink-muted">Placed {formatDateTime(order.createdAt)}</span>
        </div>

        {order.trackingNumber && (
          <div className="rounded-md bg-surface p-5">
            <p className="text-caption text-ink-muted uppercase">Tracking</p>
            <p className="pt-1 text-body">
              {order.courierName} · <span className="font-mono wrap-anywhere">{order.trackingNumber}</span>
            </p>
          </div>
        )}
        {order.cancelReason && order.status === "CANCELLED" && (
          <p className="text-body text-ink-muted">Cancelled: {order.cancelReason}</p>
        )}

        <section aria-labelledby="items-heading">
          <h2 id="items-heading" className="pb-2 font-display text-h3">
            Items
          </h2>
          <ul className="divide-y divide-line border-y border-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 py-4">
                <div className="w-16 shrink-0">
                  <CloudImage src={item.imageUrl} alt={item.productName} sizes="64px" />
                </div>
                <div className="flex flex-1 justify-between gap-4">
                  <div>
                    <p className="text-body">{item.productName}</p>
                    <p className="text-small text-ink-muted">
                      {item.variantLabel} · Qty {item.quantity}
                    </p>
                  </div>
                  <Price paisa={item.unitPricePaisa * item.quantity} className="text-body" />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="timeline-heading">
          <h2 id="timeline-heading" className="pb-4 font-display text-h3">
            Timeline
          </h2>
          <ol className="flex flex-col gap-4 border-l border-line pl-6">
            {timeline.map((event) => (
              <li key={event.id} className="relative">
                <span className="absolute top-2 -left-7 size-2 rounded-full bg-ink" aria-hidden />
                <p className="text-body">{timelineLabel(event.to)}</p>
                <p className="text-small text-ink-muted">{formatDateTime(event.createdAt)}</p>
              </li>
            ))}
          </ol>
        </section>
      </Stack>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <Stack gap={3} className="rounded-md bg-surface p-6">
          <div className="flex justify-between text-body">
            <span>Subtotal</span>
            <Price paisa={order.subtotalPaisa} />
          </div>
          <div className="flex justify-between text-body">
            <span>Shipping</span>
            <ShippingPrice paisa={order.shippingPaisa} />
          </div>
          <Separator />
          <div className="flex justify-between text-h3">
            <span>Total</span>
            <Price paisa={order.totalPaisa} />
          </div>
          <p className="text-small text-ink-muted">
            Includes VAT. Payment: {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}.
          </p>
        </Stack>
        <div className="flex flex-col gap-1 px-1">
          <p className="text-caption text-ink-muted uppercase">Delivering to</p>
          <p className="text-body">{order.address.fullName}</p>
          <p className="text-small text-ink-muted">
            {order.address.street}, {order.address.city}
            <br />
            {order.address.district}, {order.address.province}
            {order.address.landmark && (
              <>
                <br />
                Landmark: {order.address.landmark}
              </>
            )}
          </p>
          <Link
            href={`tel:${order.address.phone}`}
            className="inline-flex min-h-11 items-center self-start text-small"
          >
            {order.address.phone}
          </Link>
        </div>
      </aside>
    </div>
  );
}

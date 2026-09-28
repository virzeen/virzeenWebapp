import { Badge, Separator, Stack } from "@virzeen/ui";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
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
  const payment = paymentStatus(order.paymentStatus);
  const timeline = order.events.filter((event) => event.type === "ORDER_STATUS");

  return (
    <div className="gap-12 lg:grid-cols-[2fr_1fr] grid">
      <Stack gap={8}>
        <div className="gap-2 flex flex-wrap items-center">
          <Badge variant={status.variant}>{status.label}</Badge>
          <Badge variant={payment.variant}>{payment.label}</Badge>
          <span className="text-small text-ink-muted">Placed {formatDateTime(order.createdAt)}</span>
        </div>

        {order.trackingNumber && (
          <div className="p-5 rounded-md bg-surface">
            <p className="text-caption text-ink-muted uppercase">Tracking</p>
            <p className="pt-1 text-body">
              {order.courierName} · <span className="font-mono">{order.trackingNumber}</span>
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
              <li key={item.id} className="gap-4 py-4 flex">
                <div className="w-16 shrink-0">
                  <CloudImage src={item.imageUrl} alt={item.productName} sizes="64px" />
                </div>
                <div className="gap-4 flex flex-1 justify-between">
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
          <ol className="gap-4 pl-6 flex flex-col border-l border-line">
            {timeline.map((event) => (
              <li key={event.id} className="relative">
                <span className="top-2 -left-7 size-2 absolute rounded-full bg-ink" aria-hidden />
                <p className="text-body">{timelineLabel(event.to)}</p>
                <p className="text-small text-ink-muted">{formatDateTime(event.createdAt)}</p>
              </li>
            ))}
          </ol>
        </section>
      </Stack>

      <aside className="gap-6 lg:sticky lg:top-24 lg:self-start flex flex-col">
        <Stack gap={3} className="p-6 rounded-md bg-surface">
          <div className="flex justify-between text-body">
            <span>Subtotal</span>
            <Price paisa={order.subtotalPaisa} />
          </div>
          <div className="flex justify-between text-body">
            <span>Shipping</span>
            <Price paisa={order.shippingPaisa} />
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
        <div className="gap-1 px-1 flex flex-col">
          <p className="text-caption text-ink-muted uppercase">Delivering to</p>
          <p className="text-body">{order.address.fullName}</p>
          <p className="text-small text-ink-muted">
            {order.address.street}, {order.address.city}
            <br />
            {order.address.district}, {order.address.province}
            <br />
            {order.address.phone}
          </p>
        </div>
      </aside>
    </div>
  );
}

import { Badge, ButtonLink, EmptyState, Link } from "@virzeen/ui";
import { Package } from "lucide-react";
import { Price } from "@/client/components/shared/price";
import { formatDate } from "@/client/lib/format";
import { orderStatus, paymentStatus } from "@/client/lib/order-labels";
import { requireUserPage } from "@/server/auth/session";
import { listMyOrders } from "@/server/queries/account";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const user = await requireUserPage("/account/orders");
  const { items } = await listMyOrders(user.id);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Package className="size-5" strokeWidth={1.5} aria-hidden />}
        title="You haven't placed any orders yet."
        action={
          <ButtonLink href="/shop" shape="pill">
            Start shopping
          </ButtonLink>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-line border-y border-line">
      {items.map((order) => {
        const status = orderStatus(order.status);
        const payment = paymentStatus(order.paymentStatus);
        return (
          <li key={order.orderNumber}>
            <Link
              href={`/account/orders/${order.orderNumber}`}
              variant="subtle"
              className="flex flex-col gap-2 py-5 text-ink hover:text-ink sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="flex flex-col gap-1">
                <span className="font-mono text-body">{order.orderNumber}</span>
                <span className="text-small text-ink-muted">
                  {formatDate(order.createdAt)} · {order._count.items}{" "}
                  {order._count.items === 1 ? "item" : "items"}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                <Badge variant={payment.variant}>{payment.label}</Badge>
                <Price paisa={order.totalPaisa} className="text-body sm:pl-4" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

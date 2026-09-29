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
        const payment = paymentStatus(order.paymentStatus, order.paymentMethod);
        return (
          <li key={order.orderNumber}>
            {/* The price keeps its own right-hand column, so totals line up down the list; the badges
                go on a second line until the column is wide enough (lg) for one row. */}
            <Link
              href={`/account/orders/${order.orderNumber}`}
              variant="subtle"
              className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-3 py-5 text-ink hover:text-ink lg:grid-cols-[1fr_auto_auto] lg:items-center"
            >
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-body">{order.orderNumber}</span>
                <span className="text-small whitespace-nowrap text-ink-muted">
                  {formatDate(order.createdAt)} · {order._count.items}{" "}
                  {order._count.items === 1 ? "item" : "items"}
                </span>
              </span>
              <span className="col-span-2 row-start-2 flex flex-wrap items-center gap-2 lg:col-span-1 lg:col-start-2 lg:row-start-1">
                <Badge variant={status.variant}>{status.label}</Badge>
                <Badge variant={payment.variant}>{payment.label}</Badge>
              </span>
              <Price
                paisa={order.totalPaisa}
                className="col-start-2 row-start-1 text-right text-body lg:col-start-3 lg:pl-4"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

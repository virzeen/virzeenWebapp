import { Badge, ButtonLink, cn, DataTable, EmptyState, Link } from "@virzeen/ui";
import { Price } from "@/client/components/shared/price";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { formatDateTime } from "@/client/lib/format";
import { orderStatus, paymentStatus } from "@/client/lib/order-labels";
import { requireAdminPage } from "@/server/auth/session";
import { getDashboardStats, listAdminOrders } from "@/server/queries/admin";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await requireAdminPage();
  // Tiles that link to a filtered list count with that same filter, so the number matches the list it opens.
  const [stats, recent] = await Promise.all([getDashboardStats(), listAdminOrders({ page: 1 })]);
  // `linkContext` finishes the "View" link's name for screen readers, which list the three links side by side.
  const tiles = [
    { label: "Orders today", value: String(stats.todayOrders), today: true },
    { label: "Sales today", value: <Price paisa={stats.todayRevenuePaisa} />, today: true },
    {
      label: "To pack",
      value: String(stats.toPack),
      href: "/admin/orders?status=CONFIRMED",
      linkContext: "orders to pack",
    },
    {
      label: "To ship",
      value: String(stats.toShip),
      href: "/admin/orders?status=PROCESSING",
      linkContext: "orders to ship",
    },
    {
      label: "Payments pending",
      value: String(stats.awaitingPayment),
      href: "/admin/orders?status=PENDING",
      linkContext: "orders with payment pending",
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <AdminPageHeader title="Dashboard" description="Today in Nepal time." />
      {/* Today's two numbers share the first row and the three to-dos the second. On phones today's numbers
          get the full width (a day's sales can reach lakhs), then the to-dos two by two. */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={cn(
              "flex flex-col gap-2 rounded-md border border-line p-5 max-md:last:col-span-2",
              tile.today ? "max-sm:col-span-2 md:col-span-3" : "md:col-span-2",
            )}
          >
            <p className="text-caption text-ink-muted uppercase">{tile.label}</p>
            <p className="font-display text-h2 tabular-nums">{tile.value}</p>
            {tile.href && (
              <Link href={tile.href} className="inline-flex min-h-11 items-center self-start text-small">
                View<span className="sr-only"> {tile.linkContext}</span>
              </Link>
            )}
          </div>
        ))}
      </div>
      <section className="flex flex-col gap-4" aria-labelledby="recent-orders">
        <div className="flex items-center justify-between">
          <h2 id="recent-orders" className="font-display text-h3">
            Recent orders
          </h2>
          <ButtonLink href="/admin/orders" variant="link">
            All orders
          </ButtonLink>
        </div>
        <DataTable
          caption="Recent orders"
          rows={recent.rows.slice(0, 8)}
          getRowId={(row) => row.orderNumber}
          empty={<EmptyState title="No orders yet." />}
          columns={[
            {
              key: "order",
              header: "Order",
              // Same cell as the orders list: number, date, and the status on phones.
              cell: (row) => (
                <span className="relative flex flex-col items-start gap-1">
                  <Link
                    href={`/admin/orders/${row.orderNumber}`}
                    className="font-mono whitespace-nowrap after:absolute after:inset-0"
                  >
                    {row.orderNumber}
                  </Link>
                  <span className="text-ink-muted">{formatDateTime(row.createdAt)}</span>
                  <span className="md:hidden">
                    <Badge variant={orderStatus(row.status).variant}>{orderStatus(row.status).label}</Badge>
                  </span>
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              hideOnMobile: true,
              cell: (row) => (
                <Badge variant={orderStatus(row.status).variant}>{orderStatus(row.status).label}</Badge>
              ),
            },
            {
              key: "payment",
              header: "Payment",
              hideOnMobile: true,
              cell: (row) => (
                <Badge variant={paymentStatus(row.paymentStatus, row.paymentMethod).variant}>
                  {paymentStatus(row.paymentStatus, row.paymentMethod).label}
                </Badge>
              ),
            },
            {
              key: "total",
              header: "Total",
              align: "right",
              cell: (row) => <Price paisa={row.totalPaisa} />,
            },
          ]}
        />
      </section>
    </div>
  );
}

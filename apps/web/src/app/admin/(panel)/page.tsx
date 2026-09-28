import { Badge, ButtonLink, DataTable, EmptyState, Grid, Link } from "@virzeen/ui";
import { Price } from "@/client/components/shared/price";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { formatDateTime } from "@/client/lib/format";
import { orderStatus, paymentStatus } from "@/client/lib/order-labels";
import { requireAdminPage } from "@/server/auth/session";
import { getDashboardStats, listAdminOrders } from "@/server/queries/admin";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const [stats, recent] = await Promise.all([getDashboardStats(), listAdminOrders({ page: 1 })]);
  const tiles = [
    { label: "Orders today", value: String(stats.todayOrders) },
    { label: "Sales today", value: <Price paisa={stats.todayRevenuePaisa} /> },
    { label: "To pack or ship", value: String(stats.toFulfil), href: "/admin/orders?status=CONFIRMED" },
    { label: "Payments pending", value: String(stats.pendingPayments), href: "/admin/orders?status=PENDING" },
  ];

  return (
    <div className="flex flex-col gap-10">
      <AdminPageHeader title="Dashboard" description="Today in Nepal time." />
      <Grid columns="products" gap={4}>
        {tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-2 rounded-md border border-line p-5">
            <p className="text-caption text-ink-muted uppercase">{tile.label}</p>
            <p className="font-display text-h2 tabular-nums">{tile.value}</p>
            {tile.href && (
              <Link href={tile.href} className="text-small">
                View
              </Link>
            )}
          </div>
        ))}
      </Grid>
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
              cell: (row) => (
                <Link href={`/admin/orders/${row.orderNumber}`} className="font-mono">
                  {row.orderNumber}
                </Link>
              ),
            },
            {
              key: "placed",
              header: "Placed",
              hideOnMobile: true,
              cell: (row) => formatDateTime(row.createdAt),
            },
            {
              key: "status",
              header: "Status",
              cell: (row) => (
                <Badge variant={orderStatus(row.status).variant}>{orderStatus(row.status).label}</Badge>
              ),
            },
            {
              key: "payment",
              header: "Payment",
              hideOnMobile: true,
              cell: (row) => (
                <Badge variant={paymentStatus(row.paymentStatus).variant}>
                  {paymentStatus(row.paymentStatus).label}
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

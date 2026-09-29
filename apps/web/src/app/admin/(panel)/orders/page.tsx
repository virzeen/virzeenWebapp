import { Badge, ButtonLink, DataTable, EmptyState, Link } from "@virzeen/ui";
import { adminOrderFiltersSchema, ORDER_STATUSES } from "@virzeen/validators";
import { Price } from "@/client/components/shared/price";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { OrderFilters } from "@/client/features/admin/order-filters";
import { formatDateTime } from "@/client/lib/format";
import { orderStatus, PAYMENT_METHOD_LABELS, paymentStatus } from "@/client/lib/order-labels";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminOrders } from "@/server/queries/admin";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata = { title: "Orders" };

function pageHref(params: Record<string, string>, page: number) {
  const next = new URLSearchParams({ ...params, page: String(page) });
  return `/admin/orders?${next.toString()}`;
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const params = flattenSearchParams(await searchParams);
  const filters = adminOrderFiltersSchema.parse(params);
  const { rows, total, page, pageCount } = await listAdminOrders(filters);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Orders" description={`${total} ${total === 1 ? "order" : "orders"}`} />

      <OrderFilters
        q={filters.q ?? ""}
        status={filters.status ?? ""}
        statusOptions={ORDER_STATUSES.map((value) => ({ value, label: orderStatus(value).label }))}
      />

      <DataTable
        caption="Orders"
        rows={rows}
        getRowId={(row) => row.orderNumber}
        empty={
          <EmptyState
            title="No orders match."
            action={<ButtonLink href="/admin/orders">Clear filters</ButtonLink>}
          />
        }
        columns={[
          {
            key: "order",
            header: "Order",
            // The number never breaks and the date sits under it; on phones the status moves in here too, so
            // Total stays on screen. The link covers the whole cell, so it is easy to tap.
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
          { key: "customer", header: "Customer", hideBelow: "xl", cell: (row) => row.customerEmail },
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
              <span className="flex flex-col items-start gap-1">
                <Badge variant={paymentStatus(row.paymentStatus, row.paymentMethod).variant}>
                  {paymentStatus(row.paymentStatus, row.paymentMethod).label}
                </Badge>
                {/* Cash-on-delivery badges already say "on delivery". */}
                {row.paymentMethod !== "COD" && (
                  <span className="text-small text-ink-muted">
                    {PAYMENT_METHOD_LABELS[row.paymentMethod]}
                  </span>
                )}
              </span>
            ),
          },
          { key: "total", header: "Total", align: "right", cell: (row) => <Price paisa={row.totalPaisa} /> },
        ]}
      />

      {pageCount > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <ButtonLink href={pageHref(params, page - 1)} variant="secondary" size="sm" shape="pill">
              Previous
            </ButtonLink>
          ) : (
            <span />
          )}
          <span className="text-small text-ink-muted">
            Page {page} of {pageCount}
          </span>
          {page < pageCount ? (
            <ButtonLink href={pageHref(params, page + 1)} variant="secondary" size="sm" shape="pill">
              Next
            </ButtonLink>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

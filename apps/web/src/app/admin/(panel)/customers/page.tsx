import { ButtonLink, DataTable, EmptyState, Link } from "@virzeen/ui";
import { adminPageSchema } from "@virzeen/validators";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { formatDate } from "@/client/lib/format";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminCustomers } from "@/server/queries/admin";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata = { title: "Customers" };

// The orders list searched by this email. Its search box takes up to 60 characters (adminOrderFiltersSchema).
const ordersHref = (email: string) => `/admin/orders?q=${encodeURIComponent(email.slice(0, 60))}`;

/** Read-only in phase 1 (project-brief.md §3). */
export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const page = adminPageSchema.parse(flattenSearchParams(await searchParams).page);
  const { rows, total, pageCount } = await listAdminCustomers(page);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Customers" description={`${total} ${total === 1 ? "customer" : "customers"}`} />
      <DataTable
        caption="Customers"
        rows={rows}
        getRowId={(row) => row.id}
        empty={<EmptyState title="No customers yet." />}
        columns={[
          // Email-code sign-up doesn't ask for a name, so most rows have none.
          { key: "name", header: "Name", hideOnMobile: true, cell: (row) => row.name || "—" },
          {
            key: "email",
            header: "Email",
            cell: (row) =>
              row._count.orders > 0 ? (
                <Link
                  href={ordersHref(row.email)}
                  className="inline-flex min-h-11 items-center wrap-anywhere"
                >
                  {row.email}
                </Link>
              ) : (
                <span className="wrap-anywhere">{row.email}</span>
              ),
          },
          { key: "since", header: "Joined", hideOnMobile: true, cell: (row) => formatDate(row.createdAt) },
          {
            key: "orders",
            header: "Orders",
            align: "right",
            cell: (row) =>
              row._count.orders > 0 ? (
                <Link
                  href={ordersHref(row.email)}
                  aria-label={`${row._count.orders} ${row._count.orders === 1 ? "order" : "orders"} from ${row.email}`}
                  className="inline-flex min-h-11 min-w-11 items-center justify-end"
                >
                  {row._count.orders}
                </Link>
              ) : (
                0
              ),
          },
        ]}
      />
      {pageCount > 1 && (
        <div className="flex justify-between">
          {page > 1 ? (
            <ButtonLink href={`/admin/customers?page=${page - 1}`} variant="secondary" size="sm" shape="pill">
              Previous
            </ButtonLink>
          ) : (
            <span />
          )}
          {page < pageCount && (
            <ButtonLink href={`/admin/customers?page=${page + 1}`} variant="secondary" size="sm" shape="pill">
              Next
            </ButtonLink>
          )}
        </div>
      )}
    </div>
  );
}

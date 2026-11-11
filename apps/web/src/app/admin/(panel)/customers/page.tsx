import { Button, ButtonLink, DataTable, EmptyState, Input, Link } from "@virzeen/ui";
import { adminPageSchema, customerSearchSchema } from "@virzeen/validators";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { MemberPassActions } from "@/client/features/admin/member-pass-actions";
import { MemberWalletActions } from "@/client/features/admin/member-wallet-actions";
import { Price } from "@/client/components/shared/price";
import { formatDate } from "@/client/lib/format";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminCustomers } from "@/server/queries/admin";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata = { title: "Customers" };

// The orders list searched by this email. Its search box takes up to 60 characters (adminOrderFiltersSchema).
const ordersHref = (email: string) => `/admin/orders?q=${encodeURIComponent(email.slice(0, 60))}`;

/** Customers, searchable, with each one's Monochrome Pass and the Pass actions (specs/membership-portal.md). */
export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const params = flattenSearchParams(await searchParams);
  const page = adminPageSchema.parse(params.page);
  const query = customerSearchSchema.parse(params.q);
  const { rows, total, pageCount } = await listAdminCustomers(page, query);
  const pageHref = (target: number) =>
    `/admin/customers?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(target) })}`;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Customers" description={`${total} ${total === 1 ? "customer" : "customers"}`} />
      <form method="get" role="search" className="flex max-w-md gap-3">
        <Input
          name="q"
          defaultValue={query}
          type="search"
          maxLength={60}
          aria-label="Search customers by email or name"
          placeholder="Search by email or name"
        />
        <Button type="submit" variant="secondary" shape="pill">
          Search
        </Button>
      </form>
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
          {
            key: "pass",
            header: "Level",
            cell: (row) =>
              row.passEndsAt && row.passEndsAt > new Date()
                ? `Pass until ${formatDate(row.passEndsAt)}`
                : "MONO Member",
          },
          {
            key: "manage",
            header: "Pass",
            cell: (row) => (
              <MemberPassActions
                userId={row.id}
                label={row.name.trim() || row.email}
                passEndsAt={row.passEndsAt ? row.passEndsAt.toISOString() : null}
              />
            ),
          },
          {
            key: "wallet",
            header: "Points / credit",
            hideOnMobile: true,
            cell: (row) => (
              <span className="whitespace-nowrap">
                {row.points} · <Price paisa={row.creditPaisa} />
              </span>
            ),
          },
          {
            key: "addwallet",
            header: "Wallet",
            cell: (row) => <MemberWalletActions userId={row.id} label={row.name.trim() || row.email} />,
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
            <ButtonLink href={pageHref(page - 1)} variant="secondary" size="sm" shape="pill">
              Previous
            </ButtonLink>
          ) : (
            <span />
          )}
          {page < pageCount && (
            <ButtonLink href={pageHref(page + 1)} variant="secondary" size="sm" shape="pill">
              Next
            </ButtonLink>
          )}
        </div>
      )}
    </div>
  );
}

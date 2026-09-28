import { ButtonLink, DataTable, EmptyState } from "@virzeen/ui";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { formatDate } from "@/client/lib/format";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminCustomers } from "@/server/queries/admin";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata = { title: "Customers" };

/** Read-only in phase 1 (project-brief.md §3). */
export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const page = Math.max(1, Number.parseInt(flattenSearchParams(await searchParams).page ?? "1", 10) || 1);
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
          { key: "name", header: "Name", cell: (row) => row.name },
          { key: "email", header: "Email", cell: (row) => row.email },
          { key: "since", header: "Joined", hideOnMobile: true, cell: (row) => formatDate(row.createdAt) },
          { key: "orders", header: "Orders", align: "right", cell: (row) => row._count.orders },
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

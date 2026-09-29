import { ButtonLink, DataTable, EmptyState } from "@virzeen/ui";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { ArchiveButton } from "@/client/features/admin/archive-button";
import { formatDate } from "@/client/lib/format";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminSizeGuides } from "@/server/queries/admin";

export const metadata = { title: "Size guides" };

const productCount = (count: number) => `${count} ${count === 1 ? "product" : "products"}`;

export default async function AdminSizeGuidesPage() {
  await requireAdminPage();
  const guides = await listAdminSizeGuides();
  const newGuide = (
    <ButtonLink href="/admin/size-guides/new" shape="pill">
      New size guide
    </ButtonLink>
  );
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Size guides"
        description="Size charts customers open from Size guide on the product page. Pick one on each product under Organise."
        actions={guides.length > 0 ? newGuide : undefined}
      />
      <DataTable
        caption="Size guides"
        rows={guides}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            title="No size guides yet."
            description="Make a chart once, then pick it on each product that uses it."
            action={newGuide}
          />
        }
        columns={[
          {
            key: "name",
            header: "Size guide",
            cell: (row) => <span className="font-medium">{row.name}</span>,
          },
          { key: "products", header: "Used on", cell: (row) => productCount(row.productCount) },
          { key: "updated", header: "Updated", hideOnMobile: true, cell: (row) => formatDate(row.updatedAt) },
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            cell: (row) => (
              <div className="flex justify-end gap-1">
                <ButtonLink href={`/admin/size-guides/${row.id}`} variant="ghost" size="sm" shape="pill">
                  Edit<span className="sr-only"> {row.name}</span>
                </ButtonLink>
                <ArchiveButton kind="sizeGuide" id={row.id} name={row.name} />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

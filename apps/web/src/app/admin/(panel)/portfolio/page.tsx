import { Badge, ButtonLink, DataTable, EmptyState, Link } from "@virzeen/ui";
import { PORTFOLIO_KIND_LABELS } from "@virzeen/validators";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { formatDate } from "@/client/lib/format";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminPortfolio } from "@/server/queries/admin";

export const metadata = { title: "Portfolio" };

export default async function AdminPortfolioPage() {
  await requireAdminPage();
  const projects = await listAdminPortfolio();
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Portfolio"
        description="Campaigns, lookbooks and collaborations."
        actions={
          <ButtonLink href="/admin/portfolio/new" shape="pill">
            New project
          </ButtonLink>
        }
      />
      <DataTable
        caption="Portfolio projects"
        rows={projects}
        getRowId={(row) => row.id}
        empty={<EmptyState title="No projects yet." />}
        columns={[
          {
            key: "title",
            header: "Project",
            cell: (row) => (
              <Link href={`/admin/portfolio/${row.id}`} className="inline-flex min-h-11 items-center">
                {row.title}
              </Link>
            ),
          },
          { key: "kind", header: "Type", hideOnMobile: true, cell: (row) => PORTFOLIO_KIND_LABELS[row.kind] },
          { key: "order", header: "Order", align: "right", hideOnMobile: true, cell: (row) => row.sortOrder },
          { key: "updated", header: "Updated", hideOnMobile: true, cell: (row) => formatDate(row.updatedAt) },
          {
            key: "status",
            header: "Status",
            cell: (row) => (
              <Badge variant={row.isPublished ? "success" : "neutral"}>
                {row.isPublished ? "Published" : "Draft"}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}

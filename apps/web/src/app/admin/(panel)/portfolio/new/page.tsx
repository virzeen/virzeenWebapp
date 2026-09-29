import { Link, Stack } from "@virzeen/ui";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { PortfolioForm } from "@/client/features/admin/portfolio-form";
import { requireAdminPage } from "@/server/auth/session";
import { listProductOptions, uploadsEnabled } from "@/server/queries/admin";

export const metadata = { title: "New project" };

export default async function NewPortfolioProjectPage() {
  await requireAdminPage();
  const productOptions = await listProductOptions();
  return (
    <Stack gap={6}>
      <Link
        href="/admin/portfolio"
        variant="subtle"
        className="inline-flex min-h-11 items-center self-start text-small"
      >
        ← Portfolio
      </Link>
      <AdminPageHeader title="New project" />
      <PortfolioForm productOptions={productOptions} uploadsEnabled={uploadsEnabled()} />
    </Stack>
  );
}

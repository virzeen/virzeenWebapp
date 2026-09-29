import { Link, Stack } from "@virzeen/ui";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { SizeGuideForm } from "@/client/features/admin/size-guide-form";
import { requireAdminPage } from "@/server/auth/session";
import { uploadsEnabled } from "@/server/queries/admin";

export const metadata = { title: "New size guide" };

export default async function NewSizeGuidePage() {
  await requireAdminPage();
  return (
    <Stack gap={6}>
      <Link
        href="/admin/size-guides"
        variant="subtle"
        className="inline-flex min-h-11 items-center self-start text-small"
      >
        ← Size guides
      </Link>
      <AdminPageHeader
        title="New size guide"
        description="Measurements in cm. Customers can switch the chart to inches."
      />
      <SizeGuideForm uploadsEnabled={uploadsEnabled()} />
    </Stack>
  );
}

import { Link, Stack } from "@virzeen/ui";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { ArchiveButton } from "@/client/features/admin/archive-button";
import { SizeGuideForm } from "@/client/features/admin/size-guide-form";
import { requireAdminPage } from "@/server/auth/session";
import { getSizeGuideForEdit, uploadsEnabled } from "@/server/queries/admin";

type Props = { params: Promise<{ id: string }> };

// A missing or archived guide gets the admin not-found page's title instead of "Edit size guide".
export async function generateMetadata({ params }: Props) {
  await requireAdminPage();
  if (!(await getSizeGuideForEdit((await params).id))) notFound();
  return { title: "Edit size guide" };
}

export default async function EditSizeGuidePage({ params }: Props) {
  await requireAdminPage();
  const guide = await getSizeGuideForEdit((await params).id);
  if (!guide) notFound();
  const { id, ...values } = guide;
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
        title={guide.name}
        actions={<ArchiveButton kind="sizeGuide" id={id} name={guide.name} redirectTo="/admin/size-guides" />}
      />
      <SizeGuideForm guideId={id} defaultValues={values} uploadsEnabled={uploadsEnabled()} />
    </Stack>
  );
}

import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { CollectionManager } from "@/client/features/admin/taxonomy-managers";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminCollections } from "@/server/queries/admin";

export const metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  await requireAdminPage();
  const collections = await listAdminCollections();
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Collections" description="Curated groups for campaigns and seasons." />
      <CollectionManager collections={collections} />
    </div>
  );
}

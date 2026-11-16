import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { CollectionManager } from "@/client/features/admin/collection-manager";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminCollections } from "@/server/queries/admin";

export const metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  await requireAdminPage();
  const collections = await listAdminCollections();
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Collections"
        description="Every group of products: Tops, Bottoms, drops and seasons. Choose who may see each."
      />
      <CollectionManager collections={collections} />
    </div>
  );
}

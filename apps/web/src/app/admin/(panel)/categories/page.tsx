import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { CategoryManager } from "@/client/features/admin/taxonomy-managers";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminCategories } from "@/server/queries/admin";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  await requireAdminPage();
  const categories = await listAdminCategories();
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Categories"
        description="How the shop is organised (Tops, Bottoms, Accessories…)."
      />
      <CategoryManager categories={categories} />
    </div>
  );
}

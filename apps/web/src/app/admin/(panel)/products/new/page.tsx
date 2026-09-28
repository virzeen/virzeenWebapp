import { Link, Stack } from "@virzeen/ui";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { ProductForm } from "@/client/features/admin/product-form";
import { requireAdminPage } from "@/server/auth/session";
import { getProductFormOptions, uploadsEnabled } from "@/server/queries/admin";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdminPage();
  const { categories, collections } = await getProductFormOptions();
  return (
    <Stack gap={6}>
      <Link href="/admin/products" variant="subtle" className="text-small">
        ← Products
      </Link>
      <AdminPageHeader title="New product" description="Saved as a draft until you switch on Published." />
      <ProductForm categories={categories} collections={collections} uploadsEnabled={uploadsEnabled()} />
    </Stack>
  );
}

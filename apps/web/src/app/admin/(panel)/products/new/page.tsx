import { Link, Stack } from "@virzeen/ui";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { ProductForm } from "@/client/features/admin/product-form";
import { requireAdminPage } from "@/server/auth/session";
import { getProductFormOptions, uploadsEnabled } from "@/server/queries/admin";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdminPage();
  const { categories, collections, sizeGuides } = await getProductFormOptions();
  return (
    <Stack gap={6}>
      <Link
        href="/admin/products"
        variant="subtle"
        className="inline-flex min-h-11 items-center self-start text-small"
      >
        ← Products
      </Link>
      <AdminPageHeader
        title="New product"
        description="Fill in the details, then Publish. Or Save draft and finish later: drafts aren't in the shop."
      />
      <ProductForm
        categories={categories}
        collections={collections}
        sizeGuides={sizeGuides}
        uploadsEnabled={uploadsEnabled()}
      />
    </Stack>
  );
}

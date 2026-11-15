import { ButtonLink, Link, Stack } from "@virzeen/ui";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { NewProductForm } from "@/client/features/admin/editor/new-product-form";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminCollections } from "@/server/queries/admin";

export const metadata = { title: "New product" };

/** The New product popup's form as a page, for direct links (specs/product-editor-on-page.md "User flow"). */
export default async function NewProductPage() {
  await requireAdminPage();
  const collections = await listAdminCollections();
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
        description="Start with the name, collection and price. You add the rest on the product page."
      />
      <div className="w-full max-w-md">
        <NewProductForm
          collections={collections.map((collection) => ({ value: collection.id, label: collection.name }))}
          cancel={
            <ButtonLink href="/admin/products" variant="secondary" shape="pill">
              Cancel
            </ButtonLink>
          }
        />
      </div>
    </Stack>
  );
}

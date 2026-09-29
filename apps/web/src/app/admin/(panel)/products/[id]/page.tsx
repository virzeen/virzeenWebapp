import { notFound } from "next/navigation";
import { ProductEditor } from "@/client/features/admin/editor/product-editor";
import { requireAdminPage } from "@/server/auth/session";
import { getProductForEdit, getProductFormOptions, uploadsEnabled } from "@/server/queries/admin";

type Props = { params: Promise<{ id: string }> };

// A missing product gets the admin not-found page's title instead of "Edit product".
export async function generateMetadata({ params }: Props) {
  await requireAdminPage();
  if (!(await getProductForEdit((await params).id))) notFound();
  return { title: "Edit product" };
}

/** The product editor on the page (specs/product-editor-on-page.md): it looks like the shop's product page. */
export default async function EditProductPage({ params }: Props) {
  await requireAdminPage();
  const [product, options] = await Promise.all([
    getProductForEdit((await params).id),
    getProductFormOptions(),
  ]);
  if (!product) notFound();

  return (
    <ProductEditor
      product={{
        id: product.id,
        number: product.number,
        slug: product.slug,
        isPublished: product.isPublished,
        everPublished: product.publishedAt !== null,
        savedAt: product.updatedAt.toISOString(),
      }}
      // The form's values as core reads them (styles with their numbers too), the same shape a save returns.
      values={product.values}
      options={{ ...options, uploadsEnabled: uploadsEnabled() }}
    />
  );
}

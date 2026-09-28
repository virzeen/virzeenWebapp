import { ButtonLink, Link, Stack } from "@virzeen/ui";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { ArchiveButton } from "@/client/features/admin/archive-button";
import { ProductForm } from "@/client/features/admin/product-form";
import { requireAdminPage } from "@/server/auth/session";
import { getProductForEdit, getProductFormOptions, uploadsEnabled } from "@/server/queries/admin";

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: Props) {
  await requireAdminPage();
  const [product, options] = await Promise.all([
    getProductForEdit((await params).id),
    getProductFormOptions(),
  ]);
  if (!product) notFound();

  return (
    <Stack gap={6}>
      <Link href="/admin/products" variant="subtle" className="text-small">
        ← Products
      </Link>
      <AdminPageHeader
        title={product.name}
        actions={
          <>
            {product.isPublished && (
              <ButtonLink href={`/product/${product.slug}`} variant="secondary" size="sm" shape="pill">
                View in shop
              </ButtonLink>
            )}
            <ArchiveButton kind="product" id={product.id} name={product.name} redirectTo="/admin/products" />
          </>
        }
      />
      <ProductForm
        productId={product.id}
        categories={options.categories}
        collections={options.collections}
        uploadsEnabled={uploadsEnabled()}
        defaultValues={{
          name: product.name,
          slug: product.slug,
          description: product.description,
          care: product.care ?? "",
          seoDescription: product.seoDescription ?? "",
          categoryId: product.categoryId,
          collectionIds: product.collections.map((c) => c.id),
          isPublished: product.isPublished,
          images: product.images,
          variants: product.variants.map((v) => ({ ...v, size: v.size ?? "", color: v.color ?? "" })),
        }}
      />
    </Stack>
  );
}

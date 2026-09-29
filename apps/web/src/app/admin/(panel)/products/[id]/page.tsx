import { Link, Stack } from "@virzeen/ui";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { ArchiveButton } from "@/client/features/admin/archive-button";
import { ProductForm } from "@/client/features/admin/product-form";
import { requireAdminPage } from "@/server/auth/session";
import { getProductForEdit, getProductFormOptions, uploadsEnabled } from "@/server/queries/admin";

type Props = { params: Promise<{ id: string }> };

// A missing product gets the admin not-found page's title instead of "Edit product".
export async function generateMetadata({ params }: Props) {
  await requireAdminPage();
  if (!(await getProductForEdit((await params).id))) notFound();
  return { title: "Edit product" };
}

export default async function EditProductPage({ params }: Props) {
  await requireAdminPage();
  const [product, options] = await Promise.all([
    getProductForEdit((await params).id),
    getProductFormOptions(),
  ]);
  if (!product) notFound();

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
        title={product.name}
        actions={
          <ArchiveButton kind="product" id={product.id} name={product.name} redirectTo="/admin/products" />
        }
      />
      <ProductForm
        saved={{
          id: product.id,
          slug: product.slug,
          isPublished: product.isPublished,
          savedAt: product.updatedAt.toISOString(),
        }}
        categories={options.categories}
        collections={options.collections}
        sizeGuides={options.sizeGuides}
        uploadsEnabled={uploadsEnabled()}
        defaultValues={{
          name: product.name,
          slug: product.slug,
          description: product.description,
          care: product.care ?? "",
          benefits: product.benefits,
          details: product.details,
          countryOfOrigin: product.countryOfOrigin,
          seoDescription: product.seoDescription ?? "",
          categoryId: product.categoryId,
          sizeGuideId: product.sizeGuideId,
          collectionIds: product.collections.map((c) => c.id),
          isPublished: product.isPublished,
          images: product.images,
          features: product.features,
          shippingPaisa: product.shippingPaisa,
          variants: product.variants.map((v) => ({ ...v, size: v.size ?? "", color: v.color ?? "" })),
        }}
      />
    </Stack>
  );
}

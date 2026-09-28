import { Badge, ButtonLink, DataTable, EmptyState, Link } from "@virzeen/ui";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminProducts } from "@/server/queries/admin";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await requireAdminPage();
  const products = await listAdminProducts();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Products"
        description={`${products.length} ${products.length === 1 ? "product" : "products"}`}
        actions={
          <ButtonLink href="/admin/products/new" shape="pill">
            New product
          </ButtonLink>
        }
      />
      <DataTable
        caption="Products"
        rows={products}
        getRowId={(row) => row.id}
        empty={
          <EmptyState
            title="No products yet."
            action={
              <ButtonLink href="/admin/products/new" shape="pill">
                Add your first product
              </ButtonLink>
            }
          />
        }
        columns={[
          {
            key: "product",
            header: "Product",
            cell: (row) => (
              <Link
                href={`/admin/products/${row.id}`}
                variant="subtle"
                className="flex items-center gap-3 text-ink"
              >
                <span className="w-10 shrink-0">
                  <CloudImage src={row.images[0]?.url ?? null} alt="" sizes="40px" />
                </span>
                <span>{row.name}</span>
              </Link>
            ),
          },
          { key: "category", header: "Category", hideOnMobile: true, cell: (row) => row.category.name },
          {
            key: "stock",
            header: "Stock",
            align: "right",
            cell: (row) => row.variants.reduce((sum, v) => sum + v.stock, 0),
          },
          {
            key: "price",
            header: "From",
            align: "right",
            hideOnMobile: true,
            cell: (row) => <Price paisa={row.fromPricePaisa} />,
          },
          {
            key: "status",
            header: "Status",
            cell: (row) => (
              <Badge variant={row.isPublished ? "success" : "neutral"}>
                {row.isPublished ? "Published" : "Draft"}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}

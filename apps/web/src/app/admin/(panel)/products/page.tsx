import { Badge, ButtonLink, DataTable, EmptyState, Link } from "@virzeen/ui";
import { adminProductFiltersSchema } from "@virzeen/validators";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { ProductSearch } from "@/client/features/admin/product-search";
import { requireAdminPage } from "@/server/auth/session";
import { listAdminProducts } from "@/server/queries/admin";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata = { title: "Products" };

function StatusBadge({ published }: { published: boolean }) {
  return <Badge variant={published ? "success" : "neutral"}>{published ? "Published" : "Draft"}</Badge>;
}

function countLabel(count: number, query: string | undefined) {
  const products = `${count} ${count === 1 ? "product" : "products"}`;
  if (!query) return products;
  return `${products} ${count === 1 ? "matches" : "match"} "${query}"`;
}

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const { q } = adminProductFiltersSchema.parse(flattenSearchParams(await searchParams));
  const products = await listAdminProducts(q);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Products"
        description={countLabel(products.length, q)}
        actions={
          <ButtonLink href="/admin/products/new" shape="pill">
            New product
          </ButtonLink>
        }
      />
      <ProductSearch q={q} />
      <DataTable
        caption="Products"
        rows={products}
        getRowId={(row) => row.id}
        empty={
          q ? (
            <EmptyState
              title={`Nothing matches "${q}".`}
              description="Try a different word or browse all products."
              action={
                <ButtonLink href="/admin/products" variant="secondary" shape="pill">
                  Show all products
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState
              title="No products yet."
              action={
                <ButtonLink href="/admin/products/new" shape="pill">
                  Add your first product
                </ButtonLink>
              }
            />
          )
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
                <span className="flex flex-col items-start gap-1">
                  <span>{row.name}</span>
                  {/* Phones have no room for the Status column, so the badge sits under the name. */}
                  <span className="md:hidden">
                    <StatusBadge published={row.isPublished} />
                  </span>
                </span>
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
            hideOnMobile: true,
            cell: (row) => <StatusBadge published={row.isPublished} />,
          },
        ]}
      />
    </div>
  );
}

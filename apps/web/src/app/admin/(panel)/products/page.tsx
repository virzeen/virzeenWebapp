import { Badge, ButtonLink, DataTable, EmptyState, Link } from "@virzeen/ui";
import { adminProductFiltersSchema, type AdminProductStatus } from "@virzeen/validators";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price } from "@/client/components/shared/price";
import { AdminPageHeader } from "@/client/features/admin/admin-page-header";
import { DuplicateProductButton } from "@/client/features/admin/duplicate-product-button";
import { NewProductDialog } from "@/client/features/admin/editor/new-product-dialog";
import { ProductSearch } from "@/client/features/admin/product-search";
import { requireAdminPage } from "@/server/auth/session";
import { getProductStatusCounts, listAdminCategories, listAdminProducts } from "@/server/queries/admin";
import { flattenSearchParams, type SearchParams } from "@/server/queries/params";

export const metadata = { title: "Products" };

type ProductRow = Awaited<ReturnType<typeof listAdminProducts>>[number];

const STATUS_FILTERS: {
  status: AdminProductStatus | undefined;
  label: string;
  count: "all" | AdminProductStatus;
}[] = [
  { status: undefined, label: "All", count: "all" },
  { status: "published", label: "Published", count: "published" },
  { status: "draft", label: "Drafts", count: "draft" },
];

function StatusBadge({ published }: { published: boolean }) {
  return <Badge variant={published ? "success" : "neutral"}>{published ? "Published" : "Draft"}</Badge>;
}

/** Status plus what needs attention: no photos, nothing in stock. */
function RowBadges({ row }: { row: ProductRow }) {
  const stock = row.variants.reduce((sum, v) => sum + v.stock, 0);
  return (
    <span className="flex flex-wrap gap-1">
      <StatusBadge published={row.isPublished} />
      {row.images.length === 0 && <Badge variant="warning">No photos</Badge>}
      {stock === 0 && <Badge variant="warning">Out of stock</Badge>}
    </span>
  );
}

function countLabel(count: number, query: string | undefined) {
  const products = `${count} ${count === 1 ? "product" : "products"}`;
  if (!query) return products;
  return `${products} ${count === 1 ? "matches" : "match"} "${query}"`;
}

const hrefFor = (status: AdminProductStatus | undefined, q: string | undefined) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  return params.size > 0 ? `/admin/products?${params.toString()}` : "/admin/products";
};

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const filters = adminProductFiltersSchema.parse(flattenSearchParams(await searchParams));
  const { q, status } = filters;
  const [products, counts, categories] = await Promise.all([
    listAdminProducts(filters),
    getProductStatusCounts(),
    listAdminCategories(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Products"
        description={countLabel(products.length, q)}
        actions={
          <NewProductDialog
            categories={categories.map((category) => ({ value: category.id, label: category.name }))}
          />
        }
      />
      <nav aria-label="Product status" className="flex flex-wrap gap-6 border-b border-line">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={hrefFor(filter.status, q)}
            variant="nav"
            aria-current={filter.status === status ? "page" : undefined}
          >
            {filter.label} ({counts[filter.count]})
          </Link>
        ))}
      </nav>
      <ProductSearch q={q} status={status} />
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
          ) : status ? (
            <EmptyState
              title={status === "draft" ? "No drafts." : "Nothing published yet."}
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
                <span className="w-14 shrink-0">
                  <CloudImage src={row.images[0]?.url ?? null} alt="" sizes="56px" />
                </span>
                <span className="flex flex-col items-start gap-1">
                  <span>{row.name}</span>
                  {/* Phones have no room for the Status column, so the badges sit under the name. */}
                  <span className="md:hidden">
                    <RowBadges row={row} />
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
            cell: (row) => <RowBadges row={row} />,
          },
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            hideOnMobile: true,
            cell: (row) => <DuplicateProductButton id={row.id} productName={row.name} />,
          },
        ]}
      />
    </div>
  );
}

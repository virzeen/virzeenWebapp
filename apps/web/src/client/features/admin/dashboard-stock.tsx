import { Badge, DataTable, EmptyState, Link } from "@virzeen/ui";
import { LOW_STOCK_THRESHOLD } from "@virzeen/validators/limits";
import { Price } from "@/client/components/shared/price";

type LowStockProps = {
  rows: { variantId: string; productId: string; productName: string; label: string; stock: number }[];
  total: number;
};

type BestSellersProps = {
  rows: { productId: string; productName: string; unitsSold: number; salesPaisa: number }[];
};

const productLink = (row: { productId: string; productName: string }) => (
  <Link href={`/admin/products/${row.productId}`} className="inline-flex min-h-11 items-center">
    {row.productName}
  </Link>
);

/** "Low stock" on the dashboard (specs/admin-stock-insights.md): sizes for sale with 3 or fewer left. */
export function LowStockSection({ rows, total }: LowStockProps) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="low-stock">
      <div className="flex flex-col gap-1">
        <h2 id="low-stock" className="font-display text-h3">
          Low stock
        </h2>
        <p className="text-small text-ink-muted">
          Sizes for sale with {LOW_STOCK_THRESHOLD} or fewer left, sold out first.
        </p>
      </div>
      <DataTable
        caption="Low stock"
        rows={rows}
        getRowId={(row) => row.variantId}
        empty={<EmptyState title={`Every size has more than ${LOW_STOCK_THRESHOLD} left.`} />}
        columns={[
          { key: "product", header: "Product", cell: productLink },
          { key: "size", header: "Style / size", cell: (row) => row.label },
          {
            key: "stock",
            header: "Stock",
            align: "right",
            cell: (row) =>
              row.stock <= 0 ? (
                <Badge variant="danger">Out of stock</Badge>
              ) : (
                <Badge variant="warning">Only {row.stock} left</Badge>
              ),
          },
        ]}
      />
      {total > rows.length && (
        <p className="text-small text-ink-muted">
          {total - rows.length === 1 ? "1 more size is low." : `${total - rows.length} more sizes are low.`}{" "}
          <Link href="/admin/products">See products</Link>
        </p>
      )}
    </section>
  );
}

/** "Best sellers" on the dashboard: the 5 products that sold the most pieces in the last 30 days. */
export function BestSellersSection({ rows }: BestSellersProps) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="best-sellers">
      <div className="flex flex-col gap-1">
        <h2 id="best-sellers" className="font-display text-h3">
          Best sellers
        </h2>
        <p className="text-small text-ink-muted">
          Last 30 days, by pieces sold. Cancelled orders don&apos;t count.
        </p>
      </div>
      <DataTable
        caption="Best sellers, last 30 days"
        rows={rows}
        getRowId={(row) => row.productId}
        empty={<EmptyState title="No sales in the last 30 days." />}
        columns={[
          { key: "product", header: "Product", cell: productLink },
          { key: "sold", header: "Sold", align: "right", cell: (row) => row.unitsSold },
          {
            key: "sales",
            header: "Sales",
            align: "right",
            hideOnMobile: true,
            cell: (row) => <Price paisa={row.salesPaisa} />,
          },
        ]}
      />
    </section>
  );
}

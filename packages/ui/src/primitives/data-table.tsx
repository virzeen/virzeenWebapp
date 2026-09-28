import { cn } from "../lib/cn";

export type DataTableColumn<Row> = {
  key: string;
  header: React.ReactNode;
  cell: (row: Row) => React.ReactNode;
  /** Right-align numbers and money. */
  align?: "left" | "right";
  /** Hide on small screens (keeps the table readable on phones). */
  hideOnMobile?: boolean;
};

export type DataTableProps<Row> = {
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  getRowId: (row: Row) => string;
  /** Accessible table caption (visually hidden). */
  caption: string;
  /** Rendered instead of the table body when there are no rows (usually an `EmptyState`). */
  empty?: React.ReactNode;
  className?: string;
};

/**
 * Admin lists (orders, products, customers). Server-rendered; filters and pagination live in the URL.
 * Not for customer-facing UI.
 */
export function DataTable<Row>({ columns, rows, getRowId, caption, empty, className }: DataTableProps<Row>) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <div className={cn("w-full overflow-x-auto rounded-md border border-line", className)}>
      <table className="w-full border-collapse text-left text-small">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-4 py-3 text-caption font-medium text-ink-muted uppercase",
                  column.align === "right" && "text-right",
                  column.hideOnMobile && "max-md:hidden",
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={getRowId(row)} className="transition-colors duration-150 ease-standard hover:bg-surface">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "px-4 py-3 align-middle text-ink",
                    column.align === "right" && "text-right tabular-nums",
                    column.hideOnMobile && "max-md:hidden",
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

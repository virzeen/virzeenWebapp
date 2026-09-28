import { cn } from "@virzeen/ui";

const wholeRupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const fractionalRupees = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 125000 → "Rs 1,250" (en-IN grouping). Exported for aria labels and admin tables. */
export function formatPaisa(paisa: number): string {
  return `Rs ${(paisa % 100 === 0 ? wholeRupees : fractionalRupees).format(paisa / 100)}`;
}

type PriceProps = {
  paisa: number;
  /** Original price shown struck through (future sales). */
  compareAtPaisa?: number | null;
  /** Prefix "From" for products with several prices. */
  from?: boolean;
  className?: string;
};

/** The only way to show money in the UI (docs/ui/components-catalog.md §2). */
export function Price({ paisa, compareAtPaisa, from = false, className }: PriceProps) {
  const onSale = compareAtPaisa != null && compareAtPaisa > paisa;
  return (
    <span className={cn("tabular-nums", className)}>
      {from && <span className="text-ink-muted">From </span>}
      <span>{formatPaisa(paisa)}</span>
      {onSale && (
        <>
          {" "}
          <s className="text-ink-muted">
            <span className="sr-only">was </span>
            {formatPaisa(compareAtPaisa)}
          </s>
        </>
      )}
    </span>
  );
}

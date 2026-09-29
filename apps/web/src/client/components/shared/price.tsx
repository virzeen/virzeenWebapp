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

/**
 * The only way to show money in the UI (docs/ui/components-catalog.md §2).
 * Each amount stays on one line ("Rs" never ends a line); a narrow slot can still wrap between
 * "From", the price and the old price.
 */
export function Price({ paisa, compareAtPaisa, from = false, className }: PriceProps) {
  const onSale = compareAtPaisa != null && compareAtPaisa > paisa;
  return (
    <span className={cn("tabular-nums", className)}>
      {from && <span className="text-ink-muted">From </span>}
      <span className="whitespace-nowrap">{formatPaisa(paisa)}</span>
      {onSale && (
        <>
          {" "}
          <s className="whitespace-nowrap text-ink-muted">
            <span className="sr-only">was </span>
            {formatPaisa(compareAtPaisa)}
          </s>
        </>
      )}
    </span>
  );
}

/** Shipping line amount: "Free" when nothing is charged (shipping is included in product prices). */
export function ShippingPrice({ paisa, className }: { paisa: number; className?: string }) {
  return paisa === 0 ? (
    <span className={className}>Free</span>
  ) : (
    <Price paisa={paisa} className={className} />
  );
}

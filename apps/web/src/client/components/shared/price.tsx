import { cn } from "@virzeen/ui";

const wholeRupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const fractionalRupees = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatRupees = (paisa: number) =>
  (paisa % 100 === 0 ? wholeRupees : fractionalRupees).format(paisa / 100);

/** 125000 → "Rs 1,250" (en-IN grouping). Exported for aria labels and admin tables. */
export function formatPaisa(paisa: number): string {
  return `Rs ${formatRupees(paisa)}`;
}

type PriceSymbol = "Rs" | "रु";

/** "रु" is shown, "Rs" is read: English screen reader voices skip or spell out the Devanagari sign. */
function Amount({ paisa, symbol }: { paisa: number; symbol: PriceSymbol }) {
  if (symbol === "Rs") return formatPaisa(paisa);
  return (
    <>
      <span aria-hidden="true">रु</span>
      <span className="sr-only">Rs</span> {formatRupees(paisa)}
    </>
  );
}

type PriceProps = {
  paisa: number;
  /** Original price shown struck through (future sales). */
  compareAtPaisa?: number | null;
  /** Prefix "From" for products with several prices. */
  from?: boolean;
  /** "रु" on product cards (owner request 2026-10-01); "Rs" everywhere else. */
  symbol?: PriceSymbol;
  className?: string;
};

/**
 * The only way to show money in the UI (docs/ui/components-catalog.md §2).
 * Each amount stays on one line ("Rs" never ends a line); a narrow slot can still wrap between
 * "From", the price and the old price.
 */
export function Price({ paisa, compareAtPaisa, from = false, symbol = "Rs", className }: PriceProps) {
  const onSale = compareAtPaisa != null && compareAtPaisa > paisa;
  return (
    // relative: keeps the sr-only labels inside, so a scrolling row (ProductCarousel) still clips them.
    <span className={cn("relative tabular-nums", className)}>
      {from && <span className="text-ink-muted">From </span>}
      <span className="whitespace-nowrap">
        <Amount paisa={paisa} symbol={symbol} />
      </span>
      {onSale && (
        <>
          {" "}
          <s className="whitespace-nowrap text-ink-muted">
            <span className="sr-only">was </span>
            <Amount paisa={compareAtPaisa} symbol={symbol} />
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

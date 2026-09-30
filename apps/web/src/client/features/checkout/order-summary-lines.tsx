import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price, ShippingPrice } from "@/client/components/shared/price";

type SummaryLine = {
  id: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  lineTotalPaisa: number;
  imageUrl: string | null;
  imageAlt: string;
  isAvailable: boolean;
};

/**
 * The bag in the checkout summary, like Nike's "Arrives in…" list: photo, then name, quantity, style and size,
 * and the line price.
 */
export function OrderSummaryLines({ items, arrives }: { items: SummaryLine[]; arrives: string | null }) {
  return (
    <div className="flex flex-col gap-4">
      {arrives && <p className="text-body font-medium">Arrives in {arrives}</p>}
      <ul className="flex flex-col gap-6">
        {items
          .filter((item) => item.isAvailable)
          .map((item) => (
            <li key={item.id} className="flex gap-4">
              <CloudImage src={item.imageUrl} alt={item.imageAlt} sizes="96px" className="w-24 shrink-0" />
              <div className="flex min-w-0 flex-col text-small wrap-anywhere text-ink-muted">
                <p className="text-body text-ink">{item.productName}</p>
                <p>Qty {item.quantity}</p>
                <p>{item.variantLabel}</p>
                <Price paisa={item.lineTotalPaisa} className="text-body text-ink" />
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}

type OrderSummaryTotalsProps = {
  totals: { subtotalPaisa: number; shippingPaisa: number; totalPaisa: number; vatPaisa: number };
  /** Shipping and the total depend on the delivery address, so they wait for one. */
  hasAddress: boolean;
  /** Only the summary next to the steps carries the test id. */
  totalTestId?: string;
};

/** Subtotal, shipping, the total between hairlines, and the VAT it includes (server-calculated amounts). */
export function OrderSummaryTotals({ totals, hasAddress, totalTestId }: OrderSummaryTotalsProps) {
  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col gap-3 text-body">
        <div className="flex justify-between gap-4">
          <dt>Subtotal</dt>
          <dd>
            <Price paisa={totals.subtotalPaisa} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Shipping</dt>
          <dd>
            {totals.shippingPaisa === 0 || hasAddress ? (
              <ShippingPrice paisa={totals.shippingPaisa} />
            ) : (
              <span className="text-ink-muted">—</span>
            )}
          </dd>
        </div>
        <div className="mt-3 flex justify-between gap-4 border-y border-line py-4 font-medium">
          <dt>Total</dt>
          <dd data-testid={totalTestId}>
            <Price paisa={hasAddress ? totals.totalPaisa : totals.subtotalPaisa} />
          </dd>
        </div>
      </dl>
      <p className="text-small text-ink-muted">
        Includes <Price paisa={totals.vatPaisa} /> VAT (13%).
      </p>
    </div>
  );
}

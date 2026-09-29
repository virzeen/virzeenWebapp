import { Separator } from "@virzeen/ui";
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

/** Compact list of bag lines for the checkout summary. */
export function OrderSummaryLines({ items }: { items: SummaryLine[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {items
        .filter((item) => item.isAvailable)
        .map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <div className="relative w-14 shrink-0">
              <CloudImage src={item.imageUrl} alt={item.imageAlt} sizes="56px" />
              <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-ink text-caption text-canvas">
                {item.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-small">{item.productName}</p>
              <p className="text-small text-ink-muted">{item.variantLabel}</p>
            </div>
            <Price paisa={item.lineTotalPaisa} className="text-small" />
          </li>
        ))}
    </ul>
  );
}

type OrderSummaryTotalsProps = {
  totals: { subtotalPaisa: number; shippingPaisa: number; totalPaisa: number; vatPaisa: number };
  /** Shipping and the total depend on the delivery address, so they wait for one. */
  hasAddress: boolean;
  /** Only the summary next to "Place order" carries the test id. */
  totalTestId?: string;
};

/** Subtotal, shipping, total and the VAT note (server-calculated amounts). */
export function OrderSummaryTotals({ totals, hasAddress, totalTestId }: OrderSummaryTotalsProps) {
  return (
    <>
      <div className="flex justify-between text-body">
        <span>Subtotal</span>
        <Price paisa={totals.subtotalPaisa} />
      </div>
      <div className="flex justify-between text-body">
        <span>Shipping</span>
        {totals.shippingPaisa === 0 || hasAddress ? (
          <ShippingPrice paisa={totals.shippingPaisa} />
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </div>
      <Separator />
      <div className="flex justify-between text-h3">
        <span>Total</span>
        <span data-testid={totalTestId}>
          <Price paisa={hasAddress ? totals.totalPaisa : totals.subtotalPaisa} />
        </span>
      </div>
      <p className="text-small text-ink-muted">
        Includes <Price paisa={totals.vatPaisa} /> VAT (13%).
      </p>
    </>
  );
}

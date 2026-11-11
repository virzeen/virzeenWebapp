import { Link } from "@virzeen/ui";
import { CloudImage } from "@/client/components/shared/cloud-image";
import { Price, ShippingPrice } from "@/client/components/shared/price";
import type { CheckoutTotals } from "./checkout-types";

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
 * The bag in the checkout summary, like Nike's "Arrives in…" list: photo, then the line price large and bold,
 * and under it the name, quantity, style and size in smaller type.
 */
export function OrderSummaryLines({ items, arrives }: { items: SummaryLine[]; arrives: string }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body font-medium" data-testid="arrives-by">
        Arrives by {arrives}
      </p>
      <ul className="flex flex-col gap-6">
        {items
          .filter((item) => item.isAvailable)
          .map((item) => (
            <li key={item.id} className="flex gap-4">
              <CloudImage src={item.imageUrl} alt={item.imageAlt} sizes="96px" className="w-24 shrink-0" />
              <div className="flex min-w-0 flex-col text-small wrap-anywhere text-ink-muted">
                <Price paisa={item.lineTotalPaisa} className="text-body font-medium text-ink" />
                <p className="mt-1 text-small text-ink">{item.productName}</p>
                <p>Qty {item.quantity}</p>
                <p>{item.variantLabel}</p>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}

type OrderSummaryTotalsProps = {
  totals: CheckoutTotals;
  /** Only the summary next to the steps carries the test ids. */
  totalTestId?: string;
};

/**
 * Subtotal, delivery, a discount code's line, the total between hairlines, and the VAT it includes (all
 * server-calculated amounts), then, for guests, the member nudge (docs/checkoutfeatures.md §4), hidden when it
 * doesn't apply. The "Add X more for free delivery" hint is on the bag page only (owner 2026-11-11).
 */
export function OrderSummaryTotals({ totals, totalTestId }: OrderSummaryTotalsProps) {
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
          <dt>Delivery</dt>
          <dd data-testid={totalTestId ? "checkout-delivery" : undefined}>
            <ShippingPrice paisa={totals.shippingPaisa} />
          </dd>
        </div>
        {totals.discountPaisa > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="wrap-anywhere">
              Promo code discount{totals.discountCode ? ` (${totals.discountCode})` : ""}
            </dt>
            <dd className="whitespace-nowrap" data-testid={totalTestId ? "checkout-discount" : undefined}>
              −<Price paisa={totals.discountPaisa} />
            </dd>
          </div>
        )}
        <div className="mt-3 flex justify-between gap-4 border-y border-line py-4 font-medium">
          <dt>Total</dt>
          <dd data-testid={totalTestId}>
            <Price paisa={totals.totalPaisa} />
          </dd>
        </div>
      </dl>
      <p className="text-small text-ink-muted">
        Includes <Price paisa={totals.vatPaisa} /> VAT (13%).
      </p>
      {totals.tier === "GUEST" && totals.memberSavingPaisa > 0 && (
        <p className="text-small" data-testid="member-nudge">
          MONO Members save <Price paisa={totals.memberSavingPaisa} /> on this order.{" "}
          <Link href="/login?next=%2Fcheckout" className="underline underline-offset-4">
            Log in or sign up
          </Link>
        </p>
      )}
    </div>
  );
}

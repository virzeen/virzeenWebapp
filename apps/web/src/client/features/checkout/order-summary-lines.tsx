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

/** The name of the discount line: the birthday reward, the Pass discount or a promo code. */
export function discountLabel(totals: CheckoutTotals, withCode = false): string {
  if (totals.isBirthdayDiscount) return "Birthday reward";
  if (totals.isPassDiscount) return "Monochrome Pass discount";
  return `Promo code discount${withCode && totals.discountCode ? ` (${totals.discountCode})` : ""}`;
}

/** What Express Delivery promises: within 3 hours between 9 AM and 6 PM, otherwise by 11 AM the next day. */
export function expressPromise(withinHours: boolean): string {
  return withinHours ? "Within 3 hours" : "Tomorrow by 11 AM";
}

type OrderSummaryTotalsProps = {
  totals: CheckoutTotals;
  /** Gift wrapping was chosen (it shows as "Free" for the Pass, which has no price to show). */
  giftWrap?: boolean;
  /** Only the summary next to the steps carries the test ids. */
  totalTestId?: string;
};

/**
 * Subtotal, delivery, a discount code's line, the total between hairlines, and the VAT it includes (all
 * server-calculated amounts), then, for guests, the member nudge (docs/checkoutfeatures.md §4), hidden when it
 * doesn't apply. The "Add X more for free delivery" hint is on the bag page only (owner 2026-11-11).
 */
export function OrderSummaryTotals({ totals, giftWrap = false, totalTestId }: OrderSummaryTotalsProps) {
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
            <dt className="wrap-anywhere">{discountLabel(totals, true)}</dt>
            <dd className="whitespace-nowrap" data-testid={totalTestId ? "checkout-discount" : undefined}>
              −<Price paisa={totals.discountPaisa} />
            </dd>
          </div>
        )}
        {giftWrap && (
          <div className="flex justify-between gap-4">
            <dt>Gift wrapping</dt>
            <dd className="whitespace-nowrap" data-testid={totalTestId ? "checkout-gift-wrap" : undefined}>
              {totals.giftWrapPaisa > 0 ? <Price paisa={totals.giftWrapPaisa} /> : "Free"}
            </dd>
          </div>
        )}
        {totals.pointsUsed > 0 && (
          <div className="flex justify-between gap-4">
            <dt>Points ({totals.pointsUsed})</dt>
            <dd className="whitespace-nowrap" data-testid={totalTestId ? "checkout-points" : undefined}>
              −<Price paisa={totals.pointsUsed * 100} />
            </dd>
          </div>
        )}
        {totals.creditUsedPaisa > 0 && (
          <div className="flex justify-between gap-4">
            <dt>Credit</dt>
            <dd className="whitespace-nowrap" data-testid={totalTestId ? "checkout-credit" : undefined}>
              −<Price paisa={totals.creditUsedPaisa} />
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
      {totals.tier === "PASS" && totals.passSavingPaisa > 0 && (
        <p className="text-small" data-testid="pass-saving">
          You saved <Price paisa={totals.passSavingPaisa} /> with your Pass.
        </p>
      )}
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

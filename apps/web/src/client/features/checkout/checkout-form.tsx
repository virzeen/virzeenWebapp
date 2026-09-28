"use client";

import { Alert, Button, FormField, RadioGroup, RadioGroupItem, Separator, Stack, toast } from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Price } from "@/client/components/shared/price";
import { AddressForm } from "@/client/features/account/address-form";
import type { AddressView } from "@/client/features/account/address-book";
import { useCart } from "@/client/features/cart/cart-provider";
import { messageFor } from "@/client/lib/error-messages";
import { placeOrderAction, previewCheckoutAction } from "@/server/actions/checkout";
import { OrderSummaryLines } from "./order-summary-lines";
import { submitProviderForm } from "./submit-provider-form";

type Totals = {
  subtotalPaisa: number;
  shippingPaisa: number;
  totalPaisa: number;
  vatPaisa: number;
  deliveryEstimate: string;
  isCodAvailable: boolean;
  codLimitPaisa: number;
};

type Method = "COD" | "ESEWA" | "KHALTI";

type CheckoutFormProps = {
  addresses: AddressView[];
  initialAddressId: string | null;
  initialTotals: Totals;
  enabledMethods: { COD: boolean; ESEWA: boolean; KHALTI: boolean };
};

const METHODS: { value: Method; label: string; description: string; cta: string }[] = [
  {
    value: "COD",
    label: "Cash on delivery",
    description: "Pay the courier when your order arrives",
    cta: "Place order",
  },
  {
    value: "ESEWA",
    label: "eSewa",
    description: "You'll be taken to eSewa to pay",
    cta: "Continue to eSewa",
  },
  {
    value: "KHALTI",
    label: "Khalti",
    description: "You'll be taken to Khalti to pay",
    cta: "Continue to Khalti",
  },
];

// Codes that mean "your bag changed": send the customer back to review it.
const BAG_NOTICES: Partial<Record<string, string>> = {
  OUT_OF_STOCK: "out-of-stock",
  PRICE_CHANGED: "price-changed",
  CART_EMPTY: "empty",
};

/** Single-page checkout: Address → Delivery summary → Payment (patterns.md §8). */
export function CheckoutForm({
  addresses,
  initialAddressId,
  initialTotals,
  enabledMethods,
}: CheckoutFormProps) {
  const router = useRouter();
  const { cart } = useCart();
  const [addressId, setAddressId] = useState(initialAddressId);
  const [addingAddress, setAddingAddress] = useState(addresses.length === 0);
  const [totals, setTotals] = useState(initialTotals);
  const [method, setMethod] = useState<Method | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const [isPlacing, startPlacing] = useTransition();
  const [redirecting, setRedirecting] = useState(false);

  const available = METHODS.filter(
    (m) => enabledMethods[m.value] && (m.value !== "COD" || totals.isCodAvailable),
  );
  const selected = available.find((m) => m.value === method) ?? null;

  function chooseAddress(id: string) {
    setAddressId(id);
    startRefresh(async () => {
      const result = await previewCheckoutAction({ addressId: id });
      if (result.ok) setTotals(result.data);
      else toast.error(messageFor(result.error));
    });
  }

  function placeOrder() {
    if (!addressId || !selected) return;
    setFormError(null);
    startPlacing(async () => {
      const result = await placeOrderAction({ addressId, paymentMethod: selected.value });
      if (!result.ok) {
        const notice = BAG_NOTICES[result.error.code];
        if (notice) return router.push(`/cart?notice=${notice}`);
        setFormError(messageFor(result.error));
        return;
      }
      const { orderNumber, next } = result.data;
      setRedirecting(true);
      if (next.type === "done") router.push(`/checkout/success?order=${orderNumber}`);
      else if (next.type === "redirect") window.location.assign(next.url);
      else submitProviderForm(next.action, next.fields);
    });
  }

  return (
    <div className="gap-12 lg:grid-cols-[3fr_2fr] grid">
      <Stack gap={12}>
        {formError && <Alert variant="danger">{formError}</Alert>}

        <section aria-labelledby="address-heading" className="gap-4 flex flex-col">
          <h2 id="address-heading" className="font-display text-h3">
            1. Delivery address
          </h2>
          {addingAddress ? (
            <AddressForm
              submitLabel="Use this address"
              onSaved={(id) => {
                setAddingAddress(false);
                chooseAddress(id);
                router.refresh();
              }}
              onCancel={addresses.length > 0 ? () => setAddingAddress(false) : undefined}
            />
          ) : (
            <>
              <RadioGroup
                aria-labelledby="address-heading"
                variant="card"
                value={addressId ?? ""}
                onValueChange={chooseAddress}
                className="grid-cols-1"
              >
                {addresses.map((address) => (
                  <RadioGroupItem
                    key={address.id}
                    value={address.id}
                    label={address.fullName}
                    description={`${address.street}, ${address.city}, ${address.district} · ${address.phone}`}
                  />
                ))}
              </RadioGroup>
              <Button variant="link" className="self-start" onClick={() => setAddingAddress(true)}>
                Add a new address
              </Button>
            </>
          )}
        </section>

        <section aria-labelledby="delivery-heading" className="gap-2 flex flex-col">
          <h2 id="delivery-heading" className="font-display text-h3">
            2. Delivery
          </h2>
          <p className="text-body text-ink-muted">
            {addressId
              ? `Arrives in ${totals.deliveryEstimate}.`
              : "Choose an address to see delivery time and cost."}
          </p>
        </section>

        <section aria-labelledby="payment-heading" className="gap-4 flex flex-col">
          <h2 id="payment-heading" className="font-display text-h3">
            3. Payment
          </h2>
          <FormField label="Payment method" required>
            <RadioGroup
              variant="card"
              value={method ?? ""}
              onValueChange={(value) => setMethod(value as Method)}
              className="grid-cols-1"
            >
              {available.map((m) => (
                <RadioGroupItem key={m.value} value={m.value} label={m.label} description={m.description} />
              ))}
            </RadioGroup>
          </FormField>
          {enabledMethods.COD && !totals.isCodAvailable && (
            <p className="text-small text-ink-muted">
              Cash on delivery is available for orders up to <Price paisa={totals.codLimitPaisa} />.
            </p>
          )}
        </section>
      </Stack>

      <aside aria-labelledby="summary-heading" className="lg:sticky lg:top-24 lg:self-start">
        <Stack gap={4} className="p-6 rounded-md bg-surface" aria-busy={isRefreshing || undefined}>
          <h2 id="summary-heading" className="font-display text-h3">
            Order summary
          </h2>
          <OrderSummaryLines items={cart.items} />
          <Separator />
          <div className="flex justify-between text-body">
            <span>Subtotal</span>
            <Price paisa={totals.subtotalPaisa} />
          </div>
          <div className="flex justify-between text-body">
            <span>Shipping</span>
            {addressId ? <Price paisa={totals.shippingPaisa} /> : <span className="text-ink-muted">—</span>}
          </div>
          <Separator />
          <div className="flex justify-between text-h3">
            <span>Total</span>
            <span data-testid="checkout-total">
              <Price paisa={addressId ? totals.totalPaisa : totals.subtotalPaisa} />
            </span>
          </div>
          <p className="text-small text-ink-muted">
            Includes <Price paisa={totals.vatPaisa} /> VAT (13%).
          </p>
          <Button
            size="lg"
            shape="pill"
            className="w-full"
            loading={isPlacing || redirecting}
            disabled={!addressId || !selected || isRefreshing || addingAddress}
            onClick={placeOrder}
            data-testid="place-order"
          >
            {selected?.cta ?? "Place order"}
          </Button>
          {(!addressId || !selected) && (
            <p className="text-center text-small text-ink-muted">
              {!addressId ? "Add a delivery address to continue." : "Choose a payment method to continue."}
            </p>
          )}
        </Stack>
      </aside>
    </div>
  );
}

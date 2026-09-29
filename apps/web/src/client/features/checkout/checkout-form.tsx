"use client";

import {
  Accordion,
  AccordionItem,
  Alert,
  Button,
  FormField,
  RadioGroup,
  RadioGroupItem,
  Separator,
  Stack,
  toast,
} from "@virzeen/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { formatPaisa, Price } from "@/client/components/shared/price";
import { AddressForm } from "@/client/features/account/address-form";
import type { AddressView } from "@/client/features/account/address-book";
import { useCart } from "@/client/features/cart/cart-provider";
import { messageFor } from "@/client/lib/error-messages";
import { placeOrderAction, previewCheckoutAction } from "@/server/actions/checkout";
import { OrderSummaryLines, OrderSummaryTotals } from "./order-summary-lines";
import { submitProviderForm } from "./submit-provider-form";

type Totals = {
  subtotalPaisa: number;
  shippingPaisa: number;
  totalPaisa: number;
  vatPaisa: number;
  deliveryEstimate: string;
  isCodAvailable: boolean;
  codLimitPaisa: number | null;
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

// NOT_FOUND at checkout means the chosen address was deleted since the page loaded (e.g. in another tab).
const ADDRESS_GONE = "That address is no longer saved. Choose another address or add a new one.";

// Where keyboard focus goes when the address section switches between the list and the form: the section
// heading, "Add a new address" after Cancel, or a just-saved address once the refreshed list includes it
// (the pressed button unmounts, which would drop focus to the page). Same approach as the address book.
type FocusTarget = { to: "heading" } | { to: "add" } | { to: "address"; id: string };

/** Why "Place order" is disabled, from the same conditions as the button; null when it can be pressed. */
function placeOrderHint(state: {
  showAddressForm: boolean;
  hasSavedAddresses: boolean;
  addressId: string | null;
  hasMethod: boolean;
}): string | null {
  if (state.showAddressForm) {
    return state.hasSavedAddresses
      ? "Save the new address to continue."
      : "Add a delivery address to continue.";
  }
  if (!state.addressId) return "Choose a delivery address to continue.";
  if (!state.hasMethod) return "Choose a payment method to continue.";
  return null;
}

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
  // A form error shows at the top of the form from lg, and just above "Place order" on smaller screens
  // (where the summary comes last); only one of the two is displayed.
  const topErrorRef = useRef<HTMLDivElement>(null);
  const bottomErrorRef = useRef<HTMLDivElement>(null);
  const focusTarget = useRef<FocusTarget | null>(null);
  const addressHeadingRef = useRef<HTMLHeadingElement>(null);
  const addAddressRef = useRef<HTMLButtonElement>(null);
  const addressRefs = useRef(new Map<string, HTMLButtonElement>());

  const available = METHODS.filter(
    (m) => enabledMethods[m.value] && (m.value !== "COD" || totals.isCodAvailable),
  );
  // When only one method is offered (cash on delivery at launch), it is already chosen.
  const selected =
    available.find((m) => m.value === method) ?? (available.length === 1 ? available[0] : undefined);
  // The form also opens by itself when the last saved address was deleted elsewhere.
  const showAddressForm = addingAddress || (addresses.length === 0 && !addressId);
  const hint = placeOrderHint({
    showAddressForm,
    hasSavedAddresses: addresses.length > 0,
    addressId,
    hasMethod: selected !== undefined,
  });

  // Bring a new error into view and move focus to it, so "Place order" never seems to do nothing.
  useEffect(() => {
    if (!formError) return;
    const alert = [topErrorRef.current, bottomErrorRef.current].find(
      (el) => el !== null && el.getClientRects().length > 0,
    );
    alert?.scrollIntoView({ block: "center" });
    alert?.focus({ preventScroll: true });
  }, [formError]);

  useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    const element =
      target.to === "heading"
        ? addressHeadingRef.current
        : target.to === "add"
          ? addAddressRef.current
          : addressRefs.current.get(target.id);
    // A new address arrives with the refreshed list: try again on the next render.
    if (!element) return;
    focusTarget.current = null;
    element.focus({ preventScroll: target.to === "heading" });
    if (target.to === "heading") element.scrollIntoView({ block: "nearest" });
  }, [showAddressForm, addresses]);

  function showForm(show: boolean, focus: FocusTarget) {
    focusTarget.current = focus;
    setAddingAddress(show);
  }

  // The chosen address no longer exists: unselect it and reload the saved addresses.
  function dropDeletedAddress() {
    setAddressId(null);
    router.refresh();
  }

  function chooseAddress(id: string) {
    setAddressId(id);
    setFormError(null);
    startRefresh(async () => {
      const result = await previewCheckoutAction({ addressId: id });
      if (result.ok) {
        setTotals(result.data);
      } else if (result.error.code === "NOT_FOUND") {
        dropDeletedAddress();
        toast.error(ADDRESS_GONE);
      } else {
        toast.error(messageFor(result.error));
      }
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
        if (result.error.code === "NOT_FOUND") {
          dropDeletedAddress();
          return setFormError(ADDRESS_GONE);
        }
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
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[3fr_2fr]">
      <Stack gap={12}>
        {/* Below lg the full summary comes last, so a collapsed copy opens the page (patterns.md §8).
            AccordionItem's title is text only, hence formatPaisa rather than <Price>. It is an h2 like the
            sections after it. */}
        <Accordion type="single" collapsible className="lg:hidden">
          <AccordionItem
            value="summary"
            headingLevel={2}
            title={`Order summary · ${formatPaisa(addressId ? totals.totalPaisa : totals.subtotalPaisa)}`}
          >
            <Stack gap={4} className="pt-4 text-ink">
              <OrderSummaryLines items={cart.items} />
              <Separator />
              <OrderSummaryTotals totals={totals} hasAddress={addressId !== null} />
            </Stack>
          </AccordionItem>
        </Accordion>

        {formError && (
          <Alert ref={topErrorRef} variant="danger" tabIndex={-1} className="hidden lg:flex">
            {formError}
          </Alert>
        )}

        <section aria-labelledby="address-heading" className="flex flex-col gap-4">
          <h2
            id="address-heading"
            ref={addressHeadingRef}
            tabIndex={-1}
            className="font-display text-h3 focus:outline-none"
          >
            1. Delivery address
          </h2>
          {showAddressForm ? (
            <AddressForm
              submitLabel="Use this address"
              onSaved={(id) => {
                showForm(false, { to: "address", id });
                chooseAddress(id);
                router.refresh();
              }}
              onCancel={addresses.length > 0 ? () => showForm(false, { to: "add" }) : undefined}
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
                    ref={(element) => {
                      if (element) addressRefs.current.set(address.id, element);
                      else addressRefs.current.delete(address.id);
                    }}
                    value={address.id}
                    label={address.fullName}
                    description={`${address.street}, ${address.city}, ${address.district} · ${address.phone}`}
                  />
                ))}
              </RadioGroup>
              <Button
                ref={addAddressRef}
                variant="link"
                className="self-start"
                onClick={() => showForm(true, { to: "heading" })}
              >
                Add a new address
              </Button>
            </>
          )}
        </section>

        <section aria-labelledby="delivery-heading" className="flex flex-col gap-2">
          <h2 id="delivery-heading" className="font-display text-h3">
            2. Delivery
          </h2>
          <p className="text-body text-ink-muted">
            {addressId
              ? `Arrives in ${totals.deliveryEstimate}.`
              : "Choose an address to see the delivery time."}
          </p>
        </section>

        <section aria-labelledby="payment-heading" className="flex flex-col gap-4">
          <h2 id="payment-heading" className="font-display text-h3">
            3. Payment
          </h2>
          <FormField label="Payment method" required>
            <RadioGroup
              variant="card"
              value={selected?.value ?? ""}
              onValueChange={(value) => setMethod(value as Method)}
              className="grid-cols-1"
            >
              {available.map((m) => (
                <RadioGroupItem key={m.value} value={m.value} label={m.label} description={m.description} />
              ))}
            </RadioGroup>
          </FormField>
          {enabledMethods.COD && !totals.isCodAvailable && totals.codLimitPaisa !== null && (
            <p className="text-small text-ink-muted">
              Cash on delivery is available for orders up to <Price paisa={totals.codLimitPaisa} />.
            </p>
          )}
        </section>
      </Stack>

      <aside aria-labelledby="summary-heading" className="lg:sticky lg:top-24 lg:self-start">
        <Stack gap={4} className="rounded-md bg-surface p-6" aria-busy={isRefreshing || undefined}>
          {/* Below lg "Order summary" is the collapsible at the top and this card holds only the totals. */}
          <h2 id="summary-heading" className="font-display text-h3">
            <span className="lg:hidden">Order total</span>
            <span className="hidden lg:inline">Order summary</span>
          </h2>
          {/* Below lg the lines are in the summary at the top of the page. */}
          <div className="hidden flex-col gap-4 lg:flex">
            <OrderSummaryLines items={cart.items} />
            <Separator />
          </div>
          <OrderSummaryTotals totals={totals} hasAddress={addressId !== null} totalTestId="checkout-total" />
          {formError && (
            <Alert ref={bottomErrorRef} variant="danger" tabIndex={-1} className="lg:hidden">
              {formError}
            </Alert>
          )}
          <Button
            size="lg"
            shape="pill"
            className="w-full"
            loading={isPlacing || redirecting}
            disabled={hint !== null || isRefreshing}
            aria-describedby={hint ? "place-order-hint" : undefined}
            onClick={placeOrder}
            data-testid="place-order"
          >
            {selected?.cta ?? "Place order"}
          </Button>
          {hint && (
            <p id="place-order-hint" className="text-center text-small text-ink-muted">
              {hint}
            </p>
          )}
        </Stack>
      </aside>
    </div>
  );
}

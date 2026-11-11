"use client";

import {
  Accordion,
  AccordionItem,
  Alert,
  Button,
  FormField,
  Link,
  RadioGroup,
  RadioGroupItem,
  Stack,
  toast,
} from "@virzeen/ui";
import type { GuestDetailsInput } from "@virzeen/validators";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Price } from "@/client/components/shared/price";
import { AddressForm } from "@/client/features/account/address-form";
import type { AddressView } from "@/client/features/account/address-book";
import { useCart } from "@/client/features/cart/cart-provider";
import { messageFor } from "@/client/lib/error-messages";
import { placeGuestOrderAction, placeOrderAction, previewCheckoutAction } from "@/server/actions/checkout";
import type { CheckoutTotals } from "./checkout-types";
import { DiscountCodeField } from "./discount-code-field";
import { readStoredPromo, storePromo } from "./promo-storage";
import { EMPTY_GUEST_DETAILS, GuestDetailsForm } from "./guest-details-form";
import { OrderSummaryLines, OrderSummaryTotals } from "./order-summary-lines";
import { submitProviderForm } from "./submit-provider-form";

type Method = "COD" | "ESEWA" | "KHALTI";
type Step = "delivery" | "payment" | "review";
const STEP_ORDER: Step[] = ["delivery", "payment", "review"];

/** Where checkout goes once delivery is settled: Payment, or straight to Order Review when there's one method. */
const afterDelivery = (methodCount: number): Step => (methodCount === 1 ? "review" : "payment");
const countMethods = (enabled: Record<Method, boolean>, codAvailable: boolean) =>
  METHODS.filter((m) => enabled[m.value] && (m.value !== "COD" || codAvailable)).length;

type CheckoutFormProps = {
  /** Guests type their details; members pick a saved address. */
  mode: "guest" | "member";
  addresses: AddressView[];
  initialAddressId: string | null;
  initialTotals: CheckoutTotals;
  enabledMethods: { COD: boolean; ESEWA: boolean; KHALTI: boolean };
  /** A member's own email (shown on the review step). */
  memberEmail?: string;
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

/** A finished step collapses to a short summary with an Edit link; a step that isn't reached yet is greyed. */
function StepShell({
  id,
  title,
  state,
  summary,
  onEdit,
  children,
  headingRef,
}: {
  id: string;
  title: string;
  state: "open" | "done" | "waiting";
  summary?: React.ReactNode;
  onEdit?: () => void;
  children?: React.ReactNode;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      aria-disabled={state === "waiting" || undefined}
      className={`motion-safe:duration-fast flex flex-col gap-4 py-8 motion-safe:transition-opacity ${
        state === "waiting" ? "opacity-40" : ""
      }`}
      data-testid={`step-${id}`}
      data-state={state}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id={`${id}-heading`}
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-h3 focus:outline-none"
        >
          {title}
        </h2>
        {state === "done" && onEdit && (
          <Button variant="link" onClick={onEdit} aria-label={`Edit ${title.toLowerCase()}`}>
            Edit
          </Button>
        )}
      </div>
      {state === "done" && summary}
      {state === "open" && children}
    </section>
  );
}

function addressLine(a: { street: string; city: string; district: string; province: string }) {
  return `${a.street}, ${a.city}, ${a.district}, ${a.province}`;
}

/**
 * Checkout on one page (docs/checkoutfeatures.md §3.5, patterns.md §8): Delivery, Payment and Order review stack on
 * the left, each collapsing to a summary with an Edit link when done; the order summary stays on the right from `lg`
 * and is a bar at the top below it. Guests type their details; members pick a saved address.
 */
export function CheckoutForm({
  mode,
  addresses,
  initialAddressId,
  initialTotals,
  enabledMethods,
  memberEmail,
}: CheckoutFormProps) {
  const router = useRouter();
  const { cart } = useCart();
  const isGuest = mode === "guest";
  // A member with a saved address already chosen starts at Payment: nothing to confirm in Delivery Options.
  const [step, setStep] = useState<Step>(() =>
    !isGuest && initialAddressId && addresses.length > 0
      ? afterDelivery(countMethods(enabledMethods, initialTotals.isCodAvailable))
      : "delivery",
  );
  // The furthest step the customer has been to. Steps up to it stay enabled (with an Edit link) while another is
  // being edited, so going back never locks the later ones (owner 2026-11-11).
  const [reached, setReached] = useState<Step>(step);
  const [addressId, setAddressId] = useState(initialAddressId);
  const [addingAddress, setAddingAddress] = useState(addresses.length === 0);
  const [guestDetails, setGuestDetails] = useState<GuestDetailsInput | null>(null);
  const [totals, setTotals] = useState(initialTotals);
  const [method, setMethod] = useState<Method | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const [isApplying, setApplying] = useState(false);
  const [isPlacing, startPlacing] = useTransition();
  const [redirecting, setRedirecting] = useState(false);
  // The applied code is whatever the server last put in the totals.
  const discountCode = totals.discountCode;
  // A form error shows just above "Place order", at the end of the steps.
  const errorRef = useRef<HTMLDivElement>(null);
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
  /** Delivery is settled: Payment opens, or Order Review when only one method is offered (nothing to choose). */
  function toPayment() {
    // Back from an edit: a method is already chosen and the review was reached, so return straight to it.
    goTo(reached === "review" && selected ? "review" : afterDelivery(available.length));
  }
  function goTo(next: Step) {
    setStep(next);
    setReached((current) => (STEP_ORDER.indexOf(next) > STEP_ORDER.indexOf(current) ? next : current));
  }
  // The member form also opens by itself when the last saved address was deleted elsewhere.
  const showAddressForm = addingAddress || (addresses.length === 0 && !addressId);
  const chosenAddress = addresses.find((a) => a.id === addressId) ?? null;
  const itemCount = cart.items.filter((item) => item.isAvailable).reduce((n, item) => n + item.quantity, 0);

  // Bring a new error into view and move focus to it, so "Place order" never seems to do nothing.
  useEffect(() => {
    if (!formError) return;
    errorRef.current?.scrollIntoView({ block: "center" });
    errorRef.current?.focus({ preventScroll: true });
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
    setStep("delivery");
    router.refresh();
  }

  /** Who the server should price for: a member's saved address, or what a guest typed. */
  function whoFor(guest: GuestDetailsInput | null, id: string | null) {
    if (!isGuest) return { addressId: id };
    return guest ? { district: guest.district, email: guest.email } : {};
  }

  /** Totals without a discount code, after the server said the applied one no longer works. */
  async function refreshWithoutCode(guest: GuestDetailsInput | null, id: string | null) {
    storePromo(null);
    const result = await previewCheckoutAction(whoFor(guest, id));
    if (result.ok) setTotals(result.data);
  }

  function chooseAddress(id: string) {
    setAddressId(id);
    setFormError(null);
    startRefresh(async () => {
      const result = await previewCheckoutAction({
        addressId: id,
        ...(discountCode ? { discountCode } : {}),
      });
      if (result.ok) {
        setTotals(result.data);
      } else if (result.error.code === "NOT_FOUND") {
        dropDeletedAddress();
        toast.error(ADDRESS_GONE);
      } else if (result.error.fields?.discountCode) {
        toast.error(result.error.fields.discountCode);
        await refreshWithoutCode(null, id);
      } else {
        toast.error(messageFor(result.error));
      }
    });
  }

  /** Guest: keep what was typed, refresh the arrival date for the district, then open Payment. */
  function saveGuestDetails(values: GuestDetailsInput) {
    setFormError(null);
    startRefresh(async () => {
      const result = await previewCheckoutAction({
        ...whoFor(values, null),
        ...(discountCode ? { discountCode } : {}),
      });
      if (result.ok) {
        setTotals(result.data);
      } else if (result.error.fields?.discountCode) {
        toast.error(result.error.fields.discountCode);
        await refreshWithoutCode(values, null);
      } else {
        toast.error(messageFor(result.error));
        return;
      }
      setGuestDetails(values);
      toPayment();
    });
  }

  /** Resolves to the reason the code can't be used (shown under the field), or null once it's in the totals. */
  async function applyDiscount(code: string): Promise<string | null> {
    setFormError(null);
    setApplying(true);
    try {
      const result = await previewCheckoutAction({ ...whoFor(guestDetails, addressId), discountCode: code });
      if (result.ok) {
        setTotals(result.data);
        storePromo(result.data.discountCode);
        return null;
      }
      if (result.error.code === "NOT_FOUND") {
        dropDeletedAddress();
        return ADDRESS_GONE;
      }
      return result.error.fields?.discountCode ?? messageFor(result.error);
    } finally {
      setApplying(false);
    }
  }

  // A code entered on the bag page is applied as checkout opens; the server decides whether it still works.
  useEffect(() => {
    const stored = readStoredPromo();
    if (!stored || initialTotals.discountCode) return;
    void previewCheckoutAction({ ...whoFor(null, addressId), discountCode: stored }).then((result) => {
      if (result.ok) setTotals(result.data);
      else storePromo(null);
    });
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function removeDiscount() {
    setFormError(null);
    storePromo(null);
    startRefresh(async () => {
      const result = await previewCheckoutAction(whoFor(guestDetails, addressId));
      if (result.ok) setTotals(result.data);
      else toast.error(messageFor(result.error));
    });
  }

  function placeOrder() {
    if (!selected) return;
    if (isGuest ? !guestDetails : !addressId) return;
    setFormError(null);
    startPlacing(async () => {
      const code = discountCode ? { discountCode } : {};
      const result =
        isGuest && guestDetails
          ? await placeGuestOrderAction({ ...guestDetails, paymentMethod: selected.value, ...code })
          : await placeOrderAction({ addressId, paymentMethod: selected.value, ...code });
      if (!result.ok) {
        const notice = BAG_NOTICES[result.error.code];
        if (notice) return router.push(`/cart?notice=${notice}`);
        if (result.error.code === "NOT_FOUND") {
          dropDeletedAddress();
          return setFormError(ADDRESS_GONE);
        }
        // The code stopped working since it was applied: nothing was ordered. Take it off and say why.
        const discountRefusal = result.error.fields?.discountCode;
        if (discountRefusal) {
          await refreshWithoutCode(guestDetails, addressId);
          return setFormError(discountRefusal);
        }
        setFormError(messageFor(result.error));
        return;
      }
      const { orderNumber, next } = result.data;
      setRedirecting(true);
      storePromo(null);
      if (next.type === "done") router.push(`/checkout/success?order=${orderNumber}`);
      else if (next.type === "redirect") window.location.assign(next.url);
      else submitProviderForm(next.action, next.fields);
    });
  }

  const isBusy = isRefreshing || isApplying;
  const deliveryDone = step !== "delivery";

  const summaryBody = (testId?: string) => (
    <>
      <OrderSummaryTotals totals={totals} {...(testId ? { totalTestId: testId } : {})} />
      <OrderSummaryLines items={cart.items} arrives={totals.arrivesBy} />
      <Link href="/cart" className="self-start underline underline-offset-4">
        Edit bag
      </Link>
    </>
  );

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
      <div className="flex flex-col">
        {/* Below lg the summary opens the page, collapsed. AccordionItem's title is text only, hence formatPaisa
            rather than <Price>. It is an h2 like the steps after it. */}
        <Accordion type="single" collapsible className="lg:hidden">
          <AccordionItem
            value="summary"
            headingLevel={2}
            title={
              <>
                In your bag ({itemCount}) · <Price paisa={totals.totalPaisa} />
              </>
            }
          >
            <Stack gap={6} className="pt-2 text-ink">
              {summaryBody()}
            </Stack>
          </AccordionItem>
        </Accordion>

        <div className="flex flex-col divide-y divide-line">
          {/* 1. Delivery */}
          <StepShell
            id="address"
            title="Delivery Options"
            state={deliveryDone ? "done" : "open"}
            headingRef={addressHeadingRef}
            onEdit={() => {
              setStep("delivery");
              setFormError(null);
            }}
            summary={
              isGuest && guestDetails ? (
                <div className="text-body text-ink-muted" data-testid="delivery-summary">
                  <p className="text-ink">
                    {guestDetails.firstName} {guestDetails.lastName}
                  </p>
                  <p>
                    {addressLine({
                      street: `Ward ${guestDetails.ward}, ${guestDetails.street}`,
                      city: guestDetails.municipality,
                      district: guestDetails.district,
                      province: guestDetails.province,
                    })}
                  </p>
                  <p>
                    {guestDetails.email} · +977 {guestDetails.phone}
                  </p>
                </div>
              ) : chosenAddress ? (
                <div className="text-body text-ink-muted" data-testid="delivery-summary">
                  <p className="text-ink">{chosenAddress.fullName}</p>
                  <p>{addressLine(chosenAddress)}</p>
                  <p>
                    {memberEmail ? `${memberEmail} · ` : ""}+977 {chosenAddress.phone}
                  </p>
                </div>
              ) : null
            }
          >
            {isGuest ? (
              <GuestDetailsForm
                defaultValues={guestDetails ?? EMPTY_GUEST_DETAILS}
                onSave={saveGuestDetails}
                isSaving={isRefreshing}
              />
            ) : showAddressForm ? (
              <AddressForm
                submitLabel="Use this address"
                onSaved={(id) => {
                  showForm(false, { to: "address", id });
                  chooseAddress(id);
                  toPayment();
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
                  onValueChange={(id) => {
                    // Picking an address is the decision: Payment opens at once (owner 2026-11-11).
                    chooseAddress(id);
                    toPayment();
                  }}
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
                      // Picking the address that is already chosen (after an Edit) moves on too.
                      onClick={() => addressId === address.id && toPayment()}
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
          </StepShell>

          {/* 2. Payment */}
          <StepShell
            id="payment"
            title="Payment"
            state={step === "payment" ? "open" : reached !== "delivery" && selected ? "done" : "waiting"}
            onEdit={() => setStep("payment")}
            summary={
              <p className="text-body text-ink-muted" data-testid="payment-summary">
                {selected?.label}
                {discountCode ? ` · ${discountCode} applied` : ""}
              </p>
            }
          >
            <FormField label="Payment method" required>
              <RadioGroup
                variant="card"
                value={selected?.value ?? ""}
                onValueChange={(value) => {
                  // Choosing a method is the decision: Order Review opens at once (owner 2026-11-11).
                  setMethod(value as Method);
                  goTo("review");
                }}
                className="grid-cols-1"
              >
                {available.map((m) => (
                  <RadioGroupItem
                    key={m.value}
                    value={m.value}
                    label={m.label}
                    description={m.description}
                    // Picking the method that is already chosen (after an Edit) moves on too.
                    onClick={() => selected?.value === m.value && goTo("review")}
                  />
                ))}
              </RadioGroup>
            </FormField>
            {enabledMethods.COD && !totals.isCodAvailable && totals.codLimitPaisa !== null && (
              <p className="text-small text-ink-muted">
                Cash on delivery is available for orders up to <Price paisa={totals.codLimitPaisa} />.
              </p>
            )}
            {/* A code already added in the bag shows in the totals instead of a field here. */}
            {!discountCode && (
              <DiscountCodeField
                applied={discountCode}
                onApply={applyDiscount}
                onRemove={removeDiscount}
                disabled={isRefreshing || isPlacing}
              />
            )}
          </StepShell>

          {/* 3. Order review */}
          <StepShell
            id="review"
            title="Order Review"
            state={step === "review" ? "open" : reached === "review" ? "done" : "waiting"}
            onEdit={() => setStep("review")}
            summary={
              <p className="text-body text-ink-muted" data-testid="review-summary">
                Total <Price paisa={totals.totalPaisa} />
              </p>
            }
          >
            <dl className="flex flex-col gap-3 text-body">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Items</dt>
                <dd>{itemCount}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Arrives by</dt>
                <dd>{totals.arrivesBy}</dd>
              </div>
              {totals.discountPaisa > 0 && (
                <div className="flex justify-between gap-4" data-testid="review-discount">
                  <dt className="text-ink-muted">Promo code discount</dt>
                  <dd>
                    −<Price paisa={totals.discountPaisa} />
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">Total</dt>
                <dd className="font-medium">
                  <Price paisa={totals.totalPaisa} />
                </dd>
              </div>
            </dl>
            {formError && (
              <Alert ref={errorRef} variant="danger" tabIndex={-1}>
                {formError}
              </Alert>
            )}
            <Button
              size="lg"
              shape="pill"
              className="w-full"
              loading={isPlacing || redirecting}
              disabled={!selected || isBusy}
              onClick={placeOrder}
              data-testid="place-order"
            >
              {selected?.cta ?? "Place order"}
            </Button>
            <p className="text-center text-small text-ink-muted">You will receive a confirmation by email.</p>
          </StepShell>
        </div>
      </div>

      <aside
        aria-labelledby="summary-heading"
        aria-busy={isBusy || undefined}
        className="hidden flex-col gap-6 lg:sticky lg:top-24 lg:flex lg:self-start"
      >
        <h2 id="summary-heading" className="font-display text-h3">
          In Your Bag
        </h2>
        {summaryBody("checkout-total")}
      </aside>
    </div>
  );
}

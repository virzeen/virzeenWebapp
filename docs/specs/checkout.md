# Spec: Checkout (COD, eSewa, Khalti)

**Status:** Draft
**Owner approval:** —
**Related docs:** payments/payment-policy.md (all), security/security-policy.md §2–3, §6

## Goal

A signed-in customer in Nepal can buy the items in their bag and pay with Cash on Delivery, eSewa, or Khalti, and always sees an honest, server-calculated total.

## User flow

1. Customer opens `/checkout` from the cart (must be signed in; guests are sent to login, then back, with cart merged).
2. Chooses or adds a delivery address.
3. Sees the order summary: items, subtotal, shipping (by zone), total. VAT included note.
4. Chooses COD, eSewa, or Khalti and presses "Place order".
5. COD → confirmation page. eSewa/Khalti → provider page → back to `/checkout/success` or `/checkout/failed`.

## Acceptance criteria

- [ ] Given an empty cart, when opening `/checkout`, then redirect to `/cart` with an empty-state message.
- [ ] Given a guest, when opening `/checkout`, then redirect to login and return to `/checkout` after login with the merged cart.
- [ ] Totals shown are computed by `calculateTotals` on the server; the client never sends a price.
- [ ] Given a price or stock change since the item was added, when placing the order, then show `PRICE_CHANGED`/`OUT_OF_STOCK` with the refreshed cart and no order is created.
- [ ] Placing an order decrements stock atomically and creates order + items + payment row in one transaction.
- [ ] COD: order `CONFIRMED`, payment `COD_DUE`, confirmation email sent once, cart cleared.
- [ ] COD is hidden when the total exceeds the COD limit.
- [ ] eSewa: signed form built server-side; success only after signature check + status API `COMPLETE` + amount match.
- [ ] Khalti: initiated server-side; success only after lookup `Completed` + amount match.
- [ ] Failed/cancelled payment: order `CANCELLED`, stock restored, customer sees `/checkout/failed` with "Try again" (creates a new attempt).
- [ ] Refreshing the success page or a duplicate callback never double-processes.
- [ ] Pending payments are resolved by reconciliation within 10 minutes.
- [ ] "Place order" is disabled while submitting; double-clicks create one order.
- [ ] Given only one payment method is offered (cash on delivery at launch), when opening `/checkout`, then it is already chosen and "Place order" only needs an address.
- [ ] Given the customer has a default address, when opening `/checkout`, then it is already chosen and shipping, total and "Arrives in {estimate}." show for it.
- [ ] Given no address or no method is chosen, then "Place order" is disabled and the reason shows under it ("Add a delivery address to continue.", "Save the new address to continue.", "Choose a delivery address to continue.", "Choose a payment method to continue.").
- [ ] Given placing the order fails with a message for the form, then it shows in a danger `Alert` at the top of the form from `lg` and just above "Place order" below `lg`, scrolled into view and focused.
- [ ] Given the chosen address was deleted elsewhere (another tab), when choosing it or placing the order, then it is unselected, the saved addresses reload, "That address is no longer saved. Choose another address or add a new one." shows (a toast on choosing, the form `Alert` on placing) and no order is created.
- [ ] Below `lg`, the page opens with a collapsed "Order summary · {total}" (an h2); the card by "Place order" holds only the totals and is headed "Order total".

### Addresses (checkout and account)

- [ ] The first saved address becomes the default. Up to 10 addresses can be saved ("You can save up to 10 addresses. Remove one to add another.").
- [ ] The default only moves: saving another address with "Make this my default address" makes it the default. Saving the default without that box never unsets it, and its form shows "This is your default address" instead of the box.
- [ ] Removing the default makes the oldest remaining address the default.
- [ ] Given a failed save, the first field with an error (in screen order, Selects included) is focused; an error with no field shows in the form's `Alert`.
- [ ] The mobile number accepts spaces, brackets, hyphens and a +977 / 00977 prefix, and is stored as 10 digits.

## Out of scope (phase 1)

Coupons, gift cards, saved payment methods, international addresses, split shipments.

## UI

- Screens: `/checkout`, `/checkout/success`, `/checkout/failed`
- Feature components: `CheckoutForm` (address and payment `RadioGroup`s, hints, errors), `AddressForm`, `OrderSummaryLines`, `OrderSummaryTotals`
- Primitives: RadioGroup, Button, Input, Select, Alert, Accordion, Skeleton, Toast
- Loading: `checkout/loading.tsx` (sections, then the summary card)
- Copy: "Place order", "Continue to eSewa", "Continue to Khalti", "Payment didn't go through. Your bag is saved — try again or choose another method.", and the Checkout and Addresses tables in `docs/ui/content-style.md`
- Layout and focus: `docs/ui/patterns.md` §8

## Data & API

- Models: Order, OrderItem, Payment, OrderEvent, ProductVariant, Cart
- Validators: `checkoutSchema { addressId, paymentMethod }`, `addressSchema`
- Core: `checkoutService.placeOrder`, `payments/esewa.ts`, `payments/khalti.ts`, `payments/cod.ts`, `orders/order-state.ts`, `payments/reconcile.ts`
- API: `POST /api/v1/checkout` (see api-contract.md)

## Edge cases

- Customer closes the tab on the provider page → reconciliation resolves.
- Provider down → show error, order stays PENDING until reservation expires.
- Two tabs placing orders from the same cart → second fails with `CART_EMPTY` or `OUT_OF_STOCK`.

## Tests

- Unit: totals, COD limit, each state transition, eSewa signature (valid/invalid), Khalti lookup statuses, amount mismatch, duplicate callback, expiry restore.
- E2E: journeys 3, 4, 5 in testing-strategy.md.

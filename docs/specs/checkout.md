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

## Out of scope (phase 1)

Coupons, gift cards, saved payment methods, international addresses, split shipments.

## UI

- Screens: `/checkout`, `/checkout/success`, `/checkout/failed`
- Feature components: `AddressPicker`, `AddressForm`, `OrderSummary`, `PaymentPicker`
- Primitives: RadioGroup, Button, Input, Select, Alert, Skeleton, Toast
- Copy: "Place order", "Continue to eSewa", "Continue to Khalti", "Payment didn't go through. Your bag is saved — try again or choose another method."

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

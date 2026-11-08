# Spec: Discount codes

**Status:** Approved
**Owner approval:** owner, 2026-11-09 ("go" on the plan sent 2026-11-08: admin "Discounts" page, percentage or fixed Rs, optional minimum / end date / total uses / once per customer / on-off, one code per order, server-calculated, rounded down to whole rupees, never below Rs 0, snapshotted on the order, use returned on cancel or refusal, limited attempts). The details marked _default_ below were filled in from that plan and the payment policy; the owner reviews them in the PR.
**Related docs:** payments/payment-policy.md §1, §2, §5, §6, §10; security/security-policy.md §3, §6; database/data-rules.md; ui/content-style.md "Checkout", "Admin"

## Goal

The owners create codes such as `WELCOME10` or an Instagram campaign code, and a signed-in customer types one at checkout to get money off. The discount is worked out on the server only, kept on the order, and can't be guessed by trying codes.

## User flow

1. Admin opens `/admin/discounts`, fills "Add a discount code" and saves. The code appears in the list with its uses.
2. Customer at `/checkout` opens "Add a discount code", types the code and presses Apply.
3. The server checks the code against the bag and answers with new totals. The summary shows "Discount (WELCOME10)" and "−Rs 450"; the total drops. Remove takes it off.
4. Place order: the server checks the code again and saves the order with the code and the discount. If the code stopped working in between, nothing is ordered and the reason shows.
5. If the order is later cancelled (by the customer, an admin, a failed or expired payment) or refused at the door, the code gets that use back.

## Acceptance criteria

### Codes (admin)

- [ ] `/admin/discounts` (admins with a fresh authenticator check only, like every admin page) lists every code, newest first: the code, what it takes off ("10% off" / "Rs 500 off"), its conditions (minimum order, end date, once per customer), uses ("3 used" or "3 of 100 used") and a status badge: Active, Off, Ended or Used up.
- [ ] "Add a discount code" saves: Code (3–24 characters, letters, numbers and hyphens; stored upper-case, so customers can type any case), Type (Percentage or Fixed amount), Percentage off (1–100) or Amount off (whole rupees, at least Rs 1), and optional Minimum order (whole rupees), Ends on (a date), Total uses (1 or more), Once per customer (switch, off by default) and Active (switch, on by default).
- [ ] A code that already exists (in any case) is refused under the Code field: "This code is already used".
- [ ] Edit changes the limits (minimum order, end date, total uses, once per customer) and Active. The code and what it takes off (type and amount) are fixed once made, shown read-only with "Fixed once the code is made. To change it, switch this code off and make a new one." (security review 2026-11-09: an applied code can never change the total before Place order). Codes are never deleted; switching Active off stops them working.
- [ ] Every create and edit writes an `AuditLog` row (`discount.create`, `discount.update`) in the same transaction.
- [ ] "Ends on" means the code works until the end of that day in Nepal time (_default_).

### Discount amount (core, payment-policy.md §2)

- [ ] Percentage: `floor(subtotal × percent / 100)` rounded **down** to whole rupees. Fixed: the amount. Either way the discount is at most the subtotal, so the total never goes below Rs 0.
- [ ] Total = subtotal − discount + shipping (shipping is Rs 0 today). The VAT line is worked out from that total.
- [ ] The minimum order is compared with the bag subtotal before the discount.
- [ ] One code per order.

### Checkout

- [ ] "Add a discount code" sits in the Payment step, above "Place order". It opens a Code field and an Apply button; Apply shows its pending state and the summary is marked busy while the totals refresh.
- [ ] A working code shows "{CODE} applied" with Remove, and the summary (both the collapsed one below `lg` and the side one) shows "Discount ({CODE})" with "−{Rs X}" between Shipping and Total. All three amounts come from the server.
- [ ] A code that doesn't work shows its reason under the field and changes nothing: not found or switched off "This code isn't valid."; ended "This code has ended."; out of uses "This code has been fully used."; under the minimum "Spend {Rs X} or more to use this code."; once per customer and already used on an order that isn't cancelled "You've already used this code." An empty field: "Enter a discount code".
- [ ] Place order sends the applied code; the server checks it again inside the order transaction. If it no longer works, no order is created, the code is taken off, the totals refresh and the reason shows in the form's danger `Alert` above "Place order" (_default_, as `PRICE_CHANGED` does for prices: never charge a different amount silently).
- [ ] The order stores `discountCodeId`, `discountCode` (the text) and `discountPaisa`; `totalPaisa` already has the discount taken off. Later edits to the code never change a placed order.
- [ ] Uses are counted when the order is placed, with a conditional update, so the last use can't be taken twice (concurrency test). Once per customer counts the customer's orders with that code that aren't cancelled.
- [ ] Every cancellation (customer, admin, refused at the door, failed or expired payment, payment that couldn't start) gives the use back in the same transaction (`cancelOrderAndRestock`). A returned order keeps its use (_default_: the code was used).
- [ ] Trying codes is limited: 10 checks per 10 minutes per customer and 30 per 10 minutes per IP address (`discount:user`, `discount:ip`; security-policy.md §6). Applying, refreshing the summary with a code and placing an order with a code each count as a check.

### Where the discount shows

- [ ] The order page (customer and admin), the order confirmation email and `GET /api/v1/orders/{orderNumber}` show the discount line with its code.
- [ ] `POST /api/v1/checkout` accepts an optional `discountCode` (api-contract.md).

### Online payments (switched off until about March 2027)

- [ ] eSewa's `amount` is the subtotal minus the discount, so `amount + product_delivery_charge = total_amount` still holds; Khalti's "Items" line is the subtotal minus the discount, so the breakdown still adds up to `amount`. Conversions stay inside each adapter.
- [ ] An order with a Rs 0 total can only use cash on delivery: "Choose cash on delivery for this order" under Payment.
- [ ] Verification still compares the provider's amount with `order.totalPaisa` (the discounted total), unchanged.

## Out of scope

- Several codes on one order, automatic discounts without a code, codes for one product or category, free-shipping codes (shipping is free already), start dates, gift cards.
- Codes for guests: checkout already needs a signed-in customer.
- Sale prices on products.

## UI

- Screens: `/checkout` (Payment step and both summaries), `/admin/discounts` (new, in the admin menu after Reviews), order pages and the order email.
- Feature components: `DiscountCodeField` (checkout), `OrderSummaryTotals` (discount line), `OrderDetail` (discount line), `DiscountManager` + `DiscountForm` (admin, the same inline form-above-the-list layout as Categories and Collections).
- Primitives (existing): Button, Input, FormField, RadioGroup, Switch, Badge, Alert, EmptyState, Stack, toast. No new primitive.
- States: admin list empty "No discount codes yet." + "Make one for a launch, a campaign or a first order."; saved toast "Discount code saved"; the checkout field's pending, error and applied states above.

## Data & API

- Models: new `DiscountCode` (+ enum `DiscountKind`); `Order` gains `discountCodeId?` (Restrict), `discountCode?`, `discountPaisa` (default 0).
- Validators: `discountCodeSchema` (admin form), `discountCodeInputSchema` (the customer's code), `checkoutSchema` gains optional `discountCode`, a preview schema gains it too.
- Core: `pricing/discounts.ts` (pure: normalise a code, amount off, eligibility reason), `discounts/discount.service.ts` (admin save/list, check for a bag, claim and release a use), `calculateTotals` takes an optional discount, `checkoutService.preview/placeOrder` take an optional code, `cancelOrderAndRestock` releases the use.
- Server: `previewCheckoutAction` takes an optional code; `placeOrderAction` and `POST /api/v1/checkout` pass it; admin `saveDiscountCodeAction`.
- `/api/v1`: `POST /checkout` optional `discountCode`; `GET /orders/{orderNumber}` adds `discountCode` and `discountPaisa`.

## Edge cases

- Two customers race for the last use: one order gets it, the other sees "This code has been fully used." and no order.
- The same customer places two orders at once with a once-per-customer code: the order transaction empties the bag first, by the lines it read, so the second fails with `CART_EMPTY` before it touches stock or the code (concurrency test).
- A code switched off, ended or limited between Apply and Place order: the re-check at placement decides, and a refusal orders nothing. Its amount can't change, so an accepted code always charges the total the summary showed.
- A cancelled order whose code has since been switched off still gives its use back (the count stays right if it's switched on again).
- 100% or a fixed amount above the subtotal: total Rs 0, cash on delivery only.

## Tests

- Unit: amount off (percent rounding down, fixed, capped at the subtotal), code normalising, eligibility reasons, totals with a discount, eSewa form and Khalti breakdown with a discount, validators.
- Integration (test database): preview with each reason; placing an order snapshots the code and counts a use; once per customer; the last use under concurrency; re-check at placement; each cancellation path gives the use back; admin save with audit and duplicate code; an online order verifies against the discounted total.
- E2E: checkout journey applies a code, sees the discount line, places a cash-on-delivery order and sees the discount on the confirmation.

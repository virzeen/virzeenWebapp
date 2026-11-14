# Spec: Checkout v2, Week 1 (choice panel, guest checkout, delivery step, tier pricing)

**Status:** Built (Week 1), branch `feat/checkout-v2`; owner reviews the PR before merge (payment change)
**Owner approval:** owner, 2026-11-11 in chat ("go": threshold after discount = yes; arrival "same day in the valley, 2–4 days elsewhere" = yes). The member panel is a black "membership pass" card (owner request, same day).
**Related docs:** `docs/checkoutfeatures.md` (the full 4-week design), `payments/payment-policy.md` §2, §7, `security/security-policy.md`, `specs/checkout.md`

## Owner decisions (2026-11-11)

1. **Delivery fees replace "shipping folded into price".** Guest Rs. 200 (free from Rs. 9,999; raised from 4,000 by the owner on 2026-11-11); Member Rs. 150 (free from Rs. 3,000). This overrides the 2026-09-28 money rule: payment-policy §2 and `shipping-rates.ts` change, and customers stop seeing "Free shipping". `Product.shippingPaisa` stops being added to prices (the live site has no products yet).
2. **Monochrome Pass: built, switched off** until online payment is live (flag next to `features.esewa`). Week 3 work.
3. **Scope: Week 1 only.** Weeks 2–4 get their own approval.
4. **Existing rules stay:** no focus rings, email confirmations only (no SMS/WhatsApp wording), routes adapted to the current `/cart` and `/checkout`.

## Goal

A visitor can check out as a guest with no account (name, email, phone, address), see delivery fee and arrival date from the first screen, and pay cash on delivery. Signed-in customers keep their saved-address checkout and get the member delivery rate.

## Week 1 acceptance criteria

- [ ] `/checkout` for a signed-out visitor with items shows the choice panel (Member: "Log in / Sign up" → existing `/login?next=/checkout`; Guest: "Guest Checkout"). Signed-in customers never see it. An empty bag redirects to `/cart?notice=empty`.
- [ ] Guest Checkout opens the delivery step with Email, First/Last name, address (province, district, municipality, ward, tole/street, landmark), phone (10 digits, starts 97 or 98), optional delivery notes. Fields keep their values on error.
- [ ] A guest can place a COD order. The order stores `userId = null`, the guest's email, the address snapshot, `tier = GUEST`, and the notes.
- [ ] Delivery fee is computed on the server only: guest 20000 paisa, free when the subtotal (after discount) is Rs. 9,999 or more; member 15000 paisa, free from Rs. 3,000. The fee and total in the summary update when the bag changes.
- [ ] Summary panel ("In Your Bag"): subtotal, delivery, discount (when a code is applied), total, "Arrives by {date range}", items with image, name, colour, size, quantity, Edit link to `/cart`. On phones it is a top bar "In your bag (n) · Rs. X" that opens the panel.
- [ ] Bag page: free-delivery hint ("Add Rs. X more for free delivery.", hidden when free), member-saving line ("MONO Members save Rs. X on this order.", hidden when X is 0), "Arrives by" line, sticky Checkout button on phones. Stock hold timer is Week 4.
- [ ] Guest typing an email that already has an account sees "You have a MONO account. Log in to get member prices." and can continue as guest.
- [ ] A guest's confirmation page (`/checkout/success`) opens only with a signed, expiring token cookie set at order time; nobody can read a guest order by guessing its number. The order email (sent to the guest) links to nothing private.
- [ ] Guest orders are rate-limited per IP and per email; placing twice from one bag creates one order (existing `CART_EMPTY` guard).
- [ ] Signed-in customers: pre-filled name and email (locked), saved addresses selectable, member rate applies.
- [ ] Cash on delivery is the only method offered while `features.esewa` and `features.khalti` are off.
- [ ] eSewa and Khalti `amount_breakdown` / `product_delivery_charge` use the new delivery fee (adapters unchanged otherwise).

## Out of scope (later weeks)

Email-first identify, code/password login inside checkout, account creation in checkout, bag merge UX, saved-address cards beyond today's (Week 2). Pass offer, password option, confirmation guest-to-member profile claim (Week 3). Stock hold timer, email typo help, analytics events, breakage line (Week 4). Pick Up toggle, location pin, address search box.

## Data & API

- **Migration (additive plus one relaxation):** `Order.userId` nullable (FK `onDelete: Restrict` kept); `Order.tier` enum `GUEST | MEMBER`; `Order.deliveryNotes String?`; `Order.guestAccessHash String?` is NOT needed (token is a signed cookie).
- `Address` model unchanged for members; guests have only the order's `addressSnapshot` (adds `municipality`, `ward`, `notes`).
- Validators (`@virzeen/validators`): `guestCheckoutSchema { email, firstName, lastName, address{...}, phone, notes?, paymentMethod, discountCode? }` (`.strict()`); phone rule 97/98 + 8 digits.
- Core: `pricing/shipping-rates.ts` → tier fees and thresholds; `calculateTotals(lines, {tier}, discount)`; `checkoutService.placeOrder` accepts a guest; `checkoutService.preview` works without an address and for guests; new `deliveryDateRange`.
- Server: `placeOrderAction` / `previewCheckoutAction` accept guests (authenticate = optional, rate-limit by IP + email); signed guest-order cookie.
- `/api/v1/checkout` follows the member path only; update `api-contract.md` if the response gains `deliveryFeePaisa`/`tier`.

## Edge cases

Bag changes during checkout (PRICE_CHANGED / OUT_OF_STOCK as today); fee threshold crossed after a discount code (threshold uses subtotal minus discount, owner to confirm); member signs in mid-checkout (bag merges, panel switches to member rate); guest email already registered (soft banner).

## Tests

Unit: fee/threshold table (both tiers, exactly at and 1 paisa below threshold), delivery date range. Integration: guest order creates with null user, tier GUEST, correct total; double submit; discount + free-delivery threshold; cancellation restores stock. Web unit: phone and form validation. E2E: guest COD order end to end; member order; confirmation page denies a guest order without the token. Docs updated: payment-policy §2/§7, glossary, content-style (new copy), STATUS.

## Open questions

1. Free-delivery threshold: measured on subtotal before or after a discount code? (Proposed: after.)
2. Arrival dates: same day inside the Kathmandu Valley, 2 to 4 days elsewhere (from the design), on top of dispatch (guest 48 h, member 24 h). This replaces today's "1–3 / 3–7 days". OK?

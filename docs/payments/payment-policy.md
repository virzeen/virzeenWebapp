# Payment Policy

This is the most important doc in the repo. Mistakes here lose real money or wrongly ship unpaid goods.
**Agents: do not change behavior described here without the owner's explicit approval.**

## 1. Principles

1. The server decides the amount. It comes from `order.totalPaisa`, computed by `pricing/calculate-totals.ts` at order creation.
2. The provider's redirect is a hint, never proof. Proof is a server-to-server verification call.
3. Verified amount must equal `order.totalPaisa` exactly, else → `PAYMENT_AMOUNT_MISMATCH`, order stays unpaid, alert the owner.
4. Every state change is idempotent and goes through `orders/order-state.ts`.
5. When in doubt, leave the order `PENDING` and let reconciliation or a human resolve it. Never guess "paid".

## 2. Prices, VAT, shipping

- Product prices are **VAT-inclusive** (13%) as displayed. The invoice shows the VAT portion: `vat = round(total × 13 / 113)`.
- Shipping (owner decision 2026-09-28): each product has a shipping price (`Product.shippingPaisa`, set in admin) that is **included in every variant's `pricePaisa`**. Customers see one price and "Free shipping"; checkout adds nothing (`pricing/shipping-rates.ts` zone rates are 0). Zones still set the delivery-time promise.
- If a price or stock changed between cart and checkout, checkout fails with `PRICE_CHANGED`/`OUT_OF_STOCK` and the cart is refreshed. Never silently charge a different amount.

## 3. Order and payment state machine

Allowed transitions only (everything else throws `INVALID_STATE_TRANSITION`):

| Order status              | → allowed next | Trigger                                        |
| ------------------------- | -------------- | ---------------------------------------------- |
| `PENDING`                 | `CONFIRMED`    | verified payment, or COD placed                |
| `PENDING`                 | `CANCELLED`    | payment failed/expired, customer cancel, admin |
| `CONFIRMED`               | `PROCESSING`   | admin starts packing                           |
| `CONFIRMED`, `PROCESSING` | `CANCELLED`    | admin (triggers refund if paid online)         |
| `PROCESSING`              | `SHIPPED`      | admin adds courier + tracking                  |
| `SHIPPED`                 | `DELIVERED`    | courier/admin                                  |
| `DELIVERED`               | `RETURNED`     | admin approves a return                        |

| Payment status | → allowed next                              |
| -------------- | ------------------------------------------- |
| `UNPAID`       | `PENDING` (online), `COD_DUE` (COD)         |
| `PENDING`      | `PAID`, `FAILED`, `EXPIRED`                 |
| `PAID`         | `REFUNDED`, `PARTIALLY_REFUNDED`            |
| `COD_DUE`      | `COD_COLLECTED`, `FAILED` (refused at door) |

Every transition writes an `OrderEvent` (from, to, actor, reason).

## 4. Stock reservation

- On order creation, stock is decremented in the same transaction (conditional update).
- Online-payment orders set `reservedUntil = now + 60 min`.
- If payment ends `FAILED`/`EXPIRED`, or reconciliation finds no payment after `reservedUntil`, the order is `CANCELLED` and stock is restored in one transaction.
- COD orders keep stock reserved; admin cancellation restores it.

## 5. eSewa (ePay v2)

Flow:

1. Checkout creates the order (`PENDING`) and a `Payment` row with `providerRef = transaction_uuid` (format `VZ-<orderNumber>-<attempt>`, alphanumeric and hyphens only).
2. Server builds the form fields and signs `total_amount,transaction_uuid,product_code` with HMAC-SHA256 (secret `ESEWA_SECRET_KEY`), base64-encoded. The client only auto-submits the prepared form.
3. `total_amount` is rupees with two decimals (`(totalPaisa / 100).toFixed(2)`). Conversion happens only in `payments/esewa.ts`.
4. eSewa redirects to `/api/payments/esewa/success?data=<base64 JSON>` or `/failure`.
5. Success handler: decode `data` → recompute the signature over `signed_field_names` and compare with a timing-safe comparison → reject if invalid.
6. Then call the eSewa **status check API** with `product_code`, `total_amount`, `transaction_uuid`. Only `status: "COMPLETE"` with matching amount → mark PAID.
7. Store `ref_id`/`transaction_code` and the raw response on the `Payment`.

## 6. Khalti (KPG-2 web checkout)

Flow:

1. Checkout creates the order and calls `POST /api/v2/epayment/initiate/` server-side with `amount` in **paisa**, `purchase_order_id = orderNumber`, `return_url`, `website_url`, customer info. Header `Authorization: Key <KHALTI_SECRET_KEY>`.
2. Store the returned `pidx` as `providerRef`; redirect the customer to `payment_url`. The link expires (60 min by default).
3. Khalti redirects to `/api/payments/khalti/callback?pidx=...&status=...`. Treat every query param as untrusted.
4. Call `POST /api/v2/epayment/lookup/` with the `pidx`. Only `status: "Completed"` with `total_amount === order.totalPaisa` → PAID.
5. `Pending`/`Initiated` → leave `PENDING` (reconciliation re-checks). `User canceled`/`Expired` → `FAILED`/`EXPIRED` + restore stock. `Refunded`/`Partially Refunded` → mirror status, alert owner.
6. Khalti has no checkout webhook, so reconciliation (§8) is mandatory.

## 7. Cash on Delivery

- Available within Nepal only. Max order total in `pricing/cod-rules.ts`: **no limit** (owner decision 2026-09-28, while COD is the only payment method).
- Launch is **COD only**; eSewa and Khalti stay built but switched off (no keys) until the owner turns them on, planned about one month after launch.
- Placing a COD order: order `CONFIRMED`, payment `COD_DUE`, confirmation email/SMS.
- On delivery, admin marks `COD_COLLECTED`. Refused at door → `FAILED`, order `CANCELLED`, stock restored.

## 8. Reconciliation (cron every 10 minutes)

- Finds payments in `PENDING` older than 5 minutes and re-verifies them with the provider (eSewa status API / Khalti lookup).
- Applies the same rules as the callback handlers (shared code path — never a second implementation).
- Cancels orders whose `reservedUntil` passed with no successful payment.
- Payments still ambiguous after 24 hours are flagged to the owner (email), never auto-resolved.

## 9. Idempotency and replay

- `Payment.providerRef` is unique. A second callback for the same ref re-verifies but cannot double-apply.
- Marking PAID is a conditional update on `paymentStatus = PENDING`; if zero rows update, it's a duplicate → return success page without side effects.
- Confirmation emails are sent once, keyed by `OrderEvent` creation.

## 10. Refunds

- Phase 1: refunds are processed manually in the eSewa/Khalti merchant dashboards by the owner, then recorded in admin (`REFUNDED` + reason). No automated refund API calls in phase 1.
- Customer-facing refund/return rules live on the `/returns` page; keep it consistent with this section.

## 11. Security for payment code

- Secrets only from env. Sandbox keys in local/staging, live keys only in production.
- Callback routes: rate-limited, never cached, no auth required but no side effects without verification.
- Log `orderNumber`, provider, status, and `providerRef`. Never log the secret or full raw callback payload at info level.

## 12. Tests required for any change here

Success, failure, cancellation, amount mismatch, invalid signature (eSewa), duplicate callback, pending → reconciliation → paid, pending → expired → stock restored. Provider HTTP is always mocked.

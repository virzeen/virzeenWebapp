# Spec: 15 minutes to pay, with a reminder

**Status:** Built (branch `feat/payment-window`, 2026-11-10), waiting for the owner's PR review (payment change)
**Owner approval:** owner, 2026-11-09: "when the customer go for the payment and he didn't do the payment give him 15 minutes … and also need to add the reminder as well so that they will pay … there is the order confirmed but haven't paid". Details marked _default_ were filled in from that and payment-policy.md §1.5 ("when in doubt, leave it pending"); the owner reviews them in the PR.
**Related docs:** payments/payment-policy.md §3, §4, §5, §6, §8; specs/checkout.md; ui/content-style.md "Order and payment status"

Applies to eSewa and Khalti only. The live site is cash on delivery only until about March 2027, so customers see this once online payments are switched on.

## Goal

A customer who starts paying online but doesn't finish keeps their order (and its stock) for 15 minutes, can pay from the order page at any time in those 15 minutes, and gets one reminder email. Unpaid orders no longer sit as "We're confirming your payment" forever.

## User flow

1. The customer places an order with eSewa or Khalti and goes to the provider's page. The order holds its stock for **15 minutes** from when it was placed (was 60).
2. They leave without paying (close the tab, press back, or cancel on the provider's page). The order stays open. The order page shows "Waiting for your payment", the time to pay by and the minutes left, then **Pay now** (eSewa or Khalti) and **Cancel order**.
3. About 5 minutes after the order was placed, if it's still unpaid, they get one email: "Your order is waiting for payment". It has the time to pay by and a **Pay now** button that opens the order page. _default: one reminder, at 5 minutes._
4. They pay: the order is confirmed as today (verified with the provider, exact amount).
5. They don't: after 15 minutes the order is cancelled, the stock goes back, and the items go back into their bag, as today. The order page says "Payment time ran out" with "View bag".
6. Cancel order (while unpaid): cancelled at once, the stock and the items go back to the bag.

## Acceptance criteria

- [x] An online order's hold (`reservedUntil`) is 15 minutes after it's placed.
- [x] Leaving the provider's page without paying (eSewa failure URL, Khalti "User canceled") while time is left keeps the order `PENDING`; the customer lands on the order page with "Payment didn't go through. You can still pay until {time}." Only that attempt is marked failed.
- [x] The order page of an unpaid online order with time left shows "Waiting for your payment", "Pay by {time} ({n} minutes left)", a choice of the online methods that are switched on, **Pay now** and **Cancel order**. It no longer says "We're confirming your payment" unless an attempt was started in the last 5 minutes. The checkout success page shows the same panel instead of "We're confirming your payment" when nothing is in progress.
- [x] **Pay now** first re-checks the order's open attempts with the provider (shared verification path): if one was paid, the order is confirmed and nothing new starts. Otherwise it starts a new attempt (attempt number + 1, the same order total) and sends the customer to the provider. Refused with "There isn't enough time left to pay. This order will be cancelled shortly." when under 2 minutes are left, and after 5 attempts. _default: 2 minutes, 5 attempts._
- [x] Reconciliation runs every 5 minutes (was 10; Railway's shortest schedule). One reminder email per order, sent at the first run 5 minutes or more after the order was placed while 3 minutes or more are left; claimed with a conditional update so it's never sent twice.
- [x] When the 15 minutes are up: every open attempt is re-checked first. Paid → confirmed. A provider that can't answer (error, "halt" state) → the order stays `PENDING` (policy §1.5) and the 24-hour owner alert still applies. Otherwise → order `CANCELLED`, payment `EXPIRED`, stock and the discount code's use returned, items back in the bag.
- [x] An attempt stays watched after its order is cancelled until the provider gives a final answer or 70 minutes pass (provider links last about 60). If it turns out paid (late), the attempt is marked paid, the order stays cancelled, and the owner gets one email to refund it; the customer coming back sees "Your payment arrived after the 15 minutes ran out, so this order was cancelled. We'll refund it in full." A second payment for an already-paid order is handled the same way.
- [x] **Cancel order** (customer, unpaid online order): re-checks open attempts first (paid → can't cancel: "This order has just been paid."), then cancels with the stock and the items going back to the bag. Order history: "Cancelled by you".
- [x] Admin "Re-verify payment" checks every open attempt of the order, not only the newest.

## Out of scope

- Reminders by SMS or WhatsApp (WhatsApp later), more than one reminder, a live countdown that ticks every second (the page shows minutes left as of loading; it refreshes when the time is up).
- Changing the payment method of an unpaid order to cash on delivery (cancel it and order again; the items are back in the bag).
- Refunding late payments automatically (refunds stay manual in phase 1, policy §10).

## UI

- Order page (`/account/orders/{n}`) and checkout success page: `PayNowPanel` (an `Alert`-led section: heading, time, `RadioGroup card` of online methods, Pay now, Cancel order behind a confirm `Dialog`).
- Checkout failed page: unchanged for orders already cancelled.
- Email: "Payment reminder" template (same frame as the order emails).
- Copy in content-style.md "Order and payment status" and "Emails".

## Data & API

- `Order.paymentReminderSentAt DateTime?` (additive migration).
- Validators: `retryPaymentSchema` (exists) for Pay now; `cancelOrderSchema { orderNumber }` for Cancel order.
- Core: `paymentService.startAttempt`, `paymentService.verifyOpenAttempts`, verification rules above; `orderService.cancelUnpaidForCustomer`; `reconcilePayments` gains the expiry, reminder and late-payment steps; `notifications.paymentReminder`.
- `order-state.ts`: `transitionAttempt` moves one attempt row (its own status only); the order's payment status still moves only through `transitionPayment`.
- No `/api/v1` change.

## Edge cases

- Paying in an old tab after starting a new attempt: both attempts stay watched; the first paid one confirms the order, a second one alerts the owner to refund it.
- Paying at 14 minutes 50 seconds: the 15-minute run re-checks before cancelling, so a payment eSewa or Khalti already reports is kept; one they report only later is a late payment (refund).
- Reconciliation runs every 5 minutes, so a reminder goes between 5 and 10 minutes, and cancelling happens between 15 and 20 minutes after the order.
- On a developer PC nothing runs reconciliation, so unpaid test orders stay open: the order page shows "Payment time ran out — we're cancelling this order" once the 15 minutes are up, without Pay now.

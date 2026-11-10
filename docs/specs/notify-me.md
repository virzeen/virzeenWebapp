# Spec: Notify me when it's back

**Status:** Built (branch `feat/notify-me`, 2026-11-09)
**Owner approval:** signed-in customers only, then "go" on this spec (owner, 2026-11-09). Added while building, for the owner to check in the PR: a style that's sold out in every size can be picked too (else its sizes couldn't be asked for), and when every style is sold out the page opens on the first one.
**Related docs:** ui/patterns.md §6 (product page), ui/content-style.md "Product page", database/data-rules.md, security/security-policy.md §6, runbooks/email-setup.md (Resend limits)

## Goal

A customer who finds their size sold out can ask to be told when it's back, and gets one email the moment it is. Fewer lost sales on sold-out sizes, and the owners see which sizes people are waiting for.

## User flow

1. On a product page, a sold-out size stays struck through but can now be tapped (a sold-out style too). Tapping it changes the main button to "Notify me when it's back" (a product without sizes that is sold out shows the same button).
2. Signed in: pressing it saves the request. The button becomes "We'll email you" (with a tick), with "Don't notify me" under it to cancel (in the page, not in the phone's floating bar).
3. Guest: pressing it opens sign-in, then comes back to the same product, style and size, where they press it again (owner: signed-in customers only).
4. When that size is back in stock (an admin raises its stock, or a cancelled order returns pieces), each waiting customer gets one email: "{Product}, {style / size} is back", with a link to that exact style and size. Then the request is done.
5. Account → Profile shows "Notify me" requests waiting (product, style/size, Remove), under Favourites.

## Acceptance criteria

- [x] A sold-out size is struck through, says "sold out" to screen readers, and can be picked; picking it never adds to the bag.
- [x] With a sold-out size (or a sold-out product without sizes) picked, the button reads "Notify me when it's back"; with an in-stock size it stays "Add to bag".
- [x] Signed in: pressing it saves one request per customer and size (pressing again doesn't duplicate it); the button shows "We'll email you" and "Don't notify me" cancels. A toast confirms: "We'll email you when it's back."
- [x] Guest: pressing it goes to `/login?next=` the product URL with the style and size, and back after sign-in.
- [x] When the size is in stock again, every waiting request for it gets one email and is marked notified, right after the request that raised the stock (admin save, any cancellation that returns stock: `after()`, so the reply isn't held up). A request is never emailed twice; an email that fails puts its request back to waiting and stops that run. _Review fix 2026-11-09:_ at most 40 per run and 40 per Nepal day (keeps room in Resend's free 100 a day for sign-in codes; raise `STOCK_ALERT_EMAILS_PER_DAY` when the plan is upgraded), one every 600 ms; the rest go with the next run.
- [x] A request for a product that's been archived or a size that's removed is dropped without an email. A product that's only unpublished (or in an archived category) keeps its requests waiting, hidden from the profile and not counted.
- [x] Requests are limited: 30 per 10 minutes per customer (`alert` bucket, security-policy.md §6), and at most 20 waiting requests per customer ("You can wait for up to 20 sizes. Remove one to add another.").
- [x] Account → Profile: "Notify me" list (newest first) with Remove; empty state hidden when there are none.
- [x] Admin: the product editor's stock grid shows "{n} waiting" next to a sold-out size with requests (so the owners know what to restock).

## Out of scope

- Guests by email only (owner chose signed-in), SMS or WhatsApp alerts (WhatsApp comes later), alerts for price drops, a separate admin report page.

## UI

- Product page: `SizePicker` and `StylePicker` (sold-out options pickable: `RadioGroupItem unavailable`, stories `SizePickerSoldOutPickable` and `StyleSwatchesSoldOutPickable`), `NotifyMeButton` in `ProductPurchase`, a small "Don't notify me" text button. `?size=` opens a size (the email link and the way back from sign-in); `?style=` now opens a sold-out style too.
- Account → Profile: a "Notify me" section.
- Email: "back in stock" template (same frame as the order emails).
- Copy: added to content-style.md "Product page" and "Emails".

## Data & API

- Model: `StockAlert` { `userId` (Cascade), `variantId` (Cascade), `notifiedAt?`, timestamps } with `@@unique([userId, variantId])`, `@@index([variantId, notifiedAt])`.
- Validators: `stockAlertSchema { variantId }`.
- Core: `stockAlertService` (`request`, `cancel`, `listForUser`, `waitingVariantIds`, `waitingCounts`, `sendDue`). `sendDue` sweeps every waiting request whose variant is for sale and in stock, claims each with a conditional update before emailing it, puts it back if the email fails, and never throws. Payment and order code doesn't send these emails: the web app schedules `sendDue` with `after()` (`server/services/stock-alerts.ts`) from admin product saves and archives, admin cancel and refused-at-door, checkout with an online method, payment returns and reconciliation.
- Server actions: `requestStockAlertAction` / `cancelStockAlertAction` in `server/actions/stock-alerts.ts` (auth → rate-limit → validate → core).
- No `/api/v1` change in this round.

## Edge cases

- Stock raised and an order placed in the same minute: the email still goes; the customer may find it sold out again (the email says "while it lasts").
- Resend's free plan sends 100 emails a day, shared with sign-in codes and order emails: a popular restock could use most of it. Upgrade Resend before launch (already on the launch-prep list).
- A customer deleted: their requests go with them (Cascade).

## Tests

- Integration: request/cancel/duplicate/limit; `notifyAvailable` emails once and marks notified; no email while stock is 0; archived product dropped; called from admin save and cancellation.
- E2E: a signed-in customer asks for a sold-out size; the admin-side stock change (set in the e2e database) sends the email, read from Mailpit.

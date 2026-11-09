# Spec: Product reviews

**Status:** Built
**Owner approval:** Virzeen founder, 2026-11-08 ("go for the Reviews… go for it now"); the rules below were chosen by Claude and are reviewed in the PR
**Related docs:** `database/data-rules.md` (`Review`), `ui/patterns.md` §6 and §10, `ui/content-style.md` "Reviews", `security/security-policy.md` §6

## Goal

Customers see what buyers think of a product (stars and words), which builds trust in a new brand, and Google can show the stars. Only people who received the product can review it, so every review is from a buyer.

## User flow

1. A customer's order is marked Delivered. On the order page (`/account/orders/{number}`) each line now has "Write a review".
2. The review page (`/account/reviews/{slug}`, signed in) shows the product's photo and a form: "Your rating" (5 to 1 stars, required), "Title" and "Your review" (both optional).
3. "Submit review" saves it and goes back to the product's reviews (`/product/{slug}#reviews`) with "Thanks for your review.". Coming back later edits the same review ("Edit your review", "Save review").
4. On the product page, "Reviews" sits under the product: the average and count, "Write a review", then the newest 10 reviews (stars, title, text, first name · what they received · date · Verified buyer).
5. The admin's "Reviews" page (`/admin/reviews`) lists every review (All / Shown / Hidden). "Hide" takes a review out of the shop and the average; "Show" brings it back. Audited.

## Acceptance criteria

- [x] Only a signed-in customer with a DELIVERED order containing the product can save a review; anyone else gets "You can review this once it has been delivered to you." on the page, and the action refuses (`FORBIDDEN`).
- [x] One review per customer and product; saving again edits it. An edit keeps an admin's hiding.
- [x] Rating 1–5 is required ("Choose a rating"); title up to 80 and text up to 1,000 characters, both optional.
- [x] The product page shows visible reviews only, newest first (10), with the average to one decimal and the count; "Showing the newest 10 of {n} reviews." when there are more.
- [x] The reviewer shows by first name only; what they received ("Black / M") comes from their delivered order line.
- [x] The product's JSON-LD gains `aggregateRating` when it has visible reviews.
- [x] Admin Hide/Show changes the shop at once and writes `review.hide` / `review.show` to the audit log.

## Out of scope

- Photos in reviews (customer uploads need moderation and use Cloudinary credits), replies from the shop, "helpful" votes, sorting or filtering reviews, stars on product cards, a reviews email after delivery, `/api/v1` fields.

## UI

- Product page: `ProductReviews` (streamed in `<Suspense>` after the product, before the recommendations).
- Account: `/account/reviews/[slug]` with `ReviewForm`; `OrderDetail reviewLinks` on delivered orders.
- Admin: `/admin/reviews` (`DataTable`, filter chips, Previous/Next) with `ReviewVisibilityButton`; "Reviews" in the admin nav.
- Shared: `StarRating` (stars + "Rated {n} out of 5" for screen readers) and `Stars` (decorative) in `star-rating.tsx`.
- States: product page empty "No reviews yet. Bought this? Tell others what you think."; review page not eligible (EmptyState + Back to the product), hidden review (info Alert); form errors under fields or in an Alert; success toast.

## Data & API

- New model `Review` (migration `20261108103131_add_reviews`, additive).
- Validators: `reviewSchema`, `reviewVisibilitySchema`, `adminReviewFiltersSchema` (`reviews.ts`).
- Core: `reviewService` (`summary`, `listForProduct`, `forCustomer`, `save`, `listForAdmin`, `setHidden`).
- Actions: `saveReviewAction` (signed in, rate limit `account`), `setReviewVisibilityAction` (admin).
- `/api/v1`: no change.

## Edge cases

- Two saves at once: the second edits the row the first created (unique constraint, retried as an update).
- A product archived after the review: the review page 404s; the review stays in the admin list.
- An account deleted: its reviews go with it (cascade).

## Tests

- Unit: `reviews.test.ts` (validators).
- Integration: `review.service.test.ts` (delivered only, someone else's order refused, one per product, average and hiding, admin list).
- E2E: `reviews.spec.ts` (refused before delivery, the order's review link, stars required, the review on the product page).

# UI Patterns

Standard layouts and behaviors. Build new screens from these instead of inventing new ones. Canonical code lives in `docs/examples/`.

## 1. Page anatomy (every page)

1. `generateMetadata` (title, description, canonical, Open Graph) — see `performance-seo.md`. For a missing item it calls `notFound()` too (share the loader with the page through React `cache()`), so the tab gets the 404 title instead of the page's usual one.
2. Server Component fetches data via `server/queries`.
3. `notFound()` for missing resources, never an empty page. The 404 shows inside the shell: `(site)/[...missing]` sends every unmatched storefront URL to `(site)/not-found.tsx` (header and footer stay), `admin/(panel)/[...missing]` does the same inside the admin frame, and a missing order stays inside the account pages (`account/orders/[orderNumber]/not-found.tsx`). Whole-page 404, error and offline screens use `EmptyState titleAs="h1"`.
4. Sibling `loading.tsx` with a skeleton that matches the layout. A `loading.tsx` covers every page below it, so put it on the route whose layout it matches, not on a route group: `/shop` (also `/shop/[category]`) and `/collections/[slug]` use `ShopListingSkeleton`; `/cart`, `/checkout` (also `/checkout/success`), `/product/[slug]`, `/portfolio`, `/portfolio/[slug]` and `/account` each have their own.
5. Sibling `error.tsx` (client) with a friendly message and "Try again", which calls Next's `retry()` (it fetches the page again; `reset` would re-render the same failure).
6. Layout built from `Container` + `Stack`/`Grid`.
   Example: `docs/examples/page-product.tsx`.

## 2. Server/client split

- The page and most components are Server Components.
- Only leaves that need state/events are client components (`AddToBagButton`, `QuantityStepper`, `CartDrawer`, forms).
- Pass plain serializable props (ids, strings, numbers) into client components, never Prisma objects or functions from the server.
  Example: `docs/examples/client-add-to-bag.tsx`.

## 3. Mutations (add to bag, update quantity, place order)

1. Client leaf calls a Server Action inside `startTransition` (or a `<form action>`).
2. Show pending immediately (`Button loading`, disabled).
3. On `{ ok: true }` → toast/redirect and let `revalidatePath/Tag` refresh data. Add to bag opens the drawer instead of a toast; remove offers an inline Undo (§7).
4. On `{ ok: false }` → map `error.code` to copy from `content-style.md` and show it (toast or inline).
5. Never update the UI as if it succeeded before the action returns, except simple optimistic quantity changes via `useOptimistic` with rollback.

## 4. Forms

- React Hook Form + `zodResolver(schema)` using the schema from `@virzeen/validators` (the same one the server uses).
- Every input inside `FormField` (label, control, helper, error). Labels always visible — no placeholder-only inputs.
- Validate on blur, re-validate on change after the first error. Submit button shows `loading`.
- Server errors: field-specific → `setError(field)`; general, or a field the form doesn't have → `Alert` at top (`INTERNAL` copy).
- **After a failed submit, the first error is scrolled into view and focused, in screen order.** react-hook-form focuses in registration order (a `Controller` Select comes last), so set `shouldFocusError: false` and focus from an effect on `submitCount`, after the render that shows the messages (`AddressForm`). Long admin forms use `useRevealFirstError(submitCount)` from `client/features/admin/form-focus.ts`: it looks for `[aria-invalid=true]`, then list-level messages (`<p tabIndex={-1} data-field-error>`), then the form `Alert` (`tabIndex={-1} data-error-summary`). Checkout does the same for its `Alert`.
- `Select` inside a `Controller`: pass `field.ref` and `field.onBlur`, so it can take focus and is validated when left.
- Buttons under validate-on-blur fields (Save, Add variant, Add image) use `keepFocusOnPress` on mouse-down. Otherwise the blur error moves the button and the click is lost.
- A disabled submit says why next to it (checkout's hint under Place order).
- Length limits come from the schema. Don't add `maxLength` where people paste formatted values (the phone schema accepts spaces, hyphens and +977).
- Correct `type`, `inputMode`, and `autoComplete` on every input (e.g. `tel` + `inputMode="numeric"` for phone, `autoComplete="shipping street-address"`).
  Example: `docs/examples/form-address.tsx`.

## 5. Lists and grids

- Product grid: 2/3/4 columns, image aspect `4/5`, name, `Price`, optional `Badge`. Whole card is one `Link`.
- Empty result → `EmptyState` with an action. Loading → skeleton cards equal to the page size.
- Pagination: "Load more" button (cursor) on shop pages; numbered pages in admin tables. After "Load more", focus moves to the first new card, and the count reads "{n}+ products" until everything is loaded.
- Shop filters (bottom `Sheet`): each radio group starts with "Any" (a radio can't be unticked); "Clear all" removes every filter and closes the sheet.
- Admin search and filters live in the URL, and their controls follow it: "Clear search", or a link to the plain list, empties them.

## 6. Product page

Mobile: gallery (swipe) → name + price → variant pickers → stock label → sticky bottom "Add to bag" bar → description accordion → related products.
Desktop: two columns — gallery left (60%), sticky details column right (40%).
Variant pickers are `RadioGroup card` buttons; unavailable variants are visible but disabled with a line-through.
Before a size is chosen the button reads "Select a size" and stays enabled: pressing it scrolls to the sizes, focuses the first one and shows "Select a size" under them. It is disabled only when sold out. When the bag already holds every piece left (or 10), pressing it says so under the button instead of calling the server. A successful add opens the bag drawer (no toast), and closing the drawer returns focus to the button. The sticky bar carries `data-sticky-cta`.

## 7. Cart drawer

Opens after add-to-bag (description "Added to bag · N items") and from the header. Lines (`CartLine`): image, name, variant, "{Rs X} each" when there are several, `QuantityStepper`, line `Price`, Remove, and a note when "+" stops ("Only N left", "Limit 10 of each", "Out of stock"). Footer: subtotal, "Free shipping across Nepal. Prices include VAT.", primary "Checkout", secondary "View bag". The drawer has no trigger of its own, so `open({ returnFocusTo })` records what opened it (header bag or Add to bag) and focus goes back there on close.

**Remove with inline undo** (drawer and `/cart`). Never a toast: behind the modal drawer a toast's Undo can't be reached.

1. Remove → the line goes and `RemovedLineNotice` shows "Removed {name}." with Undo: at the top of the drawer's list (in a `role="status"` region), or on `/cart` exactly where the line was.
2. Keyboard focus moves to Undo, since the pressed Remove button is gone.
3. Undo puts the line back in its old place (it keeps its original added time) and focuses its product link. If Undo fails, the row shows the error instead of "Removed {name}.".
4. Closing the drawer, or another change to the bag, ends the offer.

After −, + or Remove, focus returns to the pressed button, or to the other stepper button when a limit disabled it.

## 8. Checkout

Single page, three clear sections (Address → Delivery summary → Payment). From `lg` the order summary sits on the right. Below `lg` a collapsed "Order summary · {total}" (an `AccordionItem` with `headingLevel={2}`) opens the page, and the card by the button holds only the totals, headed "Order total". One primary button at the end. See `docs/specs/checkout.md`.

- When only one payment method is offered (cash on delivery at launch), it is already chosen.
- "Place order" is disabled until an address and a method are chosen, with the reason under it.
- A form error shows at the top of the form from `lg` and just above "Place order" below `lg`, then scrolls into view and takes focus.
- Address section focus: "Add a new address" → the section heading; Cancel → "Add a new address"; after saving → the new address.

## 9. Portfolio pages

Full-bleed hero image (priority load), large display headline, generous whitespace, alternating image/text sections, products from the lookbook linked at the end. Motion: subtle fade/translate on scroll, disabled for reduced motion. The index and each story have their own skeleton; the index boundary also covers stories, so it shows the story skeleton on the way to one.

## 10. Admin

Function over form: `DataTable` with search, filters, status `Badge`s; forms in pages (not dialogs) for create/edit; every destructive action confirmed with `Dialog`; every successful mutation shows a toast.

**Frame** (`admin/(panel)/layout.tsx`): skip link, header, `AdminNav` and `<main id="main">`. The header holds the wordmark with "Admin" (stacked under it below `sm`), then the admin's email (from `sm`), "View shop" and "Sign out" (`SignOutButton`, a text button so the row fits a 320px phone). The nav wraps onto extra rows on phones and tablets (every section stays in view, no sideways scroll) and becomes a column from `lg`. Shared boundaries cover every admin page, so the nav stays usable:

- `loading.tsx`: a title row and a 6-row table skeleton.
- `error.tsx`: an h1 "Something went wrong on our side.", then a danger `Alert` with "Try again" (`retry()`).
- `not-found.tsx`: missing items and mistyped `/admin` addresses (`[...missing]`), with "Back to dashboard". Non-admins get the root 404 instead.

**Settings** (`/admin/settings`, the last nav item): three sections, each a `<section aria-labelledby>` with an h2. "Your account" is the same `ProfileForm` as `/account/settings`. "Sign-in security" only reads: the authenticator status, when the next code is asked for (`getAdminVerifiedUntil()`), and how a lost phone is handled. It has no reset, disable or new-QR buttons, because admin rights and authenticator resets happen only with `pnpm admin` (security-policy.md §2). "Sign out" ends this device's session.

**Order tables on phones**: the Order cell holds the number link (`font-mono whitespace-nowrap`, `after:absolute after:inset-0` so the whole cell is the tap target), the date under it, and a `md:hidden` status badge. The Status and Payment columns use `hideOnMobile` and Customer uses `hideBelow="xl"`, so Total stays on screen.

**Errors and focus**: errors the admin must act on stay in the dialog (archive blocked: the reason in an `Alert` and a single OK) or under the field (order-action dialogs validate with the same schema as the server). After an order action, focus goes to the first action now on offer, or to the "Order actions" group when none is left. Moving or removing a list item (story block, image, variant) refocuses the same control in its new place with `refocusAfterListChange`.

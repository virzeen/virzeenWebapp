# UI Patterns

Standard layouts and behaviors. Build new screens from these instead of inventing new ones. Canonical code lives in `docs/examples/`.

## 1. Page anatomy (every page)

1. `generateMetadata` (title, description, canonical, Open Graph) — see `performance-seo.md`.
2. Server Component fetches data via `server/queries`.
3. `notFound()` for missing resources, never an empty page.
4. Sibling `loading.tsx` with a skeleton that matches the layout.
5. Sibling `error.tsx` (client) with a friendly message and "Try again".
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
3. On `{ ok: true }` → toast/redirect and let `revalidatePath/Tag` refresh data.
4. On `{ ok: false }` → map `error.code` to copy from `content-style.md` and show it (toast or inline).
5. Never update the UI as if it succeeded before the action returns, except simple optimistic quantity changes via `useOptimistic` with rollback.

## 4. Forms

- React Hook Form + `zodResolver(schema)` using the schema from `@virzeen/validators` (the same one the server uses).
- Every input inside `FormField` (label, control, helper, error). Labels always visible — no placeholder-only inputs.
- Validate on blur, re-validate on change after the first error. Submit button shows `loading`.
- Server errors: field-specific → `setError(field)`; general → `Alert` at top.
- Correct `type`, `inputMode`, and `autoComplete` on every input (e.g. `tel` + `inputMode="numeric"` for phone, `autoComplete="shipping street-address"`).
  Example: `docs/examples/form-address.tsx`.

## 5. Lists and grids

- Product grid: 2/3/4 columns, image aspect `4/5`, name, `Price`, optional `Badge`. Whole card is one `Link`.
- Empty result → `EmptyState` with an action. Loading → skeleton cards equal to the page size.
- Pagination: "Load more" button (cursor) on shop pages; numbered pages in admin tables.

## 6. Product page

Mobile: gallery (swipe) → name + price → variant pickers → stock label → sticky bottom "Add to bag" bar → description accordion → related products.
Desktop: two columns — gallery left (60%), sticky details column right (40%).
Variant pickers are `RadioGroup card` buttons; unavailable variants are visible but disabled with a line-through.

## 7. Cart drawer

Opens after add-to-bag and from the header. Lines: image, name, variant, `QuantityStepper`, line `Price`, remove (with undo toast). Footer: subtotal, "Shipping calculated at checkout", primary "Checkout" button. Focus returns to the trigger on close.

## 8. Checkout

Single page, three clear sections (Address → Delivery summary → Payment), order summary on the right (desktop) or collapsible at top (mobile). One primary button at the end. See `docs/specs/checkout.md`.

## 9. Portfolio pages

Full-bleed hero image (priority load), large display headline, generous whitespace, alternating image/text sections, products from the lookbook linked at the end. Motion: subtle fade/translate on scroll, disabled for reduced motion.

## 10. Admin

Function over form: `DataTable` with search, filters, status `Badge`s; forms in pages (not dialogs) for create/edit; every destructive action confirmed with `Dialog`; every mutation shows a toast.

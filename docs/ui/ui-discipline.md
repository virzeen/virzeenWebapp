# UI Discipline

The Virzeen look is calm, premium, and product-first: large imagery, generous whitespace, restrained color, precise typography. Consistency comes from a small system used strictly — not from redesigning each screen.

## 0. UI docs map (read what your task needs)

| Doc                     | Read when                                                          |
| ----------------------- | ------------------------------------------------------------------ |
| this file               | Any UI work (always)                                               |
| `design-tokens.md`      | Choosing any color, size, spacing, radius, shadow, motion, z-index |
| `components-catalog.md` | Picking or creating a component; "which component for this?"       |
| `patterns.md`           | Building a page, form, list, drawer, checkout, admin screen        |
| `content-style.md`      | Writing any user-facing text, error, or empty state                |
| `performance-seo.md`    | New public page, images, fonts, metadata, PWA                      |
| `docs/examples/*`       | Copy the canonical shape before writing similar code               |

## 1. Principles (in priority order)

1. **Accessible and correct** before pretty.
2. **Consistent** before novel — reuse a pattern before inventing one.
3. **Content first** — product imagery and text lead; UI chrome stays quiet.
4. **Fast** — server-rendered, minimal client JS, no layout shift.
5. **Mobile first** — most customers are on phones.

## 2. The three layers

| Layer              | Lives in                         | Knows business? | Example                       |
| ------------------ | -------------------------------- | --------------- | ----------------------------- |
| Tokens             | `packages/ui/src/tokens`         | No              | `--color-ink`, `--radius-md`  |
| Primitives         | `packages/ui/src/primitives`     | No              | `Button`, `Sheet`, `Skeleton` |
| Feature components | `apps/web/src/client/features/*` | Yes             | `ProductCard`, `CartDrawer`   |

Pages compose feature components → feature components compose primitives → primitives use tokens. Nothing skips a layer. Feature components never restyle primitives with overrides; if a new look is needed, add a variant to the primitive.

## 3. Storybook is the source of truth for components

- Before using or creating a component, query the Storybook MCP: `list-all-documentation`, then `get-documentation` for each candidate. **Never invent a prop.**
- Every primitive has `<name>.stories.tsx` covering every variant, size, and state (default, hover, focus-visible, disabled, loading, error), plus a mobile viewport story when layout changes.
- A new primitive = component + story + export in `packages/ui/src/index.ts` + entry in `components-catalog.md`, all in one change.
- Storybook's a11y panel must show zero violations.

## 4. Styling rules

- Tailwind utilities generated from tokens only (`bg-surface`, `text-h2`, `rounded-md`). See `design-tokens.md`.
- Forbidden: hex/rgb literals, arbitrary values (`mt-[13px]`), inline `style` for visuals, `!important`, Tailwind's default type sizes (`text-sm`, `text-2xl`) in app code.
- Allowed arbitrary values: `aspect-[…]`, `grid-cols-[…]`, `grid-rows-[…]` for image/layout grids.
- Variants via `cva`; merge classes with `cn()`; never string-concatenate conditional classes.
- Keep class lists readable: layout → spacing → typography → color → state. Prettier's Tailwind plugin sorts them.

## 5. React rules

- Server Components by default. `"use client"` only for state, effects, browser APIs, or handlers — at the smallest leaf. Never on `page.tsx`/`layout.tsx`.
- Data is fetched on the server (`server/queries`) and passed as props. No fetching in `useEffect`.
- Mutations go through Server Actions with visible pending state (see `patterns.md` §3).
- Props passed to client components are serializable (strings, numbers, plain objects).
- Stable `key`s from ids, never array indexes.
- No `Date.now()`, `Math.random()`, or locale-dependent formatting during render of server + client components (hydration mismatch). Format on the server or with fixed locale/timezone helpers.
- Components under ~150 lines; extract subcomponents when bigger.

## 6. States every view needs

- **Loading:** skeleton matching the final layout (`loading.tsx` or `Skeleton`). No full-page spinners.
- **Empty:** `EmptyState` with message + one action (copy in `content-style.md`).
- **Error:** `error.tsx` or inline `Alert` with retry. Never show raw error text or codes.
- **Success:** `Toast` for background actions; the bag drawer for add to bag ("Added to bag"); the "Added to favourites" panel for Favourite; confirmation page for orders.
- **Disabled/unavailable:** visible but clearly disabled with a reason ("Out of stock").

## 7. Accessibility (minimum bar — WCAG 2.2 AA)

- Every interactive element is a real `button`/`a`/input (via primitives), reachable by keyboard, with visible `focus-visible` ring (`ring-focus`). Text fields (`Input`, `Textarea`, `Select`, `CodeInput`) show focus as a 2px ink border instead: `outline-1 -outline-offset-2 outline-ink` on top of `border-ink` (owner's choice, 2026-09-29).
- Every input has a visible label; errors linked with `aria-describedby`; required fields marked.
- Icon-only buttons have `aria-label`. Decorative icons `aria-hidden`.
- Images: meaningful `alt`; decorative `alt=""`.
- Contrast: 4.5:1 text, 3:1 large text and UI boundaries.
- Touch targets ≥ 44×44px on mobile.
- Dialog/Sheet focus trap, Escape to close, focus returns to trigger (primitives do this — don't re-implement). A panel opened without a trigger (the bag drawer, the "Added to favourites" `DropPanel`) sends focus back through `onCloseAutoFocus`.
- When the focused control disappears (a removed line, a finished step, a moved list item), move focus to the next sensible control instead of letting it fall to the page.
- Sticky bars mark themselves (`data-sticky-header`, `data-sticky-cta`) so `globals.css` scrolls focused elements clear of them (WCAG 2.4.11).
- Live updates (cart count, toasts) announced via `aria-live` (built into `Toast`).
- Respect `prefers-reduced-motion`.
- Page has one `h1`, logical heading order, `<main>`, `<nav>`, skip-to-content link in the root layout.

## 8. How these rules are enforced

| Check                                                                                                 | Tool                               | When                                    |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------- |
| Tokens, raw img, money formatting, client/server imports, fetch-in-effect, index keys, clickable divs | `scripts/check-ui.mjs`             | every agent edit (hook), pre-commit, CI |
| a11y lint                                                                                             | `eslint-plugin-jsx-a11y`           | edit, pre-commit, CI                    |
| Hooks misuse                                                                                          | `eslint-plugin-react-hooks`        | edit, pre-commit, CI                    |
| Layer boundaries                                                                                      | `eslint-plugin-boundaries`         | edit, pre-commit, CI                    |
| Class sorting                                                                                         | `prettier-plugin-tailwindcss`      | every edit                              |
| Component a11y                                                                                        | Storybook a11y addon               | Storybook, CI                           |
| Visual + flow check                                                                                   | Playwright MCP (`verify-ui` skill) | end of every UI task                    |
| Performance/SEO                                                                                       | Lighthouse CI                      | CI on key pages                         |

The guard's escape hatch is a comment `ui-allow: <reason>` on or above the line. Use it only with a real reason; reviewers check every one.

## 9. UI self-review before saying "done"

- [ ] Checked Storybook MCP; used existing primitives; no invented props
- [ ] Tokens only; `node scripts/check-ui.mjs --changed` passes
- [ ] Server Component unless interactivity needed; client leaves small
- [ ] Loading, empty, error, success states present with copy from `content-style.md`
- [ ] Keyboard + screen reader basics (§7) hold
- [ ] `verify-ui` run at 360 / 768 / 1280 with no console errors
- [ ] New/changed primitives have stories and a catalog entry

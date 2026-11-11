# Design Tokens

Tokens are the only source of visual values. They live in `packages/ui/src/tokens/tokens.css` and are exposed to Tailwind v4 through `@theme`, which generates utilities like `bg-surface`, `text-ink`, `rounded-md`, `shadow-sm`, `text-h2`.
Values below are the phase-1 defaults, set from the brand artwork (monochrome logo, posters, "timeless monochromium experience." cover). **Brand values marked ◆ are placeholders until the Virzeen brand guide is final** — change them here and in `tokens.css` together, never in components.

## 1. Color

| Token                     | Utility examples               | Default   | Use for                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | ------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-ink` ◆           | `text-ink`, `bg-ink`           | `#141414` | Primary text, primary button background                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `--color-ink-muted`       | `text-ink-muted`               | `#666666` | Secondary text, captions, placeholders                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `--color-canvas`          | `bg-canvas`                    | `#FFFFFF` | Page background                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--color-surface` ◆       | `bg-surface`                   | `#F5F5F5` | Cards, image placeholders, section bands                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `--color-line`            | `border-line`, `divide-line`   | `#E5E5E5` | Borders, dividers, input outlines                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `--color-line-strong`     | `border-line-strong`           | `#8A8A8A` | Input, checkbox and radio outlines (3:1 against canvas, WCAG 1.4.11)                                                                                                                                                                                                                                                                                                                                                                                           |
| `--color-accent` ◆        | `text-accent`, `bg-accent`     | `#231F20` | Brand highlights, links on hover, badges                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `--color-accent-contrast` | `text-accent-contrast`         | `#FFFFFF` | Text on accent backgrounds                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `--color-success`         | `text-success`                 | `#2E7D4F` | In stock, payment success, accepted code boxes (`border-success`)                                                                                                                                                                                                                                                                                                                                                                                              |
| `--color-warning`         | `text-warning`                 | `#8A5A00` | Low stock, pending                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `--color-danger`          | `text-danger`, `border-danger` | `#B3261E` | Errors, out of stock, destructive actions                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `--color-focus`           | `ring-focus`                   | `#141414` | Unused on screen: **no focus rings, not even for Tab** (owner decision 2026-11-09, after the blue ring showed when the phone menu opened and when Shift was pressed). tokens.css redefines the `focus-visible:` variant so it never matches, and the base layer removes the browser outline. Text fields still show focus with their 2px ink border (`focus:` in `Input`/`Select`). Taps show no flash: `html` sets `-webkit-tap-highlight-color: transparent` |

Rules: text on `canvas`/`surface` uses `ink` or `ink-muted` only. On dark imagery and the ink footer, use `text-canvas` (and `/80`, `/70` opacity steps for secondary text). Status colors are for status, never decoration. Every pairing must meet WCAG AA (4.5:1 body, 3:1 large text/UI).

## 2. Typography

Two families: **display** (headings, brand moments) and **text** (everything else), loaded with `next/font` and exposed as `--font-display` / `--font-text` ◆. Phase-1 placeholders: **Inter Tight** (display) and **Inter** (text), light weights echoing the posters. A third face, **Noto Sans Devanagari SemiBold**, is used only for the rupee sign "रु" in prices (the `rupee-sign` utility: SemiBold 600 at 1.2em of the amount's size, owner requests 2026-11-11), exposed as `--font-rupee`. The wordmark and the V mark are the owner's artwork (`apps/web/public/brand/logo/`, 2026-09-30) drawn as inline SVG in `currentColor` (`client/components/layout/wordmark.tsx`, `logo-mark.tsx`: black on light, white on dark), never set in a web font.

| Token            | Utility        | Size / line-height                                      | Weight                        | Use                                                                                   |
| ---------------- | -------------- | ------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| `--text-display` | `text-display` | 2.5rem → 4.75rem / 0.9 (40px on phones, 76px at 1280px) | 500                           | Hero headline, one per page max                                                       |
| `--text-h1`      | `text-h1`      | 2rem / 1.2 (32/38)                                      | 500                           | Big titles: sign-in, checkout results, content pages, the profile name, home sections |
| `--text-h2`      | `text-h2`      | 1.5rem / 1.2 (24/29)                                    | 500                           | Page and section titles: Settings, Bag, Favourites, carousels; listings from `lg`     |
| `--text-h3`      | `text-h3`      | 1.25rem / 1.2 (20/24)                                   | 500                           | Product name, accordion and footer headings, listing titles on phones                 |
| `--text-body-lg` | `text-body-lg` | 1.25rem / 1.5 (20/30)                                   | 400                           | Intros                                                                                |
| `--text-body`    | `text-body`    | 1rem / 1.5 (16/24)                                      | 400                           | Default text, prices (medium)                                                         |
| `--text-small`   | `text-small`   | 0.875rem / 20px (14/20)                                 | 400                           | Meta, helper text, cards on phones                                                    |
| `--text-caption` | `text-caption` | 0.75rem / 1.5 (12/18)                                   | 500, tracking-wide, uppercase | Labels, eyebrow text                                                                  |

Sizes, line heights and weights are nike.com's (owner 2026-11-10: "make the fonts size and all the primitives same like the nike … not the font", measured on its UK store at 390 and 1280px). Our typefaces stay; headings are medium (500) with normal letter spacing, like Nike's.

Rules: never use Tailwind's default `text-sm`/`text-2xl` in app code — use the named tokens. One `h1` per page. Line length for reading text ≤ 70ch (`max-w-prose`).

## 3. Spacing

Tailwind's 4px base. Use only these steps: `1 (4px) · 2 (8) · 3 (12) · 4 (16) · 6 (24) · 8 (32) · 12 (48) · 16 (64) · 24 (96) · 32 (128)`.

- Inside components: 2–6. Between related elements: 4–8. Between sections: 16 mobile, 24 desktop.
- Page gutters: `px-gutter`, 24px, and 48px from 960px wide, like nike.com (owner 2026-11-10; built into `Container`). Something that runs to the screen's edge on phones pulls out with `-mx-gutter`. Never `px-4 sm:px-6 lg:px-8` by hand.

## 4. Radius, borders, shadow

| Token          | Value  | Use                                |
| -------------- | ------ | ---------------------------------- |
| `rounded-sm`   | 4px    | Inputs, small buttons              |
| `rounded-md`   | 8px    | Cards, sheets, dialogs             |
| `rounded-full` | 9999px | Pills, avatars, icon buttons       |
| `shadow-sm`    | subtle | Sticky header on scroll, dropdowns |
| `shadow-md`    | medium | Dialogs, drawers                   |

Borders are 1px `border-line`. Prefer borders and whitespace over shadows.

## 5. Motion

| Token             | Value                        | Use                               |
| ----------------- | ---------------------------- | --------------------------------- |
| `--duration-fast` | 150ms                        | Hover, press, small state changes |
| `--duration-base` | 250ms                        | Drawers, dialogs, toasts          |
| `--duration-slow` | 400ms                        | Page-level reveals, hero images   |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Everything                        |

Animate only `opacity` and `transform`. No bouncing, no infinite animations except loading skeleton shimmer. Wrap all motion in `motion-safe:` or check `useReducedMotion()`.

Never start a hero or page heading at `opacity: 0`: browsers don't count invisible elements as the page's largest content (LCP), so it shows late in Lighthouse. `reveal` starts at 40% (2026-10-01; it failed the home page's audit at 0).

Named animations (`animate-*`, defined with their keyframes in `tokens.css`): `spin`, `shimmer`, `fade-in`/`fade-out`, `slide-in-*`/`slide-out-*` (right, bottom) and `reveal`, used by the primitives, plus these:

| Token                                                              | Value                                                                                                                 | Use                                                                                                                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--animate-shake`                                                  | 400ms, `ease-standard`, played once; a damped 6px side-shake                                                          | A wrong one-time code (`CodeInput`), always as `motion-safe:animate-shake`. Nothing else shakes.                                                                                                     |
| `--animate-nudge-in-right`, `--animate-nudge-in-left`              | 250ms, `ease-standard`; a 16px slide in with a fade                                                                   | A second panel inside a `Sheet` coming in (the phone menu's Shop, from the right) and the way back (from the left), as `motion-safe:`. 16px stays inside the sheet's 24px gutter: no sideways scroll |
| `--animate-drop-down`, `--animate-lift-up`                         | 350ms / 250ms, `ease-standard`; a `clip-path` that grows down from the top / shrinks back up                          | `Sheet side="top"` (the phone menu, like apple.com)                                                                                                                                                  |
| `--animate-shine-sweep`, `--animate-shine-border`                  | 7s / 3.5s, infinite; a band of light crossing the panel, and a border that glows and fades                            | `PremiumPanel` (the Monochrome Pass panel on the Membership page), always as `motion-safe:`. Nothing else shines.                                                                                    |
| `tone-inverse` (utility in `tokens.css`)                           | Swaps `ink`/`canvas`/`ink-muted`/`surface`/`line` for an element and its children, so they draw white on a dark photo | The home page header over the hero, before scrolling                                                                                                                                                 |
| `stagger-rows` (utility in `globals.css`, keyframes `menu-row-in`) | 350ms; each `[data-stagger="n"]` row fades in and drops 0.5rem, n × 30ms later (0–15); off with reduced motion        | The phone menu's rows as it opens                                                                                                                                                                    |

## 6. Breakpoints and layout

Tailwind defaults: `sm 640px · md 768px · lg 1024px · xl 1280px`. Design mobile first (base = 360px).
Page width `max-w-page` (1920px with the gutters, so content is at most 1824px wide, centred) via `Container`, as nike.com measured from 360 to 2560px wide on 2026-11-10. The gutter's 960px step is Nike's large breakpoint and lives only in the `--spacing-gutter` token (tokens.css), not as a Tailwind breakpoint. Product cards, everywhere (owner 2026-11-08, Nike's): 2 a row below 960px, running to the screen's edges 6px apart, 3 from 960px (nike.com, measured 2026-11-10) (`Grid columns="products"`; `ProductCarousel` matches), square photos.
`page-edge` (spacing token, e.g. `md:right-page-edge`): the distance from the screen's right edge to the right edge of
`Container`'s content, so a fixed panel under the header lines up with its icons (`DropPanel`).

## 7. Z-index scale (use only these)

`z-10` sticky header (and the product editor's top bar) · `z-20` dropdowns/popovers · `z-40` drawers/sheets + overlay · `z-50` dialogs, and the `Select` list (it also opens from inside a Dialog or Sheet, so it must sit above their overlay) · `z-60` toasts. Never invent other values.

## 8. Icons

`lucide-react`, sizes 16 / 20 / 24 via `size-4 / size-5 / size-6`, `strokeWidth={1.5}`. Icons inherit `currentColor`.

## 9. `tokens.css` shape (reference)

The real file is `packages/ui/src/tokens/tokens.css`; `packages/ui/src/tokens/tokens.ts` mirrors the colours for emails and the PWA manifest. Tailwind's default palette, type scale, fonts, radii and shadows are reset (`--color-*: initial` etc.), so `text-sm` or `bg-gray-100` do not exist. Display/H1 sizes use `clamp()` for the mobile → desktop step.

```css
@import "tailwindcss";

@theme {
  --color-ink: #141414;
  --color-ink-muted: #6b6966;
  --color-canvas: #ffffff;
  --color-surface: #f5f3ef;
  --color-line: #e4e1db;
  --color-accent: #2f4a3a;
  --color-accent-contrast: #ffffff;
  --color-success: #2e7d4f;
  --color-warning: #a56a00;
  --color-danger: #b3261e;
  --color-focus: #141414;

  --font-display: var(--font-display-loaded), Georgia, serif;
  --font-text: var(--font-text-loaded), system-ui, sans-serif;

  --text-h2: 1.75rem;
  --text-h2--line-height: 1.2;
  /* ...one pair per type token... */

  --radius-sm: 4px;
  --radius-md: 8px;

  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
}
```

Hex values are allowed **only** in this file. The UI guard (`scripts/check-ui.mjs`) rejects them everywhere else.

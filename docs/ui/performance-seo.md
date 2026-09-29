# Performance, SEO & PWA

## 1. Performance budgets (mobile, 4G, checked with Lighthouse in CI on key pages)

| Metric                                       | Budget             |
| -------------------------------------------- | ------------------ |
| LCP                                          | < 2.5s             |
| INP                                          | < 200ms            |
| CLS                                          | < 0.1              |
| JS per route (first load)                    | < 170 KB gzipped   |
| Lighthouse Performance / Accessibility / SEO | ≥ 90 / ≥ 95 / ≥ 95 |

## 2. How we hit them

- Server Components by default; client components small and at the leaves.
- Images: `CloudImage` only, explicit aspect ratio (prevents CLS), `sizes` always set, `priority` only on the single LCP image, Cloudinary `f_auto,q_auto`.
- Fonts: `next/font`, max 2 families, `display: swap`, subset latin.
- No heavy libraries on customer pages (charts, editors, date libs) — admin only, and dynamically imported.
- Motion via CSS or Motion's lightweight APIs; never animate layout properties.
- Third-party scripts: none on customer pages in phase 1 except analytics (loaded `afterInteractive`).

## 3. SEO (every public page)

- `generateMetadata`: unique `title` ("Linen Overshirt — Virzeen"), `description` (≤ 155 chars), canonical URL, Open Graph image.
- One `h1`, logical heading order. A whole-page 404, error or offline screen makes its `EmptyState` title the h1 (`titleAs="h1"`).
- Missing pages keep a real 404 title: `generateMetadata` calls `notFound()` for a missing item, so the tab reads "Page not found — Virzeen" ("Not found" in admin, "Order not found" in the account).
- Product pages include JSON-LD `Product` with `image` (the first photo's absolute address) and `offers` (price in NPR, availability).
- `sitemap.ts` lists published products, collections, portfolio projects. `robots.ts` blocks `/admin`, `/preview`, `/account`, `/checkout`, `/api`, `/cart`, `/favourites`, `/login`, `/verify`.
- Clean slugs: `/product/linen-overshirt`, never ids in public URLs.

## 4. PWA

- `manifest.ts`: name, short_name "Virzeen", icons (192, 512, maskable), theme/background colors from tokens.
- Service worker (Serwist): cache static assets and images; never cache `/api`, `/checkout`, `/account`, or HTML for authenticated pages.
- Offline page: brand message, "Try again" (a plain link to the same URL, so it reloads the page that was asked for even without cached scripts) and "Go to the home page".

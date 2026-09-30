# Virzeen — Project Brief

> **Read this first.** This is the complete picture of what Virzeen is, what we're building, which technologies we use and why, how the code is structured, how it's hosted and secured, and how the work is organized. It replaces the original planning conversation (claude.ai chat links can't be opened by Claude Code).
> The other docs hold the detailed, enforceable rules. When this brief and a detailed doc disagree, the detailed doc wins and this brief should be corrected.

---

## Contents

1. Vision
2. Who we serve
3. What we're building (scope)
4. The customer journey
5. The admin journey
6. Technology stack (every tool, its job, and why)
7. Code structure
8. How requests flow (with payment sequences)
9. Hosting & infrastructure
10. Third-party services in detail (Cloudinary, Resend, Upstash, Cloudflare, Sentry, Backblaze B2, Google, eSewa, Khalti)
11. Security model
12. Data model overview
13. Performance, SEO, PWA, and mobile apps
14. Development workflow (GitHub, CI, releases)
15. AI-assisted development system
16. Costs
17. Roadmap and the 20-day plan
18. Risks and mitigations
19. Open decisions for the owner
20. Where to find everything

---

## 1. Vision

Virzeen is a brand. The website is **both the brand's portfolio and its online store** — one experience, not two sites. A visitor should feel the brand story (campaigns, lookbooks, collaborations) and be one tap away from buying what they see.

We borrow proven practices from the best commerce brands:

| From                           | What we take                                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Apple**                      | Product-as-story: large imagery, minimal text, calm layout, the "Buy" action always visible, portfolio and shop feel like one thing                 |
| **Amazon**                     | Speed, trust, and friction removal: fast pages, clear stock and delivery info, total price shown before checkout, simple reorder and order tracking |
| **Leading fashion/D2C brands** | Editorial lookbooks linking to products, size guides, clean variant pickers, generous returns messaging                                             |
| **All of them**                | Mobile first, secure payments handled by specialists, consistent design system, no surprise fees                                                    |

**Quality bar:** it should feel like a big-brand site from day one — fast, beautiful, trustworthy, and secure — while running on a tiny budget.

## 2. Who we serve

- **Phase 1 market: Nepal (domestic).** Most customers browse on phones, often on mobile data. They trust and use **eSewa**, **Khalti**, and **Cash on Delivery (COD)**.
- **Later: cross-border** customers (international shipping, other currencies, Stripe/PayPal).
- **Admin:** the Virzeen owner (and later staff) managing products, portfolio content, and orders.

What customers need from us: honest prices (VAT included, shipping shown before paying), clear stock, fast delivery information, safe payment, easy order tracking, and a site that works well on a mid-range phone.

## 3. What we're building (scope)

### Phase 1 (launch, ~20 days)

**Storefront**

- Home: brand hero, featured collections, featured products, portfolio highlights.
- Shop: category and collection pages, product grid, filters (category, size, color, availability), "Load more".
- Product page: image gallery, name, price, variant pickers (size/color), stock label, sticky "Add to bag" on mobile, description, care info, size guide, related products.
- Favourites: "Favourite" on the product page and a Favourites page; guests keep them in the browser and they move to the account on sign-in (`specs/favourites.md`; moved from phase 2 by the owner on 2026-09-29).
- Cart ("bag"): an "Added to bag" panel after each add + the full bag page (both like Nike's since 2026-09-30), quantity changes, remove with undo, subtotal.
- Checkout: sign-in required (guest cart merges on login), address book, order summary with shipping by zone, payment by COD / eSewa / Khalti.
- Order confirmation page and email.

**Portfolio**

- Portfolio index and project pages (case studies, campaigns, lookbooks) with full-bleed imagery and links to featured products.
- About and contact pages.

**Customer account**

- Sign in with Google or email OTP (no passwords).
- Order history and order detail with status timeline.
- Saved addresses, profile settings.

**Admin panel** (`/admin`, ADMIN role + two-factor authentication)

- Products: create/edit/archive, variants with SKU/price/stock, image upload, publish toggle.
- Categories and collections.
- Portfolio projects.
- Orders: list/filter, detail, status changes (processing → shipped with tracking → delivered), COD collected, cancellations, manual payment re-verification.
- Customers (read-only in phase 1).

**Platform**

- Transactional emails (OTP, order confirmation, shipped, cancelled).
- Installable PWA (Android "Add to Home Screen").
- SEO (metadata, sitemap, product structured data).
- Legal pages: privacy, terms, returns, shipping.

### Explicitly NOT in phase 1

Reviews, coupons/discounts, gift cards, staff role, SMS notifications, automated courier integration, automated refunds, international shipping/currency, native app store builds.

## 4. The customer journey

1. **Discover** — lands on home or a portfolio story (from social media), sees the brand, taps a product.
2. **Decide** — product page shows price (VAT included), sizes with stock, delivery info, returns note.
3. **Add to bag** — picks a size, taps "Add to bag", an "Added to bag" panel drops down confirming it. Works as a guest (cart stored by a secure cookie).
4. **Sign in** — at checkout, signs in with Google or a 6-digit email code. Guest bag merges into their account.
5. **Checkout** — chooses/adds an address (Nepal provinces/districts, 10-digit mobile), sees subtotal + shipping + total calculated by the server.
6. **Pay**
   - **COD:** order confirmed immediately; pays the courier on delivery.
   - **eSewa / Khalti:** redirected to the provider, pays, returns to Virzeen. The server verifies the payment directly with the provider before confirming.
7. **Confirmation** — confirmation page + email with order number (`VZ-YYMMDD-XXXX`).
8. **Track** — account page shows the status timeline; emails on shipping.
9. **Delivery / returns** — marked delivered; returns handled per the returns policy (manual refunds in phase 1).

## 5. The admin journey

1. Signs in (Google/OTP) + TOTP two-factor code.
2. Adds products: details, variants (size/color/SKU/price/stock), uploads images directly to Cloudinary, publishes.
3. Publishes portfolio projects that link to products.
4. Processes orders: sees new paid/COD orders, packs (PROCESSING), ships with courier + tracking number (SHIPPED), marks DELIVERED, marks COD collected.
5. Handles exceptions: re-verifies stuck payments, cancels orders (stock restored), records manual refunds.
   Every admin action is written to an audit log.

## 6. Technology stack

### 6.1 Frontend

| Technology                                    | Job                                                          | Why this choice                                                             |
| --------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------- |
| **Next.js (App Router)**                      | Pages, routing, server rendering, Server Actions, API routes | One framework for frontend + backend; fast server-rendered pages; great SEO |
| **React (Server Components first)**           | UI                                                           | Less JavaScript sent to phones; interactive parts are small "client leaves" |
| **TypeScript (strict)**                       | Language everywhere                                          | Catches mistakes before customers do; shared types front-to-back            |
| **Tailwind CSS v4**                           | Styling                                                      | Fast, consistent styling from design tokens defined in CSS (`@theme`)       |
| **shadcn/ui patterns on Radix**               | Accessible primitives (dialog, sheet, select, radio...)      | Accessibility (keyboard, focus, screen readers) built in; we own the code   |
| **class-variance-authority + tailwind-merge** | Component variants, class merging                            | Clean, predictable variants instead of messy conditional classes            |
| **Motion (Framer Motion)**                    | Subtle animations                                            | Premium feel on portfolio pages; respects reduced-motion                    |
| **lucide-react**                              | Icons                                                        | One consistent icon set                                                     |
| **React Hook Form + Zod**                     | Forms                                                        | Same validation rules on the phone and on the server                        |
| **Storybook**                                 | Component workshop + documentation                           | Source of truth for components; its MCP lets the AI see real props          |
| **next/font**                                 | Font loading                                                 | No layout shift, no external font requests                                  |

### 6.2 Backend (inside Next.js — no separate server)

| Technology                      | Job                                                                | Why                                                                 |
| ------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| **Server Actions**              | Website mutations (add to bag, checkout, admin edits)              | Type-safe, no hand-written API for the web                          |
| **Route Handlers `/api/*`**     | Mobile API (`/api/v1`), payment callbacks, cron jobs, health check | Standard HTTP where needed                                          |
| **`packages/core`**             | All business logic (pricing, cart, orders, stock, payments)        | One place for rules; reused by web and mobile; easy to test         |
| **Better Auth**                 | Sign-in (Google, email OTP), sessions, roles, admin 2FA            | Modern, self-hosted auth with Prisma support; no customer passwords |
| **Zod (`packages/validators`)** | Input validation                                                   | Every boundary validated; shared with forms                         |

### 6.3 Data

| Technology                    | Job                                   | Why                                                |
| ----------------------------- | ------------------------------------- | -------------------------------------------------- |
| **PostgreSQL** (Railway)      | Main database                         | Reliable transactions for orders, stock, and money |
| **Prisma ORM**                | Schema, migrations, type-safe queries | Prevents SQL injection by default; typed models    |
| **Money in paisa (integers)** | All prices/totals                     | No floating-point rounding errors                  |

### 6.4 Services

| Service                     | Job                                                             | Plan                                 |
| --------------------------- | --------------------------------------------------------------- | ------------------------------------ |
| **Railway**                 | Hosts the app, Postgres, and cron services (payments, backups)  | Hobby (~$5/month)                    |
| **Cloudflare**              | DNS, SSL, firewall (WAF), DDoS protection, web analytics        | Free                                 |
| **Cloudinary**              | Product and portfolio image storage, optimization, delivery     | Free (25 credits/month)              |
| **Resend** (+ React Email)  | Transactional email: OTP, order confirmations, shipping updates | Free (3,000/month, 100/day)          |
| **Upstash Redis**           | Rate limiting (login, OTP, checkout, APIs)                      | Free (256 MB, 500K commands/month)   |
| **Sentry**                  | Error tracking with PII scrubbing                               | Free developer plan                  |
| **Backblaze B2**            | Nightly database backups (US West, encrypted, private)          | Free (10 GB, no card)                |
| **Google Cloud (OAuth)**    | "Sign in with Google"                                           | Free                                 |
| **eSewa, Khalti**           | Online payments                                                 | Per-transaction fees, no monthly fee |
| **GitHub + GitHub Actions** | Code, reviews, CI                                               | Free (private repo)                  |

### 6.5 Quality & tooling

| Tool                                                      | Job                                                        |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| pnpm workspaces + Turborepo                               | Monorepo package management and fast cached builds         |
| ESLint (+ jsx-a11y, react-hooks, boundaries, Next plugin) | Code quality, accessibility, layer boundaries              |
| Prettier (+ Tailwind plugin)                              | Formatting and class sorting                               |
| `scripts/check-ui.mjs`                                    | Our UI guard: tokens, images, money, client/server imports |
| Vitest                                                    | Unit and integration tests                                 |
| Playwright                                                | End-to-end tests of critical journeys                      |
| Storybook a11y + Vitest addons                            | Component accessibility and interaction tests              |
| Husky + lint-staged                                       | Checks before every commit/push                            |
| gitleaks, Dependabot, `pnpm audit`                        | Secret scanning and dependency security                    |
| Lighthouse CI                                             | Performance, accessibility, SEO budgets                    |
| Serwist                                                   | PWA service worker                                         |
| Capacitor (phase 4)                                       | Android/iOS app shell around the web app                   |

### 6.6 Rejected alternatives (so we don't revisit them)

- **Shopify/headless platforms:** monthly fees and no native eSewa/Khalti fit.
- **Separate backend (NestJS/Express):** second deployment, CORS/token complexity, extra week of work.
- **Microservices:** built for large teams, far too costly for us.
- **Vercel Hobby:** non-commercial only. **Render free:** database expires, cold starts. **Supabase free:** pauses when idle.
- **Storing card data ourselves:** never. Payments stay with eSewa/Khalti.

## 7. Code structure

One GitHub repository, organized as a **Turborepo monorepo**:

```
virzeen/
├─ apps/
│  ├─ web/                          Next.js: storefront, portfolio, account, admin, API
│  │  ├─ src/
│  │  │  ├─ app/                    ROUTES
│  │  │  │  ├─ (marketing)/         home, about, contact, portfolio/[slug], legal pages
│  │  │  │  ├─ (shop)/              shop, shop/[category], product/[slug], cart, checkout
│  │  │  │  ├─ (auth)/              login, verify
│  │  │  │  ├─ account/             orders, orders/[id], addresses, settings
│  │  │  │  ├─ admin/               dashboard, products, orders, portfolio, customers
│  │  │  │  └─ api/                 auth, v1 (mobile API), payments, cron, health
│  │  │  ├─ client/                 FRONTEND ONLY
│  │  │  │  ├─ components/          ui wrappers, layout (header/footer/nav), shared (Price, CloudImage)
│  │  │  │  ├─ features/            products, cart, checkout, orders, portfolio, admin
│  │  │  │  ├─ hooks/
│  │  │  │  └─ lib/                 auth client, formatters, error messages
│  │  │  ├─ server/                 BACKEND ONLY
│  │  │  │  ├─ actions/             Server Actions (the only server code client may import)
│  │  │  │  ├─ queries/             read-only data for pages
│  │  │  │  ├─ auth/                Better Auth config, session helpers, role guards
│  │  │  │  ├─ security/            rate limits, headers
│  │  │  │  ├─ services/            Cloudinary signing, email sending
│  │  │  │  ├─ env.ts               validated environment variables
│  │  │  │  └─ logger.ts
│  │  │  └─ proxy.ts                request-level route protection
│  │  ├─ public/                    icons, manifest assets
│  │  └─ tests/e2e/                 Playwright journeys
│  └─ mobile/                       Capacitor shell (phase 4)
├─ packages/
│  ├─ core/                         business logic: catalog, cart, pricing, inventory, orders, payments, portfolio, audit
│  ├─ db/                           Prisma schema, migrations, seed, client
│  ├─ validators/                   Zod schemas shared by client and server
│  ├─ ui/                           design tokens, primitives, Storybook
│  ├─ emails/                       React Email templates
│  └─ config/                       shared TypeScript/ESLint config
├─ docs/                            all rules + this brief + examples
├─ scripts/                         repo tooling (UI guard)
├─ .claude/                         AI agent rules, skills, hooks, reviewers
├─ .github/                         CI, templates
├─ .husky/                          git hooks
├─ CLAUDE.md                        AI agent operating manual
├─ turbo.json, pnpm-workspace.yaml, package.json
```

**Layer rule (one direction only):** page → Server Action / API route → `packages/core` service → `packages/db`.
**Boundaries:** client code never touches the database, core, or secrets; it may import only Server Actions. This is enforced by lint rules and the UI guard.

## 8. How requests flow

### Add to bag

Button (client leaf) → `addToCartAction` (auth/guest session → rate limit → Zod) → `cartService.addItem` (transaction: check variant + stock → upsert line → recompute totals from DB) → returns cart → toast + drawer opens.

### COD order

Checkout → `placeOrderAction` → `checkoutService.placeOrder` (transaction: recompute totals, check stock, decrement stock, create order + items + payment `COD_DUE`, order `CONFIRMED`) → confirmation email → confirmation page.

### eSewa payment

1. Server creates order (`PENDING`) + payment attempt with unique `transaction_uuid`, reserves stock for 60 min.
2. Server signs the payment fields (HMAC-SHA256) and returns a form; browser posts it to eSewa.
3. Customer pays on eSewa → redirected to `/api/payments/esewa/success` with encoded data.
4. Server checks the signature, then calls **eSewa's status check API**. Only a completed status with the exact amount marks the order PAID → `CONFIRMED`.
5. Confirmation email once; success page.

### Khalti payment

1. Server creates order + calls **Khalti initiate** (amount in paisa) → gets `pidx` and a payment URL.
2. Customer pays on Khalti → redirected to `/api/payments/khalti/callback`.
3. Server calls **Khalti lookup** with `pidx`. Only `Completed` with the exact amount marks PAID.
4. Khalti has no checkout webhook, so a **reconciliation cron** re-checks pending payments every 10 minutes and releases stock for expired ones.

### Mobile app

The Capacitor app loads the same site; for native screens later it calls `/api/v1/*`, which uses the same `core` services — behavior can never differ between web and app.

## 9. Hosting & infrastructure

### 9.1 Railway (production)

- **Plan:** Hobby, about $5/month with $5 of usage included; usage-based beyond that. **Set a usage limit** in Railway to avoid surprise bills.
- **Region:** Singapore (closest Railway region to Nepal). App and database in the same region.
- **Services:**
  - `web` — Next.js app. Pre-deploy command runs `prisma migrate deploy`. Health check `/api/health`.
  - `postgres` — Railway PostgreSQL.
  - `cron` — small scheduled service calling `/api/cron/reconcile-payments` every 10 minutes with a secret.
- **Deploys:** automatic from the `main` branch after CI passes.
- **Environments:** `production` (live keys), optional `staging` (sandbox keys, separate DB).

### 9.2 Domain and Cloudflare

- Domain: `virzeen.com` and/or `virzeen.com.np` (`.com.np` is free for registered Nepali businesses).
- DNS on Cloudflare, proxied (orange cloud) to Railway's custom domain.
- SSL mode **Full (strict)**, HSTS on, WAF managed rules, bot fight mode, rate limiting on auth endpoints.
- Email DNS records (SPF, DKIM, DMARC) for Resend also live here.

### 9.3 Local development

- Postgres in Docker, sandbox eSewa/Khalti keys, `.env.local` (never committed).
- `pnpm dev` (site), `pnpm storybook` (components).
- Optional free cloud preview while building: Netlify + Neon free tiers (not for production).

### 9.4 Backups and recovery

- Nightly `pg_dump` by a Railway cron service (`db-backup`) → Backblaze B2, about 30-day retention. It runs inside Railway because the database has no public address.
- Monthly restore test. Steps in `docs/runbooks/restore-backup.md`.

### 9.5 Upgrade path

When revenue justifies it: Vercel Pro + Supabase Pro in Mumbai (~$45/month) for top Next.js performance, or scale up Railway. Code doesn't change — only a database dump and redeploy.

## 10. Third-party services in detail

### Cloudinary (images)

- **Used for:** all product and portfolio images.
- **Upload:** admin uploads go **directly from the browser to Cloudinary using signed parameters** generated by our server (secret never leaves the server). Only image types, max 10 MB. Folders: `virzeen/products/<productId>/`, `virzeen/portfolio/<projectId>/`.
- **Delivery:** through our `<CloudImage>` component with automatic format and quality (`f_auto,q_auto`), a small fixed set of widths (e.g. 400/800/1200/1600) and fixed aspect ratios, so we don't create endless transformation variants.
- **Budget:** free plan = 25 credits/month, where 1 credit = 1 GB storage **or** 1 GB bandwidth **or** 1,000 transformations. On the free plan, going over does not bill — images stop being delivered until the next cycle. So: compress originals before upload (max ~2500px), limit widths, watch usage monthly, and upgrade before launch campaigns.
- **Stored in DB:** image URL/public ID + alt text + sort order (never the image itself).

### Resend (email)

- **Used for:** OTP codes, order confirmation, shipped, cancelled, admin alerts (e.g. payment amount mismatch).
- **Setup (done 2026-09-28):** `virzeen.com` verified in Resend (region Tokyo) with DKIM, SPF and DMARC records in Cloudflare. The site sends sign-in codes from `verify@virzeen.com` and everything else from `no-reply@virzeen.com` (owner decision, specs/email-senders.md).
- **Addresses (owner decision 2026-09-28):** the site shows `sales@virzeen.com` for contact and `info@virzeen.com` for general enquiries. Cloudflare Email Routing forwards both to the partners' shared Gmail, which is never shown on the site; the partners reply as `info@`/`sales@` through Resend SMTP. Details: runbooks/email-setup.md.
- **Templates:** React Email in `packages/emails`, branded with our tokens, always with a plain-text version.
- **Limits:** free plan = 3,000 emails/month, max 100/day, counted per recipient, 3 domains (Resend pricing, checked 2026-09-28). **OTP emails count too, and so do the partners' own emails as `info@`/`sales@`**, so a busy day can hit the daily cap — upgrade to Pro (~$20/month, no daily cap) around launch or campaigns.
- **Rules:** emails are sent after the database transaction commits, once per event.

### Upstash Redis (rate limiting)

- **Used for:** limiting OTP requests, login attempts, checkout, add-to-bag, payment callbacks, and the mobile API (limits in `docs/security/security-policy.md` §6).
- **Free tier:** 256 MB, 500K commands/month — plenty for launch.
- Not used as a cache or database for business data.

### Cloudflare

DNS, SSL, WAF, DDoS protection, web analytics (privacy-friendly, free). Our origin (Railway) sits behind it.

### Sentry

Error tracking for server and browser with PII scrubbing enabled. Alerts to the owner's email on new errors.

### Google Cloud

OAuth client for "Sign in with Google". Authorized redirect URLs for local, staging, production only.

### eSewa and Khalti

- **Merchant accounts:** apply on day 1 (business registration documents usually required); approval time is outside our control, so COD makes launch possible even if approval is late.
- **Sandbox keys** for development/staging; **live keys** only in production Railway variables.
- Full rules: `docs/payments/payment-policy.md`.

### Couriers (phase 1: manual)

Admin enters courier name and tracking number when shipping (e.g. Pathao Parcel, Nepal Can Move). API integration is a later phase.

### Environment variables (names only — values live in Railway / `.env.local`)

```
DATABASE_URL
BETTER_AUTH_SECRET, BETTER_AUTH_URL
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
ESEWA_PRODUCT_CODE, ESEWA_SECRET_KEY, ESEWA_BASE_URL
KHALTI_SECRET_KEY, KHALTI_BASE_URL
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
RESEND_API_KEY, EMAIL_FROM
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
CRON_SECRET, SENTRY_DSN, NEXT_PUBLIC_SITE_URL
```

All validated at startup by `apps/web/src/server/env.ts`; the app refuses to start if any are missing.

## 11. Security model

Security is layered so that one mistake doesn't expose everything. Full rules: `docs/security/security-policy.md`.

| Layer              | Protection                                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Edge**           | Cloudflare proxy, SSL Full (strict), HSTS, WAF, DDoS and bot protection                                                                                 |
| **HTTP**           | Strict Content-Security-Policy (only our domains + Cloudinary, eSewa, Khalti, Google, Sentry), no framing, nosniff, strict referrer, permissions policy |
| **Authentication** | Google + email OTP (no customer passwords); httpOnly secure SameSite cookies; OTP expiry and attempt limits; admin TOTP 2FA required                    |
| **Authorization**  | Role checked inside every admin action; ownership checked on every order/address; not-owned resources return "not found"                                |
| **Input**          | Strict Zod validation at every boundary; Prisma queries only; no unsafe HTML                                                                            |
| **Business logic** | Server-calculated prices; stock changes in transactions; order state machine; idempotent updates                                                        |
| **Payments**       | Server-to-server verification, exact amount match, signature checks, reconciliation, never trust redirects, no card/wallet data stored                  |
| **Abuse**          | Upstash rate limits on login, OTP, checkout, callbacks, API                                                                                             |
| **Secrets**        | Only in Railway/GitHub secrets; validated env; gitleaks scanning; AI agents blocked from reading `.env`                                                 |
| **Data**           | Nightly encrypted-at-rest backups (B2), audit log for admin actions, minimal personal data in logs                                                      |
| **Supply chain**   | Dependabot, `pnpm audit` in CI, locked dependencies, justified new packages                                                                             |
| **Accounts**       | 2FA on GitHub, Railway, Cloudflare, domain registrar, eSewa/Khalti, Google, Cloudinary, Resend, Upstash, Sentry                                         |
| **Process**        | PR required for `main`, CI must pass, security-reviewer agent on sensitive changes, owner reviews all payment changes                                   |

## 12. Data model overview

Core entities (full table and rules in `docs/database/data-rules.md`):
**User** (+ Better Auth session tables) · **Address** · **Category** · **Collection** · **Product** · **ProductImage** · **ProductVariant** (SKU, price, stock) · **Cart** / **CartItem** · **Order** (number, statuses, totals, address snapshot) · **OrderItem** (price/name snapshot) · **Payment** (one per attempt, provider reference) · **OrderEvent** (status timeline) · **PortfolioProject** · **AuditLog**.

Key principles: money in paisa; orders store snapshots so history never changes; catalog is archived, never deleted; orders are never deleted.

## 13. Performance, SEO, PWA, and mobile apps

- **Performance budgets (mobile):** LCP < 2.5s, INP < 200ms, CLS < 0.1, first-load JS < 170 KB per route, Lighthouse ≥ 90.
- **How:** server rendering, small client components, optimized Cloudinary images with fixed ratios, `next/font`, no heavy libraries on customer pages.
- **SEO:** unique titles/descriptions, canonical URLs, Open Graph images, product structured data (JSON-LD), sitemap, robots rules blocking admin/account/checkout/api.
- **PWA:** web manifest + Serwist service worker; installable on Android from the browser; never caches checkout, account, or API responses.
- **Apps (phase 4):** Android via Capacitor (or a Trusted Web Activity) on the Play Store; iOS via Capacitor with native features (e.g. push notifications) to meet App Store rules. Same design and code.
  Details: `docs/ui/performance-seo.md`.

## 14. Development workflow

- **GitHub organization** `virzeen`, private repo, 2FA enforced for members.
- **Branches:** `main` = production (protected). Work on `feat/*`, `fix/*`, `chore/*`, `docs/*`; branches live 1–3 days.
- **Pull requests:** template with definition-of-done checklist; CI must pass; owner reviews payment/auth changes.
- **Commits:** Conventional Commits (`feat(cart): …`, `fix(payments): …`).
- **Checks at every stage:** on each edit (format, lint, UI guard) → before commit (lint-staged, UI guard, typecheck, gitleaks) → before push (tests, e2e) → CI (everything + build + migration check + audit + Lighthouse).
- **Releases:** version tags and changelog (Changesets); Railway deploys `main`; rollback by redeploying the previous deployment.
- **Documentation lives with code:** docs change in the same PR as the behavior they describe. Decisions recorded as ADRs; emergencies have runbooks.

## 15. AI-assisted development system

Virzeen is built with Claude Code. The setup makes the agent follow the docs instead of guessing:

| Piece            | Location                                            | Purpose                                                                                             |
| ---------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Operating manual | `CLAUDE.md`                                         | Golden rule, task protocol, routing table, UI essentials, non-negotiables, working style            |
| Known traps      | `docs/ai/common-mistakes.md`                        | Loaded every session; lessons log grows with each correction                                        |
| Auto rules       | `.claude/rules/`                                    | Load automatically for UI, primitives, backend, payments, database, tests                           |
| Workflows        | `.claude/skills/`                                   | build-feature, ui-component, payment-change, db-change, verify-ui, fix-bug                          |
| Canonical code   | `docs/examples/`                                    | Patterns to copy for primitives, stories, pages, forms, services, tests                             |
| Reviewers        | `.claude/agents/`                                   | security-reviewer, ui-reviewer                                                                      |
| Eyes             | `.mcp.json`                                         | Storybook MCP (real components), Playwright MCP (real browser), Context7 MCP (current library docs) |
| Enforcement      | `.claude/hooks/`, `scripts/check-ui.mjs`, `.husky/` | Status injected at start, every edit checked, unsafe git blocked, checks must pass before finishing |

**How the owner works with the agent:** one task per session; ask for a plan first on bigger tasks; write a spec before each feature; when the agent makes a mistake, fix the rule (not just the code) so it can't happen again.

## 16. Costs

| Item                                  | Building (month 0)                   | After launch (approx.)                                         |
| ------------------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| Railway (app + Postgres + cron)       | $0 (local dev)                       | ~$5–10                                                         |
| Cloudflare (DNS, SSL, WAF, analytics) | $0                                   | $0                                                             |
| Backblaze B2 (backups)                | $0                                   | $0 up to 10 GB                                                 |
| Cloudinary                            | $0                                   | $0 → ~$89+ when traffic outgrows 25 credits                    |
| Resend                                | $0                                   | $0 → ~$20 when >100 emails/day                                 |
| Upstash, Sentry, GitHub               | $0                                   | $0                                                             |
| Domain                                | `.com.np` free / `.com` ~$10–15/year | same                                                           |
| eSewa / Khalti                        | $0 monthly                           | per-transaction fees                                           |
| **Total**                             | **~$0**                              | **~$5–10/month at launch**, rising only with real sales volume |

Free-tier limits change; re-check each provider's pricing page before launch.

## 17. Roadmap and the 20-day plan

### 20-day plan (phase 1)

| Days  | Work                                                                                                                                                                                    |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–2   | Monorepo, tooling, CI, env validation, Prisma schema, design tokens; apply for eSewa/Khalti merchant accounts; set up Cloudflare, Cloudinary, Resend, Upstash, Sentry accounts with 2FA |
| 3–5   | Primitives + Storybook; auth (Google, OTP, admin 2FA); admin product CRUD with Cloudinary uploads                                                                                       |
| 6–9   | Portfolio pages, shop listing, product page, cart (drawer + page, guest merge)                                                                                                          |
| 10–13 | Checkout: COD, eSewa sandbox, Khalti sandbox, order state machine, reconciliation cron                                                                                                  |
| 14–15 | Customer account (orders, addresses), order emails, admin order management                                                                                                              |
| 16–17 | Security hardening (headers, rate limits, audit log), PWA, SEO                                                                                                                          |
| 18–19 | E2E tests of all critical journeys, performance tuning, content entry                                                                                                                   |
| 20    | Production setup on Railway + Cloudflare, live keys, smoke test, launch                                                                                                                 |

### Later phases

- **Phase 2 — growth:** reviews, coupons, staff role, SMS notifications (a Nepali SMS provider), better tracking, basic analytics dashboard.
- **Phase 3 — cross-border:** multi-currency display, duties handled upfront (DDP), international shipping, Stripe/PayPal adapters, international address formats, HS codes.
- **Phase 4 — apps:** Capacitor builds for Play Store and App Store, push notifications.

## 18. Risks and mitigations

| Risk                                                      | Mitigation                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| eSewa/Khalti merchant approval delayed                    | Apply day 1; launch with COD; keep sandbox integration ready                                   |
| 20-day deadline slips                                     | Strict phase-1 scope; cut nice-to-haves, never security                                        |
| Payment bugs (double-paid, unpaid shipped)                | Server verification, state machine, idempotency, reconciliation, mandatory tests, owner review |
| Free tier exceeded (Cloudinary credits, Resend daily cap) | Image width limits, monthly usage checks, upgrade before campaigns                             |
| Surprise hosting bill                                     | Railway usage limit + alerts                                                                   |
| Data loss                                                 | Nightly B2 backups, monthly restore test                                                       |
| Leaked secrets                                            | gitleaks, env-only secrets, rotation runbook, AI blocked from `.env`                           |
| AI agent inventing APIs or breaking rules                 | CLAUDE.md protocol, auto rules, hooks, UI guard, examples, reviewers, CI                       |
| Account takeover of a service                             | 2FA on every account                                                                           |

## 19. Open decisions for the owner

- Final brand colors and fonts (◆ placeholders in `docs/ui/design-tokens.md`).
- Domain choice: `.com`, `.com.np`, or both.
- Shipping rates per zone (Kathmandu Valley / outside valley) and delivery-time promises.
- COD maximum order value.
- Returns/refund policy text (days, conditions).
- Business registration, PAN/VAT status (needed for merchant accounts and invoices).
- ~~Security contact email for `SECURITY.md`.~~ Decided 2026-09-28: `info@virzeen.com`.
- Launch product list, photography, and portfolio content.

## 20. Where to find everything

- Rules index: `docs/README.md`
- Current progress: `docs/STATUS.md`
- System design: `docs/architecture.md` · Naming/git: `docs/conventions.md` · Terms: `docs/glossary.md`
- UI: `docs/ui/` (discipline, tokens, catalog, patterns, copy, performance/SEO)
- Backend: `docs/backend/` · Data: `docs/database/` · Payments: `docs/payments/` · Security: `docs/security/` · Testing: `docs/testing/`
- Features: `docs/specs/` · Decisions: `docs/adr/` · Emergencies: `docs/runbooks/`
- AI setup: `CLAUDE.md`, `.claude/`, `AI-DOCS-SETUP.md`

# Project Status

> Update this file at the end of every task. Keep it under 150 lines.
> Newest entries at the top of "Log".

**Phase:** 1 — Foundation + domestic shop (target: 20 days)
**Environment:** local only (Railway production not yet created)
**Owner:** Virzeen founder
**Branch:** `feat/phase-1-foundation` (not yet pushed / no PR)

## Current focus

- [ ] Owner review of the phase-1 build (see "Decisions needed")
- [ ] Production setup: Railway + Cloudflare + service accounts (Day 20 list below)

## 20-day plan

- [x] Days 1–2: monorepo, tooling, CI, env validation (live-site rules), Prisma schema, design tokens — _merchant applications and service accounts are owner tasks: `docs/runbooks/service-setup.md`_
- [x] Days 3–5: auth (Better Auth: email OTP + Google, admin TOTP), admin product CRUD, Cloudinary signed uploads, `pnpm admin` for first admin / lost phone (`docs/runbooks/admin-accounts.md`)
- [x] Days 6–9: portfolio pages, shop listing, product page, cart (drawer + page, guest merge)
- [x] Days 10–13: checkout — COD, eSewa, Khalti, order state machine, reconciliation cron
- [x] Days 14–15: customer account, order emails, admin order management
- [~] Days 16–17: security hardening, PWA, SEO — headers/CSP/rate limits/audit/sitemap/manifest done; **service worker not yet added**
- [~] Days 18–19: e2e tests, performance — e2e suite done; **Lighthouse CI + data caching not yet added**
- [ ] Day 20: launch on Railway

## What works today (verified locally)

- Storefront: home, shop + categories + collections (filters, sort, Load more), product page (variants, stock, JSON-LD), bag drawer/page with undo, portfolio stories, content pages.
- Sign-in with a 6-digit email code (Mailpit locally); Google appears once keys are set. Guest bag merges at sign-in.
- Checkout: COD end to end; eSewa and Khalti flows verified against mock providers (e2e) and unit tests. Totals are server-calculated.
- Account: orders + timeline, addresses, settings. Admin: TOTP enrolment + 12h step-up, dashboard, orders (pack/ship/deliver/cancel/COD collected/refund/re-verify/manual paid), products, categories, collections, portfolio, customers. Every admin write is audited.
- `/api/v1` for the mobile app, `/api/cron/reconcile-payments`, `/api/health`, sitemap, robots, manifest.
- Tests: 17 validators, 103 core (unit + integration on `virzeen_test`), 63 Storybook component + a11y, 3 email, 15 web unit, 14 Playwright journeys (`pnpm test:e2e`, production build against mock eSewa/Khalti).

## Known issues / decisions needed (owner)

- ◆ **Brand**: tokens are monochrome from the logo/posters; fonts are Inter Tight (display) + Inter (text) placeholders. Wordmark is traced from `typo.png` (Mesdag font file has no licence info, so it is not shipped).
- ◆ **Money rules**: shipping Rs 100 valley / Rs 200 outside (`pricing/shipping-rates.ts`), COD limit Rs 20,000 (`pricing/cod-rules.ts`), delivery estimates 1–3 / 3–7 days.
- ◆ **Policy copy**: returns window/conditions, shipping, privacy and terms pages show a "being finalised" notice. About page text, contact email (`client/lib/site.ts`) and `SECURITY.md` address are placeholders.
- ◆ **Catalogue**: products, portfolio stories and photos are local seed samples (grey placeholder photography).
- **Docs conflict**: payment-policy §7 says a COD order refused at the door becomes CANCELLED, but the §3 state table has no SHIPPED → CANCELLED. Implemented the table strictly; refused-at-door orders currently stay SHIPPED. Decide whether to allow SHIPPED → CANCELLED (COD refusal only).
- **Docs conflict**: security-policy §5 (CSP with nonces) forces dynamic rendering, while backend-policies §6 wants cached product pages. Pages are dynamic with a nonce CSP; add data caching (Next 16 `use cache` + tags) as performance work.
- eSewa `transaction_uuid` is `<orderNumber>-<attempt>` (e.g. `VZ-260928-0042-1`), not `VZ-<orderNumber>-<attempt>` (would double the prefix).
- Admin 2FA: Better Auth only challenges password sign-ins, so the TOTP step-up for `/admin` is enforced by `requireAdmin()` with `Session.adminVerifiedAt` (12h).
- Root-level Sentry wizard files (`next.config.js`, `instrumentation*.js`, `sentry.*.config.js`, `pages/`) were created outside the app; Sentry now lives in `apps/web`. Those root files are untracked and can be deleted. Move `.env.sentry-build-plugin` into `apps/web/` (or set `SENTRY_AUTH_TOKEN` in Railway) for source-map uploads.
- Product pages stream behind a loading state, so an unknown product answers 200 with a `noindex` tag (Next.js behaviour) rather than a 404 status. Other unknown URLs return 404.
- `docs/runbooks/restore-backup.md` says to set `MAINTENANCE_MODE=true`, but no maintenance mode exists yet (Day 20 work).
- Not verified with real keys yet (need the owner's accounts): Google sign-in, Cloudinary uploads (signature checked against Cloudinary's documented example), Resend, Upstash.
- Not built yet: service worker (Serwist) + offline page, Lighthouse CI, data caching, Railway/Cloudflare setup (the R2 backup workflow and Dependabot are in `.github/` and switch on once secrets exist).

## Log

- 2026-09-28 — Days 1–5 gap check: added `pnpm admin` (first admin on production, lost-phone reset, revoke; audited, tested), live-site env rules (the app refuses sandbox payments, http, Mailpit or the memory limiter on a real domain; the sandbox would have let anyone "pay" with eSewa's public test account), Cloudinary signature test, service-setup and admin-accounts runbooks.

- 2026-09-28 — First full e2e run found three real bugs, now fixed with tests: guest-bag merge ran twice when layout and page rendered together (checkout crashed); Better Auth's built-in 3-per-minute code limit with one shared IP bucket would have blocked concurrent customers; Undo in the bag drawer sat behind the modal. Next: owner decisions, production setup.
- 2026-09-28 — Local dev prints email sign-in codes in the dev-server terminal as well as Mailpit (owner request; localhost + development only, security-policy.md §9).
- 2026-09-28 — Phase 1 build: monorepo, design system (21 primitives + Storybook), core logic (pricing, cart, stock, state machine, checkout, eSewa/Khalti/COD, reconciliation), storefront, auth, checkout, account, admin, `/api/v1`, emails, seed data, e2e journeys. Next: owner decisions above, then production setup.
- 2026-09-28 — Docs pack added.

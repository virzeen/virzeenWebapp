# Project Status

> Update this file at the end of every task. Keep it under 150 lines.
> Newest entries at the top of "Log".

**Phase:** 1 — domestic shop, **launch in 4 days (deadline set 2026-09-28), cash on delivery only**
**Environment:** local only (Railway production not yet created). Domain: `virzeen.com`
**Owner:** Virzeen founder
**Branch:** `feat/phase-1-foundation` → PR #1 (https://github.com/virzeen/virzeenWebapp/pull/1)

## Launch plan (4 days, COD only)

- [ ] Day 1: COD-only launch mode + per-product shipping folded into prices ✅; PWA (install + offline page), maintenance mode, data caching. Owner: accounts (Railway, Cloudflare + virzeen.com, Resend, Upstash, Cloudinary; Google optional), returns policy + contact details.
  - [x] Email sending (owner, 2026-09-28): Resend verified `virzeen.com` (Tokyo) + DMARC; partners send as `info@`/`sales@` from the shared Gmail through Resend SMTP (test delivered). Site: sign-in codes from `verify@`, everything else from `no-reply@` (`EMAIL_FROM_AUTH`, built). `docs/runbooks/email-setup.md`
  - [x] Email receiving (owner, 2026-09-28): Cloudflare Email Routing forwards `info@` and `sales@` to the shared Gmail; catch-all off.
  - [ ] Email follow-ups (owner, today): Gmail "edit info" → reply-to address on both send-as addresses; "Show original" shows SPF/DKIM/DMARC pass; Gmail filter "Never send to Spam" for forwarded mail.
  - [x] Contact page shows `sales@` (orders and sizing) + `info@` (everything else) instead of `hello@` (`SITE.salesEmail` / `SITE.infoEmail`; checked at 360/768/1280, 2026-09-28).
  - [x] Replies to site emails go to `sales@` (`EMAIL_REPLY_TO`, built 2026-09-28); `SECURITY.md` → `info@` (owner, 2026-09-28).
  - [ ] Resend Pro from launch day (recommended to the owner 2026-09-28; free plan fine until then).
  - [~] Google sign-in (owner, 2026-09-28): Google Cloud project "Virzeen", OAuth web client with localhost + `https://virzeen.com` origins/callbacks, keys in `apps/web/.env.local`; button shows on `/login` and hands off to Google correctly (checked 360/768/1280). Still (details in `runbooks/service-setup.md` "Google sign-in"): owner test sign-in; Railway `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`; before launch a separate "Virzeen Dev" client for localhost (Google policy: no test servers in the production client), support email off the shared Gmail, second partner as Owner; at launch a privacy policy covering Google sign-in, then Publish app.
  - [x] Sign-in pages (owner, 2026-09-28): email first, then "Continue with Google" with a black "G" (owner's choice; Google's guidelines ask for the colour "G"), no "or" divider, no helper line; the code page shows six boxes (new `CodeInput` primitive, digits in regular weight, paste and phone autofill work).
- [x] Day 2 (2026-09-28): live on https://virzeen.com.
  - Railway project "abundant-harmony": web + Postgres in Singapore, deploys `main`.
  - Cloudflare DNS: apex CNAME, "DNS only" for now; HTTPS certificate issued by Railway.
  - Production variables set: Resend, Upstash, Cloudinary, email senders.
  - First admin granted with `pnpm admin grant` (the owner's personal address). The admin two-factor setup shows a QR code; backup codes appear on request.
  - [ ] Railway GitHub App on the `virzeen` GitHub account, so pushes to `main` deploy by themselves. Until then a deploy needs `railway service source connect --branch main` or a dashboard deploy.
  - [ ] Cloudflare proxy on (orange cloud) with SSL "Full (strict)". The client IP code is ready for it (`server/security/client-ip.ts`).
  - [ ] Railway ignored the `deploy` section of `railway.json` (no pre-deploy migrations, no health check), so `pnpm start` applies migrations itself. Look into it when moving to `.railway/railway.ts` before 2026-12-01; that needs the `railway` npm SDK added to the repo.
- [ ] Day 3: owner enters real products/photos in `/admin`; speed checks, policy pages final.
- [ ] Day 4: smoke test on the live site (real COD order), fixes, launch.

## After launch (planned, owner will confirm timing)

- **~1 month after launch: eSewa and Khalti.** Built and tested (unit + e2e against mocks) but switched off: no keys set, so checkout shows cash on delivery only. To turn on: merchant keys + live URLs in Railway (`docs/runbooks/service-setup.md`), the Railway `cron` service for `/api/cron/reconcile-payments`, one small real payment each, then restore wallet wording on home/about/product/shop/footer/privacy/terms/returns pages (removed 2026-09-28).
- Lighthouse CI; COD limit review (currently none) once online payments exist.
- **By December 2026: replace Gmail "Send mail as"** for `info@`/`sales@` — Google ends it for outside addresses in January 2027 (options in `docs/runbooks/email-setup.md`). Receiving is not affected.

## Build history (original 20-day plan)

- [x] Days 1–2: monorepo, tooling, CI, env validation (live-site rules), Prisma schema, design tokens — _merchant applications and service accounts are owner tasks: `docs/runbooks/service-setup.md`_
- [x] Days 3–5: auth (Better Auth: email OTP + Google, admin TOTP), admin product CRUD, Cloudinary signed uploads, `pnpm admin` for first admin / lost phone (`docs/runbooks/admin-accounts.md`)
- [x] Days 6–9: portfolio pages, shop listing, product page, cart (drawer + page, guest merge)
- [x] Days 10–13: checkout — COD, eSewa, Khalti, order state machine, reconciliation cron
- [x] Days 14–15: customer account, order emails, admin order management
- [x] Days 16–17: security hardening, PWA, SEO — headers/CSP/rate limits/audit/sitemap/manifest, service worker + offline page (`public/sw.js`)
- [~] Days 18–19: e2e tests, performance — e2e suite done; **Lighthouse CI + data caching not yet added**
- [x] Day 20: on Railway (2026-09-28); public launch follows the 4-day plan above

## What works today (verified locally)

- Storefront: home, shop + categories + collections (filters, sort, Load more), product page (variants, stock, JSON-LD), bag drawer/page with undo, portfolio stories, content pages.
- Sign-in with a 6-digit email code (Mailpit locally); Google appears once keys are set. Guest bag merges at sign-in.
- Checkout: COD end to end, shipping shown as free (included in product prices). eSewa and Khalti are built and verified against mock providers, but switched off until month 2. Totals are server-calculated.
- Account: orders + timeline, addresses, settings. Admin: TOTP enrolment + 12h step-up, dashboard, orders (pack/ship/deliver/cancel/COD collected/refund/re-verify/manual paid), products, categories, collections, portfolio, customers, settings (name, sign-in security, sign out). Every admin write to shop data is audited (an admin's own name on Settings uses the same profile action as `/account/settings`, not audited).
- `/api/v1` for the mobile app, `/api/cron/reconcile-payments`, `/api/health`, sitemap, robots, manifest.
- Tests: 18 validators, 106 core (unit + integration on `virzeen_test`), 63 Storybook component + a11y, 3 email, 15 web unit, 14 Playwright journeys (`pnpm test:e2e`, production build against mock eSewa/Khalti).

## Known issues / decisions needed (owner)

- ◆ **Brand**: tokens are monochrome from the logo/posters; fonts are Inter Tight (display) + Inter (text) placeholders. Wordmark is traced from `typo.png` (Mesdag font file has no licence info, so it is not shipped).
- **Money rules (decided 2026-09-28)**: shipping is a per-product amount entered in admin and included in the displayed price; customers see "Free shipping". No COD order limit. Delivery estimates 1–3 days (Kathmandu Valley) / 3–7 days (elsewhere) confirmed 2026-09-28.
- **Policy copy (owner, 2026-09-28)**: returns (7 days, no fee; unworn/tags/packaging, free pickup, refund within 5 working days by bank or wallet, free size exchange) confirmed. Shipping, privacy and terms are published without the draft notice. Privacy lists the services that handle customer data (Railway, Cloudflare, Resend, Upstash, Sentry, Google) and the `info@` contact. About keeps a neutral brand story the owner may replace. Contact page shows `sales@` + `info@`; `SECURITY.md` uses `info@`.
- ◆ **Catalogue**: the live site has no products yet; the owner adds them in `/admin` (Day 3). Local development uses seed samples with grey placeholder photos.
- **COD refused at the door** (owner decision 2026-09-28): admin "Refused at door" on a shipped COD order cancels it, fails the cash payment and restores stock (`orderService.markRefusedAtDoor`; payment-policy §3 table and §7 updated).
- **Docs conflict**: security-policy §5 (CSP with nonces) forces dynamic rendering, while backend-policies §6 wants cached product pages. Pages are dynamic with a nonce CSP; add data caching (Next 16 `use cache` + tags) as performance work.
- eSewa `transaction_uuid` is `<orderNumber>-<attempt>` (e.g. `VZ-260928-0042-1`), not `VZ-<orderNumber>-<attempt>` (would double the prefix).
- **Sign-in code failures** (fixed 2026-09-28): Better Auth 1.7.6 swallows `sendVerificationOTP` errors (`runInBackgroundOrAwait` only logs them). `server/auth/otp-delivery.ts` records a failed send during the request, and the auth route answers 503 `DELIVERY_FAILED`, so the form says to try again instead of "code sent". The owner is moving to Resend Pro (no daily cap).
- Admin 2FA: Better Auth only challenges password sign-ins, so the TOTP step-up for `/admin` is enforced by `requireAdmin()` with `Session.adminVerifiedAt` (12h).
- Root-level Sentry wizard files (`next.config.js`, `instrumentation*.js`, `sentry.*.config.js`, `pages/`) were created outside the app; Sentry now lives in `apps/web`. Those root files are untracked and can be deleted. Move `.env.sentry-build-plugin` into `apps/web/` (or set `SENTRY_AUTH_TOKEN` in Railway) for source-map uploads.
- Product pages stream behind a loading state, so an unknown product answers 200 with a `noindex` tag (Next.js behaviour) rather than a 404 status. Other unknown URLs return 404.
- Not verified on the live site yet: a full Google sign-in (Railway has no `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` yet) and Cloudinary uploads (keys set, first product upload pending). Resend and Upstash work: the owner's sign-in on 2026-09-28 sent the code email and passed the Upstash rate limit.
- Not built yet: Lighthouse CI, data caching. The R2 backup workflow and Dependabot are in `.github/` and switch on once secrets exist.

## Log

- 2026-09-29 — Admin settings and sign out (owner request): "Sign out" in the admin header, new last nav item "Settings" (`/admin/settings`: name form shared with `/account/settings`, read-only sign-in security with the next code time and the lost-phone note, sign out; no authenticator reset on the website). One `SignOutButton`/`useSignOut` now does every sign-out; admin e2e covers settings and sign out from the admin header and account settings.
- 2026-09-28 — Google sign-in keys set locally with the owner (redirect verified). Sign-in pages reworked on the owner's request: email first, Google second (black "G"), six-box code entry via new `CodeInput` primitive (+7 Storybook tests incl. paste; found and fixed a paste bug where "482 913" lost a digit). Review then found five more: `CodeInput` is now controlled (`Controller` in verify-form, so reset/resend clear the boxes), a paste replaces the whole code, the hidden caret stays at the end, focus is an outline (visible in Windows contrast themes), and a wrong/expired code is a field error (red boxes) instead of the top Alert.
- 2026-09-28 — Email set up with the owner: Resend sending (`virzeen.com`, Tokyo, DMARC `p=none`), Cloudflare Email Routing (`info@`, `sales@` → shared Gmail), partners reply as those addresses via Gmail "Send mail as" + Resend SMTP. Built `EMAIL_FROM_AUTH` so sign-in codes come from `verify@` (spec `specs/email-senders.md`; +2 core, +4 web unit tests). New `runbooks/email-setup.md`. Then: contact page shows `sales@` + `info@`, order emails and alerts get Reply-To `sales@` (`EMAIL_REPLY_TO`, `mailer.test.ts` covers both transports; sign-in code emails get none, so replies can't carry live codes into the shared inbox — found in review), `SECURITY.md` → `info@`. Next: email follow-ups in the launch plan.
- 2026-09-28 — Owner: launch in 4 days with COD only; eSewa/Khalti about a month later. Added `Product.shippingPaisa` (admin enters product price + shipping; customers pay and see the sum, with "Free shipping"), removed the COD limit, removed wallet wording from customer pages, CI secret scan via gitleaks CLI. PR #1 opened.

- 2026-09-28 — Days 1–5 gap check: added `pnpm admin` (first admin on production, lost-phone reset, revoke; audited, tested), live-site env rules (the app refuses sandbox payments, http, Mailpit or the memory limiter on a real domain; the sandbox would have let anyone "pay" with eSewa's public test account), Cloudinary signature test, service-setup and admin-accounts runbooks.

- 2026-09-28 — First full e2e run found three real bugs, now fixed with tests: guest-bag merge ran twice when layout and page rendered together (checkout crashed); Better Auth's built-in 3-per-minute code limit with one shared IP bucket would have blocked concurrent customers; Undo in the bag drawer sat behind the modal. Next: owner decisions, production setup.
- 2026-09-28 — Local dev prints email sign-in codes in the dev-server terminal as well as Mailpit (owner request; localhost + development only, security-policy.md §9).
- 2026-09-28 — Phase 1 build: monorepo, design system (21 primitives + Storybook), core logic (pricing, cart, stock, state machine, checkout, eSewa/Khalti/COD, reconciliation), storefront, auth, checkout, account, admin, `/api/v1`, emails, seed data, e2e journeys. Next: owner decisions above, then production setup.
- 2026-09-28 — Docs pack added.

# Architecture

## System overview

```
Customer (browser / installed PWA / Capacitor app)
        │  HTTPS
        ▼
Cloudflare (DNS, SSL Full-strict, WAF, DDoS)
        │
        ▼
Railway — service "web" (Next.js, Singapore)
   ├── pages (React Server Components)          → frontend
   ├── server actions + /api routes             → backend entry points
   └── packages/core (business logic) ──► packages/db (Prisma) ──► Railway Postgres
                         │
                         ├──► eSewa / Khalti APIs (payments)
                         ├──► Cloudinary (images)
                         ├──► Resend (email)
                         └──► Upstash Redis (rate limits)
Railway — service "cron": calls /api/cron/* with a secret (payment reconciliation)
Railway — service "db-backup": nightly pg_dump over the private network → Backblaze B2
GitHub Actions: CI on every PR
```

## Monorepo layout

| Path                  | Role                                                 | May import from                                                                                             |
| --------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app`    | Routes. Pages render UI; `api/` holds HTTP endpoints | `client`, `server`, `@virzeen/ui`, `@virzeen/validators`                                                    |
| `apps/web/src/client` | Frontend components, feature UI, hooks               | `@virzeen/ui`, `@virzeen/validators`, other `client`, and **only** Server Actions from `@/server/actions/*` |
| `apps/web/src/server` | Server actions, queries, auth, security              | `@virzeen/core`, `@virzeen/db`, `@virzeen/validators`                                                       |
| `apps/mobile`         | Capacitor shell loading the web app                  | nothing from packages at runtime                                                                            |
| `packages/core`       | All business logic, pure services                    | `@virzeen/db`, `@virzeen/validators`, `@virzeen/emails`                                                     |
| `packages/db`         | Prisma schema, migrations, client singleton          | nothing internal                                                                                            |
| `packages/validators` | Zod schemas and inferred types                       | nothing internal                                                                                            |
| `packages/ui`         | Primitives, tokens, Storybook                        | nothing internal                                                                                            |
| `packages/emails`     | React Email templates                                | `@virzeen/ui` tokens only                                                                                   |

These boundaries are enforced by `eslint-plugin-boundaries`. A violation fails CI.

## The layer rule

```
page / component  →  server action or /api route  →  core service  →  db
     (client)              (server, thin)            (logic)       (data)
```

- Pages never query the database.
- Actions and routes never contain business rules.
- Core services never read cookies, headers, or request objects; callers pass what they need.

## Web vs mobile

- Web uses Server Actions for mutations and server-side queries for reads.
- The mobile app uses `/api/v1/*` (see `backend/api-contract.md`). Both call the same `core` services, so behavior can never drift.

## Environments

| Env        | Where                    | Branch                          | Payments     | Data                    |
| ---------- | ------------------------ | ------------------------------- | ------------ | ----------------------- |
| local      | your machine             | any                             | sandbox keys | local Postgres (Docker) |
| staging    | Railway env "staging"    | `staging` (optional in phase 1) | sandbox keys | separate DB             |
| production | Railway env "production" | `main`                          | live keys    | production DB           |

## Environment variables

Validated at startup by `apps/web/src/server/env.ts` with the schema in `env-schema.ts` (Zod, unit-tested). The app refuses to boot if one is missing or malformed.
Names only — values live in Railway / `.env.local` (never committed). Keep `.env.example` in sync.

```
DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
ESEWA_PRODUCT_CODE, ESEWA_SECRET_KEY, ESEWA_BASE_URL, ESEWA_STATUS_URL,
KHALTI_SECRET_KEY, KHALTI_BASE_URL, ALLOW_SANDBOX_PAYMENTS,
CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
EMAIL_TRANSPORT, RESEND_API_KEY, EMAIL_FROM, EMAIL_FROM_AUTH, EMAIL_REPLY_TO, MAILPIT_URL, OWNER_ALERT_EMAIL,
RATE_LIMIT_STORE, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN,
CRON_SECRET, SENTRY_DSN, NEXT_PUBLIC_SITE_URL
```

**Live-site rules.** A production build on a real domain (not localhost) must use https, `EMAIL_TRANSPORT=resend`, `RATE_LIMIT_STORE=upstash`, and the live eSewa/Khalti endpoints with a merchant product code (not `EPAYTEST`). Sandbox payments on the live site would let anyone "pay" with eSewa's public test account. A staging site on sandbox keys sets `ALLOW_SANDBOX_PAYMENTS=true`. Local production builds (e2e tests) are exempt.

## Configuration-driven features (decided during the phase-1 build)

`env.ts` always requires the site URL, database, auth secret, email sender/owner inbox, cron secret, and the keys for the chosen `EMAIL_TRANSPORT` (`resend` | `mailpit`) and `RATE_LIMIT_STORE` (`upstash` | `memory`). Production defaults are `resend` + `upstash`.
Google sign-in, eSewa, Khalti, Cloudinary uploads and Sentry switch themselves off (with a startup warning in production) when their keys are missing, so the shop can launch with COD while merchant approvals are pending.
`CLOUDINARY_CLOUD_NAME` and `SENTRY_DSN` are exposed to the browser through `next.config.ts` (`NEXT_PUBLIC_*`); both are public identifiers, not secrets. Env is validated at build time too (Railway injects variables into builds).

## Rendering and caching

`src/proxy.ts` sets a per-request CSP nonce (security-policy.md §5), which makes every page dynamically rendered. Data is read per request from Postgres; tag-based data caching (`use cache` + `cacheTag`, revalidated by admin actions) is the planned performance step. Static metadata routes (robots, manifest, icons, OG image) are prerendered.

## Local development services

`docker compose up -d` starts Postgres on **5434** (databases `virzeen`, `virzeen_test`, `virzeen_e2e`) and Mailpit on **8025** (inbox for OTP and order emails). The e2e suite builds the app into `.next-e2e`, runs it on port 3100 against `virzeen_e2e`, and fakes eSewa/Khalti with `apps/web/tests/e2e/mock-providers.mjs` on port 4010.

## Core configuration

`packages/core` never reads env or requests. `apps/web/src/server/bootstrap.ts` calls `configureCore()` (site URL, mailer, logger, provider settings, `fetch`) once per process; tests inject fakes the same way.

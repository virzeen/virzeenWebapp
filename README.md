# Virzeen

Brand portfolio + online store for Virzeen — _timeless monochromium experience._
Nepal first (Cash on delivery, eSewa, Khalti), built to grow into cross-border and native apps.

Start with [`docs/project-brief.md`](docs/project-brief.md) (why and what), then [`docs/STATUS.md`](docs/STATUS.md) (where things stand). AI agents follow [`CLAUDE.md`](CLAUDE.md).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Radix primitives + Storybook · Prisma 7 + PostgreSQL · Better Auth (email code, Google, admin TOTP) · React Email · Upstash rate limits · Sentry · pnpm + Turborepo.

```
apps/web            storefront, portfolio, account, admin, /api (Next.js)
packages/core       all business logic (pricing, cart, stock, orders, payments)
packages/db         Prisma schema, migrations, seed
packages/validators Zod schemas shared by browser and server
packages/ui         design tokens + primitives + Storybook
packages/emails     React Email templates
docs/               the rules — read before changing anything
```

## First-time setup

Requirements: Node 24, pnpm 11, Docker.

```bash
pnpm install
docker compose up -d                 # Postgres on :5434 (+ test DBs), Mailpit inbox on :8025
cp .env.example apps/web/.env.local  # then set BETTER_AUTH_SECRET and CRON_SECRET (see comments)
pnpm db:migrate                      # apply migrations
pnpm db:seed                         # sample catalogue, portfolio and an admin (SEED_ADMIN_EMAIL)
pnpm dev                             # http://localhost:3000
```

Sign in with any email: the 6-digit code arrives in Mailpit at http://localhost:8025.
The seeded admin (`admin@virzeen.local` by default) is asked to set up an authenticator app on first visit to `/admin`.

Optional services switch on when their keys are in `.env.local`: Google sign-in, eSewa/Khalti (sandbox values are in `.env.example`), Cloudinary uploads, Resend, Upstash, Sentry.

## Commands

| Command                                              | What it does                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `pnpm dev`                                           | Web app with hot reload                                            |
| `pnpm storybook`                                     | Component workshop + MCP on :6006                                  |
| `pnpm turbo run lint typecheck test`                 | All checks (core integration tests use `virzeen_test`)             |
| `pnpm test:e2e`                                      | Production build + Playwright journeys against mocked eSewa/Khalti |
| `node scripts/check-ui.mjs --all`                    | UI rules guard (tokens, images, money, imports)                    |
| `pnpm db:migrate` / `db:studio` / `db:reset:local`   | Database tasks (reset is local-only)                               |
| `pnpm admin list` / `grant` / `reset-2fa` / `revoke` | Admin accounts ([runbook](docs/runbooks/admin-accounts.md))        |

## Deploying (Railway)

Service `web`: build `pnpm install --frozen-lockfile && pnpm --filter @virzeen/web build`, pre-deploy `pnpm db:deploy`, start `pnpm start`, health check `/api/health`, region Singapore.
Set every variable from `.env.example`; the app refuses to start on a real domain with local or sandbox settings (production uses `EMAIL_TRANSPORT=resend`, `RATE_LIMIT_STORE=upstash`, live payment keys, `ESEWA_BASE_URL=https://epay.esewa.com.np`, `ESEWA_STATUS_URL=https://esewa.com.np`, `KHALTI_BASE_URL=https://khalti.com/api/v2`).
Service `cron`: every 10 minutes `curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/reconcile-payments`.
Put Cloudflare in front (SSL Full-strict). Details: `docs/architecture.md`, `docs/adr/0002-railway-hosting.md`.
Service accounts and keys: [runbook](docs/runbooks/service-setup.md).
First admin: `pnpm admin grant <owner email> --yes` against the production database ([runbook](docs/runbooks/admin-accounts.md)); the seed is local-only.

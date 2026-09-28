# Runbook: Admin accounts (first admin, lost phone, removing access)

Admin rights are changed only from the command line, by someone with database access. The website has no screen for it, on purpose. Every change signs the person out everywhere and is written to `AuditLog`. Code: `packages/core/src/admin/admin-accounts.ts`, command: `packages/core/scripts/admin.ts`.

```bash
pnpm admin list                 # who is an admin, and whether their authenticator is set up
pnpm admin grant <email>        # make an admin (creates the account if that email never signed in)
pnpm admin reset-2fa <email>    # lost or replaced phone: set up the authenticator again
pnpm admin revoke <email>       # remove admin rights (refused for the last admin)
```

By default it uses `DATABASE_URL` from `apps/web/.env.local` (your local database). It prints the database host and name, never the password. Changes to a database that isn't on your computer need `--yes`.

## Against production

1. In Railway, open the Postgres service and copy its **public** connection URL (`DATABASE_PUBLIC_URL`). The private URL only works inside Railway.
2. In a terminal at the repo root (PowerShell):
   ```powershell
   $env:DATABASE_URL = "<public connection URL>"
   pnpm admin list
   pnpm admin grant owner@yourdomain.com --yes
   Remove-Item Env:DATABASE_URL
   ```
3. Check the line starting `Database:` shows the production host before you add `--yes`.

## First admin (launch day)

1. `pnpm admin grant <owner email> --yes` against production.
2. The owner opens `/login`, signs in with the emailed code (or Google), then opens `/admin`.
3. `/admin` asks them to set up an authenticator app (Google Authenticator, 1Password, etc.) and enter a code. After that, `/admin` asks for a fresh code every 12 hours.

## Lost or replaced phone

1. Confirm the request really comes from that person (call them), because this removes their second factor.
2. `pnpm admin reset-2fa <email> --yes`.
3. They sign in with the emailed code and set up the authenticator again at `/admin`.

## Someone leaves

`pnpm admin revoke <email> --yes`. Their sessions end immediately. Then remove them from Railway, Cloudflare, GitHub and the payment dashboards (security-policy.md §10).

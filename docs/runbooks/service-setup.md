# Runbook: Setting up the service accounts (owner, before launch)

Each service below gives you values for Railway's variables (names as in `.env.example`). Turn on two-factor sign-in for every account (security-policy.md §10). Keep secrets in Railway and a password manager only, never in chat, email or the repo.

The site starts without any of the optional services: Google sign-in, eSewa, Khalti and image uploads each switch on when their keys are set.

## Apply first (slow approvals)

- **eSewa merchant** and **Khalti merchant**: apply as a business. Expect to provide business registration documents. Approval can take a while, so apply now. The shop can launch with cash on delivery meanwhile.
  - When approved: eSewa gives a product code and secret key (`ESEWA_PRODUCT_CODE`, `ESEWA_SECRET_KEY`), Khalti a live secret key (`KHALTI_SECRET_KEY`).
  - Live URLs: `ESEWA_BASE_URL=https://epay.esewa.com.np`, `ESEWA_STATUS_URL=https://esewa.com.np`, `KHALTI_BASE_URL=https://khalti.com/api/v2`. The app refuses to start on the live domain with sandbox values.

## Then, in any order

| Service          | What to create                                                                                                                  | Variables                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Cloudflare**   | Add the domain, switch its nameservers at the registrar, SSL mode "Full (strict)"                                               | none                                                                   |
| **Railway**      | Project with `web` + Postgres + `cron` services, region Singapore (README "Deploying")                                          | `DATABASE_URL` (linked from Postgres) and everything else below        |
| **Resend**       | Add your domain, add the DNS records it shows in Cloudflare, wait for "Verified", create an API key with sending access         | `RESEND_API_KEY`, `EMAIL_FROM` (an address on the verified domain)     |
| **Upstash**      | A Redis database in the region closest to Singapore; copy the REST URL and token                                                | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                   |
| **Cloudinary**   | Sign up; the dashboard shows the cloud name, API key and API secret (no upload preset needed, uploads are signed by the server) | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **Sentry**       | The project already exists (org `virzeen`); copy its DSN, and create an auth token for source maps                              | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`                                      |
| **Google Cloud** | See below                                                                                                                       | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                             |

Also set: `NEXT_PUBLIC_SITE_URL` and `BETTER_AUTH_URL` (`https://` + your domain), `BETTER_AUTH_SECRET` and `CRON_SECRET` (long random strings, see `.env.example`), `OWNER_ALERT_EMAIL`.

## Google sign-in

1. Google Cloud Console → a new project "Virzeen" → **OAuth consent screen**: app name Virzeen, your support email, the logo, links to `/privacy` and `/terms`. Scopes: email, profile, openid.
2. **Credentials → Create OAuth client ID → Web application**:
   - Authorised JavaScript origin: `https://<your domain>`
   - Authorised redirect URI: `https://<your domain>/api/auth/callback/google`
   - For local testing, also add `http://localhost:3000` and `http://localhost:3000/api/auth/callback/google`.
3. Copy the client ID and secret into Railway (and `apps/web/.env.local` for local testing). "Continue with Google" appears on `/login` after the next restart.
4. Publish the consent screen (move it out of "Testing"), otherwise only listed test users can sign in.

## After everything is set

1. Deploy, then run `pnpm admin grant <owner email> --yes` against production (runbooks/admin-accounts.md).
2. Smoke test on the live domain: sign in, place a cash-on-delivery order, check the email arrives, upload a product image in `/admin`, then one small real eSewa and Khalti payment.

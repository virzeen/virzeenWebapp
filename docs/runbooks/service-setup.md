# Runbook: Setting up the service accounts (owner, before launch)

Each service below gives you values for Railway's variables (names as in `.env.example`). Turn on two-factor sign-in for every account (security-policy.md §10). Keep secrets in Railway and a password manager only, never in chat, email or the repo.

The site starts without any of the optional services: Google sign-in, eSewa, Khalti and image uploads each switch on when their keys are set.

## Apply first (slow approvals)

- **eSewa merchant** and **Khalti merchant**: apply as a business. Expect to provide business registration documents. Approval can take a while, so apply now. The shop can launch with cash on delivery meanwhile.
  - When approved: eSewa gives a product code and secret key (`ESEWA_PRODUCT_CODE`, `ESEWA_SECRET_KEY`), Khalti a live secret key (`KHALTI_SECRET_KEY`).
  - Live URLs: `ESEWA_BASE_URL=https://epay.esewa.com.np`, `ESEWA_STATUS_URL=https://esewa.com.np`, `KHALTI_BASE_URL=https://khalti.com/api/v2`. The app refuses to start on the live domain with sandbox values.

## Then, in any order

| Service          | What to create                                                                                                                                       | Variables                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Cloudflare**   | `virzeen.com` is registered with Cloudflare, so its DNS is already there. SSL mode "Full (strict)". Email Routing is set up: runbooks/email-setup.md | none                                                                                                    |
| **Railway**      | Project with `web` + Postgres + `cron` services, region Singapore (README "Deploying"); nightly backups: runbooks/database-backups.md                | `DATABASE_URL` (linked from Postgres) and everything else below                                         |
| **Resend**       | Domain verified 2026-09-28 (runbooks/email-setup.md). Still to do: a `website` API key with Sending access limited to `virzeen.com`                  | `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_AUTH`, `EMAIL_REPLY_TO` (values in runbooks/email-setup.md) |
| **Upstash**      | A Redis database in the region closest to Singapore; copy the REST URL and token                                                                     | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                                                    |
| **Cloudinary**   | Sign up; the dashboard shows the cloud name, API key and API secret (no upload preset needed, uploads are signed by the server)                      | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`                                  |
| **Sentry**       | The project already exists (org `virzeen`); copy its DSN, and create an auth token for source maps                                                   | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`                                                                       |
| **Google Cloud** | See below                                                                                                                                            | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                                                              |

Also set: `NEXT_PUBLIC_SITE_URL` and `BETTER_AUTH_URL` (`https://` + your domain), `BETTER_AUTH_SECRET` and `CRON_SECRET` (long random strings, see `.env.example`), `OWNER_ALERT_EMAIL` (the partners' shared Gmail, not a forwarded address — runbooks/email-setup.md).

## Google sign-in

Status 2026-09-28: project "Virzeen" (owned by the shared Gmail) with one Web client holding both localhost and `https://virzeen.com`; keys in `apps/web/.env.local`, redirect to Google verified. The Google Cloud console requires two-step sign-in on every account that uses it.

1. console.cloud.google.com → new project **Virzeen** → menu → **Google Auth Platform** → **Get started**: App name `Virzeen`; User support email (users see it — see step 5); Audience **External**; Contact information (Google's notices, not shown to users); agree → **Create**.
2. **Clients → Create client → Web application**:
   - Authorized JavaScript origins: `https://virzeen.com`
   - Authorized redirect URIs: `https://virzeen.com/api/auth/callback/google` (exact match — no `www`, no trailing slash)
3. The **Client secret is shown only once**, at creation: copy it (or download the JSON) into the password manager, then Railway `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Lost it? Client → Add secret → switch → disable and delete the old one. "Continue with Google" appears on `/login` once both are set.
4. **Local testing uses its own client.** Google's policy says production clients must not include test servers: before launch, create a second project **Virzeen Dev** with a Web client for `http://localhost:3000` + `http://localhost:3000/api/auth/callback/google`, put that pair in `apps/web/.env.local`, and remove the localhost entries from the production client. Changes can take 5 minutes to a few hours to apply (`redirect_uri_mismatch` right after saving is usually that).
5. **Before publishing:** change the User support email (Branding) away from the shared Gmail — either a Google account created on `info@virzeen.com` (the sign-up code arrives through forwarding) that is added as project Owner and selected while signed in as it, or a Google Group it manages. Also give the second partner Owner access (IAM & Admin → IAM → Grant access → Basic → Owner).
6. **At launch**, once `https://virzeen.com` and a privacy policy that covers Google sign-in are live: Branding → Authorized domains `virzeen.com`, app home page / privacy / terms links → Audience → **Publish app**. Only email/profile/openid are used, so no app verification is needed; until the brand is verified Google shows "virzeen.com" instead of the name and logo.
7. **After launch (optional):** verify `virzeen.com` in Google Search Console (DNS TXT record in Cloudflare), upload a 120×120 logo, **Verify branding** (minutes, or 2–3 working days if reviewed manually) so customers see "Virzeen" and the logo.
8. **Mobile app (later):** Google blocks sign-in inside app WebViews (`disallowed_useragent`); the Capacitor app must open Google sign-in in the system browser (Custom Tabs / SFSafariViewController) and return via an app link.

The sign-in button uses a black "G" by owner choice (2026-09-28); Google's branding guidelines ask for the standard colour "G" — swap the fills in `client/features/auth/google-icon.tsx` if Google ever asks.

## After everything is set

1. Deploy, then run `pnpm admin grant <owner email> --yes` against production (runbooks/admin-accounts.md).
2. Smoke test on the live domain: sign in, place a cash-on-delivery order, check the email arrives, upload a product image in `/admin`, then one small real eSewa and Khalti payment.

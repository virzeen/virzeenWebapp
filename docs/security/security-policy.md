# Security Policy

## 1. Secrets

- Secrets live only in Railway variables (runtime) and GitHub Actions secrets (CI). Local development uses `.env.local` (gitignored).
- `.env.example` lists names with fake values only.
- Nothing secret uses the `NEXT_PUBLIC_` prefix.
- `gitleaks` runs in CI and pre-commit. A leaked secret is rotated immediately, even if the commit is reverted.
- AI agents never read `.env*` files (enforced by `.claude/settings.json`).

## 2. Authentication (Better Auth)

- Methods: Google OAuth and email OTP. No passwords for customers in phase 1.
- Session cookies: `httpOnly`, `secure`, `sameSite=lax`. Session rotated on login and role change.
- OTP: 6 digits, expires in 10 minutes, max 5 attempts, rate-limited per email and IP.
- Admins must enable TOTP two-factor. Admin routes reject sessions without 2FA.
- How it is enforced: Better Auth's two-factor plugin only challenges password sign-ins, so `/admin` requires `role = ADMIN`, `twoFactorEnabled`, and a TOTP code verified in the current session within 12 hours (`Session.adminVerifiedAt`, set by `verifyAdminTotpAction`). The step-up is rate-limited (5 / 10 min per admin).
- Admin rights and authenticator resets are changed only with `pnpm admin` by someone with database access, never from the website (`docs/runbooks/admin-accounts.md`). Each change ends the person's sessions and is audited.
- Only the auth endpoints the site uses are reachable over HTTP (`app/api/auth/[...all]/route.ts` allowlist: send code, sign in with code, social sign-in + callback, get session, sign out). `/two-factor/*`, password-reset and account-management endpoints return 404; enrolment happens through server actions only.

## 3. Authorization

- Check the role inside every admin action and route (`requireRole("ADMIN")`), not only in `proxy.ts` or the layout.
- Ownership checks on every customer resource: an order/address is returned only if `userId === session.userId`.
- Return `NOT_FOUND` (not `FORBIDDEN`) for resources the user doesn't own, so ids can't be probed.

## 4. Input and output

- Zod validation at every boundary with `.strict()`.
- Prisma only; no unsafe raw SQL.
- React escapes output by default; never use `dangerouslySetInnerHTML` except for sanitized admin rich text (DOMPurify).
- File uploads go directly to Cloudinary via signed upload params; allow only image types, max 10 MB.

## 5. HTTP security headers (set in `next.config.ts`)

- `Content-Security-Policy` with nonces; allow only self, Cloudinary, eSewa, Khalti, Google OAuth, Sentry.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, mic, geolocation off), `frame-ancestors 'none'`.

## 6. Rate limits (Upstash)

| Endpoint            | Limit                                    |
| ------------------- | ---------------------------------------- |
| OTP request         | 3 / 10 min per email, 10 / 10 min per IP |
| Login verify        | 5 / 10 min per email                     |
| Add to cart         | 60 / min per session                     |
| Checkout            | 10 / 10 min per user                     |
| Payment callbacks   | 30 / min per IP                          |
| `/api/v1/*` general | 120 / min per IP                         |

The OTP limits run in `app/api/auth/[...all]/route.ts` before Better Auth. Better Auth's own limiter stays on for its other endpoints (60 / min per IP); its built-in OTP rules are switched off because they are per IP only and would block real customers signing in at the same time.

"Per IP" means the address from `server/security/client-ip.ts`, and every limiter uses it, Better Auth included: the first `x-forwarded-for` entry, which Railway's edge sets and a visitor can't forge. `cf-connecting-ip` is used only when that entry is a Cloudflare edge address, because anyone can send it straight to Railway. IPv6 is limited per /64, the block one customer controls.

## 7. Edge protection (Cloudflare)

Proxy on, SSL "Full (strict)", WAF managed rules, bot fight mode, rate limiting on `/api/auth/*`. Origin only accepts traffic via Cloudflare where possible.

## 8. Dependencies and supply chain

Dependabot weekly, `pnpm audit` in CI (fail on high/critical), lockfile committed, new dependencies justified in PR.

## 9. Logging and privacy

No secrets, tokens, OTPs, or full personal data in logs. One owner-approved exception (2026-09-28): in local development (`NODE_ENV=development` and a localhost site URL) sign-in codes are also printed in the dev-server terminal (`server/auth/auth.ts`); never in production. Sentry PII scrubbing enabled. Admin actions recorded in `AuditLog`. Privacy policy page describes what is stored and why.

## 10. Accounts that must have 2FA

GitHub (org-enforced), Railway, Cloudflare, domain registrar, eSewa/Khalti merchant, Google Cloud, Cloudinary, Resend, Upstash, Sentry.

## 11. OWASP quick checklist for reviews

Broken access control · injection · auth failures · sensitive data exposure · security misconfiguration · vulnerable dependencies · SSRF (never fetch user-supplied URLs server-side) · CSRF (Server Actions verify origin; don't disable it) · mass assignment (strict schemas, explicit Prisma `data` objects).

## 12. Reporting

See `SECURITY.md` at the repo root.

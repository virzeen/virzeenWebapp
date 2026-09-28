# Spec: Email senders

**Status:** Built
**Owner approval:** Virzeen owners, 2026-09-28 (senders; Reply-To `sales@` added the same day)
**Related docs:** backend/backend-policies.md §9, security/security-policy.md §2, architecture.md "Environment variables", runbooks/email-setup.md

## Goal

Sign-in codes arrive from their own address, `verify@virzeen.com`, so customers learn that codes only ever come from there (easier to spot fake "Virzeen" emails, search for and allow-list). Order emails and owner alerts keep coming from `no-reply@virzeen.com`. Every site email ends with "Questions? Reply to this email", so replies go to `sales@virzeen.com`, which reaches the partners' inbox.

## User flow

1. A customer asks for a sign-in code on `/login` (Better Auth's `/api/auth/email-otp/send-verification-otp`; there is no `/api/v1` sign-in route).
2. The code email arrives from `Virzeen <verify@virzeen.com>`.
3. Later, their order emails arrive from `Virzeen <no-reply@virzeen.com>`.
4. When they press Reply on an order email, the reply is addressed to `sales@virzeen.com`. Code emails get no Reply-To (see below).

## Acceptance criteria

- [x] Given `EMAIL_FROM_AUTH` is set, when a sign-in code is sent, then it is sent from `EMAIL_FROM_AUTH`.
- [x] Given `EMAIL_FROM_AUTH` is set, when an order email or owner alert is sent, then it is sent from `EMAIL_FROM`.
- [x] Given `EMAIL_FROM_AUTH` is unset or blank, when a sign-in code is sent, then it is sent from `EMAIL_FROM` (nothing breaks for an environment that hasn't set it).
- [x] Given `EMAIL_REPLY_TO` is set, when an order email or owner alert is sent, then its Reply-To is `EMAIL_REPLY_TO`; unset or blank means no Reply-To.
- [x] A sign-in code email never has a Reply-To, so a reply or auto-reply quoting a live code can't reach the shared inbox (a reply goes to `verify@` and bounces). Found in review 2026-09-28.
- [x] `EMAIL_REPLY_TO` must be a bare email address; anything else stops the app at startup.
- [x] Both transports behave the same (Resend in production, Mailpit locally).

## Out of scope

- Checking that the sender's domain is verified in Resend; a wrong value still only fails at send time, as with `EMAIL_FROM`.
- Other per-type Reply-To rules beyond "none on sign-in codes".
- The code email's footer still says "Reply to this email" (shared layout); changing it is an owner copy decision (STATUS.md).

## UI

- None. Email templates are unchanged.

## Data & API

- Models touched: none.
- New/changed validators: `EMAIL_FROM_AUTH` (optional) and `EMAIL_REPLY_TO` (optional email) in `apps/web/src/server/env-schema.ts`.
- Core: `OutgoingEmail.sender?: "auth"`; `notifications.sendOtp` sets it. Core still never sees an address; the web mailer maps `sender` to one (`apps/web/src/server/services/email-sender.ts`) and adds the Reply-To (`mailer.ts`).
- `/api/v1` changes: none.

## Edge cases

- `EMAIL_FROM_AUTH` given as a bare address or as `Name <address>` — both work, like `EMAIL_FROM`.
- Railway variable present but empty — treated as unset (falls back / no Reply-To).

## Tests

- Unit: `mailer.test.ts` (both transports: From per email type, Reply-To on order emails, none on codes or when unset), `email-sender.test.ts` (address choice, fallback, Reply-To rule), `env-schema.test.ts` (blank means unset; Reply-To must be an address), core `notifications.test.ts` (sign-in code marked `auth`, owner alert not) and `checkout.service.test.ts` (order email not marked).
- E2E: the journeys run with `EMAIL_FROM_AUTH` and `EMAIL_REPLY_TO` set, through Mailpit.

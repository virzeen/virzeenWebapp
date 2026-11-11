# Spec: Sign-in v2 (email first, code, create account, optional password)

**Status:** Built, branch `feat/checkout-v2`
**Owner approval:** owner, 2026-11-11 in chat (Nike screenshots and the messages after them)
**Related docs:** `docs/checkoutfeatures.md` §3.2–3.4, §8; `security/security-policy.md` §2, §6; `specs/sign-in-code.md` (the code screen it replaces)

## Goal

One email box decides what happens next: a registered email gets an emailed 6-digit code (or its password), a new email is taken to "Now let's make you a MONO Member." A password is optional and is set later in Settings.

## Flow

1. `/login`: email (`FloatingInput`) → Continue. The server says whether the email is registered and whether it has a password (`identifyEmailAction`, 10 a minute per IP), then a code is sent.
2. Registered → `/verify`: "Enter the 6-digit code sent to your email." + the email and **Edit** (back to `/login` with that email typed in). One field; the sign-in continues by itself at the sixth digit. The resend countdown ("30s") sits **inside the field at its end**, then becomes a resend icon. **Use Password** appears only when the member has one: password field (show/hide), "Forgot password?" and "Email me a code instead" go back to the code.
3. New email → `/signup`: code (same field), First Name, Last Name, Shopping Preference (Home, Clothing, Both), optional Date of Birth, a pre-ticked marketing tick, a required terms tick. **No password field.** Create Account stays disabled until valid; it signs in with the code (naming the account), saves the details, and opens **the member's profile** (`/account`), whatever page they came from. Their bag is kept.
4. Settings → Password (`/account/settings/password`): set a first password, or change it with the current one. At least 8 characters, typed twice. Not offered to admins.
5. **Favourites without signing in** goes straight to `/login?next=/shop`; after signing in the customer lands on New and Featured. (A new account still ends on the profile.) What a guest saved in the browser moves into the account at sign-in.

## Rules

- A password sign-in has one message for every failure ("That email and password don't match."): unknown email, no password set, wrong password, admin. Limited per IP (20 / 10 min) and per email (5 / 10 min, shared with code checks).
- Admins never sign in with a password and can't set one: their way in is the code plus the authenticator step-up (`requireAdmin`). `identify` reports no password for them, `passwordSignInAction` refuses them, Settings → Password redirects them.
- Nobody can create an account with a password (`disableSignUp`). The `/api/auth` route still exposes only the code, Google and sign-out endpoints; password sign-in and change run in server actions.
- Terms agreement is recorded (`User.termsAcceptedAt`); marketing is a separate tick and never required.

## Data

`User`: `shoppingPreference` (`HOME | CLOTHING | BOTH`, optional), `birthday` (date, optional), `marketingOptIn` (default false), `termsAcceptedAt`. Migration `20261111120000_member_profile` (additive).

## UI

New primitive option: `FloatingInput endAdornment` (a countdown or an icon button inside the box), with `WithCountdown` and `WithResendIcon` stories. Feature component `ResendCode` (seconds, then the icon) is shared by `/verify` and `/signup`. `CodeInput` (six boxes) stays in the library but is no longer used by sign-in.

## Out of scope

Password reset by email link (a code sign-in plus Settings does it), saved-address cards in checkout, the Monochrome Pass, claiming a guest order after sign-up.

## Tests

Core: `memberService` (identify, admin, profile, hasPassword). Validators: unchanged schemas covered by the e2e. E2E `sign-in-v2.spec.ts`: create an account (details saved), profile, set a password, "Use Password" (wrong then right), Edit keeps the email, no password button without a password, resend countdown then icon; `favourites.spec.ts`: Favourites while signed out → login → New and Featured.

# Spec: Sign-in code entry

**Status:** Built
**Owner approval:** Requested by the owners 2026-09-29 ("check the code as soon as the 6th digit is in, show clearly whether it's right — the best UX"); the details below follow the build brief of the same day.
**Related docs:** security/security-policy.md §2 and §6, ui/content-style.md "Sign-in code", ui/components-catalog.md (`CodeInput`), ui/design-tokens.md §5, ui/patterns.md §4

## Goal

On `/verify` the customer types, pastes or autofills the 6-digit code from their email and is signed in without pressing a button. The page shows at once whether the code is right and, when it isn't, lets them simply type it again.

## User flow

1. On `/login` the customer enters their email and presses "Continue with email"; `/verify` opens with the code field focused. The line under the boxes, read out with the field, says they'll be signed in as soon as all 6 digits are in.
2. They enter the sixth digit (or paste, or accept the phone's suggestion). The boxes go quiet and read-only, and "Checking your code…" shows under them.
3. Right code: the boxes turn green, "Code accepted. Signing you in…", and the next page opens.
4. Wrong code: the boxes turn red and shake once, the message says so, and a moment later the boxes empty with the cursor still in them. The message goes when they type the first new digit.
5. Expired code, too many wrong codes, or a problem on our side: see the criteria. Once its 60-second wait is over, "Send a new code" is the way out, except after "Too many attempts": then only waiting helps (see Edge cases).

## Acceptance criteria

- [x] Given `/verify` loads, then the code field has focus.
- [x] Given fewer than six digits, nothing is sent. Given the sixth digit is typed, pasted or autofilled, the code is checked once, with no button (there is no "Sign in" button).
- [x] Enter submits too (the code is the form's only field, so the browser submits it). Enter with fewer than six digits shows "Enter the 6-digit code we sent to your email", shakes the boxes and sends nothing.
- [x] While a code is checked, the digits stay visible, the field is read-only and keeps focus, and a spinner with "Checking your code…" shows. Typing, pasting and Enter are ignored: one request per code.
- [x] Right code: the boxes turn `border-success`, "Code accepted. Signing you in…" shows with a check icon, then `router.replace(next)` and `router.refresh()`. That look stays until the next page shows.
- [x] `INVALID_OTP` / `INVALID_CODE`: the field error is "That code isn't right. Check it and try again.", and the boxes turn red and shake once (not with reduced motion). After 0.5 s the boxes empty and focus is still in the field. The error stays until the first new digit; Enter during the 0.5 s before the boxes empty doesn't clear it.
- [x] `OTP_EXPIRED`: the field error is "That code has expired. Send a new one.", and the boxes empty.
- [x] `TOO_MANY_ATTEMPTS` (Better Auth, 403): the field error is "Too many wrong codes. Send a new code to try again.", and the field stays disabled until a new code is sent. Focus moves to "Send a new code". If that is still waiting out its 60 seconds, focus moves when the wait ends, unless the person has gone elsewhere.
- [x] 429 (our limiter or Better Auth's): an `Alert` shows "Too many attempts. Please wait a few minutes and try again." with "Try again". The digits are kept and the field isn't marked wrong.
- [x] Anything else (offline, 5xx, no answer within 15 s, unknown): an `Alert` shows "Something went wrong on our side. Please try again." with "Try again", which checks the same digits again. The digits are kept.
- [x] "Send a new code" is available 60 s after the page loads or after the last resend. A resend empties the field, clears errors and alerts, reopens a disabled field and focuses it, and shows the toast "We sent a new code".
- [x] While a new code is being sent, the field is read-only and Enter is ignored, so no code is checked while the old one is replaced. A resend that fails shows the `Alert` (without "Try again") and puts focus back on "Send a new code".
- [x] Screen readers are told each state by one polite live region under the boxes: "Checking your code…", "Code accepted…", or the field error. `FormField`'s error text isn't live, so the region repeats it visually hidden; reading the page line by line therefore passes the error twice. Alerts announce themselves.
- [x] The field's helper text, "We'll sign you in as soon as all 6 digits are in.", says the code is checked without a button (WCAG 3.2.2). It is the field's description, so a screen reader reads it when the field takes focus, before any digit is typed. It gives way to the field error while one shows. The label stays "6-digit code".
- [x] Contrast on canvas: `success` 5.05:1 (the green borders and the "accepted" text), `ink-muted` 5.74:1 (the "checking" text).

## Out of scope

- The admin authenticator step (`/admin/verify`) keeps its own form and "Verify" button.
- Showing how many tries are left; changing Better Auth's attempt limit or our rate limits.

## UI

- Screens/components affected: `app/(site)/(auth)/verify/page.tsx` (intro), `client/features/auth/verify-form.tsx`.
- Primitives: `CodeInput` gains `onComplete`, `status` (`checking` / `success`) and `errorKey` (replays the shake); the new token `--animate-shake`. Also `FormField` (helper text), `Alert`, `Button`, `VisuallyHidden`, and lucide `Loader2` / `CheckCircle2` icons.
- Differences from patterns.md §4, for this field only: there is no submit button (Enter still works), and the code is validated on submit, not on blur, so a half-typed code doesn't turn red while the customer fetches it from their email.
- States: the page is rendered on the server, so there is no loading state. Checking, accepted and the errors above; copy in content-style.md "Sign-in code".

## Data & API

- Models, validators, core services, `/api/v1`: none. The form calls Better Auth's `/api/auth/sign-in/email-otp` and `/api/auth/email-otp/send-verification-otp` through `authClient`.
- Where each error goes (field, `Alert`, or shutting the field): `codeCheckFailure()` in `client/features/auth/auth-errors.ts`.

## Edge cases

- Better Auth 1.7.6 with `allowedAttempts: 5`: wrong tries 1–5 on a code answer 400 `INVALID_OTP`. The next try on that code, right or wrong, answers 403 `TOO_MANY_ATTEMPTS` and deletes the stored code, so every later try answers `INVALID_OTP` until a new code is sent. After a reload the field isn't shut, but "Send a new code" still fixes it.
- Our limiter (`login:email`, 5 per 10 minutes, sliding window) counts every check for the email. So in practice the sixth check within 10 minutes gets our 429 before Better Auth's 403, and the wait can be up to 10 minutes, not one. A new code doesn't help: its check counts against the same limit, and the resend spends one of the 3 sends per 10 minutes (`otp:email`).
- A check or resend with no answer within 15 s is dropped by the page and shown as the "Something went wrong" `Alert`. The server may still finish it: a dropped resend's email can still arrive, and its code works; a dropped check the server accepted has used up the code, so "Try again" then says it isn't right and a new code is needed.
- If the person edits a rejected code within 0.5 s, the auto-clear is cancelled and their edit stays. Pasting a new full code over a rejected one checks it straight away.
- Reduced motion: no shake, while the red boxes and the message still show. Windows contrast themes: the borders take system colours, so the status line and error text carry the state; focus is an outline.

## Tests

- Unit: `apps/web/src/client/features/auth/auth-errors.test.ts` (which errors go to the field, the `Alert` or the lock, and the copy for each).
- Component (Storybook stories run by `pnpm --filter @virzeen/ui test`), `code-input.stories.tsx`:
  - `Checking`: read-only, keeps focus, ignores typing and paste.
  - `CompletingTheCode`: `onComplete` fires once for six typed digits and once for a paste, never for fewer.
  - `SetByThePage`: `onComplete` doesn't fire for a value set by the page.
  - `WrongCode`: a new `errorKey` replays the shake without replacing the input or moving focus.
- E2E: `tests/e2e/auth.spec.ts`: a wrong code shows "That code isn't right…" (Enter while it is checked sends nothing more: one check), the boxes empty with focus kept, then the right code signs in (two checks in all). Every other journey signs in through `completeEmailSignIn` (`tests/e2e/helpers.ts`), which fills the six digits and waits to leave `/verify`, with no button.

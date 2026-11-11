# Security review checklist

Go through this yourself, in the main session, before committing any change to auth, payments, orders, admin, API routes or server actions. Never hand it to a subagent (owner rule 2026-11-11, CLAUDE.md §6).

1. Read `docs/security/security-policy.md` and `docs/payments/payment-policy.md`.
2. Get the diff with `git diff main...HEAD` (and `git diff` for unstaged work).
3. Check every changed entry point for: authentication, role/ownership checks, rate limiting, strict Zod validation, and that logic lives in `packages/core`.
4. For payment code check: amount from server only, verification before PAID, exact amount match, idempotent conditional updates, transitions only via `order-state.ts`, paisa/rupee conversion only in adapters, no secrets or raw payloads logged.
5. Check for secrets in code, `NEXT_PUBLIC_` misuse, unsafe raw SQL, `dangerouslySetInnerHTML`, SSRF, missing `server-only`, client importing server code.

Report a list of findings, each with: severity (critical/high/medium/low), file:line, the policy section it violates, and a concrete fix. If nothing is found, say so explicitly and list what you checked. Fix the findings before committing; payment changes still need the owner's PR review.

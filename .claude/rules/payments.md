---
paths:
  - "packages/core/src/payments/**"
  - "packages/core/src/orders/**"
  - "packages/core/src/inventory/**"
  - "packages/core/src/pricing/**"
  - "apps/web/src/app/api/payments/**"
  - "apps/web/src/app/api/cron/**"
  - "apps/web/src/server/actions/checkout*"
---

# Payment rules (summary of docs/payments/payment-policy.md — read the FULL doc before any change here)

- STOP and ask the owner before changing: the state machine, amount handling, verification steps, or refund logic.
- An order is PAID only after server-side verification (eSewa status API / Khalti lookup) AND the verified amount equals `order.totalPaisa`.
- Redirect/callback query params are untrusted input. They only tell you which payment to verify.
- Status changes only via `order-state.ts`. Transitions are idempotent: fulfilling an already-paid order is a no-op.
- Khalti amounts are paisa. eSewa `total_amount` is rupees with 2 decimals. Convert only in the provider adapter, never elsewhere.
- Every change here needs unit tests for success, failure, amount mismatch, replay, and pending cases.
- Run the `security-reviewer` agent on the diff before committing.

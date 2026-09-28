---
name: payment-change
description: The mandatory workflow for any change touching payments, checkout, orders, order status, stock reservation, refunds, reconciliation, or the eSewa/Khalti/COD adapters in Virzeen. Use it whenever those words appear or files under packages/core/src/payments, orders, inventory, pricing, or app/api/payments are involved — even for a one-line fix.
---

# Payment change workflow

Payment bugs lose money or ship unpaid goods, so this path is slower on purpose.

1. Read `docs/payments/payment-policy.md` in full, plus `docs/security/security-policy.md` §1, §3, §6.
2. State which section(s) of the policy the change touches. If the change would alter any rule in the policy (state machine, amounts, verification, refunds), stop and get explicit owner approval, then update the policy text first.
3. Write or update unit tests FIRST for: success, failure/cancel, amount mismatch, invalid signature (eSewa), duplicate callback, pending → reconciliation, expiry → stock restored. Mock provider HTTP.
4. Implement in the provider adapter / core service only. Callback routes stay thin: parse → call `verify` → redirect.
5. Confirm:
   - amount conversion (paisa ↔ rupees) happens only inside the adapter,
   - every status change goes through `order-state.ts`,
   - writes are conditional (idempotent) and inside a transaction.
6. Run tests, then run the `security-reviewer` agent on the diff and resolve its findings.
7. Mark the PR "needs owner review". Never self-merge payment changes.
8. Update `docs/STATUS.md`.

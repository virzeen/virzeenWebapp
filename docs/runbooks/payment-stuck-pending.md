# Runbook: Customer paid but order shows PENDING

1. Get the order number from the customer. Open it in `/admin/orders`.
2. Check the `Payment` rows: provider, `providerRef`, status, last verification time.
3. Wait up to 5 minutes — reconciliation may resolve it. Check the cron service logs in Railway.
4. Manually trigger verification from the admin order page ("Re-verify payment"). This uses the same code path as callbacks.
5. If the provider says completed but verification fails:
   - Amount mismatch → do NOT mark paid. Compare amounts in the provider dashboard and contact the owner.
   - Provider API error → check provider status page, retry later.
6. If the provider dashboard shows the money received and the owner approves, find that attempt in the order's **Payment attempts** table (match the provider and reference) and press its **Mark paid**, with the provider reference as the reason. Never mark another attempt: an order can have several open at once (Pay now), and the real payment would then look like a second payment to refund. This creates an `OrderEvent` ("Attempt N: Manual: …") with the admin as actor. Only possible while the order still waits for payment; a payment for a closed order is refunded instead (payment-policy §10).
7. Reply to the customer with the updated status. Add a note to `docs/STATUS.md` → Known issues if it happened more than once.

# Runbook: Customer paid but order shows PENDING

1. Get the order number from the customer. Open it in `/admin/orders`.
2. Check the `Payment` rows: provider, `providerRef`, status, last verification time.
3. Wait up to 10 minutes — reconciliation may resolve it. Check the cron service logs in Railway.
4. Manually trigger verification from the admin order page ("Re-verify payment"). This uses the same code path as callbacks.
5. If the provider says completed but verification fails:
   - Amount mismatch → do NOT mark paid. Compare amounts in the provider dashboard and contact the owner.
   - Provider API error → check provider status page, retry later.
6. If the provider dashboard shows the money received and the owner approves, use "Mark paid (manual)" with the provider reference as the reason. This creates an `OrderEvent` with the admin as actor.
7. Reply to the customer with the updated status. Add a note to `docs/STATUS.md` → Known issues if it happened more than once.

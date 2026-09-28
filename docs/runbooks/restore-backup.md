# Runbook: Restore the database from backup

1. Put the site in maintenance mode (Railway: set `MAINTENANCE_MODE=true`, redeploy).
2. Download the latest good dump from Cloudflare R2 (`virzeen-backups/YYYY-MM-DD.dump`).
3. Restore into a NEW Railway Postgres instance first, never over the live one:
   `pg_restore --no-owner --no-privileges -d "$NEW_DATABASE_URL" backup.dump`
4. Verify: row counts for Order, Payment, Product; latest order timestamp; log in as admin locally against it.
5. Point the `web` service `DATABASE_URL` to the new database, redeploy, turn maintenance mode off.
6. Reconcile payments made between the backup time and the incident using the eSewa/Khalti dashboards.
7. Keep the old database for 7 days before deleting. Write a short incident note in `docs/STATUS.md`.

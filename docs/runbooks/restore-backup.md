# Runbook: Restore the database from backup

Backups come from the Railway cron service `db-backup`: one `pg_dump` (custom format) every night at 02:00 Nepal time, kept about 30 days in the private Backblaze B2 bucket `Virzeen` (runbooks/database-backups.md). Each file is named after the UTC time it was taken: `2026-09-29T2015Z.dump` is from 02:00 on 30 September, Nepal time.

The Railway databases have no public address. To reach one from a PC, install the Railway CLI, run `railway link` in the repo folder, then `railway connect <database service> --tunnel-only`: it prints a local connection URL and keeps the tunnel open until Ctrl+C. `pg_restore` must be at least the PostgreSQL version that made the dump (`PG_MAJOR` in `ops/db-backup/Dockerfile`, now 17).

1. Put the site in maintenance mode (Railway: set `MAINTENANCE_MODE=true`, redeploy).
2. Download the latest good dump: Backblaze → **Buckets** → `Virzeen` → **Upload/Download** → the file → **Download**.
3. Restore into a NEW Railway Postgres instance first, never over the live one. In Railway, **New → Database → PostgreSQL**; open a tunnel to it (`railway connect <new database> --tunnel-only`) and, in a second terminal:
   `pg_restore --no-owner --no-privileges -d "<URL printed by the tunnel>" 2026-09-29T2015Z.dump`
4. Verify: row counts for Order, Payment, Product; latest order timestamp; log in as admin locally against it.
5. Point `DATABASE_URL` of both the `web` and `db-backup` services to the new database (`${{<new database>.DATABASE_URL}}`), redeploy, turn maintenance mode off.
6. Reconcile payments made between the backup time and the incident using the eSewa/Khalti dashboards.
7. Keep the old database for 7 days before deleting. Write a short incident note in `docs/STATUS.md`.

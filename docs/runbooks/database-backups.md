# Runbook: Nightly database backups (Railway cron → Cloudflare R2)

The Railway cron service `db-backup` dumps the production database every night at 02:00 Nepal time (20:15 UTC) and uploads the dump to a private Cloudflare R2 bucket. The database has no public address, so the job runs inside the Railway project and reaches Postgres over the private network (`postgres.railway.internal`). Railway's own backups need the Pro plan. Code: `ops/db-backup/` (`Dockerfile`, `backup.sh`, `aws-config`). Restoring: runbooks/restore-backup.md.

Keep the R2 keys in Railway and the password manager only, never in chat, email or the repo. The dumps hold customer data (names, addresses, orders), so the privacy page's list of services must include the storage provider.

## What the job does

- Waits up to 60 seconds for the database, then checks its PostgreSQL version. If the database is newer than the job's `pg_dump`, the run fails and says which `PG_MAJOR` to set in `ops/db-backup/Dockerfile`.
- `pg_dump --format=custom --no-owner --no-privileges`, checked with `pg_restore --list` before upload.
- File name = the UTC time of the run: `2026-09-29T2015Z.dump` is the backup taken at 02:00 on 30 September, Nepal time.
- The log shows only `Uploaded <file> (<size> bytes)`. Any problem fails the run, and Railway shows it as a failed cron run.
- The job never deletes anything. R2's lifecycle rule removes backups after 30 days.

## 1. Cloudflare R2 (storage)

Cloudflare asks for a payment method before R2 can be switched on, even on the free tier (10 GB).

1. Cloudflare → **R2 Object Storage** → **Create bucket**: name `virzeen-backups`, Location → **Asia-Pacific** (a location hint can't be changed later).
2. The bucket → **Settings** → Public access: leave the **R2.dev subdomain** disabled and add no custom domain.
3. The bucket → Settings → **Object Lifecycle Rules** → **Add rule**: applies to all objects, delete objects **30 days** after upload. Keep the default rule that cleans up unfinished uploads.
4. R2 Object Storage → Account Details → API Tokens → **Manage** → **Create Account API token**: name `railway-db-backup`, Permissions **Object Read & Write**, **Apply to specific buckets only** → `virzeen-backups`. Cloudflare shows the **Access Key ID** and **Secret Access Key** once: type them straight into Railway (step 2) and the password manager.
5. The R2 overview page shows the **Account ID**. The S3 endpoint is `https://<Account ID>.r2.cloudflarestorage.com`.

## 2. Railway service `db-backup`

Railway no longer lets new services use a config file (`railway.json`) and stops reading existing ones on 2026-12-01, so the dashboard settings below are what count. `ops/db-backup/railway.json` records the same build and schedule settings.

1. Project `abundant-harmony` → **New → GitHub Repo** → `virzeen/virzeenWebapp`. Railway starts a first build with the website's settings straight away. It fails without the variables; ignore it.
2. Service → **Settings**:

   | Setting                              | Value                                                           |
   | ------------------------------------ | --------------------------------------------------------------- |
   | Service name                         | `db-backup`                                                     |
   | Source → Branch                      | `main`                                                          |
   | Source → Root Directory              | empty (the build needs the whole repo)                          |
   | Config-as-code → Railway Config File | `/ops/db-backup/railway.json`, only if Railway offers the field |
   | Build → Watch Paths                  | `/ops/db-backup/**` (other changes don't rebuild the job)       |
   | Deploy → Cron Schedule               | `15 20 * * *` (UTC = 02:00 Nepal time)                          |
   | Deploy → Restart Policy              | **Never**                                                       |
   | Deploy → Region                      | the same as Postgres (Singapore)                                |
   | Networking                           | nothing: no public domain                                       |

3. Service → **Variables** (type the keys yourself; don't paste them anywhere else):

   | Variable                  | Value                                                                                                  |
   | ------------------------- | ------------------------------------------------------------------------------------------------------ |
   | `DATABASE_URL`            | `${{Postgres.DATABASE_URL}}`, the private URL (use the database service's name if it isn't `Postgres`) |
   | `RAILWAY_DOCKERFILE_PATH` | `ops/db-backup/Dockerfile` (builds the job, not the website)                                           |
   | `S3_ENDPOINT`             | `https://<Account ID>.r2.cloudflarestorage.com`                                                        |
   | `S3_REGION`               | `auto`                                                                                                 |
   | `S3_BUCKET`               | `virzeen-backups`                                                                                      |
   | `S3_ACCESS_KEY_ID`        | the token's Access Key ID                                                                              |
   | `S3_SECRET_ACCESS_KEY`    | the token's Secret Access Key                                                                          |

4. Click **Deploy** to apply the changes. The build log must show `FROM postgres:17-alpine` and `apk add --no-cache aws-cli`. If it shows pnpm or Railpack instead, the website's settings are being used: check `RAILWAY_DOCKERFILE_PATH`.

## 3. First run and checks

1. `db-backup` → **Run now**. The run's log ends with `Uploaded 2026-09-29T2015Z.dump (… bytes)`.
2. Cloudflare → R2 → `virzeen-backups` → **Objects**: the same file name and size are there.
3. The next morning, check that a new file from 20:15 UTC is there too.
4. Once a month, restore the latest backup into a new database (runbooks/restore-backup.md) and check it.

## When a run fails

Railway marks the cron run as failed. The last lines of its log say why:

| Log says                                                         | Fix                                                                                       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Missing variables: …`                                           | Add those variables (step 2.3).                                                           |
| `The database did not answer within 60 seconds.`                 | Check the Postgres service is running and `DATABASE_URL` is `${{Postgres.DATABASE_URL}}`. |
| `password authentication failed`                                 | `DATABASE_URL` was typed by hand or is out of date: set it back to the reference.         |
| `The database runs PostgreSQL 18 but this image has pg_dump 17.` | Set `ARG PG_MAJOR=18` in `ops/db-backup/Dockerfile` and merge it.                         |
| `InvalidAccessKeyId`, `SignatureDoesNotMatch`, `AccessDenied`    | Wrong or deleted token: create a new one (step 1.4) and update both key variables.        |
| `NoSuchBucket`                                                   | `S3_BUCKET` or `S3_ENDPOINT` doesn't match the bucket.                                    |

Railway skips a scheduled run while the previous one is still running.

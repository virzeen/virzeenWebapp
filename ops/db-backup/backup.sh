#!/bin/sh
# Nightly database backup, run by the Railway cron service `db-backup` (docs/runbooks/database-backups.md):
# dump Postgres over Railway's private network, check the dump, upload it to S3-compatible object
# storage. Retention is the storage's lifecycle rule; this job never deletes. Any failure exits non-zero
# so Railway marks the run as failed. Railway keeps these logs, so never add `set -x` and never print
# DATABASE_URL or a key. aws-config (AWS_CONFIG_FILE) holds the S3 client settings.
set -eu

missing=""
for name in DATABASE_URL S3_ENDPOINT S3_REGION S3_BUCKET S3_ACCESS_KEY_ID S3_SECRET_ACCESS_KEY; do
  eval "value=\${$name:-}"
  if [ -z "$value" ]; then missing="$missing $name"; fi
done
unset value
if [ -n "$missing" ]; then
  echo "Missing variables:$missing" >&2
  exit 1
fi

# The private network name (postgres.railway.internal) can take a few seconds to resolve after the
# container starts. pg_isready's output names the host, so it is discarded.
deadline=$(($(date +%s) + 60))
waiting=""
while :; do
  status=0
  pg_isready --dbname="$DATABASE_URL" --timeout=5 >/dev/null 2>&1 || status=$?
  if [ "$status" -eq 0 ]; then break; fi
  if [ "$status" -eq 3 ]; then
    echo "DATABASE_URL is not a valid connection string." >&2
    exit 1
  fi
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "The database did not answer within 60 seconds." >&2
    exit 1
  fi
  if [ -z "$waiting" ]; then
    echo "Waiting for the database..."
    waiting=1
  fi
  sleep 2
done

# pg_dump can't dump a server newer than itself; say how to fix it instead of pg_dump's generic error.
server_version=$(psql --no-psqlrc --tuples-only --no-align --dbname="$DATABASE_URL" \
  --command="SHOW server_version_num")
case "$server_version" in
  "" | *[!0-9]*)
    echo "Could not read the database's PostgreSQL version." >&2
    exit 1
    ;;
esac
server_major=$((server_version / 10000))
client_major=$(pg_dump --version | sed 's/^[^0-9]*\([0-9]*\).*/\1/')
if [ "$server_major" -gt "$client_major" ]; then
  echo "The database runs PostgreSQL $server_major but this image has pg_dump $client_major." >&2
  echo "Raise PG_MAJOR in ops/db-backup/Dockerfile to $server_major and redeploy." >&2
  exit 1
fi

umask 077
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT
# As PID 1 the shell ignores stop signals unless it traps them.
trap 'exit 130' INT
trap 'exit 143' TERM

file="$(date -u +%Y-%m-%dT%H%MZ).dump"
dump="$workdir/$file"
pg_dump --format=custom --no-owner --no-privileges --file="$dump" --dbname="$DATABASE_URL"

if [ ! -s "$dump" ]; then
  echo "The dump is empty." >&2
  exit 1
fi
if ! pg_restore --list "$dump" >/dev/null; then
  echo "pg_restore can't read the dump." >&2
  exit 1
fi

export AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$S3_SECRET_ACCESS_KEY"
export AWS_DEFAULT_REGION="$S3_REGION"
aws s3 cp "$dump" "s3://$S3_BUCKET/$file" --endpoint-url "$S3_ENDPOINT" --only-show-errors --no-progress

echo "Uploaded $file ($(wc -c <"$dump" | tr -d ' ') bytes)"

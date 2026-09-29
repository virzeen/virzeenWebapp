# Nightly Postgres backup to S3-compatible object storage: the Railway cron service `db-backup`
# (docs/runbooks/database-backups.md). Build context is the repo root, as on Railway.
# pg_dump refuses to dump a newer server, so PG_MAJOR must be at least the database's major version.
ARG PG_MAJOR=17
FROM postgres:${PG_MAJOR}-alpine

RUN apk add --no-cache aws-cli

COPY ops/db-backup/aws-config /etc/db-backup/aws-config
ENV AWS_CONFIG_FILE=/etc/db-backup/aws-config
COPY ops/db-backup/backup.sh /usr/local/bin/backup.sh
# Git on Windows doesn't always keep the executable bit.
RUN chmod 0755 /usr/local/bin/backup.sh

# The image's own unprivileged user. Setting ENTRYPOINT also clears the base image's CMD (`postgres`).
USER postgres
ENTRYPOINT ["/usr/local/bin/backup.sh"]

#!/usr/bin/env bash
# Nightly backup of the Eclipse Motors database + uploaded car photos.
# Deployed on the VPS at /usr/local/bin/eclipse-backup.sh and scheduled by
# /etc/cron.d/eclipse-backup (03:30 daily). Keeps 14 days of backups.
set -euo pipefail
BACKUP_DIR=/var/backups/eclipse
KEEP_DAYS=14
STAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_DIR"

# Load DATABASE_URL / UPLOAD_DIR from the app env
set -a; . /var/www/CarLab/.env; set +a

# 1) Database dump (compressed)
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/eclipse-db-$STAMP.sql.gz"

# 2) Uploaded photos (on disk, not in the DB)
if [ -d "${UPLOAD_DIR:-/var/www/eclipse-uploads}" ]; then
  tar -czf "$BACKUP_DIR/eclipse-uploads-$STAMP.tar.gz" \
      -C "${UPLOAD_DIR:-/var/www/eclipse-uploads}" . 2>/dev/null || true
fi

# 3) Rotate: delete backups older than KEEP_DAYS
find "$BACKUP_DIR" -name 'eclipse-*.gz' -type f -mtime +$KEEP_DAYS -delete

echo "$(date -Is) backup ok -> $BACKUP_DIR (db+uploads $STAMP)"

#!/usr/bin/env bash
# Nightly backup of the Eclipse Motors database + uploaded car photos,
# kept locally and copied off-site to Google Drive (rclone remote "gdrive").
#
# Deployed on the VPS at /usr/local/bin/eclipse-backup.sh and scheduled by
# /etc/cron.d/eclipse-backup (03:30 daily). Keeps 14 days, local and remote.
# rclone Drive credentials live in /root/.config/rclone/rclone.conf (chmod 600).
set -euo pipefail
BACKUP_DIR=/var/backups/eclipse
REMOTE_DIR=gdrive:eclipse-backups
RCLONE_CONF=/root/.config/rclone/rclone.conf
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

# 3) Rotate local copies older than KEEP_DAYS
find "$BACKUP_DIR" -name 'eclipse-*.gz' -type f -mtime +$KEEP_DAYS -delete

# 4) Off-site copy to Google Drive (+ matching rotation there)
if [ -f "$RCLONE_CONF" ]; then
  rclone --config "$RCLONE_CONF" copy "$BACKUP_DIR" "$REMOTE_DIR" \
    --include "eclipse-*.gz" --transfers 2 --retries 3 --timeout 5m
  rclone --config "$RCLONE_CONF" delete "$REMOTE_DIR" \
    --include "eclipse-*.gz" --min-age ${KEEP_DAYS}d || true
  echo "$(date -Is) off-site copy to $REMOTE_DIR ok"
else
  echo "$(date -Is) WARNING: rclone config missing, skipped off-site copy" >&2
fi

echo "$(date -Is) backup ok -> $BACKUP_DIR (db+uploads $STAMP)"

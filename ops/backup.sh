#!/usr/bin/env bash
# Backup app_core DB (MySQL) and critical config files for GIVRwrld.
# Usage: ./ops/backup.sh [backup_dir]
# Default backup_dir: ./backups (relative to repo root) or set BACKUP_ROOT.

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$REPO_ROOT/backups}"
BACKUP_DIR="${1:-$BACKUP_ROOT}"
STAMP="$(date +%Y%m%d-%H%M%S)"
MYSQL_DATABASE="${MYSQL_DATABASE:-app_core}"

if [[ -f "$REPO_ROOT/api/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$REPO_ROOT/api/.env"
  set +a
fi

MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-app_rw}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"

mkdir -p "$BACKUP_DIR"
DIR="$BACKUP_DIR/$STAMP"
mkdir -p "$DIR"

echo "Backing up MySQL database: $MYSQL_DATABASE"
mysqldump \
  -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" \
  ${MYSQL_PASSWORD:+-p"${MYSQL_PASSWORD}"} \
  --single-transaction --quick \
  "$MYSQL_DATABASE" | gzip -c > "$DIR/app_core.sql.gz"

echo "Backing up config files"
mkdir -p "$DIR/config"
cp -a "$REPO_ROOT/ecosystem.config.cjs" "$DIR/config/" 2>/dev/null || true
if [[ -f "$REPO_ROOT/api/.env" ]]; then
  cp -a "$REPO_ROOT/api/.env" "$DIR/config/api.env"
fi
if [[ -d /etc/nginx/sites-enabled ]]; then
  mkdir -p "$DIR/config/nginx"
  for f in /etc/nginx/sites-enabled/givrwrld* /etc/nginx/sites-enabled/*givrwrld*; do
    [[ -e "$f" ]] && cp -a "$f" "$DIR/config/nginx/" 2>/dev/null || true
  done
fi

echo "Backup written to $DIR"
ls -la "$DIR" "$DIR/config" 2>/dev/null || true

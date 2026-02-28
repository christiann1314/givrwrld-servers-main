#!/usr/bin/env bash
# Restore app_core from a backup created by ops/backup.sh.
# Usage: ./ops/restore.sh [backup_timestamp_dir]
# Example: ./ops/restore.sh backups/20260227-120000
# If no argument, uses the latest backup under BACKUP_ROOT.

set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-$REPO_ROOT/backups}"

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
MYSQL_DATABASE="${MYSQL_DATABASE:-app_core}"

if [[ -n "${1:-}" ]]; then
  DIR="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
else
  LATEST="$(ls -td "$BACKUP_ROOT"/[0-9]*-[0-9]* 2>/dev/null | head -1)"
  if [[ -z "${LATEST:-}" ]]; then
    echo "No backup found under $BACKUP_ROOT"
    exit 1
  fi
  DIR="$LATEST"
  echo "Using latest backup: $DIR"
fi

if [[ ! -f "$DIR/app_core.sql.gz" ]]; then
  echo "Missing $DIR/app_core.sql.gz"
  exit 1
fi

echo "Restoring $MYSQL_DATABASE from $DIR/app_core.sql.gz"
echo "Stop API and workers (e.g. pm2 stop all) before restoring if they use the DB."
read -r -p "Proceed? [y/N] " confirm
[[ "${confirm,,}" == "y" ]] || exit 0

gunzip -c "$DIR/app_core.sql.gz" | mysql \
  -h "${MYSQL_HOST}" -P "${MYSQL_PORT}" -u "${MYSQL_USER}" \
  ${MYSQL_PASSWORD:+-p"${MYSQL_PASSWORD}"} \
  "$MYSQL_DATABASE"

echo "DB restore complete. If you use migrations, run: npm run db:migrate"
echo "Config copies are in $DIR/config/ (api.env, ecosystem.config.cjs, nginx/). Restore manually if needed."

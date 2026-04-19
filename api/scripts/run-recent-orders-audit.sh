#!/usr/bin/env bash
set -euo pipefail
ENV_FILE="${1:-/opt/givrwrld/api/.env}"
SQL="${2:-/tmp/recent-orders-audit.sql}"
APP_PASS=$(grep '^MYSQL_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '\r')
exec mysql -u app_rw -p"${APP_PASS}" -h 127.0.0.1 app_core < "$SQL"

#!/usr/bin/env bash
# Run on VPS: bash vps-panel-db-sanity.sh
set -euo pipefail
ENV="${1:-/opt/givrwrld/pterodactyl/.env}"
set -a
# shellcheck disable=SC1090
source "$ENV"
set +a
sudo docker exec pterodactyl-mariadb-1 mariadb -upterodactyl -p"$DB_PASSWORD" panel -e \
  "SHOW TABLES LIKE 'settings'; SHOW TABLES LIKE 'users'; SELECT COUNT(*) AS user_count FROM users; SELECT id, email, root_admin, use_totp FROM users;"

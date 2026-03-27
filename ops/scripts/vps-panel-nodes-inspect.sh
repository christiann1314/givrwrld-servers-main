#!/usr/bin/env bash
set -euo pipefail
ENV="${1:-/opt/givrwrld/pterodactyl/.env}"
set -a
# shellcheck disable=SC1090
source "$ENV"
set +a
sudo docker exec pterodactyl-mariadb-1 mariadb -upterodactyl -p"$DB_PASSWORD" panel -e \
  "SELECT id, name, daemon_token_id, CHAR_LENGTH(daemon_token) AS toklen, LEFT(daemon_token, 80) AS tprefix FROM nodes;"

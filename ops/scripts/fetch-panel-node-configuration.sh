#!/usr/bin/env bash
set -euo pipefail
# Usage: fetch-panel-node-configuration.sh [node_id]
# Reads PTERO_CLIENT_KEY from /opt/givrwrld/api/.env, writes JSON to stdout.
NODE_ID="${1:-1}"
KEY="$(grep ^PTERO_CLIENT_KEY= /opt/givrwrld/api/.env | cut -d= -f2-)"
curl -sS \
  -H "Authorization: Bearer ${KEY}" \
  -H "Accept: application/vnd.pterodactyl.v1+json" \
  "https://panel.givrwrldservers.com/api/application/nodes/${NODE_ID}/configuration"

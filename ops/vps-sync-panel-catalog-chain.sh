#!/usr/bin/env bash
# Run on the control-plane VPS after Panel egg/nest changes or "selected egg is invalid" (422).
# Syncs nests/eggs from Panel MariaDB into app_core, then rechains plan seeds so plans.ptero_egg_id matches live Panel IDs.
set -euo pipefail
REPO_ROOT="${REPO_ROOT:-/opt/givrwrld}"
cd "${REPO_ROOT}/api"
exec node scripts/sync-pterodactyl-catalog.js --apply --chain-seed-plans

#!/usr/bin/env bash
# Fix Panel DB: Among Us server stuck on Terraria startup (egg/command mismatch).
set -euo pipefail
cd /opt/givrwrld/pterodactyl
set -a
# shellcheck disable=SC1091
source .env
set +a
UUID="${1:-a807cbcc-7c8d-4e19-830b-826ee3018d12}"

sudo docker compose exec -T mariadb mysql -u pterodactyl -p"$DB_PASSWORD" panel <<EOSQL
SELECT id, uuid, egg_id, LEFT(startup, 160) AS startup_preview, image
FROM servers WHERE uuid = '${UUID}';
SELECT id, name, LEFT(startup, 160) AS egg_startup FROM eggs WHERE id = 74;
UPDATE servers s
INNER JOIN eggs e ON e.id = 74
SET s.egg_id = 74,
    s.startup = e.startup,
    s.image = 'ghcr.io/parkervcp/yolks:dotnet_8'
WHERE s.uuid = '${UUID}';
SELECT id, uuid, egg_id, LEFT(startup, 160) AS startup_preview, image
FROM servers WHERE uuid = '${UUID}';
EOSQL

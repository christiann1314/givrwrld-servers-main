#!/usr/bin/env bash
# Impostor releases now target .NET 8 — use dotnet_8 yolk (not dotnet_7).
set -euo pipefail
cd /opt/givrwrld/pterodactyl
set -a
source .env
set +a
UUID="${1:-a807cbcc-7c8d-4e19-830b-826ee3018d12}"

sudo docker compose exec -T mariadb mysql -u pterodactyl -p"$DB_PASSWORD" panel <<EOSQL
UPDATE eggs
SET docker_images = JSON_SET(
  COALESCE(docker_images, '{}'),
  '$.Dotnet_8', 'ghcr.io/parkervcp/yolks:dotnet_8'
)
WHERE id = 74;

UPDATE servers
SET image = 'ghcr.io/parkervcp/yolks:dotnet_8'
WHERE uuid = '${UUID}';

SELECT id, name, docker_images FROM eggs WHERE id = 74;
SELECT id, uuid, image, LEFT(startup, 80) AS su FROM servers WHERE uuid = '${UUID}';
EOSQL

#!/usr/bin/env bash
# List Pterodactyl panel allocations (node, IP, port, server, egg) — run on the VPS.
set -euo pipefail
PW="$(sudo docker exec pterodactyl-mariadb-1 printenv MYSQL_PASSWORD)"
export MYSQL_PWD="$PW"
sudo docker exec -i -e MYSQL_PWD="$PW" pterodactyl-mariadb-1 mysql -B -t -upterodactyl panel <<'SQL'
SELECT
  n.name AS node,
  a.ip,
  a.port,
  s.name AS server,
  e.name AS egg,
  nest.name AS nest
FROM allocations a
JOIN nodes n ON n.id = a.node_id
LEFT JOIN servers s ON s.allocation_id = a.id
LEFT JOIN eggs e ON e.id = s.egg_id
LEFT JOIN nests nest ON nest.id = e.nest_id
ORDER BY n.name, a.port;
SQL

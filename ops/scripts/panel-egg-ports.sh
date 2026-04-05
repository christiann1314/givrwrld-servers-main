#!/usr/bin/env bash
# Live Panel DB: egg variables whose names look like ports (run on VPS).
set -euo pipefail
PW="$(sudo docker exec pterodactyl-mariadb-1 printenv MYSQL_PASSWORD)"
sudo docker exec -i -e MYSQL_PWD="$PW" pterodactyl-mariadb-1 mysql -B -t -upterodactyl panel <<'SQL'
SELECT n.name AS nest, e.name AS egg, ev.env_variable, ev.default_value
FROM egg_variables ev
JOIN eggs e ON e.id = ev.egg_id
JOIN nests n ON n.id = e.nest_id
WHERE ev.env_variable LIKE '%PORT%'
   OR ev.env_variable IN ('PORT','SERVER_PORT','QUERY_PORT','RCON_PORT','APP_PORT')
ORDER BY n.name, e.name, ev.env_variable;
SQL

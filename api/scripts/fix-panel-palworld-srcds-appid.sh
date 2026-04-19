#!/usr/bin/env bash
# One-time: Palworld egg (id 70) must use SRCDS_APPID=2394010. Wrong values (e.g. 1007)
# cause: Error! App '1007' state is 0x2 and missing PalServer-Linux-Shipping.
#
# Run on the host that can reach the Panel MariaDB (adjust DBPASS if needed):
#   bash api/scripts/fix-panel-palworld-srcds-appid.sh
#
# Then for each affected server in Pterodactyl: Stop → Reinstall (or clear steamapps + Start).

set -euo pipefail
DBPASS="${PANEL_DB_ROOT_PASSWORD:-J1IVjHgCGWZjQC34bc5Q92UZPy0BNZL2}"

echo "Updating egg_variables default for Palworld (egg 70)..."
sudo docker exec pterodactyl-mariadb-1 mysql -u root -p"${DBPASS}" panel -e "
UPDATE egg_variables SET default_value = '2394010'
WHERE egg_id = 70 AND env_variable = 'SRCDS_APPID';
"

echo "Updating all server_variables bound to that egg variable..."
sudo docker exec pterodactyl-mariadb-1 mysql -u root -p"${DBPASS}" panel -e "
UPDATE server_variables sv
INNER JOIN egg_variables ev ON ev.id = sv.variable_id
SET sv.variable_value = '2394010'
WHERE ev.egg_id = 70 AND ev.env_variable = 'SRCDS_APPID';
"

echo "Verify:"
sudo docker exec pterodactyl-mariadb-1 mysql -u root -p"${DBPASS}" panel -e "
SELECT id, env_variable, default_value FROM egg_variables WHERE egg_id = 70 AND env_variable = 'SRCDS_APPID';
SELECT sv.server_id, sv.variable_value
FROM server_variables sv
INNER JOIN egg_variables ev ON ev.id = sv.variable_id
WHERE ev.egg_id = 70 AND ev.env_variable = 'SRCDS_APPID'
LIMIT 20;
"

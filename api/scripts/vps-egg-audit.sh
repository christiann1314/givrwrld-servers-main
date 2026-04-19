#!/usr/bin/env bash
# GIVRwrld VPS egg + provisioning audit (run on Wings/Panel host with docker + mysql access).
# Usage: bash api/scripts/vps-egg-audit.sh
# Optional env: PANEL_DB_ROOT_PASSWORD, GIVRWRLD_API_ROOT (default /opt/givrwrld/api for .env + remediation paths).

set -euo pipefail
DBPASS="${PANEL_DB_ROOT_PASSWORD:-J1IVjHgCGWZjQC34bc5Q92UZPy0BNZL2}"
API_ROOT="${GIVRWRLD_API_ROOT:-/opt/givrwrld/api}"
P_AUDIT="/tmp/vps-egg-audit.panel.$$"
A_AUDIT="/tmp/vps-egg-audit.app.$$"

cleanup_audit_temp() { rm -f "$P_AUDIT" "$A_AUDIT" 2>/dev/null || true; }
trap cleanup_audit_temp EXIT

mysqle() {
    sudo docker exec pterodactyl-mariadb-1 mysql -u root -p"${DBPASS}" panel -e "$1" 2>/dev/null
}

# Tab-separated, no column headers (for drift compare).
mysqle_raw() {
    sudo docker exec pterodactyl-mariadb-1 mysql -u root -p"${DBPASS}" panel -N -B -e "$1" 2>/dev/null
}

echo "=============================================="
echo " 1) DOCKER (panel / wings / mariadb)"
echo "=============================================="
sudo docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' 2>/dev/null | head -20 || true

echo ""
echo "=============================================="
echo " 2) PANEL EGGS 60-78 (startup head, docker_images, config_startup)"
echo "=============================================="
mysqle "
SELECT e.id AS egg_id,
       e.name AS egg_name,
       LEFT(REPLACE(REPLACE(COALESCE(e.docker_images,''),'\\\\\\\\/','/'),'\\\\/','/'), 120) AS docker_images_head,
       LEFT(e.startup, 200) AS startup_head,
       LEFT(e.config_startup, 120) AS config_startup_head,
       e.config_stop AS stop_cmd
FROM eggs e
WHERE e.id BETWEEN 60 AND 78
ORDER BY e.id;
"

echo ""
echo "=============================================="
echo " 3) SERVERS: allocation count vs policy need"
echo "    (65,66=3 | 70,74,75=2 | else 1)"
echo "=============================================="
mysqle "
SELECT s.id, s.name, s.egg_id, e.name AS egg_name,
       COUNT(a.id) AS allocation_count,
       CASE s.egg_id
         WHEN 65 THEN 3 WHEN 66 THEN 3
         WHEN 70 THEN 2 WHEN 74 THEN 2 WHEN 75 THEN 2
         ELSE 1 END AS required_allocations,
       CASE WHEN COUNT(a.id) >= CASE s.egg_id WHEN 65 THEN 3 WHEN 66 THEN 3 WHEN 70 THEN 2 WHEN 74 THEN 2 WHEN 75 THEN 2 ELSE 1 END
            THEN 'OK' ELSE 'MISSING_PORTS' END AS alloc_status
FROM servers s
JOIN eggs e ON e.id = s.egg_id
LEFT JOIN allocations a ON a.server_id = s.id
GROUP BY s.id, s.name, s.egg_id, e.name
ORDER BY s.id;
"

echo ""
echo "=============================================="
echo " 4) CRITICAL STEAM / APP IDS (per server)"
echo "=============================================="
mysqle "
SELECT s.id, s.name, s.egg_id,
       MAX(CASE WHEN ev.env_variable = 'SRCDS_APPID' THEN sv.variable_value END) AS SRCDS_APPID,
       MAX(CASE WHEN ev.env_variable = 'APP_ID' THEN sv.variable_value END) AS APP_ID
FROM servers s
LEFT JOIN server_variables sv ON sv.server_id = s.id
LEFT JOIN egg_variables ev ON ev.id = sv.variable_id
WHERE s.egg_id IN (65,66,70,76)
GROUP BY s.id, s.name, s.egg_id
ORDER BY s.id;
"

echo ""
echo "=============================================="
echo " 5) app_core.ptero_eggs mirror (compare to Panel)"
echo "=============================================="
if command -v mysql >/dev/null 2>&1; then
  APP_PASS=$(grep '^MYSQL_PASSWORD=' "${API_ROOT}/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r')
  if [ -n "${APP_PASS:-}" ]; then
    mysql -u app_rw -p"${APP_PASS}" -h 127.0.0.1 -P 3306 app_core -e "
    SELECT ptero_egg_id, name, LEFT(startup_cmd, 120) AS startup_head,
           REPLACE(REPLACE(docker_image,'\\\\/','/'),'\\\\\\\\/','/') AS docker_image
    FROM ptero_eggs
    WHERE ptero_egg_id BETWEEN 60 AND 78
    ORDER BY ptero_egg_id;
    " 2>/dev/null || echo "(app_core query skipped)"
  else
    echo "(no MYSQL_PASSWORD in ${API_ROOT}/.env — skip app_core)"
  fi
else
  echo "(mysql client not on PATH — skip app_core)"
fi

echo ""
echo "=============================================="
echo " 5b) DRIFT: Panel eggs.startup vs app_core.ptero_eggs.startup_cmd"
echo "     (docker: compare sections 2 vs 5 — Panel stores JSON docker_images)"
echo "=============================================="
if command -v mysql >/dev/null 2>&1; then
  APP_PASS=$(grep '^MYSQL_PASSWORD=' "${API_ROOT}/.env" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r')
  if [ -n "${APP_PASS:-}" ]; then
    mysqle_raw "
SELECT e.id,
       LEFT(TRIM(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(e.startup,'')),
         CHAR(9),' '), CHAR(10),' '), CHAR(13),' ')), 120)
FROM eggs e
WHERE e.id BETWEEN 60 AND 78
ORDER BY e.id;
" >"$P_AUDIT" || true
    mysql -u app_rw -p"${APP_PASS}" -h 127.0.0.1 -P 3306 app_core -N -B -e "
SELECT ptero_egg_id,
       LEFT(TRIM(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(startup_cmd,'')),
         CHAR(9),' '), CHAR(10),' '), CHAR(13),' ')), 120)
FROM ptero_eggs
WHERE ptero_egg_id BETWEEN 60 AND 78
ORDER BY ptero_egg_id;
" >"$A_AUDIT" 2>/dev/null || true
    if [ ! -s "$P_AUDIT" ]; then
      echo "(panel TSV empty — check docker / PANEL_DB_ROOT_PASSWORD)"
    elif [ ! -s "$A_AUDIT" ]; then
      echo "(app_core TSV empty — check MYSQL_PASSWORD / app_rw / ptero_eggs)"
    else
      DRIFT=0
      while IFS= read -r line || [ -n "$line" ]; do
        [ -z "$line" ] && continue
        id="${line%%$'\t'*}"
        p_start="${line#*$'\t'}"
        app_line=$(awk -F'\t' -v id="$id" '$1==id {print; exit}' "$A_AUDIT" || true)
        if [ -z "$app_line" ]; then
          echo " DRIFT egg $id: missing row in app_core.ptero_eggs"
          DRIFT=1
          continue
        fi
        a_start="${app_line#*$'\t'}"
        if [ "$p_start" != "$a_start" ]; then
          echo " DRIFT egg $id startup (Panel vs app_core):"
          echo "   panel: |$p_start|"
          echo "   app:   |$a_start|"
          DRIFT=1
        fi
      done <"$P_AUDIT"
      if [ "$DRIFT" -eq 0 ]; then
        echo " OK — normalized startup first 120 chars match for eggs 60-78."
      else
        echo ""
        echo " Remediation: pull Panel eggs into app_core (fixes mirror used by tooling / fallbacks):"
        echo "   cd ${API_ROOT} && node scripts/sync-pterodactyl-catalog.js --apply"
      fi
    fi
  else
    echo "(no MYSQL_PASSWORD in ${API_ROOT}/.env — skip drift)"
  fi
else
  echo "(mysql client not on PATH — skip drift)"
fi

echo ""
echo "=============================================="
echo " 6) PM2 + API health"
echo "=============================================="
pm2 list 2>/dev/null | head -12 || true
curl -s -o /dev/null -w "GET /api/health HTTP %{http_code}\n" http://127.0.0.1:3001/api/health 2>/dev/null || \
  curl -s -o /dev/null -w "GET /api/health HTTP %{http_code}\n" https://api.givrwrldservers.com/api/health 2>/dev/null || true

echo ""
echo "=============================================="
echo " 7) DISK"
echo "=============================================="
df -h /var/lib/pterodactyl 2>/dev/null || df -h / | head -3

echo ""
echo "=============================================="
echo " DONE — review MISSING_PORTS, wrong SRCDS_APPID,"
echo "       section 5b DRIFT, and Steam vars in section 4."
echo ""
echo " If 5b reported DRIFT (or you edited eggs only in Panel):"
echo "   cd ${API_ROOT} && node scripts/sync-pterodactyl-catalog.js --apply"
echo " To push internal catalog fixes to Panel (when catalog != panel):"
echo "   cd ${API_ROOT} && node scripts/sync-panel-eggs.js"
echo "=============================================="

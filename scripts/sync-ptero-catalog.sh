#!/usr/bin/env bash
set -euo pipefail

# Sync Pterodactyl Nests and Eggs to MySQL
# Usage: bash scripts/sync-ptero-catalog.sh
# Requires: jq, mysql client

# Configuration (set via environment or edit here)
PANEL_URL="${PANEL_URL:-https://panel.givrwrldservers.com}"
PANEL_KEY="${PANEL_KEY:-ptla_app_XXXXXXXXXXXXXXXX}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_DB="${MYSQL_DB:-app_core}"

# Check dependencies
command -v jq >/dev/null 2>&1 || { echo "❌ jq is required. Install: apt-get install jq"; exit 1; }
command -v mysql >/dev/null 2>&1 || { echo "❌ mysql client is required. Install: apt-get install mysql-client"; exit 1; }

echo "🔄 Syncing Pterodactyl Catalog to MySQL"
echo "========================================"
echo "Panel: $PANEL_URL"
echo ""

# MySQL helper function
mysql_exec() {
  mysql -u"$MYSQL_USER" "$MYSQL_DB" -N -e "$1" 2>/dev/null
}

# Fetch nests
echo "📦 Fetching nests..."
NESTS_JSON=$(curl -s -H "Authorization: Bearer $PANEL_KEY" \
  -H "Accept: Application/vnd.pterodactyl.v1+json" \
  "$PANEL_URL/api/application/nests")

if [ $? -ne 0 ] || [ -z "$NESTS_JSON" ]; then
  echo "❌ Failed to fetch nests from Pterodactyl"
  exit 1
fi

NEST_COUNT=$(echo "$NESTS_JSON" | jq '.data | length')
echo "   Found $NEST_COUNT nests"

# Import nests
echo "$NESTS_JSON" | jq -r '.data[] | [.attributes.id, .attributes.name, (.attributes.description // "")] | @tsv' | \
while IFS=$'\t' read -r nid name desc; do
  # Escape single quotes for SQL
  name_escaped=$(echo "$name" | sed "s/'/''/g")
  desc_escaped=$(echo "$desc" | sed "s/'/''/g")
  
  sql="INSERT INTO ptero_nests(ptero_nest_id, name, description)
       VALUES(${nid}, '${name_escaped}', '${desc_escaped}')
       ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);"
  
  mysql_exec "$sql" && echo "   ✅ Nest: $name (ID: $nid)" || echo "   ❌ Failed: $name"
done

# Fetch and import eggs for each nest
echo ""
echo "🥚 Fetching eggs..."
TOTAL_EGGS=0

echo "$NESTS_JSON" | jq -r '.data[].attributes.id' | while read -r nid; do
  EGGS_JSON=$(curl -s -H "Authorization: Bearer $PANEL_KEY" \
    -H "Accept: Application/vnd.pterodactyl.v1+json" \
    "$PANEL_URL/api/application/nests/$nid/eggs?include=nest")
  
  if [ $? -ne 0 ] || [ -z "$EGGS_JSON" ]; then
    echo "   ⚠️  Failed to fetch eggs for nest $nid"
    continue
  fi
  
  echo "$EGGS_JSON" | jq -r '.data[] | [
    .attributes.id,
    .attributes.nest,
    .attributes.name,
    (.attributes.docker_image // ""),
    (.attributes.startup // ""),
    (.attributes.description // "")
  ] | @tsv' | while IFS=$'\t' read -r eid enid ename image startup desc; do
    # Escape single quotes
    ename_escaped=$(echo "$ename" | sed "s/'/''/g")
    image_escaped=$(echo "$image" | sed "s/'/''/g")
    startup_escaped=$(echo "$startup" | sed "s/'/''/g")
    desc_escaped=$(echo "$desc" | sed "s/'/''/g")
    
    sql="INSERT INTO ptero_eggs(ptero_egg_id, ptero_nest_id, name, docker_image, startup_cmd, description)
         VALUES(${eid}, ${enid}, '${ename_escaped}', '${image_escaped}', '${startup_escaped}', '${desc_escaped}')
         ON DUPLICATE KEY UPDATE
           name=VALUES(name),
           docker_image=VALUES(docker_image),
           startup_cmd=VALUES(startup_cmd),
           description=VALUES(description);"
    
    if mysql_exec "$sql"; then
      echo "   ✅ Egg: $ename (ID: $eid, Nest: $enid)"
      TOTAL_EGGS=$((TOTAL_EGGS + 1))
    else
      echo "   ❌ Failed: $ename"
    fi
  done
done

echo ""
echo "✅ Sync complete!"
echo ""
echo "📊 Summary:"
mysql_exec "SELECT COUNT(*) as nests FROM ptero_nests;" | xargs echo "   Nests:"
mysql_exec "SELECT COUNT(*) as eggs FROM ptero_eggs;" | xargs echo "   Eggs:"
echo ""




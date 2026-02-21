#!/usr/bin/env bash
set -euo pipefail

# Sync Pterodactyl Nests and Eggs to MySQL (Fixed Version)
PANEL_URL="${PANEL_URL:-https://panel.givrwrldservers.com}"
PANEL_KEY="${PANEL_KEY:-ptla_nCMil1ujYSSZ3ooMPiOI9r459kfGztE0Hfdlw8FrFQC}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_DB="${MYSQL_DB:-app_core}"

command -v jq >/dev/null 2>&1 || { echo "❌ jq is required"; exit 1; }
command -v mysql >/dev/null 2>&1 || { echo "❌ mysql client is required"; exit 1; }

echo "🔄 Syncing Pterodactyl Catalog to MySQL"
echo "========================================"
echo "Panel: $PANEL_URL"
echo ""

mysql_exec() {
  mysql -u"$MYSQL_USER" "$MYSQL_DB" -N -e "$1" 2>/dev/null
}

# Fetch nests
echo "📦 Fetching nests..."
NESTS_JSON=$(curl -s -H "Authorization: Bearer $PANEL_KEY" \
  -H "Accept: Application/vnd.pterodactyl.v1+json" \
  "$PANEL_URL/api/application/nests")

if [ $? -ne 0 ] || [ -z "$NESTS_JSON" ]; then
  echo "❌ Failed to fetch nests"
  exit 1
fi

NEST_COUNT=$(echo "$NESTS_JSON" | jq '.data | length')
echo "   Found $NEST_COUNT nests"

# Import nests using prepared statements
echo "$NESTS_JSON" | jq -r '.data[] | "\(.attributes.id)|\(.attributes.name)|\(.attributes.description // "")"' | \
while IFS='|' read -r nid name desc; do
  # Use mysql with proper escaping
  mysql_exec "INSERT INTO ptero_nests(ptero_nest_id, name, description) VALUES(${nid}, $(mysql -u"$MYSQL_USER" "$MYSQL_DB" -N -e "SELECT QUOTE('$name');" 2>/dev/null), $(mysql -u"$MYSQL_USER" "$MYSQL_DB" -N -e "SELECT QUOTE('$desc');" 2>/dev/null)) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);" && \
    echo "   ✅ Nest: $name (ID: $nid)" || echo "   ❌ Failed: $name"
done

echo ""
echo "✅ Sync complete!"

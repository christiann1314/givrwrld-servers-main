#!/bin/bash

# Script to verify all egg IDs in Pterodactyl panel
# Usage: ./verify-egg-ids.sh

PANEL_URL="https://panel.givrwrldservers.com"
API_KEY="ptla_nCMil1ujYSSZ3ooMPiOI9r459kfGztE0Hfdlw8FrFQC"

echo "=== Fetching All Nests ==="
echo ""

# Get all nests
NESTS=$(curl -s -X GET "${PANEL_URL}/api/application/nests" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Accept: application/json")

echo "$NESTS" | jq -r '.data[] | "Nest ID: \(.attributes.id) | Name: \(.attributes.name) | Eggs: \(.attributes.relationships.eggs.data | length)"'

echo ""
echo "=== Checking Specific Nests for Egg IDs ==="
echo ""

# Check each nest we care about
declare -a NEST_IDS=("3" "4" "5" "6" "7" "9" "10" "11" "13" "14" "15" "19")

for NEST_ID in "${NEST_IDS[@]}"; do
  echo "--- Nest ID: $NEST_ID ---"
  EGGS=$(curl -s -X GET "${PANEL_URL}/api/application/nests/${NEST_ID}/eggs" \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Accept: application/json")
  
  echo "$EGGS" | jq -r '.data[] | "  Egg ID: \(.attributes.id) | Name: \(.attributes.name)"'
  echo ""
done

echo "=== Expected Egg IDs in Code ==="
echo "Minecraft (Paper): 39"
echo "Rust: 2"
echo "Palworld: 3"
echo "Terraria: 16"
echo "ARK: 14"
echo "Factorio: 21"
echo "Mindustry: 29"
echo "Rimworld: 26"
echo "Vintage Story: 32"
echo "Teeworlds: 33"
echo "Among Us: 34"


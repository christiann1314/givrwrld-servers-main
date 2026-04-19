#!/usr/bin/env bash
# Clear stuck SteamCMD state after a failed Palworld install (wrong app id or 0x2).
# Usage: bash api/scripts/clear-palworld-steam-stuck-state.sh <pterodactyl-server-uuid>

set -euo pipefail
UUID="${1:-}"
if [ -z "$UUID" ]; then
  echo "Usage: $0 <pterodactyl-server-uuid>"
  exit 1
fi

CNAME=$(sudo docker ps -a --format '{{.Names}}' | grep -i "$UUID" | head -1)
if [ -z "$CNAME" ]; then
  echo "No container found matching uuid: $UUID"
  exit 1
fi

echo "Container: $CNAME"
sudo docker exec "$CNAME" sh -c '
  cd /home/container || exit 1
  rm -rf steamapps/downloading steamapps/temp 2>/dev/null || true
  mkdir -p steamapps/temp
  rm -f steamapps/appmanifest_2394010.acf steamapps/appmanifest_1007.acf 2>/dev/null || true
  rm -rf steamapps/common 2>/dev/null || true
  ls -la steamapps/
'
echo "OK. Fix SRCDS_APPID=2394010 in Panel, then Reinstall or Start."

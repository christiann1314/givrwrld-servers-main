#!/usr/bin/env bash
# Clear stuck SteamCMD state for a Rust Pterodactyl server when you see:
#   Error! App '258550' state is 0x2 after update job
#   ./RustDedicated: No such file or directory
#
# Usage (on the Wings host, as a user with docker):
#   bash api/scripts/clear-rust-steam-stuck-state.sh <server-uuid>
# Example:
#   bash api/scripts/clear-rust-steam-stuck-state.sh 0abf42aa-29bd-4870-90e2-3ae9b89811c4
#
# Then in the Panel: Stop → Start (or Reinstall if needed).

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
  rm -f steamapps/appmanifest_258550.acf
  rm -rf steamapps/common 2>/dev/null || true
  echo "steamapps after cleanup:"
  ls -la steamapps/
'
echo "OK. In Panel: Stop the server, then Start (give Steam several minutes to download)."

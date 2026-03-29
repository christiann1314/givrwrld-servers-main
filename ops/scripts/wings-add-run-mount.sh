#!/usr/bin/env bash
# On the Panel/Wings host: ensure Wings bind-mounts host /run/wings (machine-id files for game containers).
set -euo pipefail
F="${1:-/opt/givrwrld/pterodactyl/docker-compose.yml}"
if [[ ! -f "$F" ]]; then
  echo "Compose file not found: $F" >&2
  exit 1
fi
if grep -q '/run/wings:/run/wings' "$F"; then
  echo "Already has /run/wings mount"
else
  sudo sed -i '/- \/var\/lib\/pterodactyl:\/var\/lib\/pterodactyl/a\      - /run/wings:/run/wings' "$F"
  echo "Inserted /run/wings:/run/wings after pterodactyl data mount"
fi
sudo mkdir -p /run/wings/machine-id /run/wings/etc
sudo chown -R "${WINGS_UID:-988}:${WINGS_GID:-988}" /run/wings
cd "$(dirname "$F")"
sudo docker compose up -d wings
echo "Wings restarted"

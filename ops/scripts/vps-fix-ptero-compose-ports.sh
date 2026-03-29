#!/usr/bin/env bash
set -euo pipefail
cd /opt/givrwrld
git checkout origin/main -- pterodactyl/docker-compose.yml
perl -pi -e 's/"8080:8080"/"8082:8080"/' pterodactyl/docker-compose.yml
perl -pi -e 's/"3306:3306"/"127.0.0.1:13306:3306"/' pterodactyl/docker-compose.yml
grep -E '8082|13306' pterodactyl/docker-compose.yml

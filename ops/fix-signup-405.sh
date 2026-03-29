#!/bin/bash
# Run on VPS as ubuntu (or root). Fixes 405 on signup and missing DB table.
# Usage: cd /opt/givrwrld && bash ops/fix-signup-405.sh

set -e
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== 1/5 Migration: email_verification_tokens ==="
if mysql -u app_rw -p"${MYSQL_PASSWORD:-}" app_core -e "SELECT 1 FROM email_verification_tokens LIMIT 1" 2>/dev/null; then
  echo "  Table exists, skip."
else
  echo "  Creating table..."
  mysql -u app_rw -p"${MYSQL_PASSWORD:-}" app_core < sql/migrations/20260217000100_email_verification_tokens.sql 2>/dev/null || \
  mysql -u app_rw -p app_core < sql/migrations/20260217000100_email_verification_tokens.sql
  echo "  Done."
fi

echo "=== 2/5 Nginx: proxy /api/ to API ==="
NGINX_SITES="/etc/nginx/sites-available"
NGINX_SNIPPETS="/etc/nginx/snippets"
CONF_NAME=""
for f in "$NGINX_SITES"/givrwrld* "$NGINX_SITES"/www* "$NGINX_SITES"/default; do
  [ -f "$f" ] && grep -q "givrwrldservers.com" "$f" 2>/dev/null && CONF_NAME="$f" && break
done
[ -z "$CONF_NAME" ] && for f in "$NGINX_SITES"/*; do [ -f "$f" ] && grep -q "givrwrldservers.com" "$f" 2>/dev/null && CONF_NAME="$f" && break; done

if [ -z "$CONF_NAME" ]; then
  echo "  Could not find nginx config for givrwrldservers.com in $NGINX_SITES"
  echo "  Do this manually: add location /api/ proxy to the server block for givrwrldservers.com (see docs/FIX-SIGNUP-405-RUNBOOK.md)"
else
  echo "  Found config: $CONF_NAME"
  sudo mkdir -p "$NGINX_SNIPPETS"
  sudo cp "$REPO_ROOT/ops/nginx/snippets/givrwrld-api-proxy.conf" "$NGINX_SNIPPETS/" 2>/dev/null || true
  sudo cp "$REPO_ROOT/ops/nginx/snippets/givrwrld-api-proxy-upstream.conf" "$NGINX_SNIPPETS/" 2>/dev/null || true
  if grep -q "location /api/" "$CONF_NAME" 2>/dev/null; then
    echo "  location /api/ already present, skip."
  else
    echo "  You must add the /api/ proxy to $CONF_NAME"
    echo "  Add at the top of the file (before any server {}): include snippets/givrwrld-api-proxy-upstream.conf;"
    echo "  Add inside the server {} for givrwrldservers.com: include snippets/givrwrld-api-proxy.conf;"
    echo "  Then run: sudo nginx -t && sudo systemctl reload nginx"
    read -p "  Press Enter after you have updated nginx and reloaded..."
  fi
fi

echo "=== 3/5 Frontend build (VITE_API_URL) ==="
export VITE_API_URL="https://api.givrwrldservers.com"
npm run build
echo "  Done."

echo "=== 4/5 PM2 restart ==="
pm2 restart givrwrld-api givrwrld-provisioner 2>/dev/null || true
echo "  Done."

echo "=== 5/5 Reload nginx (if we have sudo) ==="
sudo nginx -t 2>/dev/null && sudo systemctl reload nginx 2>/dev/null && echo "  Nginx reloaded." || echo "  Run: sudo nginx -t && sudo systemctl reload nginx"

echo ""
echo "DONE. Hard-refresh the browser (Ctrl+Shift+R) on https://givrwrldservers.com/auth and try signup again."

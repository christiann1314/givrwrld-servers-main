#!/usr/bin/env bash
set -euo pipefail

# Safe Supabase Teardown Script
# Removes Supabase Docker containers and volumes WITHOUT touching other containers
# Run: sudo bash scripts/supabase-teardown.sh

echo "🗑️  Supabase Teardown"
echo "===================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Please run as root (sudo)"
  exit 1
fi

# ============ Step 1: Stop Supabase Docker Compose ============
echo "🛑 Step 1: Stopping Supabase containers..."

# Try common Supabase locations
SUPABASE_PATHS=(
  "/opt/supabase"
  "/home/ubuntu/supabase"
  "/root/supabase"
  "$(pwd)/supabase"
)

FOUND=false
for path in "${SUPABASE_PATHS[@]}"; do
  if [ -f "$path/docker-compose.yml" ] || [ -f "$path/compose.yml" ]; then
    echo "   Found Supabase at: $path"
    cd "$path"
    docker compose down -v 2>/dev/null || docker-compose down -v 2>/dev/null || true
    FOUND=true
    break
  fi
done

if [ "$FOUND" = false ]; then
  echo "   ⚠️  No Supabase docker-compose.yml found in common locations"
fi

# ============ Step 2: Remove Supabase Containers ============
echo ""
echo "🗑️  Step 2: Removing Supabase containers..."
SUPABASE_CONTAINERS=$(docker ps -aq --filter "name=supabase" 2>/dev/null || true)
if [ -n "$SUPABASE_CONTAINERS" ]; then
  echo "$SUPABASE_CONTAINERS" | xargs docker rm -f 2>/dev/null || true
  echo "   ✅ Removed Supabase containers"
else
  echo "   ℹ️  No Supabase containers found"
fi

# ============ Step 3: Remove Supabase Volumes ============
echo ""
echo "🗑️  Step 3: Removing Supabase volumes..."
SUPABASE_VOLUMES=$(docker volume ls -q | grep supabase 2>/dev/null || true)
if [ -n "$SUPABASE_VOLUMES" ]; then
  echo "$SUPABASE_VOLUMES" | xargs docker volume rm 2>/dev/null || true
  echo "   ✅ Removed Supabase volumes"
else
  echo "   ℹ️  No Supabase volumes found"
fi

# ============ Step 4: Remove Supabase CLI ============
echo ""
echo "🗑️  Step 4: Removing Supabase CLI..."
if command -v supabase &> /dev/null; then
  rm -f /usr/local/bin/supabase /usr/bin/supabase 2>/dev/null || true
  echo "   ✅ Removed Supabase CLI"
else
  echo "   ℹ️  Supabase CLI not found"
fi

# ============ Step 5: Clean Docker System ============
echo ""
echo "🧹 Step 5: Cleaning Docker system..."
docker system prune -f --volumes 2>/dev/null || true
echo "   ✅ Docker cleanup complete"

echo ""
echo "✅ Supabase teardown complete!"
echo ""
echo "📋 Remaining Steps:"
echo "  1. Remove SUPABASE_* environment variables from .env files"
echo "  2. Remove @supabase/* packages from package.json"
echo "  3. Update code to use MySQL instead of Supabase"
echo ""




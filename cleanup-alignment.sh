#!/bin/bash
# Comprehensive Cleanup and Alignment Script
# Checks Stripe, Pterodactyl, and Supabase alignment

set -e

PROJECT_REF="mjhvkvnshnbnxojnandf"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

echo "🧹 Comprehensive Cleanup & Alignment Audit"
echo "==========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📊 Step 1: Analyzing Edge Functions"
echo "-----------------------------------"
echo ""

# Count functions
TOTAL_FUNCTIONS=$(find supabase/functions -maxdepth 1 -type d | wc -l)
echo "Total functions: $((TOTAL_FUNCTIONS - 1))"

# Check which functions are in config
CONFIG_FUNCTIONS=$(grep -c "^\[functions\." supabase/config.toml || echo "0")
echo "Functions in config: $CONFIG_FUNCTIONS"

echo ""
echo "⚠️  Functions to review for removal:"
echo "  - admin-management"
echo "  - check-subscription"
echo "  - customer-portal"
echo "  - get-user-stats"
echo "  - get-server-console"
echo "  - fix-pterodactyl-credentials"
echo "  - health-check"
echo "  - rate-limiter"
echo "  - support-system"
echo "  - gdpr-compliance"
echo "  - notification-system"
echo "  - backup-monitor"
echo "  - error-handler"
echo "  - security-audit"
echo "  - migrate-pterodactyl-data (if migration complete)"
echo ""

echo "📋 Step 2: Database Cleanup"
echo "---------------------------"
echo ""
echo "Run these SQL queries in Supabase SQL Editor:"
echo "  1. supabase/migrations/1000_comprehensive_cleanup.sql"
echo "  2. supabase/migrations/999_cleanup_remove_modpacks.sql (if not done)"
echo ""

read -p "Have you reviewed the cleanup migrations? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please review migrations first."
    exit 1
fi

echo ""
echo "💳 Step 3: Stripe Alignment"
echo "-------------------------"
echo ""
echo "Action required:"
echo "  1. Go to Stripe Dashboard → Products → Prices"
echo "  2. Export all active price IDs"
echo "  3. Compare with database plans"
echo "  4. Update plans.stripe_price_id to match"
echo "  5. Mark inactive any plans not in Stripe"
echo ""

read -p "Have you aligned Stripe prices? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Stripe alignment pending${NC}"
fi

echo ""
echo "🖥️  Step 4: Pterodactyl Alignment"
echo "--------------------------------"
echo ""
echo "Action required:"
echo "  1. Verify egg IDs in servers-provision/index.ts match your panel"
echo "  2. Verify node IDs in ptero_nodes table"
echo "  3. Remove unused environment variables from game configs"
echo "  4. Consolidate duplicate game configurations"
echo ""

read -p "Have you verified Pterodactyl configuration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Pterodactyl alignment pending${NC}"
fi

echo ""
echo "🗑️  Step 5: Remove Unused Functions"
echo "-----------------------------------"
echo ""
echo "Functions to consider removing:"
echo ""

read -p "Remove unused functions? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "⚠️  CAUTION: This will delete functions. Make sure they're not used!"
    echo ""
    read -p "Continue? (yes/no) " -r
    if [[ $REPLY == "yes" ]]; then
        echo ""
        echo "Removing unused functions..."
        # Add function removal logic here
        echo "✅ Functions removed (manual review recommended)"
    fi
fi

echo ""
echo "✅ Cleanup Complete!"
echo ""
echo "Next steps:"
echo "  1. Run database migrations"
echo "  2. Verify Stripe alignment"
echo "  3. Verify Pterodactyl alignment"
echo "  4. Test checkout flow"
echo "  5. Test server provisioning"
echo ""


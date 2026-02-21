#!/bin/bash
# Database Cleanup Helper Script
# This script helps identify and fix database inconsistencies

set -e

PROJECT_REF="mjhvkvnshnbnxojnandf"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

echo "🧹 Database Cleanup Helper"
echo "=========================="
echo ""
echo "This script will help you:"
echo "  1. Audit current database state"
echo "  2. Remove modpack support"
echo "  3. Identify inconsistencies"
echo ""

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    exit 1
fi

echo "📊 Step 1: Running Database Audit"
echo "----------------------------------"
echo ""
echo "Please run these queries in Supabase SQL Editor:"
echo "  https://supabase.com/dashboard/project/${PROJECT_REF}/sql"
echo ""
echo "Or use the audit migration:"
echo "  supabase/migrations/998_audit_database_state.sql"
echo ""

read -p "Have you reviewed the audit? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please review the audit first, then run this script again."
    exit 1
fi

echo ""
echo "🗑️  Step 2: Removing Modpack Support"
echo "-------------------------------------"
echo ""
echo "This will:"
echo "  - Remove modpack_id column from orders"
echo "  - Drop modpacks table"
echo "  - Remove all modpack references"
echo ""

read -p "Continue with modpack removal? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "⚠️  IMPORTANT: Run this migration in Supabase SQL Editor:"
    echo "  supabase/migrations/999_cleanup_remove_modpacks.sql"
    echo ""
    echo "Or copy-paste the SQL directly."
    echo ""
fi

echo ""
echo "🔄 Step 3: Deploy Updated Functions"
echo "-----------------------------------"
echo ""
echo "After running the migration, deploy updated functions:"
echo ""

read -p "Deploy updated functions now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Deploying functions..."
    supabase functions deploy create-checkout-session
    supabase functions deploy stripe-webhook
    echo ""
    echo "✅ Functions deployed!"
fi

echo ""
echo "✅ Cleanup Complete!"
echo ""
echo "Next steps:"
echo "  1. Verify plans match Stripe price IDs"
echo "  2. Verify nodes match Pterodactyl node IDs"
echo "  3. Test checkout flow"
echo ""
echo "See DATABASE_CLEANUP_GUIDE.md for detailed instructions."


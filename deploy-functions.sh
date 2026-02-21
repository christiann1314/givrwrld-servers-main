#!/bin/bash
# Deploy Supabase Edge Functions with CORS fixes

set -e

PROJECT_REF="mjhvkvnshnbnxojnandf"

echo "🚀 Deploying Supabase Edge Functions"
echo "===================================="

# Check for access token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "❌ SUPABASE_ACCESS_TOKEN not set"
    echo ""
    echo "To get your access token:"
    echo "1. Go to: https://supabase.com/dashboard/account/tokens"
    echo "2. Create a new access token (or use existing)"
    echo "3. Run: export SUPABASE_ACCESS_TOKEN='your-token-here'"
    echo "4. Then run this script again"
    echo ""
    echo "OR run: npx supabase login"
    exit 1
fi

echo "✅ Access token found"
echo ""

# Deploy create-checkout-session
echo "📦 Deploying create-checkout-session..."
npx supabase functions deploy create-checkout-session \
    --project-ref "$PROJECT_REF" \
    || { echo "❌ Failed to deploy create-checkout-session"; exit 1; }

echo "✅ create-checkout-session deployed"
echo ""

# Deploy create-pterodactyl-user
echo "📦 Deploying create-pterodactyl-user..."
npx supabase functions deploy create-pterodactyl-user \
    --project-ref "$PROJECT_REF" \
    || { echo "❌ Failed to deploy create-pterodactyl-user"; exit 1; }

echo "✅ create-pterodactyl-user deployed"
echo ""

echo "🎉 All functions deployed successfully!"
echo ""
echo "Next steps:"
echo "1. Re-enable Cache-Control header in src/integrations/supabase/client.ts"
echo "2. Rebuild and redeploy frontend"
echo "3. Test the checkout flow"


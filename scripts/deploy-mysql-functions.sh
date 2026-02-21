#!/usr/bin/env bash
# Deploy MySQL-based Edge Functions to Supabase

set -euo pipefail

PROJECT_REF="${PROJECT_REF:-mjhvkvnshnbnxojnandf}"

echo "🚀 Deploying MySQL Edge Functions"
echo "================================="
echo ""

# Check for Supabase CLI
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found. Install with: npm install -g supabase"
  exit 1
fi

# Get secrets from files
if [ ! -f "PASSWORDS.txt" ] || [ ! -f "AES_KEY.txt" ]; then
  echo "❌ Missing PASSWORDS.txt or AES_KEY.txt"
  exit 1
fi

MYSQL_PASS=$(grep app_rw PASSWORDS.txt | cut -d: -f2 | xargs)
AES_KEY=$(cat AES_KEY.txt)

echo "📦 Setting environment variables..."
echo "  MYSQL_HOST=127.0.0.1"
echo "  MYSQL_USER=app_rw"
echo "  MYSQL_DATABASE=app_core"
echo "  AES_KEY=*** (hidden)"
echo ""

# Set secrets (requires SUPABASE_ACCESS_TOKEN)
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "⚠️  SUPABASE_ACCESS_TOKEN not set"
  echo "   Set it with: export SUPABASE_ACCESS_TOKEN='your_token'"
  echo ""
  echo "   Then run these commands manually:"
  echo "   npx supabase secrets set --project-ref $PROJECT_REF MYSQL_HOST=127.0.0.1"
  echo "   npx supabase secrets set --project-ref $PROJECT_REF MYSQL_PORT=3306"
  echo "   npx supabase secrets set --project-ref $PROJECT_REF MYSQL_USER=app_rw"
  echo "   npx supabase secrets set --project-ref $PROJECT_REF MYSQL_PASSWORD=\"$MYSQL_PASS\""
  echo "   npx supabase secrets set --project-ref $PROJECT_REF MYSQL_DATABASE=app_core"
  echo "   npx supabase secrets set --project-ref $PROJECT_REF AES_KEY=\"$AES_KEY\""
else
  echo "✅ Setting secrets..."
  npx supabase secrets set --project-ref $PROJECT_REF MYSQL_HOST=127.0.0.1
  npx supabase secrets set --project-ref $PROJECT_REF MYSQL_PORT=3306
  npx supabase secrets set --project-ref $PROJECT_REF MYSQL_USER=app_rw
  npx supabase secrets set --project-ref $PROJECT_REF MYSQL_PASSWORD="$MYSQL_PASS"
  npx supabase secrets set --project-ref $PROJECT_REF MYSQL_DATABASE=app_core
  npx supabase secrets set --project-ref $PROJECT_REF AES_KEY="$AES_KEY"
  echo "✅ Secrets set"
fi

echo ""
echo "📦 Deploying functions..."

# Deploy functions
echo "  Deploying stripe-webhook-mysql..."
npx supabase functions deploy stripe-webhook-mysql --project-ref $PROJECT_REF || echo "  ⚠️  Deployment failed"

echo "  Deploying create-checkout-session-mysql..."
npx supabase functions deploy create-checkout-session-mysql --project-ref $PROJECT_REF || echo "  ⚠️  Deployment failed"

echo "  Deploying get-plans-mysql..."
npx supabase functions deploy get-plans-mysql --project-ref $PROJECT_REF || echo "  ⚠️  Deployment failed"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next Steps:"
echo "  1. Update Stripe webhook URL to:"
echo "     https://$PROJECT_REF.supabase.co/functions/v1/stripe-webhook-mysql"
echo "  2. Update frontend to use new API endpoints"
echo "  3. Test end-to-end flow"

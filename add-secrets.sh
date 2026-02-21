#!/bin/bash
# Script to add essential secrets to Supabase Edge Functions

set -e

export SUPABASE_ACCESS_TOKEN='sbp_34115bcba57a38fe3af736fbc9b37e704f6aa2fb'
export PROJECT_REF='mjhvkvnshnbnxojnandf'

echo "=== Adding Essential Secrets ==="
echo ""
echo "Please provide the following values:"
echo ""

# 1. Stripe Secret Key (LIVE)
read -p "STRIPE_SECRET_KEY (sk_live_...): " STRIPE_SECRET_KEY
npx -y supabase secrets set --project-ref $PROJECT_REF STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
echo "✅ STRIPE_SECRET_KEY set"

# 2. Stripe Webhook Secret (LIVE)
read -p "STRIPE_WEBHOOK_SECRET (whsec_...): " STRIPE_WEBHOOK_SECRET
npx -y supabase secrets set --project-ref $PROJECT_REF STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
echo "✅ STRIPE_WEBHOOK_SECRET set"

# 3. Supabase URL
read -p "SUPABASE_URL (https://mjhvkvnshnbnxojnandf.supabase.co): " SUPABASE_URL
if [ -z "$SUPABASE_URL" ]; then
  SUPABASE_URL="https://mjhvkvnshnbnxojnandf.supabase.co"
fi
npx -y supabase secrets set --project-ref $PROJECT_REF SUPABASE_URL="$SUPABASE_URL"
echo "✅ SUPABASE_URL set"

# 4. Supabase Service Role Key
read -p "SUPABASE_SERVICE_ROLE_KEY (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...): " SUPABASE_SERVICE_ROLE_KEY
npx -y supabase secrets set --project-ref $PROJECT_REF SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
echo "✅ SUPABASE_SERVICE_ROLE_KEY set"

# 5. Pterodactyl Panel URL
read -p "PANEL_URL (https://panel.givrwrldservers.com): " PANEL_URL
if [ -z "$PANEL_URL" ]; then
  PANEL_URL="https://panel.givrwrldservers.com"
fi
npx -y supabase secrets set --project-ref $PROJECT_REF PANEL_URL="$PANEL_URL"
echo "✅ PANEL_URL set"

# 6. Pterodactyl Application API Key
read -p "PTERO_APP_KEY (ptla_...): " PTERO_APP_KEY
npx -y supabase secrets set --project-ref $PROJECT_REF PTERO_APP_KEY="$PTERO_APP_KEY"
echo "✅ PTERO_APP_KEY set"

# Optional: Supabase Anon Key
read -p "SUPABASE_ANON_KEY (optional, press Enter to skip): " SUPABASE_ANON_KEY
if [ -n "$SUPABASE_ANON_KEY" ]; then
  npx -y supabase secrets set --project-ref $PROJECT_REF SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
  echo "✅ SUPABASE_ANON_KEY set"
else
  echo "⏭️  SUPABASE_ANON_KEY skipped"
fi

# Optional: Stripe Publishable Key
read -p "STRIPE_PUBLISHABLE_KEY (optional, press Enter to skip): " STRIPE_PUBLISHABLE_KEY
if [ -n "$STRIPE_PUBLISHABLE_KEY" ]; then
  npx -y supabase secrets set --project-ref $PROJECT_REF STRIPE_PUBLISHABLE_KEY="$STRIPE_PUBLISHABLE_KEY"
  echo "✅ STRIPE_PUBLISHABLE_KEY set"
else
  echo "⏭️  STRIPE_PUBLISHABLE_KEY skipped"
fi

echo ""
echo "=== All essential secrets added ==="
echo ""
echo "Current secrets:"
npx -y supabase secrets list --project-ref $PROJECT_REF | grep -E "(STRIPE|SUPABASE|PANEL|PTERO)" || echo "No secrets found"


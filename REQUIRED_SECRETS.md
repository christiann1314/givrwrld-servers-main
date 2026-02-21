# 🔐 Required Secrets - Essential Only

## Core Secrets (REQUIRED)

These secrets are **required** for the system to work:

### 1. Stripe (LIVE Mode)
- **STRIPE_SECRET_KEY** - Live secret key from Stripe Dashboard
  - Get from: https://dashboard.stripe.com/apikeys (LIVE mode)
  - Format: `sk_live_...`

- **STRIPE_WEBHOOK_SECRET** - Webhook signing secret
  - Get from: https://dashboard.stripe.com/webhooks (LIVE mode)
  - Click your webhook endpoint → "Signing secret" → Reveal
  - Format: `whsec_...`

### 2. Supabase
- **SUPABASE_URL** - Your Supabase project URL
  - Value: `https://mjhvkvnshnbnxojnandf.supabase.co`

- **SUPABASE_SERVICE_ROLE_KEY** - Service role key (full access)
  - Get from: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/settings/api
  - Copy "service_role" key
  - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Pterodactyl
- **PANEL_URL** - Pterodactyl panel URL
  - Value: `https://panel.givrwrldservers.com`

- **PTERO_APP_KEY** - Application API key
  - Get from: https://panel.givrwrldservers.com/admin/api
  - Copy "Application API" key
  - Format: `ptla_...`

## Optional Secrets

These are optional but may be used by some functions:

- **SUPABASE_ANON_KEY** - Anon/public key (for some functions)
  - Get from: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/settings/api
  - Copy "anon public" key

- **STRIPE_PUBLISHABLE_KEY** - Publishable key (for frontend, usually not needed in Edge Functions)
  - Get from: https://dashboard.stripe.com/apikeys (LIVE mode)
  - Format: `pk_live_...`

## How to Add Secrets

### Option 1: Use the Interactive Script
```bash
cd /home/ubuntu/givrwrld-severs
./add-secrets.sh
```

### Option 2: Add Manually (One by One)
```bash
export SUPABASE_ACCESS_TOKEN='sbp_34115bcba57a38fe3af736fbc9b37e704f6aa2fb'
export PROJECT_REF='mjhvkvnshnbnxojnandf'

# Add each secret
npx -y supabase secrets set --project-ref $PROJECT_REF STRIPE_SECRET_KEY="sk_live_..."
npx -y supabase secrets set --project-ref $PROJECT_REF STRIPE_WEBHOOK_SECRET="whsec_..."
npx -y supabase secrets set --project-ref $PROJECT_REF SUPABASE_URL="https://mjhvkvnshnbnxojnandf.supabase.co"
npx -y supabase secrets set --project-ref $PROJECT_REF SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
npx -y supabase secrets set --project-ref $PROJECT_REF PANEL_URL="https://panel.givrwrldservers.com"
npx -y supabase secrets set --project-ref $PROJECT_REF PTERO_APP_KEY="ptla_..."
```

## Verify Secrets

After adding, verify they're set:
```bash
npx -y supabase secrets list --project-ref mjhvkvnshnbnxojnandf | grep -E "(STRIPE|SUPABASE|PANEL|PTERO)"
```

## Notes

- All game plan secrets (MC_1GB_MONTHLY, etc.) are **NOT needed** - those are stored in the database
- Redundant Pterodactyl keys (PTERODACTYL_URL, PTERODACTYL_API_KEY, etc.) are **NOT needed** - use PANEL_URL and PTERO_APP_KEY only
- After adding secrets, redeploy functions:
  ```bash
  npx -y supabase functions deploy --project-ref mjhvkvnshnbnxojnandf stripe-webhook servers-provision
  ```


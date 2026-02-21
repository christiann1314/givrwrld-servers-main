# 🔐 Secrets Setup Guide

## Required Secrets for Production

We'll add these secrets one by one. Make sure you have all the values ready:

### 1. Stripe Keys (LIVE Mode)
- `STRIPE_SECRET_KEY` - Your live Stripe secret key (starts with `sk_live_...`)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret from Stripe Dashboard (starts with `whsec_...`)
- `STRIPE_PUBLISHABLE_KEY` - Your live Stripe publishable key (starts with `pk_live_...`) - Optional, for frontend

### 2. Supabase Keys
- `SUPABASE_URL` - Your Supabase project URL (e.g., `https://mjhvkvnshnbnxojnandf.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
- `SUPABASE_ANON_KEY` - Anon/public key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`) - Optional, for some functions

### 3. Pterodactyl Keys
- `PANEL_URL` - Pterodactyl panel URL (e.g., `https://panel.givrwrldservers.com`)
- `PTERO_APP_KEY` - Pterodactyl Application API key (starts with `ptla_...`)

### 4. Optional
- `ALERTS_WEBHOOK` - Discord/Slack webhook for alerts (optional)

## Where to Get Values

### Stripe Keys:
1. Go to: https://dashboard.stripe.com/apikeys (LIVE mode)
2. Copy "Publishable key" → `STRIPE_PUBLISHABLE_KEY`
3. Click "Reveal test key" → Copy "Secret key" → `STRIPE_SECRET_KEY`
4. Go to: https://dashboard.stripe.com/webhooks (LIVE mode)
5. Click your webhook endpoint → "Signing secret" → Copy → `STRIPE_WEBHOOK_SECRET`

### Supabase Keys:
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/settings/api
2. Copy "Project URL" → `SUPABASE_URL`
3. Copy "service_role" key → `SUPABASE_SERVICE_ROLE_KEY`
4. Copy "anon public" key → `SUPABASE_ANON_KEY`

### Pterodactyl Keys:
1. Go to: https://panel.givrwrldservers.com/admin/api
2. Copy "Application API" key → `PTERO_APP_KEY`
3. Panel URL is: `https://panel.givrwrldservers.com` → `PANEL_URL`


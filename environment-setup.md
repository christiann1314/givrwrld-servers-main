# Environment Configuration

## Frontend (.env.local)
Create `.env.local` in project root with:

```bash
VITE_SUPABASE_URL=https://mjhvkvnshnbnxojnandf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaHZrdm5zaG5ibnhvam5hbmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5Njg4NTEsImV4cCI6MjA0NzU0NDg1MX0.jaqpjR0s2bgEMxG9gjsg_pgaezEI4
VITE_SUPABASE_FUNCTIONS_URL=https://mjhvkvnshnbnxojnandf.functions.supabase.co
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_STRIPE_PUBLISHABLE_KEY_HERE
VITE_PANEL_URL=https://panel.givrwrldservers.com
VITE_APP_NAME=GIVRWRLD Servers
VITE_APP_URL=https://givrwrldservers.com
```

## Supabase Edge Functions Secrets
Set these in Supabase Dashboard > Edge Functions > Secrets:

```bash
SUPABASE_URL=https://mjhvkvnshnbnxojnandf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qaHZrdm5zaG5ibnhvam5hbmRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5Njg4NTEsImV4cCI6MjA0NzU0NDg1MX0.jaqpjR0s2bgEMxG9gjsg_pgaezEI4
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.mjhvkvnshnbnxojnandf.supabase.co:5432/postgres

STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

PANEL_URL=https://panel.givrwrldservers.com
PTERO_APP_KEY=YOUR_PTERODACTYL_APPLICATION_API_KEY_HERE
PTERO_CLIENT_KEY=YOUR_PTERODACTYL_CLIENT_API_KEY_HERE

ALLOW_ORIGINS=https://givrwrldservers.com,https://www.givrwrldservers.com,http://localhost:5173
ALERTS_WEBHOOK=YOUR_DISCORD_OR_SLACK_WEBHOOK_URL_HERE
```

## Deployment Commands

```bash
# 1. Set up environment
cp environment-setup.md .env.local  # Edit with actual values

# 2. Install dependencies
npm install

# 3. Build frontend
npm run build

# 4. Deploy Edge Functions
supabase functions deploy create-checkout-session
supabase functions deploy create-billing-portal-session
supabase functions deploy panel-sync-user
supabase functions deploy stripe-webhook
supabase functions deploy servers-provision
supabase functions deploy server-stats

# 5. Run database migrations
# Execute SQL files in Supabase SQL Editor:
# - supabase/migrations/002_profiles.sql
# - supabase/migrations/003_catalog.sql

# 6. Deploy to production server
scp -r dist/* ubuntu@15.204.251.32:/var/www/givrwrld/
```

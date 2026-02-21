# Quick Setup Guide - Get Everything Working

## 🎯 Goal
Get a complete purchase → server creation flow working.

---

## Step 1: Database Tables (5 minutes)

### Run these migrations in Supabase SQL Editor:

1. **Create core tables:**
   ```sql
   -- Run: supabase/migrations/003_catalog.sql
   ```

2. **Remove modpacks (cleanup):**
   ```sql
   -- Run: supabase/migrations/999_cleanup_remove_modpacks.sql
   ```

3. **Verify tables exist:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('plans', 'orders', 'external_accounts', 'ptero_nodes');
   ```
   Should return 4 rows.

---

## Step 2: Add Plans to Database (10 minutes)

### Get Stripe Price IDs:
1. Go to Stripe Dashboard → Products → Prices
2. Copy price IDs (they start with `price_1...`)

### Insert plans:
```sql
INSERT INTO public.plans (id, item_type, game, ram_gb, vcores, ssd_gb, stripe_price_id, display_name, is_active)
VALUES
  ('mc-1gb', 'game', 'minecraft', 1, 1, 10, 'price_YOUR_STRIPE_PRICE_ID', 'Minecraft 1GB', true),
  ('rust-6gb', 'game', 'rust', 6, 3, 30, 'price_YOUR_STRIPE_PRICE_ID', 'Rust 6GB', true)
ON CONFLICT (id) DO UPDATE 
SET stripe_price_id = EXCLUDED.stripe_price_id;
```

**Replace `price_YOUR_STRIPE_PRICE_ID` with actual Stripe price IDs!**

---

## Step 3: Add Pterodactyl Nodes (5 minutes)

### Get node info from Pterodactyl:
1. Go to Pterodactyl Panel → Admin → Nodes
2. Click on a node
3. Note: Node ID (from URL or details page), Name, Region

### Insert nodes:
```sql
INSERT INTO public.ptero_nodes (pterodactyl_node_id, name, region, max_ram_gb, max_disk_gb, enabled)
VALUES
  (1, 'US-East-1', 'us-east', 64, 1000, true),
  (2, 'US-West-1', 'us-west', 64, 1000, true)
ON CONFLICT (pterodactyl_node_id) DO UPDATE
SET name = EXCLUDED.name,
    region = EXCLUDED.region,
    max_ram_gb = EXCLUDED.max_ram_gb,
    max_disk_gb = EXCLUDED.max_disk_gb;
```

**Replace with your actual node IDs and details!**

---

## Step 4: Configure Stripe (10 minutes)

### 1. Get API Keys:
- Go to Stripe Dashboard → Developers → API keys
- Copy Secret Key → Set in Supabase: `STRIPE_SECRET_KEY`
- Copy Publishable Key → Set in frontend: `VITE_STRIPE_PUBLISHABLE_KEY`

### 2. Create Webhook:
- Go to Stripe Dashboard → Webhooks
- Add endpoint: `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
- Select events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Copy signing secret → Set in Supabase: `STRIPE_WEBHOOK_SECRET`

---

## Step 5: Configure Pterodactyl (5 minutes)

### 1. Get API Key:
- Go to Pterodactyl Panel → Admin → Application API
- Create new API key with all permissions
- Copy key → Set in Supabase: `PTERO_APP_KEY`

### 2. Set Panel URL:
- Your panel URL (e.g., `https://panel.givrwrldservers.com`)
- Set in Supabase: `PANEL_URL`

### 3. Verify Egg IDs:
- Go to Pterodactyl Panel → Admin → Nests
- For each game, find the egg ID
- Verify it matches `servers-provision/index.ts`

---

## Step 6: Deploy Functions (2 minutes)

```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy servers-provision
```

---

## Step 7: Test Everything (5 minutes)

### Test 1: Checkout Session
```bash
# Should return a checkout URL
curl -X POST https://mjhvkvnshnbnxojnandf.functions.supabase.co/create-checkout-session \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "item_type": "game",
    "plan_id": "mc-1gb",
    "region": "us-east",
    "server_name": "Test Server",
    "term": "monthly"
  }'
```

### Test 2: Make Test Purchase
1. Go to your frontend
2. Select a plan
3. Complete checkout
4. Check Supabase logs for:
   - Webhook received
   - Order created
   - Provisioning triggered
   - Server created

---

## ✅ Verification Checklist

- [ ] Database tables exist (`plans`, `orders`, `external_accounts`, `ptero_nodes`)
- [ ] At least 1 plan in `plans` table with valid `stripe_price_id`
- [ ] At least 1 node in `ptero_nodes` table with valid `pterodactyl_node_id`
- [ ] Stripe webhook configured and active
- [ ] Stripe API keys set in Supabase
- [ ] Pterodactyl API key set in Supabase
- [ ] Pterodactyl panel URL set in Supabase
- [ ] Egg IDs verified in code match panel
- [ ] Functions deployed
- [ ] Test purchase works end-to-end

---

## 🚨 If Something Breaks

### Check Logs:
1. Supabase Dashboard → Edge Functions → Logs
2. Look for errors in:
   - `stripe-webhook` (payment processing)
   - `servers-provision` (server creation)

### Common Fixes:
- **"Plan not found"** → Add plan to database
- **"Stripe price invalid"** → Update `stripe_price_id`
- **"No available capacity"** → Add nodes to `ptero_nodes`
- **"Pterodactyl API error"** → Check API key and panel URL

---

## 📊 System Status Check

Run this to see what's configured:

```sql
-- Check plans
SELECT COUNT(*) as plan_count FROM public.plans WHERE is_active = true;

-- Check nodes
SELECT COUNT(*) as node_count FROM public.ptero_nodes WHERE enabled = true;

-- Check recent orders
SELECT COUNT(*) as order_count FROM public.orders WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check external accounts
SELECT COUNT(*) as account_count FROM public.external_accounts;
```

All should return > 0 for a working system.


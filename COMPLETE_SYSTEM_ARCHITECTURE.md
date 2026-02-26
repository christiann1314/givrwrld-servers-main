# Complete System Architecture Guide

## 🎯 Overview: How Everything Works Together

This document explains the complete flow from customer purchase to server creation, and what's needed in each system.

---

## 📊 Complete Purchase-to-Server Flow

```
Customer → Frontend → Stripe Checkout → Stripe Webhook → Supabase → Pterodactyl → Server Created
```

### Step-by-Step Flow:

1. **Customer selects plan** → Frontend calls `create-checkout-session`
2. **Stripe Checkout** → Customer pays → Stripe sends webhook
3. **Webhook receives payment** → `stripe-webhook` function creates order
4. **Order created** → Triggers `servers-provision` function
5. **Provisioning** → Creates Pterodactyl user (if needed) → Creates server
6. **Server created** → Order updated with server details

---

## 🗄️ Database Tables Required

### Core Tables (Required)

#### 1. `profiles`
**Purpose:** User profile information
```sql
- id (UUID)
- user_id (UUID) → references auth.users
- email (TEXT)
- first_name (TEXT)
- last_name (TEXT)
- created_at, updated_at
```

#### 2. `plans`
**Purpose:** Available server plans (links to Stripe prices)
```sql
- id (TEXT) → 'mc-1gb', 'rust-6gb', etc.
- item_type (TEXT) → 'game' or 'vps'
- game (TEXT) → 'minecraft', 'rust', 'palworld', etc.
- ram_gb (INTEGER)
- vcores (INTEGER)
- ssd_gb (INTEGER)
- stripe_price_id (TEXT) → MUST match Stripe price ID
- display_name (TEXT)
- is_active (BOOLEAN)
```

**Critical:** `stripe_price_id` MUST match actual Stripe price IDs!

#### 3. `orders`
**Purpose:** Tracks all purchases and server provisioning
```sql
- id (UUID)
- user_id (UUID) → references auth.users
- plan_id (TEXT) → references plans.id
- item_type (TEXT) → 'game' or 'vps'
- term (TEXT) → 'monthly', 'quarterly', 'yearly'
- region (TEXT) → 'us-east', 'us-west', etc.
- server_name (TEXT)
- stripe_sub_id (TEXT) → Stripe subscription ID
- status (TEXT) → 'pending', 'paid', 'provisioning', 'provisioned', 'error', 'canceled'
- node_id (INTEGER) → references ptero_nodes.id
- pterodactyl_server_id (INTEGER) → Pterodactyl server ID
- pterodactyl_server_identifier (TEXT) → Pterodactyl server identifier
- addons (JSONB) → Array of addon IDs
- created_at, updated_at
```

#### 4. `external_accounts`
**Purpose:** Links Supabase users to Pterodactyl users
```sql
- user_id (UUID) → references auth.users (PRIMARY KEY)
- pterodactyl_user_id (INTEGER) → Pterodactyl user ID
- panel_username (TEXT) → Pterodactyl username
- last_synced_at (TIMESTAMPTZ)
```

**Critical:** This table links your users to Pterodactyl accounts!

#### 5. `ptero_nodes`
**Purpose:** Tracks Pterodactyl nodes for capacity management
```sql
- id (SERIAL) → Internal ID
- pterodactyl_node_id (INTEGER) → MUST match Pterodactyl panel node ID
- name (TEXT) → 'US-East-1', 'EU-West-1', etc.
- region (TEXT) → 'us-east', 'us-west', 'eu', etc.
- max_ram_gb (INTEGER) → Total RAM available
- max_disk_gb (INTEGER) → Total disk available
- reserved_headroom_gb (INTEGER) → Reserved for system
- enabled (BOOLEAN) → Whether node is active
```

**Critical:** `pterodactyl_node_id` MUST match your actual Pterodactyl node IDs!

### Optional Tables

#### 6. `addons`
**Purpose:** Additional services (backups, DDoS protection, etc.)
```sql
- id (TEXT)
- item_type (TEXT)
- display_name (TEXT)
- stripe_price_id (TEXT)
- is_active (BOOLEAN)
```

#### 7. `affiliates`
**Purpose:** Referral system (optional)
```sql
- user_id (UUID)
- code (TEXT)
- clicks, signups, credits_cents
```

---

## 💳 Stripe Configuration Required

### 1. Products & Prices

**What you need:**
- Create a Product for each game/plan combination
- Create a Price for each plan (monthly subscription)
- Copy the Price ID (starts with `price_1...`)

**Example:**
```
Product: "Minecraft 1GB Server"
Price: $5/month → Price ID: price_1SPmR6B3VffY65l6oa9Vc1T4
```

**Action Required:**
1. Go to Stripe Dashboard → Products
2. List all your active prices
3. Update `plans.stripe_price_id` in database to match

### 2. Webhook Endpoint

**What you need:**
- Webhook URL: `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
- Events to listen for:
  - `checkout.session.completed` (when payment succeeds)
  - `customer.subscription.updated` (when subscription changes)
  - `customer.subscription.deleted` (when subscription cancelled)
  - `invoice.payment_failed` (when payment fails)

**Action Required:**
1. Go to Stripe Dashboard → Webhooks
2. Verify webhook is active
3. Copy webhook signing secret
4. Set in Supabase: `STRIPE_WEBHOOK_SECRET`

### 3. API Keys

**What you need:**
- Secret Key (starts with `sk_live_...` or `sk_test_...`)
- Publishable Key (starts with `pk_live_...` or `pk_test_...`)

**Action Required:**
1. Go to Stripe Dashboard → Developers → API keys
2. Copy Secret Key → Set in Supabase: `STRIPE_SECRET_KEY`
3. Copy Publishable Key → Set in frontend: `VITE_STRIPE_PUBLISHABLE_KEY`

---

## 🖥️ Pterodactyl Configuration Required

### 1. API Keys

**What you need:**
- Application API Key (starts with `ptla_...`)
  - Used for: Creating servers, managing users, admin operations
  - Permissions: All permissions checked

**Action Required:**
1. Go to Pterodactyl Panel → Admin → Application API
2. Create new API key with all permissions
3. Set in Supabase: `PTERO_APP_KEY` (or `PTERODACTYL_API_KEY`)

### 2. Panel URL

**What you need:**
- Your Pterodactyl panel URL (e.g., `https://panel.givrwrldservers.com`)

**Action Required:**
1. Set in Supabase: `PANEL_URL` (or `PTERODACTYL_URL`)

### 3. Node Information

**What you need for each node:**
- Node ID (from Pterodactyl panel)
- Node Name
- Region code
- Total RAM (GB)
- Total Disk (GB)

**Action Required:**
1. Go to Pterodactyl Panel → Admin → Nodes
2. For each node, note:
   - Node ID (from URL or node details)
   - Name
   - Region
   - Resources
3. Insert into `ptero_nodes` table:
```sql
INSERT INTO public.ptero_nodes (pterodactyl_node_id, name, region, max_ram_gb, max_disk_gb, enabled)
VALUES
  (1, 'US-East-1', 'us-east', 64, 1000, true),
  (2, 'US-West-1', 'us-west', 64, 1000, true);
```

### 4. Game Egg IDs

**What you need:**
- Egg ID for each game type
- These are hardcoded in `servers-provision/index.ts`

**Current Egg IDs (verify these match your panel):**
```typescript
minecraft: 39
rust: 50
palworld: 15
among-us: 34
terraria: 16
ark: 14
factorio: 21
mindustry: 29
rimworld: 26
vintage-story: 32
teeworlds: 33
```

**Action Required:**
1. Go to Pterodactyl Panel → Admin → Nests
2. For each game, find the egg ID
3. Verify it matches the code in `servers-provision/index.ts`

### 5. Allocations (Ports)

**What you need:**
- Available IP:Port combinations for servers
- These are automatically found by the provisioning function

**How it works:**
- Function queries Pterodactyl API for available allocations
- Selects first available port on the selected node
- Assigns it to the new server

---

## 🔄 Complete Flow Diagram

```
┌─────────────┐
│   Customer  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Frontend (React)   │
│  - Select plan      │
│  - Enter server name│
└──────┬──────────────┘
       │
       │ POST /functions/v1/create-checkout-session
       ▼
┌─────────────────────┐
│  Supabase Function  │
│  create-checkout-   │
│  session            │
│  - Validates plan   │
│  - Creates Stripe   │
│    checkout session │
└──────┬──────────────┘
       │
       │ Returns checkout URL
       ▼
┌─────────────────────┐
│   Stripe Checkout   │
│  - Customer pays    │
│  - Payment succeeds │
└──────┬──────────────┘
       │
       │ Webhook: checkout.session.completed
       ▼
┌─────────────────────┐
│  Supabase Function  │
│  stripe-webhook     │
│  - Verifies webhook │
│  - Creates order    │
│  - Status: 'paid'   │
└──────┬──────────────┘
       │
       │ POST /functions/v1/servers-provision
       ▼
┌─────────────────────┐
│  Supabase Function  │
│  servers-provision  │
│  1. Get order       │
│  2. Check/create    │
│     Pterodactyl user│
│  3. Find available  │
│     node & port     │
│  4. Create server   │
│     in Pterodactyl  │
│  5. Update order    │
│     with server ID  │
└──────┬──────────────┘
       │
       │ POST /api/application/servers
       ▼
┌─────────────────────┐
│  Pterodactyl Panel  │
│  - Creates server   │
│  - Assigns resources│
│  - Returns server ID│
└──────┬──────────────┘
       │
       │ Server created
       ▼
┌─────────────────────┐
│   Database Update   │
│  orders table:      │
│  - status:          │
│    'provisioned'    │
│  - pterodactyl_     │
│    server_id: set   │
│  - node_id: set     │
└─────────────────────┘
```

---

## ✅ Setup Checklist

### Database Setup

- [ ] Run `supabase/migrations/003_catalog.sql` (creates tables)
- [ ] Run `supabase/migrations/999_cleanup_remove_modpacks.sql` (removes modpacks)
- [ ] Insert plans into `plans` table with correct `stripe_price_id`
- [ ] Insert nodes into `ptero_nodes` table with correct `pterodactyl_node_id`
- [ ] Verify RLS policies are enabled
- [ ] Test: Can you query `plans` table? Can you query `orders` table?

### Stripe Setup

- [ ] Create products in Stripe Dashboard
- [ ] Create prices for each plan (monthly subscriptions)
- [ ] Copy all price IDs
- [ ] Update `plans.stripe_price_id` in database
- [ ] Create webhook endpoint pointing to your Supabase function
- [ ] Set webhook signing secret in Supabase: `STRIPE_WEBHOOK_SECRET`
- [ ] Set secret key in Supabase: `STRIPE_SECRET_KEY`
- [ ] Set publishable key in frontend: `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] Test: Can you create a checkout session?

### Pterodactyl Setup

- [ ] Create Application API key with all permissions
- [ ] Set in Supabase: `PTERO_APP_KEY`
- [ ] Set panel URL in Supabase: `PANEL_URL`
- [ ] List all nodes from Pterodactyl panel
- [ ] Insert nodes into `ptero_nodes` table
- [ ] Verify egg IDs match your panel
- [ ] Test: Can you query Pterodactyl API? Can you list nodes?

### Function Setup

- [ ] Deploy all Edge Functions
- [ ] Verify function secrets are set
- [ ] Test: Can you call `create-checkout-session`?
- [ ] Test: Can Stripe reach your webhook?
- [ ] Test: Can webhook call `servers-provision`?

---

## 🔍 Verification Queries

### Check Database Setup

```sql
-- Check plans exist
SELECT id, game, ram_gb, stripe_price_id, is_active 
FROM public.plans 
WHERE is_active = true;

-- Check nodes exist
SELECT id, pterodactyl_node_id, name, region, enabled 
FROM public.ptero_nodes 
WHERE enabled = true;

-- Check external_accounts structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'external_accounts';

-- Check orders structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders';
```

### Check Stripe Alignment

```sql
-- Find plans with invalid Stripe price IDs
SELECT id, display_name, stripe_price_id
FROM public.plans
WHERE stripe_price_id NOT LIKE 'price_1%'
  AND stripe_price_id NOT LIKE 'price_test_%'
  AND is_active = true;

-- Find plans missing Stripe price IDs
SELECT id, display_name, stripe_price_id
FROM public.plans
WHERE stripe_price_id IS NULL OR stripe_price_id = ''
  AND is_active = true;
```

### Check Pterodactyl Alignment

```sql
-- Verify node IDs are set
SELECT id, pterodactyl_node_id, name, region
FROM public.ptero_nodes
WHERE pterodactyl_node_id IS NULL
   OR name IS NULL
   OR region IS NULL;

-- Check for orders with invalid node references
SELECT o.id, o.node_id, o.region
FROM public.orders o
WHERE o.node_id IS NOT NULL
  AND o.node_id NOT IN (SELECT id FROM public.ptero_nodes);
```

---

## 🚨 Common Issues & Fixes

### Issue 1: "Plan not found"
**Cause:** Plan doesn't exist in database or `is_active = false`
**Fix:** Insert plan or set `is_active = true`

### Issue 2: "Stripe price invalid"
**Cause:** `stripe_price_id` doesn't match Stripe
**Fix:** Update `plans.stripe_price_id` with correct Stripe price ID

### Issue 3: "No available capacity"
**Cause:** No nodes in `ptero_nodes` or all nodes disabled
**Fix:** Insert nodes or set `enabled = true`

### Issue 4: "Pterodactyl user not found"
**Cause:** `external_accounts` entry missing
**Fix:** Function auto-creates, but verify `profiles.email` exists

### Issue 5: "Egg ID not found"
**Cause:** Egg ID in code doesn't match Pterodactyl panel
**Fix:** Update egg ID in `servers-provision/index.ts`

---

## 📋 Minimum Required Setup

To get a basic purchase → server flow working, you need:

1. **Database:**
   - `profiles` table (created by auth trigger)
   - `plans` table with at least 1 plan
   - `orders` table
   - `external_accounts` table
   - `ptero_nodes` table with at least 1 node

2. **Stripe:**
   - At least 1 product with 1 price
   - Webhook endpoint configured
   - API keys set in Supabase

3. **Pterodactyl:**
   - Application API key
   - Panel URL
   - At least 1 node with available allocations
   - Egg IDs verified for games you offer

4. **Supabase Secrets:**
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `PTERO_APP_KEY` (or `PTERODACTYL_API_KEY`)
   - `PANEL_URL` (or `PTERODACTYL_URL`)

---

## 🎯 Next Steps

1. **Verify Database:** Run verification queries above
2. **Align Stripe:** Update all `stripe_price_id` values
3. **Align Pterodactyl:** Insert nodes and verify egg IDs
4. **Test Flow:** Make a test purchase and watch logs
5. **Monitor:** Check Supabase logs for errors

---

## 📚 Related Documentation

- `ALIGNMENT_CHECKLIST.md` - Step-by-step alignment guide
- `DATABASE_CLEANUP_GUIDE.md` - Database cleanup instructions
- `FUNCTION_USAGE_AUDIT.md` - Function usage analysis
- `run-database-cleanup.md` - Migration instructions


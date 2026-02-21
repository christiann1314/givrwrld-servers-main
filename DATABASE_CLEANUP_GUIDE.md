# Database Cleanup Guide

## Overview
This guide helps clean up inconsistencies between your database, Stripe, and Pterodactyl.

## Step 1: Run Database Audit (Before Cleanup)

Run the audit queries to see current state:

```sql
-- Run this in Supabase SQL Editor
\i supabase/migrations/998_audit_database_state.sql
```

Or manually run these queries:

1. **Check all plans:**
```sql
SELECT id, item_type, game, display_name, stripe_price_id, is_active 
FROM public.plans 
ORDER BY item_type, game, ram_gb;
```

2. **Check for orphaned orders:**
```sql
SELECT o.id, o.plan_id, o.status, o.created_at
FROM public.orders o
LEFT JOIN public.plans p ON o.plan_id = p.id
WHERE p.id IS NULL;
```

3. **Check plans with invalid Stripe price IDs:**
```sql
SELECT id, display_name, stripe_price_id
FROM public.plans
WHERE stripe_price_id NOT LIKE 'price_%' 
  AND is_active = true;
```

## Step 2: Remove Modpack Support

### 2a. Run Migration
```sql
-- Run in Supabase SQL Editor
\i supabase/migrations/999_cleanup_remove_modpacks.sql
```

### 2b. Verify Modpack Removal
```sql
-- Should return 0 rows
SELECT COUNT(*) FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'modpack_id';

-- Should return false
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'modpacks'
);
```

## Step 3: Align Plans with Stripe

### 3a. Get Your Actual Stripe Prices

1. Go to Stripe Dashboard → Products → Prices
2. Export or list all active price IDs
3. Compare with your database

### 3b. Update Plans Table

For each plan in your database:

```sql
-- Example: Update a plan's Stripe price ID
UPDATE public.plans
SET stripe_price_id = 'price_YOUR_ACTUAL_STRIPE_PRICE_ID'
WHERE id = 'plan-id-here';

-- Mark plans as inactive if they don't exist in Stripe
UPDATE public.plans
SET is_active = false
WHERE stripe_price_id NOT IN (
  -- List your actual Stripe price IDs here
  'price_1SPmR6B3VffY65l6oa9Vc1T4',
  'price_1SPmbMB3VffY65l6Bio5NjIE',
  -- ... add all your actual price IDs
);
```

### 3c. Add Missing Plans from Stripe

If you have Stripe prices that aren't in your database:

```sql
INSERT INTO public.plans (id, item_type, game, ram_gb, vcores, ssd_gb, stripe_price_id, display_name, is_active)
VALUES
  ('plan-id', 'game', 'minecraft', 4, 2, 20, 'price_STRIPE_ID', 'Display Name', true)
ON CONFLICT (id) DO UPDATE
SET stripe_price_id = EXCLUDED.stripe_price_id,
    is_active = EXCLUDED.is_active;
```

## Step 4: Align Pterodactyl Nodes

### 4a. Get Your Actual Pterodactyl Nodes

1. Go to Pterodactyl Panel → Admin → Nodes
2. Note the Node IDs and their regions

### 4b. Update ptero_nodes Table

```sql
-- Update existing nodes
UPDATE public.ptero_nodes
SET 
  pterodactyl_node_id = YOUR_ACTUAL_NODE_ID,
  name = 'Node Name',
  region = 'us-east', -- or your actual region
  max_ram_gb = ACTUAL_RAM_GB,
  max_disk_gb = ACTUAL_DISK_GB,
  enabled = true
WHERE id = YOUR_DB_NODE_ID;

-- Add missing nodes
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

## Step 5: Clean Up Orphaned Data

### 5a. Fix Orders with Invalid Plan IDs

```sql
-- Option 1: Mark as error
UPDATE public.orders
SET status = 'error'
WHERE plan_id NOT IN (SELECT id FROM public.plans);

-- Option 2: Delete (if you're sure)
-- DELETE FROM public.orders
-- WHERE plan_id NOT IN (SELECT id FROM public.plans);
```

### 5b. Fix Orders with Invalid Node IDs

```sql
-- Set node_id to NULL for invalid nodes
UPDATE public.orders
SET node_id = NULL
WHERE node_id IS NOT NULL 
  AND node_id NOT IN (SELECT id FROM public.ptero_nodes);
```

## Step 6: Verify Everything

Run these verification queries:

```sql
-- 1. All active plans have valid Stripe price IDs
SELECT id, display_name, stripe_price_id
FROM public.plans
WHERE is_active = true 
  AND (stripe_price_id IS NULL OR stripe_price_id NOT LIKE 'price_%');

-- 2. No orphaned orders
SELECT COUNT(*) as orphaned_orders
FROM public.orders o
LEFT JOIN public.plans p ON o.plan_id = p.id
WHERE p.id IS NULL;

-- 3. All orders have valid node references (if node_id is set)
SELECT COUNT(*) as invalid_node_refs
FROM public.orders o
WHERE o.node_id IS NOT NULL 
  AND o.node_id NOT IN (SELECT id FROM public.ptero_nodes);

-- 4. All active plans have matching games
SELECT id, game, item_type
FROM public.plans
WHERE is_active = true 
  AND item_type = 'game' 
  AND (game IS NULL OR game = '');
```

## Step 7: Deploy Updated Functions

After database cleanup, deploy the updated functions:

```bash
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

## Common Issues & Fixes

### Issue: Plans don't match Stripe
**Fix:** Update `stripe_price_id` in plans table to match actual Stripe price IDs

### Issue: Node IDs don't match Pterodactyl
**Fix:** Update `pterodactyl_node_id` in ptero_nodes table

### Issue: Orders reference deleted plans
**Fix:** Either restore the plan or mark orders as 'error'

### Issue: Region mismatch
**Fix:** Ensure `orders.region` matches `ptero_nodes.region` format

## Next Steps

1. ✅ Run audit queries
2. ✅ Remove modpack support (migration)
3. ✅ Align plans with Stripe
4. ✅ Align nodes with Pterodactyl
5. ✅ Clean up orphaned data
6. ✅ Deploy updated functions
7. ✅ Test checkout flow


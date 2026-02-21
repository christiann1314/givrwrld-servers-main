-- =====================================================
-- COMPREHENSIVE CLEANUP MIGRATION
-- =====================================================
-- This migration cleans up inconsistencies and removes unused data

-- Step 1: Remove unused columns (if they exist)
ALTER TABLE public.orders 
  DROP COLUMN IF EXISTS modpack_id CASCADE;

-- Remove modpack_id from user_servers if table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_servers') THEN
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'user_servers' 
        AND column_name = 'modpack_id'
    ) THEN
      ALTER TABLE public.user_servers DROP COLUMN modpack_id CASCADE;
    END IF;
  END IF;
END $$;

-- Step 2: Clean up orphaned orders
-- Mark orders as error if plan doesn't exist
UPDATE public.orders
SET status = 'error'
WHERE plan_id NOT IN (SELECT id FROM public.plans)
  AND status NOT IN ('error', 'canceled');

-- Step 3: Clean up orders with invalid node references
UPDATE public.orders
SET node_id = NULL
WHERE node_id IS NOT NULL 
  AND node_id NOT IN (SELECT id FROM public.ptero_nodes);

-- Step 4: Mark inactive plans that likely don't exist in Stripe
-- (Update this list with your actual Stripe price IDs)
UPDATE public.plans
SET is_active = false
WHERE stripe_price_id NOT LIKE 'price_1%'
  AND stripe_price_id NOT LIKE 'price_test_%';

-- Step 5: Remove duplicate/unused addons if any
-- (Review and adjust based on your needs)
DELETE FROM public.addons
WHERE id NOT IN (
  SELECT DISTINCT unnest(addons::text[])::text
  FROM public.orders
  WHERE addons IS NOT NULL
);

-- Step 6: Clean up unused indexes (if any)
-- Review indexes and remove unused ones manually

-- Step 7: Verify data integrity
-- Check for orders without users
UPDATE public.orders
SET status = 'error'
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 8: Clean up old error orders (optional - adjust date as needed)
-- DELETE FROM public.orders
-- WHERE status = 'error' 
--   AND created_at < NOW() - INTERVAL '90 days';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check for remaining issues
SELECT 'Orphaned Orders' as issue_type, COUNT(*) as count
FROM public.orders o
LEFT JOIN public.plans p ON o.plan_id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 'Invalid Node References', COUNT(*)
FROM public.orders
WHERE node_id IS NOT NULL 
  AND node_id NOT IN (SELECT id FROM public.ptero_nodes)

UNION ALL

SELECT 'Orders Without Users', COUNT(*)
FROM public.orders
WHERE user_id NOT IN (SELECT id FROM auth.users)

UNION ALL

SELECT 'Inactive Plans', COUNT(*)
FROM public.plans
WHERE is_active = false;


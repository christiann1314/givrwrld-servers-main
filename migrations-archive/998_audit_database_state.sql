-- =====================================================
-- DATABASE AUDIT QUERIES
-- =====================================================
-- Run these queries to see current state before cleanup

-- 1. Check all plans in database
SELECT 
  id,
  item_type,
  game,
  display_name,
  stripe_price_id,
  is_active,
  ram_gb,
  vcores,
  ssd_gb
FROM public.plans
ORDER BY item_type, game, ram_gb;

-- 2. Check all addons in database
SELECT 
  id,
  item_type,
  display_name,
  stripe_price_id,
  is_active
FROM public.addons
ORDER BY item_type;

-- 3. Check all modpacks (before removal)
SELECT 
  id,
  game,
  display_name,
  slug,
  is_active
FROM public.modpacks
ORDER BY game;

-- 4. Check orders with modpack_id (before cleanup)
SELECT 
  id,
  plan_id,
  modpack_id,
  status,
  created_at
FROM public.orders
WHERE modpack_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- 5. Check ptero_nodes
SELECT 
  id,
  pterodactyl_node_id,
  name,
  region,
  max_ram_gb,
  max_disk_gb,
  enabled
FROM public.ptero_nodes
ORDER BY region, name;

-- 6. Count orders by status
SELECT 
  status,
  COUNT(*) as count
FROM public.orders
GROUP BY status
ORDER BY count DESC;

-- 7. Check for orphaned orders (plan_id not in plans table)
SELECT 
  o.id,
  o.plan_id,
  o.status,
  o.created_at
FROM public.orders o
LEFT JOIN public.plans p ON o.plan_id = p.id
WHERE p.id IS NULL
ORDER BY o.created_at DESC;

-- 8. Check for plans with invalid stripe_price_id format
SELECT 
  id,
  display_name,
  stripe_price_id,
  CASE 
    WHEN stripe_price_id LIKE 'price_%' THEN 'Valid'
    WHEN stripe_price_id LIKE 'price_%_%' THEN 'Check format'
    ELSE 'Invalid'
  END as price_id_status
FROM public.plans
WHERE is_active = true;


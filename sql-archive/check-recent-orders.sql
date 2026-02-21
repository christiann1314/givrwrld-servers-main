-- Check recent orders and their provisioning status
-- Run this in Supabase SQL Editor

-- 1. Check all recent orders (last 24 hours)
SELECT 
  id,
  user_id,
  plan_id,
  item_type,
  server_name,
  status,
  stripe_sub_id,
  pterodactyl_server_id,
  pterodactyl_server_identifier,
  region,
  created_at,
  updated_at
FROM orders
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check orders by status
SELECT 
  status,
  COUNT(*) as count,
  MAX(created_at) as latest_order
FROM orders
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY latest_order DESC;

-- 3. Check orders that are paid but not provisioned
SELECT 
  id,
  user_id,
  plan_id,
  server_name,
  status,
  pterodactyl_server_id,
  created_at
FROM orders
WHERE status IN ('paid', 'provisioning', 'installing')
  AND (pterodactyl_server_id IS NULL OR pterodactyl_server_id = 0)
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check external_accounts for user
-- Replace USER_ID with actual user ID from orders above
-- SELECT * FROM external_accounts WHERE user_id = 'USER_ID';

-- 5. Check if nodes are available
SELECT 
  id,
  name,
  region,
  max_ram_gb,
  reserved_headroom_gb,
  enabled,
  (SELECT COUNT(*) FROM orders 
   WHERE node_id = ptero_nodes.id 
   AND status IN ('paid', 'provisioning', 'installing', 'provisioned', 'active')
  ) as active_orders
FROM ptero_nodes
WHERE enabled = true;


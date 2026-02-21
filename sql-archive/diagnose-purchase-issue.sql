-- Diagnostic queries to check purchase flow
-- Run these in Supabase SQL Editor after a purchase

-- 1. Check recent orders (last hour)
SELECT 
  id,
  user_id,
  plan_id,
  item_type,
  server_name,
  status,
  stripe_sub_id,
  pterodactyl_server_id,
  created_at,
  updated_at
FROM orders
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 2. Check orders by status
SELECT 
  status,
  COUNT(*) as count,
  MAX(created_at) as latest
FROM orders
GROUP BY status
ORDER BY latest DESC;

-- 3. Check orders that are paid but not provisioned
SELECT 
  id,
  user_id,
  plan_id,
  item_type,
  server_name,
  status,
  stripe_sub_id,
  pterodactyl_server_id,
  created_at
FROM orders
WHERE status = 'paid'
  AND pterodactyl_server_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check orders in provisioning states
SELECT 
  id,
  user_id,
  plan_id,
  item_type,
  server_name,
  status,
  stripe_sub_id,
  pterodactyl_server_id,
  created_at
FROM orders
WHERE status IN ('paid', 'provisioning', 'installing', 'error')
ORDER BY created_at DESC
LIMIT 20;

-- 5. Check user's orders (replace USER_ID with actual user ID)
-- SELECT * FROM orders WHERE user_id = 'USER_ID' ORDER BY created_at DESC;


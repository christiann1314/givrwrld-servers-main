-- Check ALL orders (no time limit)
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
ORDER BY created_at DESC
LIMIT 20;

-- Check if ANY orders exist at all
SELECT COUNT(*) as total_orders FROM orders;

-- Check orders by status
SELECT 
  status,
  COUNT(*) as count,
  MAX(created_at) as latest_order
FROM orders
GROUP BY status
ORDER BY latest_order DESC;



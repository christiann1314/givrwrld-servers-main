-- Quick query to get order ID for manual provisioning
-- Run this in Supabase SQL Editor

SELECT 
  id as order_id,
  user_id,
  plan_id,
  item_type,
  server_name,
  status,
  created_at
FROM orders
WHERE status = 'paid'
  AND pterodactyl_server_id IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- Copy the "order_id" value from the results
-- Use it in the servers-provision function payload:
-- {
--   "order_id": "PASTE_ORDER_ID_HERE"
-- }


-- Quick diagnostic query to check provisioning status
-- Run this in Supabase SQL Editor after a purchase

-- Check recent orders and their provisioning status
SELECT 
  o.id as order_id,
  o.user_id,
  o.plan_id,
  o.item_type,
  o.server_name,
  o.status,
  o.region,
  o.stripe_sub_id,
  o.pterodactyl_server_id,
  o.pterodactyl_server_identifier,
  o.node_id,
  o.created_at,
  o.updated_at,
  p.display_name as plan_name,
  p.game,
  p.ram_gb,
  CASE 
    WHEN o.status = 'paid' AND o.pterodactyl_server_id IS NULL THEN '⚠️ NEEDS PROVISIONING'
    WHEN o.status = 'provisioning' THEN '🔄 PROVISIONING IN PROGRESS'
    WHEN o.status = 'provisioned' THEN '✅ PROVISIONED'
    WHEN o.status = 'error' THEN '❌ ERROR - CHECK LOGS'
    ELSE o.status
  END as provisioning_status
FROM orders o
LEFT JOIN plans p ON o.plan_id = p.id
WHERE o.created_at > NOW() - INTERVAL '24 hours'
ORDER BY o.created_at DESC
LIMIT 20;

-- Check for orders that need manual provisioning
SELECT 
  o.id as order_id,
  o.server_name,
  o.plan_id,
  o.status,
  o.created_at,
  p.display_name as plan_name
FROM orders o
LEFT JOIN plans p ON o.plan_id = p.id
WHERE o.status = 'paid' 
  AND o.pterodactyl_server_id IS NULL
  AND o.item_type = 'game'
ORDER BY o.created_at DESC;


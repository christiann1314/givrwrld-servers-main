-- Check ptero_nodes table
SELECT 
  id,
  pterodactyl_node_id,
  name,
  region,
  max_ram_gb,
  max_disk_gb,
  reserved_headroom_gb,
  enabled,
  last_seen_at,
  created_at
FROM ptero_nodes
ORDER BY region, enabled DESC;

-- Check external_accounts table (sample)
SELECT 
  user_id,
  pterodactyl_user_id,
  panel_username,
  last_synced_at
FROM external_accounts
ORDER BY last_synced_at DESC
LIMIT 10;

-- Check if users have external accounts
SELECT 
  u.id as user_id,
  u.email,
  CASE WHEN ea.user_id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_panel_account,
  ea.pterodactyl_user_id,
  ea.panel_username
FROM auth.users u
LEFT JOIN external_accounts ea ON ea.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 20;

-- Count nodes by region with capacity calculations
SELECT 
  region,
  COUNT(*) as total_nodes,
  SUM(CASE WHEN enabled THEN 1 ELSE 0 END) as enabled_nodes,
  SUM(max_ram_gb) as total_ram_gb,
  SUM(reserved_headroom_gb) as reserved_headroom_gb,
  SUM(max_ram_gb - reserved_headroom_gb) as available_ram_gb
FROM ptero_nodes
GROUP BY region;


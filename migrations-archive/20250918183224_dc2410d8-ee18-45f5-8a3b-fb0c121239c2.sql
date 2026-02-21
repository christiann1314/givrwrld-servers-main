-- Update stuck servers to allow re-provisioning
UPDATE user_servers 
SET status = 'pending', 
    ip = '15.204.251.32',
    updated_at = NOW()
WHERE status = 'installing' 
  AND pterodactyl_server_id IS NOT NULL;
-- Delete the two pending servers that were manually removed from Pterodactyl
DELETE FROM user_servers 
WHERE id IN (
  'e1a9d65d-199d-4ad1-bf4a-c047c807b495',  -- minecraft-server-eor2
  '55499bd6-4583-4047-882b-bb4aa5356626'   -- older Minecraft Server
) 
AND status = 'pending';
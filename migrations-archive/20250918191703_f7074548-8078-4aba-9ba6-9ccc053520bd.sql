-- First delete the orders associated with the servers to be removed
DELETE FROM orders 
WHERE server_id IN (
  'e1a9d65d-199d-4ad1-bf4a-c047c807b495',  -- minecraft-server-eor2
  '55499bd6-4583-4047-882b-bb4aa5356626'   -- older Minecraft Server
);

-- Then delete the servers themselves
DELETE FROM user_servers 
WHERE id IN (
  'e1a9d65d-199d-4ad1-bf4a-c047c807b495',  -- minecraft-server-eor2
  '55499bd6-4583-4047-882b-bb4aa5356626'   -- older Minecraft Server
) 
AND status = 'pending';
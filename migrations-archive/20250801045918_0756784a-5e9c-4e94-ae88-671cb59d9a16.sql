-- Test adding a second server to trigger real-time updates
INSERT INTO public.user_servers (
  user_id, 
  server_name, 
  game_type, 
  ram, 
  cpu, 
  disk, 
  location, 
  status,
  pterodactyl_url
) VALUES (
  'f9352a56-af91-46e3-af25-d4e463a4bdc1',
  'Minecraft Server 2',
  'Minecraft',
  '4GB',
  '2 vCPU',
  '50GB SSD',
  'US-East',
  'Online',
  'https://panel.example.com'
);
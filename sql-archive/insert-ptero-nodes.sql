-- Seed data for pterodactyl nodes (update with your actual node IDs)
INSERT INTO public.ptero_nodes (pterodactyl_node_id, name, region, max_ram_gb, max_disk_gb, reserved_headroom_gb, enabled) VALUES
  (1, 'US-East-1', 'east', 64, 1000, 2, true),
  (2, 'US-West-1', 'west', 64, 1000, 2, true),
  (3, 'EU-Central-1', 'eu', 64, 1000, 2, true)
ON CONFLICT (pterodactyl_node_id) DO UPDATE SET
  name = EXCLUDED.name,
  region = EXCLUDED.region,
  max_ram_gb = EXCLUDED.max_ram_gb,
  max_disk_gb = EXCLUDED.max_disk_gb,
  reserved_headroom_gb = EXCLUDED.reserved_headroom_gb,
  enabled = EXCLUDED.enabled;


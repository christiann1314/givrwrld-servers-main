-- Seed Pterodactyl integration for local development
-- Run AFTER creating Location and Node in Pterodactyl Panel
-- Update NODE_ID below to match your panel's Node ID

USE app_core;

-- Minecraft nest and egg (Pterodactyl default: nest 1, egg 1 = Java)
INSERT IGNORE INTO ptero_nests (ptero_nest_id, name, description) VALUES
  (1, 'Minecraft', 'Minecraft - Vanilla, Spigot, Paper, etc.');

INSERT INTO ptero_eggs (ptero_egg_id, ptero_nest_id, name, docker_image, startup_cmd, description)
VALUES (1, 1, 'Java', 'ghcr.io/pterodactyl/yolks:java_17', 'java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}', 'Minecraft Java')
ON DUPLICATE KEY UPDATE docker_image = VALUES(docker_image), startup_cmd = VALUES(startup_cmd);

-- Insert region (if not exists)
INSERT IGNORE INTO regions (code, display_name) VALUES
  ('us-central', 'US Central'),
  ('us-east', 'US East'),
  ('us-west', 'US West');

-- Insert ptero node - REPLACE 1 with your actual Pterodactyl Node ID from the panel
-- Get Node ID from: Admin -> Nodes -> click your node -> ID is in the URL
INSERT INTO ptero_nodes (ptero_node_id, name, region_code, max_ram_gb, max_disk_gb, reserved_headroom, enabled)
VALUES (1, 'Local-Node', 'us-central', 64, 1024, 2, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  region_code = VALUES(region_code),
  max_ram_gb = VALUES(max_ram_gb),
  max_disk_gb = VALUES(max_disk_gb),
  enabled = VALUES(enabled);

-- Map region to node (for getNodeForRegion)
INSERT INTO region_node_map (region_code, ptero_node_id, weight)
VALUES ('us-central', 1, 100)
ON DUPLICATE KEY UPDATE weight = VALUES(weight);

-- Add us-east and us-west if you have multiple nodes
-- INSERT INTO region_node_map (region_code, ptero_node_id, weight) VALUES ('us-east', 1, 100);
-- INSERT INTO region_node_map (region_code, ptero_node_id, weight) VALUES ('us-west', 1, 100);

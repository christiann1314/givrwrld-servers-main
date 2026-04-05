-- Optional branding / join hints after post-provision worker (dashboard, support).
-- Rollback: ALTER TABLE orders DROP COLUMN game_display_address, DROP COLUMN game_brand_hostname;

ALTER TABLE orders
  ADD COLUMN game_brand_hostname VARCHAR(255) NULL DEFAULT NULL AFTER ptero_extra_ports_json,
  ADD COLUMN game_display_address VARCHAR(512) NULL DEFAULT NULL AFTER game_brand_hostname;

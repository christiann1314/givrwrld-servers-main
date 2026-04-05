-- Optional branding / join hints after post-provision worker (dashboard, support).
-- Rollback: ALTER TABLE orders DROP COLUMN game_display_address, DROP COLUMN game_brand_hostname;
-- Idempotent: db-migrate reapplies all migrations each run.

SET @db := DATABASE();

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'orders' AND column_name = 'game_brand_hostname');
SET @s := IF(@c = 0, 'ALTER TABLE orders ADD COLUMN game_brand_hostname VARCHAR(255) NULL DEFAULT NULL AFTER ptero_extra_ports_json', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'orders' AND column_name = 'game_display_address');
SET @s := IF(@c = 0, 'ALTER TABLE orders ADD COLUMN game_display_address VARCHAR(512) NULL DEFAULT NULL AFTER game_brand_hostname', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

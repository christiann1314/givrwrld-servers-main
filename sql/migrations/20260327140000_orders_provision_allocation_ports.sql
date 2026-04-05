-- Persist Panel allocation truth on the order for dashboard, support, and idempotent retries.
-- Rollback: ALTER TABLE orders DROP COLUMN ptero_extra_ports_json, DROP COLUMN ptero_primary_port,
--   DROP COLUMN ptero_primary_allocation_id, DROP COLUMN ptero_server_uuid;
-- Idempotent: db-migrate reapplies all migrations each run.

SET @db := DATABASE();

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'orders' AND column_name = 'ptero_server_uuid');
SET @s := IF(@c = 0, 'ALTER TABLE orders ADD COLUMN ptero_server_uuid CHAR(36) NULL DEFAULT NULL AFTER ptero_identifier', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'orders' AND column_name = 'ptero_primary_allocation_id');
SET @s := IF(@c = 0, 'ALTER TABLE orders ADD COLUMN ptero_primary_allocation_id INT NULL DEFAULT NULL AFTER ptero_server_uuid', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'orders' AND column_name = 'ptero_primary_port');
SET @s := IF(@c = 0, 'ALTER TABLE orders ADD COLUMN ptero_primary_port INT NULL DEFAULT NULL AFTER ptero_primary_allocation_id', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'orders' AND column_name = 'ptero_extra_ports_json');
SET @s := IF(@c = 0, 'ALTER TABLE orders ADD COLUMN ptero_extra_ports_json JSON NULL DEFAULT NULL AFTER ptero_primary_port', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

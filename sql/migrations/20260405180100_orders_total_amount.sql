-- Checkout / billing display (COALESCE in getUserOrders).
-- Rollback: ALTER TABLE orders DROP COLUMN total_amount;
-- Idempotent: safe under db-migrate re-runs.

SET @db := DATABASE();

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'orders' AND column_name = 'total_amount');
SET @s := IF(@c = 0, 'ALTER TABLE orders ADD COLUMN total_amount DECIMAL(10,2) NULL DEFAULT NULL AFTER server_name', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

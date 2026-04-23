-- Add parent_order_id to link addon/upgrade purchases to their parent game server order.
-- Idempotent: db-migrate replays all migration files on each run (no ledger yet).

SET @db = DATABASE();

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'parent_order_id'
);
SET @sql = IF(
  @col_exists = 0,
  'ALTER TABLE orders ADD COLUMN parent_order_id CHAR(36) NULL AFTER user_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = @db AND table_name = 'orders' AND index_name = 'idx_orders_parent'
);
SET @sql2 = IF(
  @idx_exists = 0,
  'ALTER TABLE orders ADD INDEX idx_orders_parent (parent_order_id)',
  'SELECT 1'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Support 24h provisioning-stats query without full table scan.
-- Rollback: DROP INDEX idx_orders_status_updated ON orders;
-- Idempotent: db-migrate reapplies all migrations each run.

SET @idx_exists := (
  SELECT COUNT(1) FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND index_name = 'idx_orders_status_updated'
);
SET @sql := IF(@idx_exists = 0,
  'ALTER TABLE orders ADD INDEX idx_orders_status_updated (status, updated_at)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Post-provision reachability: configuring → verifying → playable (Class C HTTPS, log checks, etc.)
-- Rollback: restore previous ENUM (omit new values) — only run if no rows use new statuses.
-- Idempotent: skip if ENUM already includes playable.

SET @has_playable := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'orders'
    AND column_name = 'status'
    AND column_type LIKE '%playable%'
);
SET @sql := IF(@has_playable = 0,
  'ALTER TABLE orders MODIFY COLUMN status ENUM(''pending'',''paid'',''provisioning'',''provisioned'',''configuring'',''verifying'',''playable'',''error'',''canceled'',''failed'') NOT NULL DEFAULT ''pending''',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

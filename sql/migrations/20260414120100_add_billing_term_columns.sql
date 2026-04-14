-- Add term price columns to plans table and semiannual to orders.term enum.
-- Safe to re-run (uses IF NOT EXISTS / conditional ALTER).
-- Run: mysql -u app_rw -p app_core < sql/migrations/20260414120100_add_billing_term_columns.sql

USE app_core;

-- Add price_quarterly if missing
SET @has_quarterly = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'plans' AND column_name = 'price_quarterly'
);
SET @sql_q = IF(@has_quarterly = 0,
  'ALTER TABLE plans ADD COLUMN price_quarterly DECIMAL(10,2) NULL AFTER price_monthly',
  'SELECT 1');
PREPARE stmt FROM @sql_q; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add price_semiannual if missing
SET @has_semiannual = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'plans' AND column_name = 'price_semiannual'
);
SET @sql_s = IF(@has_semiannual = 0,
  'ALTER TABLE plans ADD COLUMN price_semiannual DECIMAL(10,2) NULL AFTER price_quarterly',
  'SELECT 1');
PREPARE stmt FROM @sql_s; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add price_yearly if missing
SET @has_yearly = (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = DATABASE() AND table_name = 'plans' AND column_name = 'price_yearly'
);
SET @sql_y = IF(@has_yearly = 0,
  'ALTER TABLE plans ADD COLUMN price_yearly DECIMAL(10,2) NULL AFTER price_semiannual',
  'SELECT 1');
PREPARE stmt FROM @sql_y; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Populate term prices from monthly (5%, 10%, 20% discounts) where NULL
UPDATE plans
SET price_quarterly  = ROUND(price_monthly * 3 * 0.95, 2)
WHERE price_quarterly IS NULL AND price_monthly > 0;

UPDATE plans
SET price_semiannual = ROUND(price_monthly * 6 * 0.90, 2)
WHERE price_semiannual IS NULL AND price_monthly > 0;

UPDATE plans
SET price_yearly     = ROUND(price_monthly * 12 * 0.80, 2)
WHERE price_yearly IS NULL AND price_monthly > 0;

-- Ensure orders.term enum includes 'semiannual'
-- This is a safe ALTER that widens the enum; existing rows are not affected.
ALTER TABLE orders MODIFY COLUMN term ENUM('monthly','quarterly','semiannual','yearly') NOT NULL;

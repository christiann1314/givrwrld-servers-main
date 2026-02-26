-- Add semiannual to orders.term so 6-month checkout does not fail
-- Run: mysql -u app_rw -p app_core < migrations/20260222000000_add_semiannual_to_orders_term.sql

USE app_core;

ALTER TABLE orders
  MODIFY COLUMN term ENUM('monthly','quarterly','semiannual','yearly') NOT NULL;

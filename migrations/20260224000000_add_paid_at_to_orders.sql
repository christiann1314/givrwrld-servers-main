-- Add paid_at for KPI digest (new paid orders, avg provision time). Safe default NULL.
-- Run once from repo root: mysql -u app_rw -p app_core < migrations/20260224000000_add_paid_at_to_orders.sql

USE app_core;

ALTER TABLE orders ADD COLUMN paid_at DATETIME NULL DEFAULT NULL;
-- Optional backfill: set paid_at = updated_at where status IN ('paid','provisioning','provisioned') and paid_at IS NULL
-- UPDATE orders SET paid_at = updated_at WHERE status IN ('paid','provisioning','provisioned') AND paid_at IS NULL;

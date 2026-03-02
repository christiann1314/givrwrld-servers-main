-- Support 24h provisioning-stats query without full table scan.
-- Rollback: DROP INDEX idx_orders_status_updated ON orders;

ALTER TABLE orders ADD INDEX idx_orders_status_updated (status, updated_at);

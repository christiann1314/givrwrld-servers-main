-- Persist Panel allocation truth on the order for dashboard, support, and idempotent retries.
-- Rollback: ALTER TABLE orders DROP COLUMN ptero_extra_ports_json, DROP COLUMN ptero_primary_port,
--   DROP COLUMN ptero_primary_allocation_id, DROP COLUMN ptero_server_uuid;

ALTER TABLE orders
  ADD COLUMN ptero_server_uuid CHAR(36) NULL DEFAULT NULL AFTER ptero_identifier,
  ADD COLUMN ptero_primary_allocation_id INT NULL DEFAULT NULL AFTER ptero_server_uuid,
  ADD COLUMN ptero_primary_port INT NULL DEFAULT NULL AFTER ptero_primary_allocation_id,
  ADD COLUMN ptero_extra_ports_json JSON NULL DEFAULT NULL AFTER ptero_primary_port;

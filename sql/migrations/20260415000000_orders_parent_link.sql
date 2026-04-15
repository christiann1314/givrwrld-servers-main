-- Add parent_order_id to link addon/upgrade purchases to their parent game server order.
-- This allows querying "which addons does this server have?"

ALTER TABLE orders
  ADD COLUMN parent_order_id CHAR(36) NULL AFTER user_id,
  ADD INDEX idx_orders_parent (parent_order_id);

-- FK is intentionally omitted to avoid cascading issues with order lifecycle.
-- Application logic will enforce referential integrity.

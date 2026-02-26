-- Phase 1: Order state machine + idempotency
-- Run: mysql -u app_rw -p app_core < migrations/20260220000000_phase1_order_idempotency.sql

USE app_core;

-- Idempotency table for PayPal webhooks (event_id = primary key; if exists, return 200 and skip)
CREATE TABLE IF NOT EXISTS paypal_webhook_events (
  event_id    VARCHAR(120) PRIMARY KEY,
  received_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  raw_type    VARCHAR(120) NOT NULL,
  order_id    CHAR(36)     NULL,
  INDEX idx_order (order_id),
  INDEX idx_received (received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Orders: provisioning retry columns (run each ALTER once; ignore "Duplicate column" if re-running)
ALTER TABLE orders ADD COLUMN provision_attempt_count INT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN last_provision_attempt_at DATETIME NULL;
ALTER TABLE orders ADD COLUMN last_provision_error TEXT NULL;

-- Status enum: add 'failed' (run once; ignore if already present)
ALTER TABLE orders MODIFY COLUMN status ENUM('pending','paid','provisioning','provisioned','error','failed','canceled') DEFAULT 'pending';

-- Unique on ptero_server_id (nullable: only one non-null per server). Run once; ignore "Duplicate key" if index exists.
ALTER TABLE orders ADD UNIQUE INDEX uniq_ptero_server_id (ptero_server_id);

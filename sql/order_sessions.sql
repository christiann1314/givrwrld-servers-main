-- Order Sessions Table
-- Maps Stripe checkout sessions to orders

USE app_core;

-- Map Stripe checkout sessions -> orders
CREATE TABLE IF NOT EXISTS order_sessions (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id          CHAR(36) NOT NULL,
  stripe_session_id VARCHAR(120) NOT NULL,
  status            ENUM('created','completed','expired','canceled') DEFAULT 'created',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_session (stripe_session_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order (order_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Quick audit view
CREATE OR REPLACE VIEW v_orders_brief AS
SELECT
  o.id,
  o.user_id,
  o.plan_id,
  o.region,
  o.server_name,
  o.status,
  os.stripe_session_id,
  o.stripe_sub_id,
  o.ptero_server_id,
  o.ptero_identifier,
  o.created_at,
  o.updated_at
FROM orders o
LEFT JOIN order_sessions os ON os.order_id = o.id;


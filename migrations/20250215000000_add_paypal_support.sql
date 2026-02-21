-- Add PayPal support for recurring subscriptions
-- Run: mysql -u app_rw -p app_core < migrations/20250215000000_add_paypal_support.sql

USE app_core;

-- Plans: add PayPal plan ID (maps to PayPal Billing Plan)
ALTER TABLE plans
  ADD COLUMN paypal_plan_id VARCHAR(128) NULL AFTER stripe_price_id,
  ADD INDEX idx_paypal_plan (paypal_plan_id);

-- Orders: add PayPal subscription and payer IDs
ALTER TABLE orders
  ADD COLUMN paypal_subscription_id VARCHAR(128) NULL AFTER stripe_customer_id,
  ADD COLUMN paypal_payer_id VARCHAR(128) NULL AFTER paypal_subscription_id,
  ADD INDEX idx_paypal_sub (paypal_subscription_id);

-- PayPal Subscriptions (mirrors stripe_subscriptions)
CREATE TABLE IF NOT EXISTS paypal_subscriptions (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id          CHAR(36) NOT NULL,
  paypal_sub_id     VARCHAR(120) NOT NULL,
  status            VARCHAR(32) NOT NULL,
  payer_id          VARCHAR(120) NULL,
  current_period_end TIMESTAMP NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_order (order_id),
  UNIQUE KEY uniq_sub (paypal_sub_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_paypal_sub (paypal_sub_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- PayPal Webhook Events Log
CREATE TABLE IF NOT EXISTS paypal_events_log (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id     VARCHAR(120) NOT NULL,
  event_type   VARCHAR(120) NOT NULL,
  payload      JSON,
  processed    TINYINT(1) DEFAULT 0,
  received_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  UNIQUE KEY uniq_event (event_id),
  INDEX idx_type (event_type),
  INDEX idx_processed (processed),
  INDEX idx_received (received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Secrets: add paypal scope (modify ENUM)
ALTER TABLE secrets MODIFY COLUMN scope ENUM('panel','stripe','paypal','worker','general') NOT NULL;

-- Attribution only: which orders came from which affiliate. No billing/provisioning use.
-- Rollback: DROP TABLE IF EXISTS order_affiliate_attribution;

CREATE TABLE IF NOT EXISTS order_affiliate_attribution (
  id                CHAR(36) PRIMARY KEY,
  order_id          CHAR(36) NOT NULL,
  affiliate_user_id CHAR(36) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_order_affiliate (order_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (affiliate_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_affiliate (affiliate_user_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

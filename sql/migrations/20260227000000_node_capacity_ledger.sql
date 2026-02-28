USE app_core;

-- Ledger for reserved node capacity per order.
-- Ensures each order reserves capacity on at most one node (order_id UNIQUE),
-- and allows transactional capacity checks without mutating ptero_nodes directly.

CREATE TABLE IF NOT EXISTS ptero_node_capacity_ledger (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  ptero_node_id  INT NOT NULL,
  order_id       CHAR(36) NOT NULL,
  ram_gb         INT NOT NULL,
  disk_gb        INT NOT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_order (order_id),
  INDEX idx_node (ptero_node_id),
  CONSTRAINT fk_node_capacity_node
    FOREIGN KEY (ptero_node_id) REFERENCES ptero_nodes(ptero_node_id) ON DELETE CASCADE,
  CONSTRAINT fk_node_capacity_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


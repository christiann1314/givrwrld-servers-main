CREATE TABLE IF NOT EXISTS server_public_pages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  public_page_enabled TINYINT(1) NOT NULL DEFAULT 0,
  public_slug VARCHAR(80) NULL,
  streamer_name VARCHAR(120) NULL,
  stream_platform ENUM('twitch', 'kick') NULL,
  stream_channel VARCHAR(120) NULL,
  stream_url VARCHAR(255) NULL,
  discord_url VARCHAR(255) NULL,
  server_description TEXT NULL,
  kick_embed_enabled TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_server_public_pages_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_server_public_pages_order (order_id),
  UNIQUE KEY uniq_server_public_pages_slug (public_slug),
  KEY idx_server_public_pages_enabled_slug (public_page_enabled, public_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS server_public_snapshots (
  order_id CHAR(36) NOT NULL PRIMARY KEY,
  status VARCHAR(32) NOT NULL,
  players_online INT NOT NULL DEFAULT 0,
  players_max INT NOT NULL DEFAULT 0,
  join_address VARCHAR(255) NULL,
  snapshot_source VARCHAR(32) NOT NULL DEFAULT 'panel-cache',
  captured_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_server_public_snapshots_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  KEY idx_server_public_snapshots_captured_at (captured_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- GIVRwrld Core Database Schema (MySQL 8.0)
-- Run: mysql -u root app_core < sql/app_core.sql

USE app_core;

-- ============ Users & Authentication ============

CREATE TABLE IF NOT EXISTS users (
  id                CHAR(36) PRIMARY KEY,
  email             VARCHAR(255) NOT NULL UNIQUE,
  password_hash     VARBINARY(255) NOT NULL,
  display_name      VARCHAR(120),
  is_email_verified TINYINT(1) DEFAULT 0,
  email_verified_at  TIMESTAMP NULL,
  last_login_at     TIMESTAMP NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ Roles & Permissions ============

CREATE TABLE IF NOT EXISTS roles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  code        ENUM('admin','moderator','user') NOT NULL,
  display_name VARCHAR(64) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO roles(code, display_name) VALUES 
  ('admin','Administrator'),
  ('moderator','Moderator'),
  ('user','User');

CREATE TABLE IF NOT EXISTS user_roles (
  id         CHAR(36) PRIMARY KEY,
  user_id    CHAR(36) NOT NULL,
  role_id    INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  UNIQUE KEY uniq_user_role (user_id, role_id),
  INDEX idx_user (user_id),
  INDEX idx_role (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ Plans & Catalog ============

CREATE TABLE IF NOT EXISTS plans (
  id                VARCHAR(64) PRIMARY KEY,
  item_type         ENUM('game','vps') NOT NULL,
  game              VARCHAR(64),
  ram_gb            INT NOT NULL,
  vcores            INT NOT NULL,
  ssd_gb            INT NOT NULL,
  price_monthly     DECIMAL(10,2) NOT NULL,
  ptero_egg_id      INT NULL,
  stripe_product_id VARCHAR(128) NULL,
  stripe_price_id   VARCHAR(128) NULL,
  display_name      VARCHAR(128) NOT NULL,
  description       TEXT,
  is_active         TINYINT(1) DEFAULT 1,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_game (game),
  INDEX idx_active (is_active),
  INDEX idx_stripe_price (stripe_price_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ Orders & Subscriptions ============

CREATE TABLE IF NOT EXISTS orders (
  id                    CHAR(36) PRIMARY KEY,
  user_id               CHAR(36) NOT NULL,
  item_type             ENUM('game','vps') NOT NULL,
  plan_id               VARCHAR(64) NOT NULL,
  term                  ENUM('monthly','quarterly','yearly') NOT NULL,
  region                VARCHAR(64) NOT NULL,
  server_name           VARCHAR(128) NOT NULL,
  status                ENUM('pending','paid','provisioning','provisioned','error','canceled') DEFAULT 'pending',
  stripe_sub_id         VARCHAR(128),
  stripe_customer_id    VARCHAR(128),
  ptero_server_id       INT,
  ptero_identifier      VARCHAR(32),
  ptero_node_id         INT,
  error_message         TEXT,
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT,
  INDEX idx_orders_user (user_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_created (created_at),
  INDEX idx_stripe_sub (stripe_sub_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ Support Tickets ============

CREATE TABLE IF NOT EXISTS tickets (
  id          CHAR(36) PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  subject     VARCHAR(200) NOT NULL,
  category    ENUM('general','billing','technical') DEFAULT 'general',
  priority    ENUM('low','normal','high') DEFAULT 'normal',
  status      ENUM('open','pending','closed') DEFAULT 'open',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ticket_user (user_id),
  INDEX idx_ticket_status (status),
  INDEX idx_ticket_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_messages (
  id           CHAR(36) PRIMARY KEY,
  ticket_id    CHAR(36) NOT NULL,
  user_id      CHAR(36) NOT NULL,
  is_staff     TINYINT(1) DEFAULT 0,
  message      MEDIUMTEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ticket_messages_ticket (ticket_id),
  INDEX idx_ticket_messages_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ Audit & Logging ============

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id     CHAR(36),
  event       VARCHAR(64) NOT NULL,
  entity      VARCHAR(64),
  entity_id   VARCHAR(64),
  details     JSON,
  ip          VARCHAR(64),
  user_agent  VARCHAR(255),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_user_time (user_id, created_at),
  INDEX idx_audit_event (event),
  INDEX idx_audit_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ Server Stats Cache ============

CREATE TABLE IF NOT EXISTS server_stats_cache (
  order_id      CHAR(36) PRIMARY KEY,
  state         VARCHAR(32) NOT NULL,
  cpu_percent   FLOAT,
  memory_bytes  BIGINT,
  disk_bytes    BIGINT,
  uptime_ms     BIGINT,
  players_online INT DEFAULT 0,
  players_max   INT DEFAULT 0,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_stats_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ Secrets & Configuration ============

CREATE TABLE IF NOT EXISTS secrets (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  scope       ENUM('panel','stripe','worker','general') NOT NULL,
  key_name    VARCHAR(120) NOT NULL,
  value_enc   VARBINARY(4096) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_scope_key (scope, key_name),
  INDEX idx_scope (scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS config (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  scope       ENUM('panel','stripe','worker','general') NOT NULL,
  key_name    VARCHAR(120) NOT NULL,
  value_str   VARCHAR(1024) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_cfg (scope, key_name),
  INDEX idx_scope (scope)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ Pterodactyl Catalog ============

CREATE TABLE IF NOT EXISTS regions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(32) NOT NULL UNIQUE,
  display_name  VARCHAR(64) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ptero_nodes (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  ptero_node_id     INT NOT NULL UNIQUE,
  name              VARCHAR(128) NOT NULL,
  region_code       VARCHAR(32) NOT NULL,
  max_ram_gb        INT NOT NULL,
  max_disk_gb       INT NOT NULL,
  reserved_headroom INT DEFAULT 2,
  enabled           TINYINT(1) DEFAULT 1,
  last_seen_at      TIMESTAMP NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (region_code) REFERENCES regions(code) ON DELETE RESTRICT,
  INDEX idx_region (region_code),
  INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ptero_nests (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  ptero_nest_id INT NOT NULL UNIQUE,
  name          VARCHAR(128) NOT NULL,
  description   TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_nest_id (ptero_nest_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ptero_eggs (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  ptero_egg_id  INT NOT NULL UNIQUE,
  ptero_nest_id INT NOT NULL,
  name          VARCHAR(128) NOT NULL,
  docker_image  VARCHAR(255) NOT NULL,
  startup_cmd   TEXT,
  description   TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ptero_nest_id) REFERENCES ptero_nests(ptero_nest_id) ON DELETE RESTRICT,
  INDEX idx_nest (ptero_nest_id),
  UNIQUE KEY uniq_egg_id (ptero_egg_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS region_node_map (
  region_code   VARCHAR(32) NOT NULL,
  ptero_node_id INT NOT NULL,
  weight        INT DEFAULT 100,
  PRIMARY KEY (region_code, ptero_node_id),
  FOREIGN KEY (region_code) REFERENCES regions(code) ON DELETE CASCADE,
  FOREIGN KEY (ptero_node_id) REFERENCES ptero_nodes(ptero_node_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ Stripe Integration ============

CREATE TABLE IF NOT EXISTS stripe_customers (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id          CHAR(36) NOT NULL,
  stripe_customer  VARCHAR(120) NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user (user_id),
  UNIQUE KEY uniq_cust (stripe_customer),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_stripe_customer (stripe_customer)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stripe_subscriptions (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id          CHAR(36) NOT NULL,
  stripe_sub_id     VARCHAR(120) NOT NULL,
  status            ENUM('active','trialing','past_due','canceled','incomplete','incomplete_expired','unpaid') NOT NULL,
  current_period_end BIGINT,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_order (order_id),
  UNIQUE KEY uniq_sub (stripe_sub_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_stripe_sub (stripe_sub_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stripe_events_log (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  event_id     VARCHAR(120) NOT NULL,
  type         VARCHAR(120) NOT NULL,
  payload      JSON,
  processed    TINYINT(1) DEFAULT 0,
  received_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP NULL,
  UNIQUE KEY uniq_event (event_id),
  INDEX idx_type (type),
  INDEX idx_processed (processed),
  INDEX idx_received (received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ External Accounts (Pterodactyl User Linking) ============

CREATE TABLE IF NOT EXISTS external_accounts (
  user_id            CHAR(36) PRIMARY KEY,
  pterodactyl_user_id INT NOT NULL,
  panel_username     VARCHAR(128) NOT NULL,
  last_synced_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_ptero_user (pterodactyl_user_id),
  INDEX idx_panel_username (panel_username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============ Affiliates (Optional) ============

CREATE TABLE IF NOT EXISTS affiliates (
  user_id      CHAR(36) PRIMARY KEY,
  code         VARCHAR(32) NOT NULL UNIQUE,
  clicks       INT DEFAULT 0,
  signups      INT DEFAULT 0,
  credits_cents INT DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;




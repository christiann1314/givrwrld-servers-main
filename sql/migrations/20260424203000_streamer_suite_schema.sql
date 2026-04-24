-- Streamer Station / suite: core tables, subscriptions + usage, OAuth + analytics.
-- Collation utf8mb4_unicode_ci matches `users` (app_core.sql) for FK compatibility.
-- Run against app_core (same DB as rest of app).

START TRANSACTION;

CREATE TABLE IF NOT EXISTS streamer_platform_accounts (
  id                 CHAR(36) PRIMARY KEY,
  user_id            CHAR(36) NOT NULL,
  provider           ENUM('twitch','youtube','kick','tiktok','facebook','x') NOT NULL,
  external_user_id   VARCHAR(128) NOT NULL,
  display_name       VARCHAR(255),
  access_token       TEXT NULL,
  refresh_token      TEXT NULL,
  token_expires_at   TIMESTAMP NULL,
  scopes             TEXT NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_user_provider (user_id, provider),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS streamer_streams (
  id                 CHAR(36) PRIMARY KEY,
  user_id            CHAR(36) NOT NULL,
  title              VARCHAR(512) NOT NULL,
  source_url         TEXT,
  platform           VARCHAR(32),
  status             ENUM('queued','importing','ready','error') NOT NULL DEFAULT 'queued',
  duration_seconds   INT NULL,
  thumbnail_url      VARCHAR(1024) NULL,
  error_message      TEXT NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_status (user_id, status),
  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS streamer_clips (
  id                 CHAR(36) PRIMARY KEY,
  user_id            CHAR(36) NOT NULL,
  stream_id          CHAR(36) NULL,
  title              VARCHAR(512) NOT NULL,
  edit_kind          ENUM('ai','tiktok','trim','montage','pro') NOT NULL,
  status             ENUM('queued','processing','ready','failed') NOT NULL DEFAULT 'queued',
  output_url         TEXT NULL,
  duration_label     VARCHAR(16) NULL,
  error_message      TEXT NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (stream_id) REFERENCES streamer_streams(id) ON DELETE SET NULL,
  INDEX idx_user_kind (user_id, edit_kind),
  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS streamer_playlists (
  id          CHAR(36) PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS streamer_playlist_items (
  playlist_id CHAR(36) NOT NULL,
  clip_id     CHAR(36) NOT NULL,
  sort_order  INT DEFAULT 0,
  PRIMARY KEY (playlist_id, clip_id),
  FOREIGN KEY (playlist_id) REFERENCES streamer_playlists(id) ON DELETE CASCADE,
  FOREIGN KEY (clip_id) REFERENCES streamer_clips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS streamer_scheduled_posts (
  id             CHAR(36) PRIMARY KEY,
  user_id        CHAR(36) NOT NULL,
  clip_id        CHAR(36) NULL,
  title          VARCHAR(512) NOT NULL,
  caption        TEXT,
  platforms      JSON NOT NULL,
  scheduled_at   DATETIME NOT NULL,
  post_kind      ENUM('scheduled','posted','event','game_update') NOT NULL DEFAULT 'scheduled',
  status         ENUM('scheduled','posting','posted','failed','canceled') NOT NULL DEFAULT 'scheduled',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (clip_id) REFERENCES streamer_clips(id) ON DELETE SET NULL,
  INDEX idx_user_scheduled (user_id, scheduled_at),
  INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS streamer_jobs (
  id                 CHAR(36) PRIMARY KEY,
  user_id            CHAR(36) NOT NULL,
  job_type           ENUM(
                        'import_stream',
                        'ai_edit',
                        'transcode_vertical',
                        'scheduled_post_publish',
                        'sync_vod_list'
                      ) NOT NULL,
  payload            JSON NOT NULL,
  status             ENUM('pending','processing','done','failed','dead') NOT NULL DEFAULT 'pending',
  attempts           INT NOT NULL DEFAULT 0,
  max_attempts       INT NOT NULL DEFAULT 5,
  run_after          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_error         TEXT NULL,
  related_stream_id  CHAR(36) NULL,
  related_clip_id    CHAR(36) NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_stream_id) REFERENCES streamer_streams(id) ON DELETE SET NULL,
  FOREIGN KEY (related_clip_id) REFERENCES streamer_clips(id) ON DELETE SET NULL,
  INDEX idx_worker (status, run_after),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS streamer_subscriptions (
  user_id                  CHAR(36) NOT NULL PRIMARY KEY,
  tier                     ENUM('free','premium') NOT NULL DEFAULT 'free',
  paypal_subscription_id   VARCHAR(64) NULL,
  paypal_plan_id           VARCHAR(64) NULL,
  billing                  VARCHAR(16) NULL,
  status                   ENUM('none','active','cancelled','suspended','approval_pending') NOT NULL DEFAULT 'none',
  current_period_end       DATETIME NULL,
  created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_paypal_sub (paypal_subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS streamer_usage_daily (
  user_id   CHAR(36) NOT NULL,
  day       DATE NOT NULL,
  imports   INT NOT NULL DEFAULT 0,
  clips     INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @exist := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'streamer_jobs' AND COLUMN_NAME = 'priority'
);
SET @stmt := IF(@exist = 0,
  'ALTER TABLE streamer_jobs ADD COLUMN priority INT NOT NULL DEFAULT 0 AFTER max_attempts',
  'SELECT 1');
PREPARE s FROM @stmt;
EXECUTE s;
DEALLOCATE PREPARE s;

CREATE TABLE IF NOT EXISTS streamer_oauth_states (
  id            CHAR(36) PRIMARY KEY,
  user_id       CHAR(36) NOT NULL,
  provider      VARCHAR(32) NOT NULL,
  state_token   VARCHAR(64) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_state (state_token),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS streamer_webhook_events (
  id           CHAR(36) PRIMARY KEY,
  provider     VARCHAR(32) NOT NULL,
  event_type   VARCHAR(128) NOT NULL,
  payload      JSON NOT NULL,
  received_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_provider_time (provider, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS streamer_analytics_daily (
  user_id            CHAR(36) NOT NULL,
  day                DATE NOT NULL,
  imports_completed  INT NOT NULL DEFAULT 0,
  clips_completed    INT NOT NULL DEFAULT 0,
  posts_published    INT NOT NULL DEFAULT 0,
  assistant_turns    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS streamer_assistant_messages (
  id         CHAR(36) PRIMARY KEY,
  user_id    CHAR(36) NOT NULL,
  role       ENUM('user','assistant','system') NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_time (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @exist2 := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'streamer_jobs' AND COLUMN_NAME = 'progress_pct'
);
SET @stmt3 := IF(@exist2 = 0,
  'ALTER TABLE streamer_jobs ADD COLUMN progress_pct TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER priority',
  'SELECT 1');
PREPARE s3 FROM @stmt3;
EXECUTE s3;
DEALLOCATE PREPARE s3;

SET @pkce := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'streamer_oauth_states' AND COLUMN_NAME = 'code_verifier'
);
SET @stmt4 := IF(@pkce = 0,
  'ALTER TABLE streamer_oauth_states ADD COLUMN code_verifier VARCHAR(128) NULL AFTER state_token',
  'SELECT 1');
PREPARE s4 FROM @stmt4;
EXECUTE s4;
DEALLOCATE PREPARE s4;

COMMIT;

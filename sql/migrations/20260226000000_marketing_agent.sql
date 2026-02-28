-- Marketing agent tables for content automation (draft-only).
-- Run manually in app_core (once):
--   mysql -u app_rw -p app_core < sql/migrations/20260226000000_marketing_agent.sql

USE app_core;

CREATE TABLE IF NOT EXISTS marketing_events (
  id           CHAR(36)     NOT NULL,
  event_type   VARCHAR(64)  NOT NULL,
  event_key    VARCHAR(191) NOT NULL,
  source       VARCHAR(64)  NOT NULL DEFAULT 'manual',
  payload_json JSON         NULL,
  occurred_at  DATETIME     NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_marketing_event_key (event_key),
  KEY idx_marketing_events_type (event_type),
  KEY idx_marketing_events_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS marketing_content_drafts (
  id          CHAR(36)     NOT NULL,
  event_id    CHAR(36)     NOT NULL,
  channel     VARCHAR(32)  NOT NULL, -- 'discord' | 'reddit' | 'tiktok'
  type        VARCHAR(64)  NOT NULL, -- 'announcement' | 'incident' | etc.
  title       VARCHAR(191) NOT NULL,
  body_json   JSON         NOT NULL,
  status      ENUM('draft','posted','discarded') NOT NULL DEFAULT 'draft',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  posted_at   DATETIME     NULL,
  notes       TEXT         NULL,
  PRIMARY KEY (id),
  KEY idx_marketing_drafts_event (event_id),
  KEY idx_marketing_drafts_channel (channel),
  KEY idx_marketing_drafts_status (status),
  CONSTRAINT fk_marketing_drafts_event
    FOREIGN KEY (event_id) REFERENCES marketing_events (id)
      ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Add sent_to_discord status: webhook sent but not yet manually confirmed as "posted".
-- Run once: mysql -u app_rw -p app_core < sql/migrations/20260226100000_marketing_draft_status.sql

USE app_core;

ALTER TABLE marketing_content_drafts
  MODIFY COLUMN status ENUM('draft','sent_to_discord','posted','discarded') NOT NULL DEFAULT 'draft';

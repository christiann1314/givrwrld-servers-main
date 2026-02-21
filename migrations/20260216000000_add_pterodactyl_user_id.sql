-- Add Pterodactyl user mapping to local users table.
-- Provisioning stores the Panel user ID per app user for reuse.

ALTER TABLE users
  ADD COLUMN pterodactyl_user_id INT NULL AFTER display_name,
  ADD INDEX idx_users_pterodactyl_user_id (pterodactyl_user_id);

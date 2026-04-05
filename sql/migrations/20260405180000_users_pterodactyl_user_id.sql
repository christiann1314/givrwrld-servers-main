-- Panel user id per app user (provisioning reuses this Panel account).
-- Rollback: ALTER TABLE users DROP INDEX idx_users_pterodactyl_user_id, DROP COLUMN pterodactyl_user_id;
-- Idempotent: safe under db-migrate re-runs.

SET @db := DATABASE();

SET @c := (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = @db AND table_name = 'users' AND column_name = 'pterodactyl_user_id');
SET @s := IF(@c = 0, 'ALTER TABLE users ADD COLUMN pterodactyl_user_id INT NULL DEFAULT NULL AFTER display_name', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

SET @c := (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = @db AND table_name = 'users' AND index_name = 'idx_users_pterodactyl_user_id');
SET @s := IF(@c = 0, 'ALTER TABLE users ADD INDEX idx_users_pterodactyl_user_id (pterodactyl_user_id)', 'SELECT 1');
PREPARE q FROM @s; EXECUTE q; DEALLOCATE PREPARE q;

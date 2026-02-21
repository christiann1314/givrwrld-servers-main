-- =====================================================
-- REMOVE UNUSED FUNCTIONS FROM CONFIG
-- =====================================================
-- Note: This doesn't delete the function files, just removes from config
-- You should manually delete unused function directories after verification

-- This is a reference document - actual removal is done via:
-- 1. Remove from supabase/config.toml
-- 2. Delete function directories
-- 3. Run: supabase functions delete <function-name>

-- Functions to remove:
-- - get-user-stats
-- - health-check
-- - rate-limiter
-- - support-system
-- - gdpr-compliance
-- - notification-system
-- - backup-monitor
-- - error-handler

-- After migration is complete:
-- - migrate-pterodactyl-data (one-time migration)


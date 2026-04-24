-- CS:GO / CS2 dedicated install via SteamCMD is ~32+ GiB on disk. Plans used
-- ssd_gb = ram_gb * 10 from seed-game-variant-plans.js, so the 2 GB tier
-- (20 GiB disk) exceeds the cgroup disk cap mid-install → Panel red / broken server.
--
-- Bump active Counter-Strike plans below 40 GiB disk to 40 GiB. Pricing unchanged.
-- Existing Pterodactyl servers already created at 20 GiB must be resized in Panel
-- (Server → Build Configuration → disk) or recreated; new provisions pick up
-- buildPteroLimitsForGame() as well.

START TRANSACTION;

UPDATE plans
   SET ssd_gb     = GREATEST(ssd_gb, 40),
       updated_at = CURRENT_TIMESTAMP
 WHERE item_type = 'game'
   AND game = 'counter-strike'
   AND ssd_gb < 40
   AND is_active = 1;

COMMIT;

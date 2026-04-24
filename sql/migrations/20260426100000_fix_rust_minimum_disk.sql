-- Rust: Steam server files + procedural map/saves commonly exceed 20 GiB on
-- small tiers where ssd_gb was ram_gb * 10 (e.g. 2 GB RAM → 20 GiB disk).
-- Align active plans with the 35 GiB floor used in provisioning (buildPteroLimitsForGame).
-- Pricing unchanged. Existing Panel servers: raise disk in Panel or reinstall.

START TRANSACTION;

UPDATE plans
   SET ssd_gb     = GREATEST(ssd_gb, 35),
       updated_at = CURRENT_TIMESTAMP
 WHERE item_type = 'game'
   AND game = 'rust'
   AND ssd_gb < 35
   AND is_active = 1;

COMMIT;

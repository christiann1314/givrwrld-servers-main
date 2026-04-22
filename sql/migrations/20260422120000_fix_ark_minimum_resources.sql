-- Fix: ARK plans sold at 4 GB RAM get OOM-killed by the Pterodactyl container
-- during TheIsland world load (~5.7 GiB RSS peak). The provisioner already
-- uplifts ARK containers to a 6 GB floor server-side, so the customer-facing
-- plan must match reality: a 4 GB ARK plan is not a real SKU.
--
-- Strategy: keep plan ids stable (Stripe subscriptions are keyed to plan id)
-- and bump ram_gb / ssd_gb / display_name on any active ARK plan below the
-- 6 GB floor. Pricing is untouched — this is a resource correction, not a
-- repricing. Reversible: downgrade the fields back to the previous values
-- if a full SKU overhaul is needed later.
--
-- Mirrors the same pattern used in 20260415200001_fix_rust_minimum_resources.sql
-- but with an UPDATE instead of an is_active flip, since we want existing
-- subscribers on `ark-4gb` / `ark-vanilla-4gb` to continue billing and simply
-- receive the corrected resource tier.

START TRANSACTION;

-- Bump any active ARK plan below the 6 GB floor to a 6 GB floor.
-- ram_gb: 6 (minimum for fresh TheIsland world load with headroom)
-- ssd_gb: keep >= 35 (ARK installs to ~20 GB; room for maps/mods/logs)
-- vcores: keep >= 2 (world tick + RCON + health checks)
UPDATE plans
   SET ram_gb       = 6,
       ssd_gb       = GREATEST(ssd_gb, 35),
       vcores       = GREATEST(vcores, 2),
       display_name = REPLACE(display_name, '4GB', '6GB'),
       updated_at   = CURRENT_TIMESTAMP
 WHERE item_type = 'game'
   AND game LIKE 'ark%'
   AND ram_gb < 6
   AND is_active = 1;

COMMIT;

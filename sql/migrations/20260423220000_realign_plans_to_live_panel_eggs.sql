-- Definitive re-alignment of plans.ptero_egg_id to the LIVE Pterodactyl Panel
-- (givrwrldservers, 2026-04-23). Earlier migrations mapped plans to legacy egg
-- ids (60-78) that exist only in a phantom/orphaned nest in the Panel database
-- (visible to direct MariaDB sync but NOT exposed by the Application API),
-- which caused every fresh order to fail with one of:
--   * "The selected egg is invalid." (422 ValidationException)
--   * "Panel egg fetch failed (404) for egg <legacy-id>"
--   * "Failed to lookup panel server by external_id: AuthenticationException 401"
--     (key was rotated since; no longer applicable, but listed for context)
--
-- The current live Panel exposes these eggs via the Application API:
--   nest 1 "Minecraft":     1 Sponge, 2 Forge Minecraft, 3 Bungeecord, 4 Paper, 5 Vanilla Minecraft
--   nest 2 "Source Engine": 6 GMod, 7 TF2, 8 Insurgency, 9 CS:GO, 10 Custom SRCDS,
--                           11 Ark: Survival Evolved, 15 Mindustry, 16 Palworld,
--                           17 Teeworlds, 18 Veloren, 19 Vintage Story,
--                           20 Among Us - Impostor Server, 21 Factorio,
--                           22 Rimworld Together, 23 Terraria Vanilla,
--                           24 Enshrouded, 25 ARK: Survival Ascended, 26 tModloader
--   nest 3 "Voice Servers": 12 Teamspeak3, 13 Mumble
--   nest 4 "Rust":          14 Rust
--
-- Re-runs are safe (idempotent — only mutates plans where the value would change).

USE app_core;

START TRANSACTION;

-- Source-Engine games (nest 2)
UPDATE plans SET ptero_egg_id = 11, updated_at = NOW()
 WHERE item_type = 'game' AND game = 'ark'                    AND ptero_egg_id <> 11;
UPDATE plans SET ptero_egg_id = 25, updated_at = NOW()
 WHERE item_type = 'game' AND game = 'ark-asa'                AND ptero_egg_id <> 25;
UPDATE plans SET ptero_egg_id = 9,  updated_at = NOW()
 WHERE item_type = 'game' AND game = 'counter-strike'         AND ptero_egg_id <> 9;
UPDATE plans SET ptero_egg_id = 24, updated_at = NOW()
 WHERE item_type = 'game' AND game = 'enshrouded'             AND ptero_egg_id <> 24;
UPDATE plans SET ptero_egg_id = 21, updated_at = NOW()
 WHERE item_type = 'game' AND game = 'factorio'               AND ptero_egg_id <> 21;
UPDATE plans SET ptero_egg_id = 15, updated_at = NOW()
 WHERE item_type = 'game' AND game = 'mindustry'              AND ptero_egg_id <> 15;
UPDATE plans SET ptero_egg_id = 16, updated_at = NOW()
 WHERE item_type = 'game' AND game = 'palworld'               AND ptero_egg_id <> 16;
UPDATE plans SET ptero_egg_id = 22, updated_at = NOW()
 WHERE item_type = 'game' AND game = 'rimworld'               AND ptero_egg_id <> 22;
UPDATE plans SET ptero_egg_id = 17, updated_at = NOW()
 WHERE item_type = 'game' AND game = 'teeworlds'              AND ptero_egg_id <> 17;
UPDATE plans SET ptero_egg_id = 18, updated_at = NOW()
 WHERE item_type = 'game' AND game = 'veloren'                AND ptero_egg_id <> 18;
UPDATE plans SET ptero_egg_id = 19, updated_at = NOW()
 WHERE item_type = 'game' AND game IN ('vintage-story','vintagestory') AND ptero_egg_id <> 19;
UPDATE plans SET ptero_egg_id = 20, updated_at = NOW()
 WHERE item_type = 'game' AND game = 'among-us'               AND ptero_egg_id <> 20;

-- Terraria splits by variant (Vanilla = 23, tModLoader = 26)
UPDATE plans SET ptero_egg_id = 23, updated_at = NOW()
 WHERE item_type = 'game' AND game = 'terraria'
   AND (id LIKE '%vanilla%' OR display_name LIKE '%Vanilla%')
   AND ptero_egg_id <> 23;
UPDATE plans SET ptero_egg_id = 26, updated_at = NOW()
 WHERE item_type = 'game' AND game = 'terraria'
   AND (id LIKE '%tmodloader%' OR id LIKE '%calamity%' OR display_name LIKE '%tModLoader%')
   AND ptero_egg_id <> 26;

-- Rust (nest 4 — its own nest)
UPDATE plans SET ptero_egg_id = 14, updated_at = NOW()
 WHERE item_type = 'game' AND game = 'rust'                   AND ptero_egg_id <> 14;

-- Minecraft variants (nest 1).
-- Map by plan id pattern; default any unmatched Minecraft plan to Paper (4) so
-- legacy "minecraft-standard-*" rows still provision.
UPDATE plans SET ptero_egg_id = 1,  updated_at = NOW()
 WHERE item_type = 'game' AND game = 'minecraft' AND id LIKE '%sponge%'   AND ptero_egg_id <> 1;
UPDATE plans SET ptero_egg_id = 2,  updated_at = NOW()
 WHERE item_type = 'game' AND game = 'minecraft' AND id LIKE '%forge%'    AND ptero_egg_id <> 2;
UPDATE plans SET ptero_egg_id = 3,  updated_at = NOW()
 WHERE item_type = 'game' AND game = 'minecraft' AND id LIKE '%bungee%'   AND ptero_egg_id <> 3;
UPDATE plans SET ptero_egg_id = 4,  updated_at = NOW()
 WHERE item_type = 'game' AND game = 'minecraft' AND id LIKE '%paper%'    AND ptero_egg_id <> 4;
UPDATE plans SET ptero_egg_id = 5,  updated_at = NOW()
 WHERE item_type = 'game' AND game = 'minecraft' AND id LIKE '%vanilla%'  AND ptero_egg_id <> 5;
-- Purpur and Fabric eggs do NOT exist in this Panel; route them to Paper to
-- keep the SKUs orderable until the eggs are imported. Revisit after import.
UPDATE plans SET ptero_egg_id = 4,  updated_at = NOW()
 WHERE item_type = 'game' AND game = 'minecraft'
   AND (id LIKE '%purpur%' OR id LIKE '%fabric%') AND ptero_egg_id <> 4;
-- Catch-all: any active Minecraft plan still pointing at a phantom nest-5 id.
UPDATE plans p
   LEFT JOIN ptero_eggs e
     ON e.ptero_egg_id = p.ptero_egg_id AND e.ptero_nest_id IN (1,2,3,4)
   SET p.ptero_egg_id = 4, p.updated_at = NOW()
 WHERE p.item_type = 'game' AND p.game = 'minecraft' AND p.is_active = 1
   AND e.ptero_egg_id IS NULL;

-- ---------------------------------------------------------------------------
-- Final safety net: any active game plan still pointing at a phantom egg id
-- (one not present in the live nests 1-4) is logged via audit_log so we can
-- spot it during the post-deploy verification step.
-- ---------------------------------------------------------------------------
INSERT INTO audit_log (event, entity, entity_id, details, created_at)
SELECT
  'plan_pointing_at_phantom_egg',
  'plan',
  p.id,
  JSON_OBJECT('game', p.game, 'display_name', p.display_name, 'ptero_egg_id', p.ptero_egg_id),
  NOW()
FROM plans p
LEFT JOIN ptero_eggs e
  ON e.ptero_egg_id = p.ptero_egg_id AND e.ptero_nest_id IN (1,2,3,4)
WHERE p.item_type = 'game'
  AND p.is_active = 1
  AND p.ptero_egg_id IS NOT NULL
  AND e.ptero_egg_id IS NULL;

COMMIT;

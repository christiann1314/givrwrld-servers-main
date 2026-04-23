-- Align plans.ptero_egg_id (+ catalog row for egg 74) with live Pterodactyl Nest Eggs (givrwrldservers).
-- Panel mapping (2026-03-27 UI):
--   60 Forge Minecraft, 61 Paper, 62 Vanilla Minecraft, 63 Fabric, 64 Purpur,
--   65 Rust, 66 Ark: Survival Evolved, 67 Terraria Vanilla, 68 tModLoader,
--   69 Factorio, 70 Palworld, 71 Mindustry, 72 Vintage Story, 73 Teeworlds,
--   74 Among Us - Impostor Server, 75 Veloren, 76 Enshrouded,
--   77 Rimworld: Open World, 78 Rimworld Together
--
-- Run (from repo): node api/scripts/apply-sql-file.js sql/migrations/20260327120000_sync_plans_to_panel_egg_ids.sql
-- After apply: enqueue provision (Redis worker) or POST /api/servers/provision with JWT for retried orders.

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- plans → Panel egg ids (by plan id pattern / game)
-- ---------------------------------------------------------------------------
UPDATE plans SET ptero_egg_id = 60 WHERE item_type = 'game' AND id LIKE 'mc-forge-%';
UPDATE plans SET ptero_egg_id = 61 WHERE item_type = 'game' AND id LIKE 'mc-paper-%';
UPDATE plans SET ptero_egg_id = 62 WHERE item_type = 'game' AND (id LIKE 'mc-vanilla-%' OR id LIKE 'minecraft-vanilla-%');
UPDATE plans SET ptero_egg_id = 63 WHERE item_type = 'game' AND id LIKE 'mc-fabric-%';
UPDATE plans SET ptero_egg_id = 64 WHERE item_type = 'game' AND id LIKE 'mc-purpur-%';

UPDATE plans SET ptero_egg_id = 65 WHERE item_type = 'game' AND game = 'rust';
UPDATE plans SET ptero_egg_id = 66 WHERE item_type = 'game' AND game = 'ark';

UPDATE plans SET ptero_egg_id = 67 WHERE item_type = 'game' AND game = 'terraria';
UPDATE plans SET ptero_egg_id = 68 WHERE item_type = 'game' AND game = 'terraria' AND (id LIKE '%tmodloader%' OR id LIKE '%calamity%');

UPDATE plans SET ptero_egg_id = 69 WHERE item_type = 'game' AND game = 'factorio';
UPDATE plans SET ptero_egg_id = 70 WHERE item_type = 'game' AND game = 'palworld';
UPDATE plans SET ptero_egg_id = 71 WHERE item_type = 'game' AND game = 'mindustry';
UPDATE plans SET ptero_egg_id = 72 WHERE item_type = 'game' AND game IN ('vintage-story', 'vintagestory');
UPDATE plans SET ptero_egg_id = 73 WHERE item_type = 'game' AND game = 'teeworlds';

-- All Among Us storefront plans use the Impostor egg only (we do not sell proximity/Crewlink Panel eggs).
UPDATE plans SET ptero_egg_id = 74 WHERE item_type = 'game' AND game = 'among-us';

UPDATE plans SET ptero_egg_id = 75 WHERE item_type = 'game' AND game = 'veloren';
UPDATE plans SET ptero_egg_id = 76 WHERE item_type = 'game' AND game = 'enshrouded';

UPDATE plans SET ptero_egg_id = 77 WHERE item_type = 'game' AND game = 'rimworld' AND id LIKE '%vanilla%';
UPDATE plans SET ptero_egg_id = 78 WHERE item_type = 'game' AND game = 'rimworld' AND id NOT LIKE '%vanilla%';

-- ---------------------------------------------------------------------------
-- ptero_eggs: row 74 required (provisionServer reads egg from DB before Panel API).
-- Nest id copied from egg 67 when possible so /nests/{nest}/eggs/74 variables fetch works.
-- ---------------------------------------------------------------------------
INSERT INTO ptero_eggs (ptero_egg_id, ptero_nest_id, name, docker_image, startup_cmd, description)
SELECT
  74,
  COALESCE((SELECT ptero_nest_id FROM ptero_eggs WHERE ptero_egg_id = 67 LIMIT 1),
           (SELECT MIN(ptero_nest_id) FROM ptero_eggs),
           1),
  'Among Us - Impostor Server',
  COALESCE((SELECT docker_image FROM ptero_eggs WHERE ptero_egg_id = 67 LIMIT 1), 'ghcr.io/parkervcp/yolks:debian'),
  NULL,
  'Panel egg 74 — Among Us Impostor.'
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  ptero_nest_id = VALUES(ptero_nest_id),
  docker_image = VALUES(docker_image),
  startup_cmd = VALUES(startup_cmd);

-- ---------------------------------------------------------------------------
-- Retry failed Among Us order (from live logs): invalid egg before this migration
-- ---------------------------------------------------------------------------
UPDATE orders
SET
  status = 'paid',
  last_provision_error = NULL,
  provision_attempt_count = 0,
  last_provision_attempt_at = NULL,
  updated_at = NOW()
WHERE id = '251a473b-8057-4c4f-88dc-6225e8bfeb68'
  AND item_type = 'game'
  AND (ptero_server_id IS NULL OR ptero_server_id = 0);

COMMIT;

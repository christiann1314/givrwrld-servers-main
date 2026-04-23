-- Re-bind Minecraft *variant* plans to the correct Panel egg by exact egg name.
-- After a panel reset or a mistaken sync, plans like mc-fabric-4gb can still
-- point at Paper's ptero_egg_id while display_name says "Minecraft Fabric".
-- Provisioning uses plans.ptero_egg_id → wrong server type in the panel.
--
-- Safe: only updates rows whose plan id clearly indicates the variant; joins
-- app_core.ptero_eggs (synced from the live Panel) so IDs stay correct per node.

USE app_core;

UPDATE plans p
INNER JOIN ptero_eggs e ON e.name = 'Minecraft Vanilla'
SET p.ptero_egg_id = e.ptero_egg_id
WHERE p.item_type = 'game'
  AND p.game = 'minecraft'
  AND (p.id LIKE 'mc-vanilla-%' OR p.id LIKE 'minecraft-vanilla-%');

UPDATE plans p
INNER JOIN ptero_eggs e ON e.name = 'Minecraft Paper'
SET p.ptero_egg_id = e.ptero_egg_id
WHERE p.item_type = 'game'
  AND p.game = 'minecraft'
  AND (p.id LIKE 'mc-paper-%' OR p.id LIKE 'minecraft-paper-%');

UPDATE plans p
INNER JOIN ptero_eggs e ON e.name = 'Minecraft Purpur'
SET p.ptero_egg_id = e.ptero_egg_id
WHERE p.item_type = 'game'
  AND p.game = 'minecraft'
  AND (p.id LIKE 'mc-purpur-%' OR p.id LIKE 'minecraft-purpur-%');

UPDATE plans p
INNER JOIN ptero_eggs e ON e.name = 'Minecraft Fabric'
SET p.ptero_egg_id = e.ptero_egg_id
WHERE p.item_type = 'game'
  AND p.game = 'minecraft'
  AND (p.id LIKE 'mc-fabric-%' OR p.id LIKE 'minecraft-fabric-%');

UPDATE plans p
INNER JOIN ptero_eggs e ON e.name = 'Minecraft Forge'
SET p.ptero_egg_id = e.ptero_egg_id
WHERE p.item_type = 'game'
  AND p.game = 'minecraft'
  AND (p.id LIKE 'mc-forge-%' OR p.id LIKE 'minecraft-forge-%');

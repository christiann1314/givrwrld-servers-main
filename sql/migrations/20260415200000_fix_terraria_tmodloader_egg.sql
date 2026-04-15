-- Fix: tModLoader and Calamity plans were mapped to egg 67 (vanilla) instead of 68 (tModLoader).
-- The original migration set egg 68 first, then overwrote it with the broader "game = terraria" → 67 rule.

START TRANSACTION;

UPDATE plans SET ptero_egg_id = 68
WHERE item_type = 'game'
  AND game = 'terraria'
  AND (id LIKE '%tmodloader%' OR id LIKE '%calamity%');

COMMIT;

-- Among Us: storefront sells Impostor only. Deactivate any stray plans that reference
-- proximity / Crewlink SKUs (belt-and-suspenders with 20260425104500_deactivate_legacy_modded_game_plans.sql).

START TRANSACTION;

UPDATE plans
SET is_active = 0, updated_at = NOW()
WHERE item_type = 'game'
  AND game = 'among-us'
  AND is_active = 1
  AND (
    LOWER(id) LIKE '%proximity%'
    OR LOWER(id) LIKE '%crewlink%'
    OR LOWER(COALESCE(display_name, '')) LIKE '%proximity%'
    OR LOWER(COALESCE(display_name, '')) LIKE '%crewlink%'
    OR LOWER(COALESCE(display_name, '')) LIKE '%bettercrewlink%'
  );

COMMIT;

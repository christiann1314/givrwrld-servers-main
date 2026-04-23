-- Earlier migration deactivated all *-vanilla-* game plans; Terraria Vanilla is a current retail SKU.
UPDATE plans
SET is_active = 1, updated_at = NOW()
WHERE item_type = 'game'
  AND id REGEXP '^terraria-vanilla-[0-9]+gb$';

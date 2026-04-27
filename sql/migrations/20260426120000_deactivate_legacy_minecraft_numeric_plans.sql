-- Retire generic storefront SKUs (minecraft-2gb … minecraft-12gb) from seed-12-games-plans.sql.
-- Variant plans mc-{paper|purpur|fabric|forge}-{ram}gb are the canonical Minecraft catalog.
UPDATE plans
SET is_active = 0, updated_at = NOW()
WHERE item_type = 'game'
  AND game = 'minecraft'
  AND id REGEXP '^minecraft-[0-9]+gb$';

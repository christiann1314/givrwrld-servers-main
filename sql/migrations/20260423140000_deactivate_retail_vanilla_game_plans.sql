-- Stop selling Mojang-vanilla Minecraft and per-game *-vanilla-* variant SKUs on the storefront.
-- Existing subscriptions keep their plan rows; checkout should reject inactive plans via API.
UPDATE plans
SET is_active = 0, updated_at = NOW()
WHERE item_type = 'game'
  AND is_active = 1
  AND (
    id LIKE 'mc-vanilla-%'
    OR id LIKE '%-vanilla-%'
  );

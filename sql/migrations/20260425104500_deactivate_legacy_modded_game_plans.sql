-- Retire modded/profile SKUs; stock + Terraria tModLoader are seeded separately (see seed-game-variant-plans.js).
UPDATE plans
SET is_active = 0, updated_at = NOW()
WHERE item_type = 'game'
  AND is_active = 1
  AND (
    id LIKE 'rust-oxide-%'
    OR id LIKE 'rust-carbon-%'
    OR id LIKE 'ark-primal-fear-%'
    OR id LIKE 'ark-pve-cluster-%'
    OR id LIKE 'terraria-calamity-%'
    OR id LIKE 'factorio-space-age-ready-%'
    OR id LIKE 'factorio-bobs-angels-ready-%'
    OR id LIKE 'palworld-community-plus-%'
    OR id LIKE 'palworld-hardcore-%'
    OR id LIKE 'mindustry-pvp-%'
    OR id LIKE 'mindustry-survival-%'
    OR id LIKE 'rimworld-multiplayer-ready-%'
    OR id LIKE 'vintage-story-primitive-plus-%'
    OR id LIKE 'teeworlds-instagib-%'
    OR id LIKE 'among-us-proximity-chat-ready-%'
    OR id LIKE 'veloren-rp-realm-%'
    OR id LIKE 'enshrouded-modded-%'
  );

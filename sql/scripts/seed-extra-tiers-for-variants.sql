-- Extra RAM tiers so seed-game-variant-plans.js can create plans for modded/variant eggs.
-- Run after seed-12-games-plans.sql. ptero_egg_id stays NULL here; sync-pterodactyl-catalog
-- will set it per game. Then run seed-game-variant-plans.js to create variant plans.
-- Usage: mysql -u app_rw -p app_core < sql/scripts/seed-extra-tiers-for-variants.sql

USE app_core;

INSERT INTO plans (id, item_type, game, ram_gb, vcores, ssd_gb, price_monthly, ptero_egg_id, display_name, is_active)
VALUES
  ('rust-4gb',             'game', 'rust',            4, 1, 25, 14.99, NULL, 'Rust 4GB',            1),
  ('ark-8gb',              'game', 'ark',              8, 2, 45, 28.99, NULL, 'ARK 8GB',             1),
  ('terraria-4gb',         'game', 'terraria',        4, 1, 20,  9.99, NULL, 'Terraria 4GB',         1),
  ('factorio-4gb',         'game', 'factorio',        4, 1, 20, 10.99, NULL, 'Factorio 4GB',         1),
  ('palworld-8gb',         'game', 'palworld',        8, 2, 45, 28.99, NULL, 'Palworld 8GB',         1),
  ('mindustry-4gb',        'game', 'mindustry',       4, 1, 20,  7.99, NULL, 'Mindustry 4GB',        1),
  ('rimworld-8gb',         'game', 'rimworld',        8, 2, 35, 24.99, NULL, 'Rimworld 8GB',         1),
  ('vintage-story-8gb',    'game', 'vintage-story',   8, 2, 35, 19.99, NULL, 'Vintage Story 8GB',    1),
  ('among-us-4gb',         'game', 'among-us',        4, 1, 15,  6.99, NULL, 'Among Us 4GB',         1),
  ('veloren-8gb',          'game', 'veloren',         8, 2, 35, 19.99, NULL, 'Veloren 8GB',          1)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  ram_gb = VALUES(ram_gb),
  vcores = VALUES(vcores),
  ssd_gb = VALUES(ssd_gb),
  price_monthly = VALUES(price_monthly),
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;

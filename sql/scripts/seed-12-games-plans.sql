-- Seed one active game plan per game so the Deploy page shows all 12 games.
-- Run once after app_core schema is applied (e.g. after Docker MariaDB init or manually):
--   mysql -u app_rw -p app_core < sql/scripts/seed-12-games-plans.sql
-- Or from repo root: Get-Content sql/scripts/seed-12-games-plans.sql | docker exec -i givrwrld-mariadb mysql -u app_rw -pdevpass app_core

USE app_core;

INSERT INTO plans (id, item_type, game, ram_gb, vcores, ssd_gb, price_monthly, ptero_egg_id, display_name, is_active)
VALUES
  ('minecraft-2gb',   'game', 'minecraft',      2, 1, 20,  9.99, NULL, 'Minecraft 2GB',   1),
  ('rust-3gb',        'game', 'rust',            3, 1, 25, 12.99, NULL, 'Rust 3GB',        1),
  ('palworld-4gb',    'game', 'palworld',        4, 2, 30, 14.99, NULL, 'Palworld 4GB',    1),
  ('ark-4gb',         'game', 'ark',              4, 2, 35, 14.99, NULL, 'ARK 4GB',        1),
  ('terraria-2gb',    'game', 'terraria',        2, 1, 15,  6.99, NULL, 'Terraria 2GB',    1),
  ('factorio-2gb',    'game', 'factorio',        2, 1, 15,  7.99, NULL, 'Factorio 2GB',    1),
  ('mindustry-2gb',   'game', 'mindustry',       2, 1, 15,  5.99, NULL, 'Mindustry 2GB',   1),
  ('rimworld-4gb',    'game', 'rimworld',        4, 2, 25, 12.99, NULL, 'Rimworld 4GB',    1),
  ('vintage-story-4gb','game','vintage-story',   4, 2, 25, 11.99, NULL, 'Vintage Story 4GB',1),
  ('teeworlds-2gb',   'game', 'teeworlds',       2, 1, 10,  4.99, NULL, 'Teeworlds 2GB',   1),
  ('among-us-2gb',    'game', 'among-us',        2, 1, 10,  4.99, NULL, 'Among Us 2GB',    1),
  ('veloren-4gb',     'game', 'veloren',         4, 2, 25, 10.99, NULL, 'Veloren 4GB',     1)
ON DUPLICATE KEY UPDATE
  display_name = VALUES(display_name),
  ram_gb = VALUES(ram_gb),
  vcores = VALUES(vcores),
  ssd_gb = VALUES(ssd_gb),
  price_monthly = VALUES(price_monthly),
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;

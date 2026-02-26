-- Profit lever: Raise 6GB plan price by $1 (monthly).
-- Run once after connecting to app_core: mysql -u user -p app_core < sql/scripts/bump-6gb-plan-by-dollar.sql
-- Optional: If you have price_quarterly, price_semiannual, price_yearly columns, uncomment and run those lines.

USE app_core;

UPDATE plans
SET price_monthly = price_monthly + 1
WHERE ram_gb = 6 AND item_type = 'game';

-- If your schema has term columns, run these too (adjust column names if different):
-- UPDATE plans SET price_quarterly = price_quarterly + 3 WHERE ram_gb = 6 AND item_type = 'game';
-- UPDATE plans SET price_semiannual = price_semiannual + 6 WHERE ram_gb = 6 AND item_type = 'game';
-- UPDATE plans SET price_yearly = price_yearly + 12 WHERE ram_gb = 6 AND item_type = 'game';

SELECT id, game, ram_gb, price_monthly FROM plans WHERE ram_gb = 6;

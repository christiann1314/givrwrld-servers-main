-- Update all Stripe price IDs with actual live prices
-- Run this in Supabase SQL Editor to update existing plans

-- Minecraft Plans
UPDATE public.plans SET stripe_price_id = 'price_1SPmR6B3VffY65l6oa9Vc1T4' WHERE id = 'mc-1gb';
UPDATE public.plans SET stripe_price_id = 'price_1SPmR6B3VffY65l6Ya3UxaOt' WHERE id = 'mc-2gb';
UPDATE public.plans SET stripe_price_id = 'price_1SPmR7B3VffY65l61o7vcnLj' WHERE id = 'mc-4gb';
UPDATE public.plans SET stripe_price_id = 'price_1SPmR7B3VffY65l68V9C5v6W' WHERE id = 'mc-8gb';

-- Rust Plans
UPDATE public.plans SET stripe_price_id = 'price_1SPmUhB3VffY65l6HJUM5I6P' WHERE id = 'rust-3gb';
UPDATE public.plans SET stripe_price_id = 'price_1SPmUiB3VffY65l6Yax8JGJT' WHERE id = 'rust-6gb';
UPDATE public.plans SET stripe_price_id = 'price_1SPmUiB3VffY65l6zkKjQcsP' WHERE id = 'rust-8gb';
UPDATE public.plans SET stripe_price_id = 'price_1SPmUjB3VffY65l6lRm0CDLF' WHERE id = 'rust-12gb';

-- ARK Plans (insert if don't exist)
INSERT INTO public.plans (id, item_type, game, ram_gb, vcores, ssd_gb, stripe_price_id, display_name) VALUES
  ('ark-4gb', 'game', 'ark', 4, 2, 30, 'price_1SPmWnB3VffY65l61pDqOIFb', 'ARK 4GB'),
  ('ark-8gb', 'game', 'ark', 8, 4, 60, 'price_1SPmWnB3VffY65l67sv6bQRF', 'ARK 8GB'),
  ('ark-16gb', 'game', 'ark', 16, 8, 120, 'price_1SPmWoB3VffY65l6IuunmP51', 'ARK 16GB')
ON CONFLICT (id) DO UPDATE SET stripe_price_id = EXCLUDED.stripe_price_id;

-- Terraria Plans
INSERT INTO public.plans (id, item_type, game, ram_gb, vcores, ssd_gb, stripe_price_id, display_name) VALUES
  ('terraria-1gb', 'game', 'terraria', 1, 1, 10, 'price_1SPmWoB3VffY65l6h8gabJi1', 'Terraria 1GB'),
  ('terraria-2gb', 'game', 'terraria', 2, 1, 20, 'price_1SPmWpB3VffY65l6MEZw3ob6', 'Terraria 2GB'),
  ('terraria-4gb', 'game', 'terraria', 4, 2, 40, 'price_1SPmWpB3VffY65l6LVSBoOrj', 'Terraria 4GB')
ON CONFLICT (id) DO UPDATE SET stripe_price_id = EXCLUDED.stripe_price_id;

-- Factorio Plans
INSERT INTO public.plans (id, item_type, game, ram_gb, vcores, ssd_gb, stripe_price_id, display_name) VALUES
  ('factorio-2gb', 'game', 'factorio', 2, 1, 15, 'price_1SPmbFB3VffY65l6UJpNHuoD', 'Factorio 2GB'),
  ('factorio-4gb', 'game', 'factorio', 4, 2, 30, 'price_1SPmbFB3VffY65l6WnwX5pkK', 'Factorio 4GB'),
  ('factorio-8gb', 'game', 'factorio', 8, 4, 60, 'price_1SPmbGB3VffY65l6hH7aNUc1', 'Factorio 8GB')
ON CONFLICT (id) DO UPDATE SET stripe_price_id = EXCLUDED.stripe_price_id;

-- Mindustry Plans
INSERT INTO public.plans (id, item_type, game, ram_gb, vcores, ssd_gb, stripe_price_id, display_name) VALUES
  ('mindustry-2gb', 'game', 'mindustry', 2, 1, 15, 'price_1SPmbGB3VffY65l67QWQwdHN', 'Mindustry 2GB'),
  ('mindustry-4gb', 'game', 'mindustry', 4, 2, 30, 'price_1SPmbHB3VffY65l6RyueapJs', 'Mindustry 4GB'),
  ('mindustry-8gb', 'game', 'mindustry', 8, 4, 60, 'price_1SPmbHB3VffY65l6UUksvbUm', 'Mindustry 8GB')
ON CONFLICT (id) DO UPDATE SET stripe_price_id = EXCLUDED.stripe_price_id;

-- Rimworld Plans
INSERT INTO public.plans (id, item_type, game, ram_gb, vcores, ssd_gb, stripe_price_id, display_name) VALUES
  ('rimworld-2gb', 'game', 'rimworld', 2, 1, 15, 'price_1SPmbIB3VffY65l677XUEhXi', 'Rimworld 2GB'),
  ('rimworld-4gb', 'game', 'rimworld', 4, 2, 30, 'price_1SPmbIB3VffY65l63jyVMNvb', 'Rimworld 4GB'),
  ('rimworld-8gb', 'game', 'rimworld', 8, 4, 60, 'price_1SPmbIB3VffY65l6qzsyiXX5', 'Rimworld 8GB')
ON CONFLICT (id) DO UPDATE SET stripe_price_id = EXCLUDED.stripe_price_id;

-- Vintage Story Plans
INSERT INTO public.plans (id, item_type, game, ram_gb, vcores, ssd_gb, stripe_price_id, display_name) VALUES
  ('vintage-story-2gb', 'game', 'vintage-story', 2, 1, 15, 'price_1SPmbJB3VffY65l6ghwbyqCl', 'Vintage Story 2GB'),
  ('vintage-story-4gb', 'game', 'vintage-story', 4, 2, 30, 'price_1SPmbJB3VffY65l6gX4H8CN4', 'Vintage Story 4GB'),
  ('vintage-story-8gb', 'game', 'vintage-story', 8, 4, 60, 'price_1SPmbKB3VffY65l6eyLHNRjj', 'Vintage Story 8GB')
ON CONFLICT (id) DO UPDATE SET stripe_price_id = EXCLUDED.stripe_price_id;

-- Teeworlds Plans
INSERT INTO public.plans (id, item_type, game, ram_gb, vcores, ssd_gb, stripe_price_id, display_name) VALUES
  ('teeworlds-1gb', 'game', 'teeworlds', 1, 1, 10, 'price_1SPmbKB3VffY65l66gSZP9XR', 'Teeworlds 1GB'),
  ('teeworlds-2gb', 'game', 'teeworlds', 2, 1, 20, 'price_1SPmbLB3VffY65l6bKNT9J8o', 'Teeworlds 2GB'),
  ('teeworlds-4gb', 'game', 'teeworlds', 4, 2, 40, 'price_1SPmbLB3VffY65l6VCs0HHTW', 'Teeworlds 4GB')
ON CONFLICT (id) DO UPDATE SET stripe_price_id = EXCLUDED.stripe_price_id;

-- Among Us Plans
INSERT INTO public.plans (id, item_type, game, ram_gb, vcores, ssd_gb, stripe_price_id, display_name) VALUES
  ('among-us-1gb', 'game', 'among-us', 1, 1, 10, 'price_1SPmbMB3VffY65l6Bio5NjIE', 'Among Us 1GB'),
  ('among-us-2gb', 'game', 'among-us', 2, 1, 20, 'price_1SPmbMB3VffY65l6ZdF7pFBL', 'Among Us 2GB'),
  ('among-us-4gb', 'game', 'among-us', 4, 2, 40, 'price_1SPmbNB3VffY65l68KrkZAJT', 'Among Us 4GB')
ON CONFLICT (id) DO UPDATE SET stripe_price_id = EXCLUDED.stripe_price_id;

-- Verify all updates
SELECT 
  id, 
  game, 
  ram_gb, 
  stripe_price_id, 
  display_name,
  CASE 
    WHEN stripe_price_id LIKE 'price_1SP%' THEN '✅ Live Price'
    WHEN stripe_price_id LIKE 'price_%' THEN '⚠️ Placeholder'
    ELSE '❌ Missing'
  END as status
FROM public.plans 
WHERE item_type = 'game'
ORDER BY game, ram_gb;


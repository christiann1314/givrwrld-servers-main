-- Update Stripe price IDs with actual live prices
-- Run this in Supabase SQL Editor

-- Minecraft Plans
UPDATE public.plans SET stripe_price_id = 'price_1SPmR6B3VffY65l6oa9Vc1T4' WHERE id = 'mc-1gb';
UPDATE public.plans SET stripe_price_id = 'price_1SPmR6B3VffY65l6Ya3UxaOt' WHERE id = 'mc-2gb';
UPDATE public.plans SET stripe_price_id = 'price_1SPmR7B3VffY65l61o7vcnLj' WHERE id = 'mc-4gb';
UPDATE public.plans SET stripe_price_id = 'price_1SPmR7B3VffY65l68V9C5v6W' WHERE id = 'mc-8gb';
-- Note: Minecraft 16GB exists in Stripe but not in current plans table

-- Rust Plans
UPDATE public.plans SET stripe_price_id = 'price_1SPmUhB3VffY65l6HJUM5I6P' WHERE id = 'rust-3gb';
UPDATE public.plans SET stripe_price_id = 'price_1SPmUiB3VffY65l6Yax8JGJT' WHERE id = 'rust-6gb';
UPDATE public.plans SET stripe_price_id = 'price_1SPmUiB3VffY65l6zkKjQcsP' WHERE id = 'rust-8gb';
UPDATE public.plans SET stripe_price_id = 'price_1SPmUjB3VffY65l6lRm0CDLF' WHERE id = 'rust-12gb';

-- ARK Plans
UPDATE public.plans SET stripe_price_id = 'price_1SPmWnB3VffY65l61pDqOIFb' WHERE id LIKE 'ark-4gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmWnB3VffY65l67sv6bQRF' WHERE id LIKE 'ark-8gb%';
-- Note: ARK 16GB exists in Stripe but may not be in plans table

-- Terraria Plans
UPDATE public.plans SET stripe_price_id = 'price_1SPmWoB3VffY65l6h8gabJi1' WHERE id LIKE 'terraria-1gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmWpB3VffY65l6MEZw3ob6' WHERE id LIKE 'terraria-2gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmWpB3VffY65l6LVSBoOrj' WHERE id LIKE 'terraria-4gb%';

-- Factorio Plans
UPDATE public.plans SET stripe_price_id = 'price_1SPmbFB3VffY65l6UJpNHuoD' WHERE id LIKE 'factorio-2gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmbFB3VffY65l6WnwX5pkK' WHERE id LIKE 'factorio-4gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmbGB3VffY65l6hH7aNUc1' WHERE id LIKE 'factorio-8gb%';

-- Mindustry Plans
UPDATE public.plans SET stripe_price_id = 'price_1SPmbGB3VffY65l67QWQwdHN' WHERE id LIKE 'mindustry-2gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmbHB3VffY65l6RyueapJs' WHERE id LIKE 'mindustry-4gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmbHB3VffY65l6UUksvbUm' WHERE id LIKE 'mindustry-8gb%';

-- Rimworld Plans
UPDATE public.plans SET stripe_price_id = 'price_1SPmbIB3VffY65l677XUEhXi' WHERE id LIKE 'rimworld-2gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmbIB3VffY65l63jyVMNvb' WHERE id LIKE 'rimworld-4gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmbIB3VffY65l6qzsyiXX5' WHERE id LIKE 'rimworld-8gb%';

-- Vintage Story Plans
UPDATE public.plans SET stripe_price_id = 'price_1SPmbJB3VffY65l6ghwbyqCl' WHERE id LIKE 'vintage-story-2gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmbJB3VffY65l6gX4H8CN4' WHERE id LIKE 'vintage-story-4gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmbKB3VffY65l6eyLHNRjj' WHERE id LIKE 'vintage-story-8gb%';

-- Teeworlds Plans
UPDATE public.plans SET stripe_price_id = 'price_1SPmbKB3VffY65l66gSZP9XR' WHERE id LIKE 'teeworlds-1gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmbLB3VffY65l6bKNT9J8o' WHERE id LIKE 'teeworlds-2gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmbLB3VffY65l6VCs0HHTW' WHERE id LIKE 'teeworlds-4gb%';

-- Among Us Plans
UPDATE public.plans SET stripe_price_id = 'price_1SPmbMB3VffY65l6Bio5NjIE' WHERE id LIKE 'among-us-1gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmbMB3VffY65l6ZdF7pFBL' WHERE id LIKE 'among-us-2gb%';
UPDATE public.plans SET stripe_price_id = 'price_1SPmbNB3VffY65l68KrkZAJT' WHERE id LIKE 'among-us-4gb%';

-- Verify updates
SELECT id, game, ram_gb, stripe_price_id, display_name 
FROM public.plans 
WHERE stripe_price_id LIKE 'price_%' 
ORDER BY game, ram_gb;


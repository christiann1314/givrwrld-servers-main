-- Game Types Alignment Verification Queries
-- Run these in Supabase SQL Editor to verify alignment

-- ============================================
-- 1. List all games in database with plan counts
-- ============================================
SELECT 
  game,
  COUNT(*) as plan_count,
  MIN(ram_gb) as min_ram,
  MAX(ram_gb) as max_ram,
  STRING_AGG(id || ' (' || ram_gb || 'GB)', ', ' ORDER BY ram_gb) as plan_ids,
  COUNT(CASE WHEN stripe_price_id LIKE 'price_1%' THEN 1 END) as live_prices,
  COUNT(CASE WHEN stripe_price_id LIKE 'price_%' AND stripe_price_id NOT LIKE 'price_1%' THEN 1 END) as placeholder_prices,
  COUNT(CASE WHEN stripe_price_id IS NULL OR stripe_price_id = '' THEN 1 END) as missing_prices
FROM public.plans
WHERE item_type = 'game' AND is_active = true
GROUP BY game
ORDER BY game;

-- ============================================
-- 2. Detailed plan list with Stripe price status
-- ============================================
SELECT 
  id,
  game,
  ram_gb,
  vcores,
  ssd_gb,
  stripe_price_id,
  display_name,
  is_active,
  CASE 
    WHEN stripe_price_id LIKE 'price_1%' THEN '✅ Live Price'
    WHEN stripe_price_id LIKE 'price_%' AND stripe_price_id NOT LIKE 'price_1%' THEN '⚠️ Placeholder'
    WHEN stripe_price_id IS NULL OR stripe_price_id = '' THEN '❌ Missing'
    ELSE '❌ Invalid Format'
  END as price_status
FROM public.plans
WHERE item_type = 'game'
ORDER BY game, ram_gb;

-- ============================================
-- 3. Find plans with invalid/missing Stripe price IDs
-- ============================================
SELECT 
  id,
  game,
  ram_gb,
  stripe_price_id,
  display_name
FROM public.plans
WHERE item_type = 'game'
  AND (
    stripe_price_id IS NULL 
    OR stripe_price_id = ''
    OR stripe_price_id NOT LIKE 'price_1%'
  )
ORDER BY game, ram_gb;

-- ============================================
-- 4. Check for games in backend but missing in database
-- ============================================
-- Backend games: minecraft, rust, palworld, among-us, terraria, ark, factorio, mindustry, rimworld, vintage-story, teeworlds
-- This query shows which backend games are missing plans
WITH backend_games AS (
  SELECT unnest(ARRAY[
    'minecraft', 'rust', 'palworld', 'among-us', 'terraria', 
    'ark', 'factorio', 'mindustry', 'rimworld', 'vintage-story', 'teeworlds'
  ]) as game
)
SELECT 
  bg.game as backend_game,
  CASE 
    WHEN COUNT(p.id) > 0 THEN '✅ Has Plans'
    ELSE '❌ Missing Plans'
  END as status,
  COUNT(p.id) as plan_count
FROM backend_games bg
LEFT JOIN public.plans p ON p.game = bg.game AND p.item_type = 'game' AND p.is_active = true
GROUP BY bg.game
ORDER BY bg.game;

-- ============================================
-- 5. Check for games in database but not in backend
-- ============================================
SELECT 
  p.game,
  COUNT(*) as plan_count,
  STRING_AGG(p.id, ', ') as plan_ids
FROM public.plans p
WHERE p.item_type = 'game' 
  AND p.is_active = true
  AND p.game NOT IN (
    'minecraft', 'rust', 'palworld', 'among-us', 'terraria', 
    'ark', 'factorio', 'mindustry', 'rimworld', 'vintage-story', 'teeworlds'
  )
GROUP BY p.game
ORDER BY p.game;

-- ============================================
-- 6. Summary: Games vs Plans vs Stripe Prices
-- ============================================
SELECT 
  'Total Games in Backend' as metric,
  '11' as value,
  'minecraft, rust, palworld, among-us, terraria, ark, factorio, mindustry, rimworld, vintage-story, teeworlds' as details
UNION ALL
SELECT 
  'Total Games in Database' as metric,
  COUNT(DISTINCT game)::text as value,
  STRING_AGG(DISTINCT game, ', ' ORDER BY game) as details
FROM public.plans
WHERE item_type = 'game' AND is_active = true
UNION ALL
SELECT 
  'Total Plans in Database' as metric,
  COUNT(*)::text as value,
  '' as details
FROM public.plans
WHERE item_type = 'game' AND is_active = true
UNION ALL
SELECT 
  'Plans with Live Stripe Prices' as metric,
  COUNT(*)::text as value,
  '' as details
FROM public.plans
WHERE item_type = 'game' 
  AND is_active = true
  AND stripe_price_id LIKE 'price_1%'
UNION ALL
SELECT 
  'Plans with Placeholder Prices' as metric,
  COUNT(*)::text as value,
  STRING_AGG(id, ', ') as details
FROM public.plans
WHERE item_type = 'game' 
  AND is_active = true
  AND stripe_price_id LIKE 'price_%' 
  AND stripe_price_id NOT LIKE 'price_1%'
UNION ALL
SELECT 
  'Plans Missing Stripe Prices' as metric,
  COUNT(*)::text as value,
  STRING_AGG(id, ', ') as details
FROM public.plans
WHERE item_type = 'game' 
  AND is_active = true
  AND (stripe_price_id IS NULL OR stripe_price_id = '');




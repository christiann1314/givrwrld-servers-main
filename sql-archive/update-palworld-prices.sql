-- Update Palworld plans with actual Stripe price IDs
-- Created via Stripe CLI on 2025-11-08

UPDATE public.plans SET stripe_price_id = 'price_1SQK3YB3VffY65l6mttysyH7' WHERE id = 'palworld-4gb';
UPDATE public.plans SET stripe_price_id = 'price_1SQK3aB3VffY65l65HvxiHLC' WHERE id = 'palworld-8gb';
UPDATE public.plans SET stripe_price_id = 'price_1SQK3cB3VffY65l6s3NcHy0Y' WHERE id = 'palworld-16gb';

-- Verify updates
SELECT 
  id, 
  game, 
  ram_gb, 
  stripe_price_id, 
  display_name,
  CASE 
    WHEN stripe_price_id LIKE 'price_1SQK%' THEN '✅ Live Price'
    WHEN stripe_price_id LIKE 'price_1SP%' THEN '✅ Live Price'
    WHEN stripe_price_id LIKE 'price_%' THEN '⚠️ Placeholder'
    ELSE '❌ Missing'
  END as status
FROM public.plans 
WHERE game = 'palworld'
ORDER BY ram_gb;


# Quick Update Guide - Apply All Changes

## ✅ Step 1: Nodes Updated (DONE)
You've already run the ptero_nodes INSERT - ✅ Complete!

## 🔴 Step 2: Update Stripe Price IDs (NEXT)

Run `update-all-stripe-prices.sql` in Supabase SQL Editor:

1. Open Supabase SQL Editor
2. Copy the contents of `update-all-stripe-prices.sql`
3. Paste into SQL Editor
4. Click "Run" (or press Ctrl+Enter)

This will:
- ✅ Update Minecraft and Rust plans with live price IDs
- ✅ Add new games: ARK, Terraria, Factorio, Mindustry, Rimworld, Vintage Story, Teeworlds, Among Us
- ✅ Show a verification query at the end

### What to Expect
- Success message for each UPDATE/INSERT
- Final verification query shows all plans with status indicators
- ✅ Live Price = Good to go
- ⚠️ Placeholder = Still needs Stripe price

## ⚠️ Step 3: Create Missing Stripe Prices (If Needed)

If you want to offer these services, create prices in Stripe Dashboard:

### Palworld
- Create products: Palworld 4GB, 8GB, 16GB
- Copy price IDs
- Update database:
  ```sql
  UPDATE public.plans SET stripe_price_id = 'YOUR_PRICE_ID' WHERE id = 'palworld-4gb';
  UPDATE public.plans SET stripe_price_id = 'YOUR_PRICE_ID' WHERE id = 'palworld-8gb';
  UPDATE public.plans SET stripe_price_id = 'YOUR_PRICE_ID' WHERE id = 'palworld-16gb';
  ```

### VPS Plans
- Create products: Basic VPS, Standard VPS, Premium VPS
- Update as above

### Addons
- Create products for each addon
- Update addons table

## Verification

After running the update script, verify with:
```sql
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
```

## Files Ready

- ✅ `update-all-stripe-prices.sql` - Complete update script
- ✅ `run-ptero-nodes-insert.sql` - Node update (already run)
- ✅ `supabase/migrations/003_catalog.sql` - Updated migration file

All changes committed and pushed to GitHub.


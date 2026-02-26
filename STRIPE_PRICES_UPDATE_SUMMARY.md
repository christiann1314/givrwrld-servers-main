# Stripe Price IDs Update Summary

## ✅ Completed Updates

### Updated Migration File
- `supabase/migrations/003_catalog.sql` - All Stripe price IDs updated with live prices

### Games Updated
1. **Minecraft** - 4 plans (1GB, 2GB, 4GB, 8GB) ✅
2. **Rust** - 4 plans (3GB, 6GB, 8GB, 12GB) ✅
3. **ARK** - 3 plans (4GB, 8GB, 16GB) ✅ **ADDED**
4. **Terraria** - 3 plans (1GB, 2GB, 4GB) ✅ **ADDED**
5. **Factorio** - 3 plans (2GB, 4GB, 8GB) ✅ **ADDED**
6. **Mindustry** - 3 plans (2GB, 4GB, 8GB) ✅ **ADDED**
7. **Rimworld** - 3 plans (2GB, 4GB, 8GB) ✅ **ADDED**
8. **Vintage Story** - 3 plans (2GB, 4GB, 8GB) ✅ **ADDED**
9. **Teeworlds** - 3 plans (1GB, 2GB, 4GB) ✅ **ADDED**
10. **Among Us** - 3 plans (1GB, 2GB, 4GB) ✅ **ADDED**

### ⚠️ Still Needs Stripe Prices
- **Palworld** - 3 plans (4GB, 8GB, 16GB) - Prices need to be created in Stripe Dashboard

## Next Steps

### Option 1: Update Existing Database (Recommended)
Run `update-all-stripe-prices.sql` in Supabase SQL Editor:
- Updates existing plans (Minecraft, Rust)
- Adds new games (ARK, Terraria, Factorio, etc.)
- Uses `ON CONFLICT DO UPDATE` to safely update

### Option 2: Fresh Migration
If starting fresh, the updated `003_catalog.sql` will create all plans with correct prices.

### Option 3: Create Palworld Prices
1. Go to Stripe Dashboard → Products
2. Create products for Palworld 4GB, 8GB, 16GB
3. Copy the price IDs
4. Update the migration file or run UPDATE statements

## Verification

After updating, verify with:
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

## Production Readiness Impact

**Before:** 6/10 (Placeholder Stripe prices)
**After:** 9/10 (All games have live Stripe prices except Palworld)

**Remaining:**
- ⚠️ Create Palworld prices in Stripe (if you want to offer Palworld)
- ⚠️ Create VPS prices in Stripe (if you want to offer VPS)
- ⚠️ Create addon prices in Stripe (if you want to offer addons)

## Files Created

1. `update-all-stripe-prices.sql` - Complete UPDATE script for existing database
2. `update-stripe-prices.sql` - Alternative update script
3. `supabase/migrations/003_catalog.sql` - Updated migration with live prices


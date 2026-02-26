# Quick Plan Sync Guide

## Problem
- **43 Pterodactyl eggs** available
- **15 active plans** in database
- **28 eggs missing plans** → Can't provision these game types!

## Solution

### Step 1: Sync Plans with Pterodactyl Eggs
```bash
./scripts/sync-plans-stripe-ptero.sh
```

This will:
- ✅ Create plans for all eggs that don't have one
- ✅ Use egg name as display name
- ✅ Set default pricing (you can customize later)
- ✅ Report on Stripe price mapping

### Step 2: Review Created Plans
```sql
-- See all plans
SELECT id, display_name, game, ptero_egg_id, stripe_price_id, price_monthly 
FROM plans 
WHERE is_active=1 
ORDER BY game, display_name;
```

### Step 3: Create Stripe Products/Prices

For each new plan, you need to:

1. **Create Stripe Product** (one per game type):
   ```bash
   stripe products create \
     --name "Game Name" \
     --description "Game server hosting"
   ```

2. **Create Stripe Price** (one per plan):
   ```bash
   stripe prices create \
     --product prod_xxxxx \
     --unit-amount 999 \
     --currency usd \
     --recurring interval=month
   ```

3. **Update Plan in Database**:
   ```sql
   UPDATE plans 
   SET stripe_price_id = 'price_xxxxx' 
   WHERE id = 'plan-id';
   ```

### Step 4: Customize Plan Details

After creating plans, you may want to:
- Adjust RAM/CPU/disk allocations
- Set proper pricing
- Update display names
- Group plans by game type

```sql
-- Example: Update plan specs
UPDATE plans 
SET ram_gb = 8, vcores = 4, ssd_gb = 40, price_monthly = 19.99
WHERE id = 'minecraft-8gb';
```

## Verification

```sql
-- Check sync status
SELECT 
  (SELECT COUNT(*) FROM ptero_eggs) as total_eggs,
  (SELECT COUNT(*) FROM plans WHERE is_active=1) as total_plans,
  (SELECT COUNT(*) FROM plans WHERE is_active=1 AND stripe_price_id IS NOT NULL) as plans_with_stripe;

-- Find eggs without plans
SELECT e.ptero_egg_id, e.name, n.name as nest_name
FROM ptero_eggs e
LEFT JOIN plans p ON p.ptero_egg_id = e.ptero_egg_id
JOIN ptero_nests n ON n.ptero_nest_id = e.ptero_nest_id
WHERE p.id IS NULL
ORDER BY n.name, e.name;
```

## Expected Result

After sync:
- ✅ **43 plans** (one per egg)
- ✅ All plans have `ptero_egg_id` set
- ⚠️ Plans may need Stripe prices (manual step)
- ⚠️ Plans may need pricing/specs adjustment (manual step)

## Next Steps After Sync

1. **Review created plans** - Make sure names/specs make sense
2. **Create Stripe products** - One per game type
3. **Create Stripe prices** - One per plan
4. **Update database** - Link Stripe prices to plans
5. **Test checkout** - Verify plans appear in frontend


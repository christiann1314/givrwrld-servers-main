# Stripe Price Creation Status

## Current Status

### Plans Created
- **Total Plans**: 153
- **Plans with Stripe Prices**: 15
- **Plans Needing Stripe Prices**: 138

### By Game
| Game | Total Plans | With Stripe | Need Stripe |
|------|-------------|-------------|-------------|
| Minecraft | 64 | ? | ? |
| Source Engine | 18 | ? | ? |
| Terraria | 14 | ? | ? |
| Among Us | 9 | ? | ? |
| Factorio | 9 | ? | ? |
| Rust | 9 | ? | ? |
| Rimworld | 6 | ? | ? |
| Voice Servers | 6 | ? | ? |
| Others | 18 | ? | ? |

## How to Create Stripe Prices

### Option 1: Using Stripe CLI (Automated)

1. **Login to Stripe CLI**:
   ```bash
   stripe login
   ```
   Follow the authentication flow in your browser.

2. **Run the creation script**:
   ```bash
   ./scripts/create-all-stripe-prices.sh
   ```

   This will:
   - Create one Stripe product per game
   - Create one Stripe price per plan
   - Update database with `stripe_price_id` and `stripe_product_id`

### Option 2: Manual Creation via Stripe Dashboard

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/products

2. **For each game**:
   - Create a product (e.g., "Minecraft Server")
   - Create prices for each plan (monthly subscription)

3. **Update database**:
   ```sql
   UPDATE plans 
   SET stripe_price_id = 'price_xxxxx',
       stripe_product_id = 'prod_xxxxx'
   WHERE id = 'plan-id';
   ```

### Option 3: Bulk Update Script

If you have a CSV or list of plan IDs and Stripe price IDs, you can bulk update:

```sql
-- Example bulk update
UPDATE plans SET stripe_price_id = 'price_abc123' WHERE id = 'paper-4gb';
UPDATE plans SET stripe_price_id = 'price_def456' WHERE id = 'fabric-8gb';
-- ... repeat for all plans
```

## Verification

### Check Plans Without Stripe Prices
```sql
SELECT id, display_name, game, price_monthly
FROM plans
WHERE is_active=1 
AND (stripe_price_id IS NULL OR stripe_price_id = '')
ORDER BY game, display_name;
```

### Check Plans With Stripe Prices
```sql
SELECT game, COUNT(*) as total,
       COUNT(CASE WHEN stripe_price_id IS NOT NULL THEN 1 END) as with_stripe
FROM plans
WHERE is_active=1
GROUP BY game
ORDER BY game;
```

## Next Steps

1. ✅ Plans created for all eggs
2. ⏳ Stripe prices need to be created
3. ⏳ Test checkout flow
4. ⏳ Verify provisioning works

## Scripts Available

- `scripts/create-all-stripe-prices.sh` - Automated Stripe price creation
- `scripts/verify-plans-by-game.sh` - Verify plans by game
- `scripts/create-plans-simple.sh` - Create plans for eggs


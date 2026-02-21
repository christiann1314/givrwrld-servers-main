# Create Palworld Stripe Prices

## ⚠️ Current Issue

Palworld plans in the database still have placeholder Stripe price IDs:
- `palworld-4gb` → `price_palworld_4gb_monthly` (placeholder)
- `palworld-8gb` → `price_palworld_8gb_monthly` (placeholder)
- `palworld-16gb` → `price_palworld_16gb_monthly` (placeholder)

**If you try to purchase now, it will fail with:** `No such price: price_palworld_8gb_monthly`

## Steps to Fix

### 1. Create Products in Stripe Dashboard

Go to: https://dashboard.stripe.com/products (LIVE mode)

Create three products:
- **Palworld 4GB** - $11.99/month
- **Palworld 8GB** - $23.99/month
- **Palworld 16GB** - $47.99/month

### 2. Create Prices for Each Product

For each product, create a recurring price:
- **Billing period:** Monthly
- **Price:** Match the prices shown on your website
- **Currency:** USD

### 3. Copy Price IDs

After creating each price, copy the price ID (starts with `price_...`)

### 4. Update Database

Run this in Supabase SQL Editor (replace with your actual price IDs):

```sql
-- Update Palworld plans with actual Stripe price IDs
UPDATE public.plans SET stripe_price_id = 'YOUR_4GB_PRICE_ID' WHERE id = 'palworld-4gb';
UPDATE public.plans SET stripe_price_id = 'YOUR_8GB_PRICE_ID' WHERE id = 'palworld-8gb';
UPDATE public.plans SET stripe_price_id = 'YOUR_16GB_PRICE_ID' WHERE id = 'palworld-16gb';

-- Verify updates
SELECT id, game, ram_gb, stripe_price_id, display_name 
FROM public.plans 
WHERE game = 'palworld'
ORDER BY ram_gb;
```

### Example Prices (Based on Your Website)

- **4GB:** $11.99/month
- **8GB:** $23.99/month (currently selected on purchase page)
- **16GB:** $47.99/month

## After Creating Prices

Once you've updated the database with the real price IDs, Palworld purchases will work correctly.

## Quick Test

After updating, try purchasing a Palworld server to verify:
1. Checkout session creates successfully
2. Payment processes
3. Webhook creates order
4. Server provisions in Pterodactyl


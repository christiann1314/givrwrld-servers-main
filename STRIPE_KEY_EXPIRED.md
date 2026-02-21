# ⚠️ Stripe API Key Expired

## Issue
The Stripe secret key stored in the database is **expired**. All API calls are failing with:
```
Expired API Key provided: sk_live_...
```

## Solution

### Step 1: Get New Stripe Secret Key
1. Go to: https://dashboard.stripe.com/apikeys
2. Create a new **Secret key** (or use existing valid one)
3. Copy the key (starts with `sk_live_...` or `sk_test_...`)

### Step 2: Update Database
```bash
# Get AES key
AES_KEY=$(cat AES_KEY.txt)

# Get new Stripe key (replace YOUR_NEW_KEY)
NEW_STRIPE_KEY="sk_live_YOUR_NEW_KEY_HERE"

# Encrypt and store
mysql -u root app_core << SQL
UPDATE secrets 
SET value_enc = AES_ENCRYPT('$NEW_STRIPE_KEY', '$AES_KEY')
WHERE scope = 'stripe' AND key_name = 'STRIPE_SECRET_KEY';
SQL
```

### Step 3: Verify
```bash
# Test decryption
mysql -u app_rw -p app_core -e "
SELECT AES_DECRYPT(value_enc, '$AES_KEY') as decrypted
FROM secrets 
WHERE scope='stripe' AND key_name='STRIPE_SECRET_KEY';
"
```

### Step 4: Run Price Creation Again
```bash
cd api
node create-stripe-prices.js
```

## Current Status

- ✅ Script works correctly
- ✅ Database connection works
- ✅ Secret decryption works
- ❌ Stripe API key is expired

## Alternative: Use Stripe CLI

If you prefer to use Stripe CLI instead:

1. **Login**:
   ```bash
   stripe login
   ```

2. **Run bash script**:
   ```bash
   ./scripts/create-all-stripe-prices.sh
   ```

## Verification After Fix

Once you update the key, the script should:
- ✅ Create products for each game
- ✅ Create prices for each plan
- ✅ Update database with `stripe_price_id` and `stripe_product_id`

Expected result: **153 plans with Stripe prices**


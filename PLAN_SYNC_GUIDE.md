# Plan Sync Guide: Pterodactyl Eggs → Plans → Stripe Prices

## Overview

Plans should match **exactly** what's available in Pterodactyl. The sync process ensures:
1. Every Pterodactyl egg has a corresponding plan
2. Every plan has a Stripe price ID
3. Plans are properly mapped for auto-provisioning

## Current State

### Plans Count
- **Active Plans**: Check with `SELECT COUNT(*) FROM plans WHERE is_active=1;`
- **Pterodactyl Eggs**: Check with `SELECT COUNT(*) FROM ptero_eggs;`
- **Expected**: Plans should match or exceed eggs (one plan per egg minimum)

### Mapping Status
- **Plans → Pterodactyl Eggs**: `ptero_egg_id` field
- **Plans → Stripe Prices**: `stripe_price_id` field

## Sync Process

### Step 1: Sync Pterodactyl Catalog
```bash
./scripts/sync-ptero-catalog.sh
```
This fetches all nests and eggs from Pterodactyl and stores them in MySQL.

### Step 2: Sync Plans with Eggs
```bash
./scripts/sync-plans-stripe-ptero.sh
```
This ensures every egg has a corresponding plan.

### Step 3: Create Stripe Products/Prices

For each plan without a Stripe price:

1. **Create Stripe Product** (if not exists):
   ```bash
   # Use Stripe CLI or Dashboard
   stripe products create \
     --name "Minecraft 8GB" \
     --description "Minecraft server with 8GB RAM"
   ```

2. **Create Stripe Price**:
   ```bash
   stripe prices create \
     --product prod_xxxxx \
     --unit-amount 999 \
     --currency usd \
     --recurring interval=month
   ```

3. **Update Plan in Database**:
   ```bash
   mysql -u app_rw -p app_core -e "
   UPDATE plans 
   SET stripe_price_id = 'price_xxxxx' 
   WHERE id = 'minecraft-8gb';
   "
   ```

### Step 4: Verify Sync

```sql
-- Check plans without eggs
SELECT id, display_name, ptero_egg_id 
FROM plans 
WHERE is_active=1 
AND (ptero_egg_id IS NULL OR ptero_egg_id = 0);

-- Check plans without Stripe prices
SELECT id, display_name, stripe_price_id 
FROM plans 
WHERE is_active=1 
AND (stripe_price_id IS NULL OR stripe_price_id = '');

-- Check eggs without plans
SELECT e.ptero_egg_id, e.name, n.name as nest_name
FROM ptero_eggs e
LEFT JOIN plans p ON p.ptero_egg_id = e.ptero_egg_id
JOIN ptero_nests n ON n.ptero_nest_id = e.nest_id
WHERE p.id IS NULL;
```

## Automated Sync Script

The `sync-plans-stripe-ptero.sh` script:
- ✅ Fetches all Pterodactyl eggs
- ✅ Creates plans for eggs that don't have one
- ✅ Reports on Stripe price mapping status
- ⚠️ Does NOT create Stripe products/prices (manual step)

## Manual Steps Required

### 1. Create Stripe Products
For each game/egg type, create a Stripe product:
- Product name: Game name (e.g., "Minecraft")
- Description: Game server hosting

### 2. Create Stripe Prices
For each plan, create prices:
- Monthly price
- Quarterly price (optional)
- Yearly price (optional)

### 3. Update Database
Link Stripe prices to plans:
```sql
UPDATE plans 
SET stripe_price_id = 'price_xxxxx' 
WHERE id = 'plan-id';
```

## Best Practices

1. **One Plan Per Egg**: Each Pterodactyl egg should have at least one plan
2. **Multiple Plans Per Egg**: You can have multiple plans (different RAM/CPU) for the same egg
3. **Stripe Product Structure**: 
   - One product per game type
   - Multiple prices per product (different tiers)
4. **Plan Naming**: Use format: `{game}-{ram}gb` (e.g., `minecraft-8gb`)

## Troubleshooting

### Plans Missing Eggs
```sql
-- Find plans without egg mapping
SELECT id, display_name, ptero_egg_id 
FROM plans 
WHERE is_active=1 
AND (ptero_egg_id IS NULL OR ptero_egg_id = 0);
```

**Fix**: Run `sync-plans-stripe-ptero.sh` or manually update `ptero_egg_id`.

### Plans Missing Stripe Prices
```sql
-- Find plans without Stripe prices
SELECT id, display_name, stripe_price_id 
FROM plans 
WHERE is_active=1 
AND (stripe_price_id IS NULL OR stripe_price_id = '');
```

**Fix**: Create Stripe products/prices and update `stripe_price_id`.

### Eggs Without Plans
```sql
-- Find eggs without plans
SELECT e.ptero_egg_id, e.name 
FROM ptero_eggs e
LEFT JOIN plans p ON p.ptero_egg_id = e.ptero_egg_id
WHERE p.id IS NULL;
```

**Fix**: Run `sync-plans-stripe-ptero.sh` to create plans automatically.

## Quick Commands

```bash
# Check current state
mysql -u app_rw -p app_core -e "
SELECT 
  (SELECT COUNT(*) FROM plans WHERE is_active=1) as active_plans,
  (SELECT COUNT(*) FROM ptero_eggs) as total_eggs,
  (SELECT COUNT(*) FROM plans WHERE is_active=1 AND stripe_price_id IS NOT NULL) as plans_with_stripe;
"

# Sync everything
./scripts/sync-ptero-catalog.sh
./scripts/sync-plans-stripe-ptero.sh
```


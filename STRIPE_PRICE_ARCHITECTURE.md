# Stripe Price Architecture Analysis

## Current Setup

### Database Schema
```sql
plans (
  id VARCHAR(64) PRIMARY KEY,           -- e.g., "minecraft-2gb", "palworld-4gb"
  game VARCHAR(64),                      -- e.g., "minecraft", "palworld"
  ptero_egg_id INT,                     -- Links to Pterodactyl egg
  stripe_product_id VARCHAR(128),        -- Stripe product
  stripe_price_id VARCHAR(128),          -- Stripe price (subscription)
  ram_gb INT,
  vcores INT,
  ssd_gb INT,
  price_monthly DECIMAL(10,2)
)
```

### Current Flow

1. **User selects plan** → Frontend sends `plan_id` to checkout API
2. **Checkout API** → Looks up plan, uses `plan.stripe_price_id` to create Stripe session
3. **Stripe webhook** → Receives payment, creates order with `plan_id`
4. **Provisioning** → Uses `plan.ptero_egg_id` to create server in Pterodactyl

## Answer: YES, You Need Separate Prices Per Game Type

### Why Separate Prices Are Required

**Current Architecture (Correct):**
- Each plan = unique combination of:
  - Game type (Minecraft, Palworld, Terraria, etc.)
  - Resource level (2GB RAM, 4GB RAM, etc.)
- Each plan has its own `stripe_price_id`
- Each plan links to the correct `ptero_egg_id`

**This is necessary because:**

1. **Different Games = Different Eggs**
   - Minecraft uses egg ID 1
   - Palworld uses egg ID 2
   - Terraria uses egg ID 3
   - Each requires different Docker images, startup commands, environment variables

2. **Pricing Flexibility**
   - You may want to charge different prices for different games
   - Even if prices are the same now, you might want flexibility later
   - Stripe requires separate prices for separate products

3. **Provisioning Accuracy**
   - The system needs to know EXACTLY which egg to use
   - `plan_id` → `ptero_egg_id` mapping is critical
   - Can't provision Minecraft server with Palworld egg!

### Current Setup is Coherent ✅

Your current architecture is **correct and sufficient** for auto-provisioning:

```
User selects "minecraft-2gb" plan
  ↓
Checkout uses plan.stripe_price_id (e.g., "price_minecraft_2gb")
  ↓
Stripe webhook receives payment
  ↓
Order created with plan_id = "minecraft-2gb"
  ↓
Provisioning looks up plan.ptero_egg_id = 1 (Minecraft egg)
  ↓
Server created in Pterodactyl with correct egg
```

### What You Need in Stripe

For each plan, you need:
1. **One Stripe Product** (optional, can reuse)
   - e.g., "Minecraft Server - 2GB"
2. **One Stripe Price** (required, unique per plan)
   - e.g., `price_abc123` for "Minecraft 2GB Monthly"
   - Links to `plans.stripe_price_id`

### Example Setup

```sql
-- Plan 1: Minecraft 2GB
INSERT INTO plans VALUES (
  'minecraft-2gb',
  'game',
  'minecraft',
  2,  -- RAM
  1,  -- vcores
  10, -- SSD
  9.99,
  1,  -- ptero_egg_id (Minecraft egg)
  'prod_minecraft',
  'price_minecraft_2gb_monthly'
);

-- Plan 2: Palworld 2GB
INSERT INTO plans VALUES (
  'palworld-2gb',
  'game',
  'palworld',
  2,  -- RAM
  1,  -- vcores
  10, -- SSD
  9.99,
  2,  -- ptero_egg_id (Palworld egg)
  'prod_palworld',
  'price_palworld_2gb_monthly'
);
```

### Alternative: Shared Prices (NOT Recommended)

**You COULD theoretically:**
- Use the same Stripe price for multiple games if they cost the same
- But this breaks the clean mapping and makes it harder to:
  - Change prices per game later
  - Track revenue per game
  - Handle refunds/cancellations per game type

**Recommendation:** Keep separate prices per plan (current setup is correct)

## Summary

✅ **Your current setup is coherent and sufficient for auto-provisioning**

✅ **You DO need separate Stripe prices for each game type** (each plan)

✅ **The flow is:**
   - Plan ID → Stripe Price ID (checkout)
   - Plan ID → Pterodactyl Egg ID (provisioning)

✅ **No changes needed** - your architecture is correct!


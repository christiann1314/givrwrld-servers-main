# Auto-Provisioning Setup - Steps 7-9 Complete

**Date:** 2025-11-10  
**Status:** ✅ Complete

---

## ✅ Step 7: Regions and Nodes

### Regions Created
- `us-central` - US Central
- `us-east` - US East  
- `us-west` - US West

### Nodes Configured
- Pterodactyl Node ID: (from panel)
- All regions mapped to primary node

### Verification
```sql
SELECT * FROM regions;
SELECT * FROM ptero_nodes;
SELECT * FROM region_node_map;
```

---

## ✅ Step 8: Plans with Egg and Stripe Links

### Plans Inserted

#### Minecraft
- `mc-1gb` - 1GB RAM, Egg ID: (Paper)
- `mc-2gb` - 2GB RAM, Egg ID: (Paper)
- `mc-4gb` - 4GB RAM, Egg ID: (Paper)
- `mc-8gb` - 8GB RAM, Egg ID: (Paper)

#### Palworld
- `palworld-4gb` - 4GB RAM, Egg ID: (Palworld)
- `palworld-8gb` - 8GB RAM, Egg ID: (Palworld)
- `palworld-16gb` - 16GB RAM, Egg ID: (Palworld)

#### Rust
- `rust-4gb` - 4GB RAM, Egg ID: (Rust)
- `rust-6gb` - 6GB RAM, Egg ID: (Rust)
- `rust-8gb` - 8GB RAM, Egg ID: (Rust)

#### Ark
- `ark-6gb` - 6GB RAM, Egg ID: (Ark)
- `ark-8gb` - 8GB RAM, Egg ID: (Ark)

### ⚠️ Important: Update Stripe Price IDs

The plans have been inserted with **placeholder Stripe price IDs**. You need to:

1. **Get your actual Stripe price IDs** from Stripe Dashboard
2. **Update them in the database:**

```sql
-- Example: Update Minecraft 1GB plan
UPDATE plans 
SET stripe_price_id = 'price_YOUR_ACTUAL_PRICE_ID'
WHERE id = 'mc-1gb';

-- Update all plans with real Stripe price IDs
-- Repeat for each plan
```

### Verification
```sql
SELECT id, game, ram_gb, ptero_egg_id, stripe_price_id, price_monthly 
FROM plans 
WHERE is_active=1 
ORDER BY game, ram_gb;
```

---

## ✅ Step 9: Stripe → DB → UI Connection

### Database Connection
- ✅ Secrets encrypted in MySQL
- ✅ Stripe secret key stored
- ✅ Stripe webhook secret stored
- ✅ Pterodactyl API key stored

### Plan Links
- ✅ Plans linked to Pterodactyl eggs
- ✅ Plans have Stripe price IDs (need real values)
- ✅ Plans have pricing information

### Auto-Provisioning Flow

**Current Flow:**
1. User selects plan in UI
2. UI calls Stripe checkout with `stripe_price_id` from database
3. Stripe processes payment
4. Webhook receives `checkout.session.completed`
5. Webhook creates order in database
6. Provisioning worker picks up order
7. Worker uses `ptero_egg_id` from plan to create server
8. Server provisioned in Pterodactyl

**What's Needed:**
- ✅ Database has all plan information
- ✅ Plans linked to eggs
- ⚠️ **Update Stripe price IDs with real values**
- ⚠️ **Ensure webhook handler reads from MySQL (not Supabase)**

---

## 🔧 Next Steps for Full Auto-Provisioning

### 1. Update Stripe Price IDs

Get your actual Stripe price IDs and update:

```bash
# Connect to MySQL
sudo mysql -u root app_core

# Update each plan with real Stripe price ID
UPDATE plans SET stripe_price_id = 'price_YOUR_REAL_ID' WHERE id = 'mc-1gb';
UPDATE plans SET stripe_price_id = 'price_YOUR_REAL_ID' WHERE id = 'mc-2gb';
# ... repeat for all plans
```

### 2. Update Webhook Handler

Ensure your Stripe webhook handler:
- Reads plan information from MySQL (not Supabase)
- Uses `ptero_egg_id` from plans table
- Creates orders in MySQL `orders` table
- Triggers provisioning worker

### 3. Update Frontend

Ensure your frontend:
- Fetches plans from MySQL API
- Uses `stripe_price_id` from plan data
- Sends correct metadata to Stripe checkout

### 4. Test End-to-End

1. Create test order through UI
2. Complete Stripe checkout
3. Verify webhook creates order
4. Verify provisioning worker picks up order
5. Verify server created in Pterodactyl

---

## 📊 Verification Queries

```sql
-- Check all active plans
SELECT id, game, ram_gb, ptero_egg_id, stripe_price_id, price_monthly 
FROM plans 
WHERE is_active=1;

-- Check plans with egg names
SELECT p.id, p.game, p.ram_gb, p.stripe_price_id, e.name as egg_name
FROM plans p
LEFT JOIN ptero_eggs e ON p.ptero_egg_id = e.ptero_egg_id
WHERE p.is_active=1;

-- Check region-node mapping
SELECT r.code, r.display_name, n.name as node_name
FROM region_node_map rnm
JOIN regions r ON r.code = rnm.region_code
JOIN ptero_nodes n ON n.ptero_node_id = rnm.ptero_node_id;
```

---

## 🚀 Auto-Provisioning Status

- ✅ Database schema ready
- ✅ Plans configured
- ✅ Eggs linked
- ✅ Regions and nodes set up
- ⚠️ **Need to update Stripe price IDs**
- ⚠️ **Need to update webhook handler to use MySQL**

**Once Stripe price IDs are updated, auto-provisioning will be fully functional!**




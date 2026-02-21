# Complete Fix Implementation - Terraria Purchase Issue

**Date:** 2025-11-10  
**Status:** 🔴 CRITICAL - Multiple Issues Found

---

## 🔴 ROOT CAUSES IDENTIFIED

### Issue 1: Database Mismatch (CRITICAL)
- **Webhook handler** (`stripe-webhook`) writes to **Supabase**
- **Frontend** queries **Supabase** directly
- **MySQL** has 0 orders (order is in Supabase)
- **Result:** Order created in wrong database

### Issue 2: Terraria Plan Missing
- **Terraria plans don't exist in MySQL**
- **Result:** Purchase may have failed or used wrong plan

### Issue 3: Frontend Queries Wrong Database
- All frontend hooks query Supabase directly
- **Result:** Dashboard may show data from Supabase, but provisioning won't work

---

## 🔧 COMPLETE FIX PLAN

### Step 1: Add Terraria Plans ✅ (Just Done)
- Terraria plans added to MySQL
- Linked to Pterodactyl egg ID 16
- Stripe price IDs configured

### Step 2: Update Webhook Handler (CRITICAL)

**Current:** `stripe-webhook` writes to Supabase  
**Fix:** Update to use MySQL

**Option A: Deploy MySQL Webhook (Recommended)**
```bash
# Deploy stripe-webhook-mysql
npx supabase functions deploy stripe-webhook-mysql --project-ref mjhvkvnshnbnxojnandf

# Update Stripe Dashboard webhook URL to:
# https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/stripe-webhook-mysql
```

**Option B: Update Existing Webhook**
- Replace Supabase client with MySQL client in `stripe-webhook/index.ts`
- Redeploy function

### Step 3: Create Frontend Edge Functions ✅ (Created)
- `get-user-orders-mysql` - Returns user's orders
- `get-user-servers-mysql` - Returns user's servers with Pterodactyl data

**Deploy:**
```bash
npx supabase functions deploy get-user-orders-mysql --project-ref mjhvkvnshnbnxojnandf
npx supabase functions deploy get-user-servers-mysql --project-ref mjhvkvnshnbnxojnandf
```

### Step 4: Update Frontend Hooks

**Files to Update:**
1. `src/hooks/useLiveServerData.ts`
2. `src/hooks/useUserServers.ts`
3. `src/hooks/useLiveBillingData.ts`

**Change from Supabase queries to Edge Functions:**
```typescript
// OLD
const { data } = await supabase.from('orders').select('*').eq('user_id', user.id);

// NEW
const response = await fetch(
  `${config.supabase.functionsUrl}/get-user-orders-mysql?user_id=${user.id}`,
  { headers: { 'Authorization': `Bearer ${session.access_token}` } }
);
const { orders } = await response.json();
```

### Step 5: Migrate Existing Order

**If Terraria order exists in Supabase:**
1. Go to Supabase Dashboard → Table Editor → orders
2. Find the Terraria order
3. Export the data
4. Insert into MySQL:

```sql
INSERT INTO orders (
  id, user_id, plan_id, item_type, term, region, server_name,
  status, stripe_sub_id, stripe_customer_id, created_at
) VALUES (
  'order-id-from-supabase',
  'user-id',
  'terraria-4gb', -- or whatever plan was used
  'game',
  'monthly',
  'us-central', -- or actual region
  'server-name',
  'paid',
  'stripe-sub-id',
  'stripe-customer-id',
  '2025-11-10 00:00:00' -- actual timestamp
);
```

### Step 6: Update Provisioning

**Ensure provisioning reads from MySQL:**
- Deploy `servers-provision-mysql` function
- Update webhook to call `servers-provision-mysql` instead of `servers-provision`

---

## 📋 Implementation Checklist

### Immediate (Do Now)
- [x] Add Terraria plans to MySQL
- [ ] Deploy `stripe-webhook-mysql` function
- [ ] Update Stripe webhook URL
- [ ] Deploy `get-user-orders-mysql` function
- [ ] Deploy `get-user-servers-mysql` function
- [ ] Update frontend hooks (3 files)
- [ ] Check Supabase for existing Terraria order
- [ ] Migrate existing order to MySQL (if exists)

### Testing
- [ ] Test purchase flow end-to-end
- [ ] Verify order created in MySQL
- [ ] Verify server provisioned in Pterodactyl
- [ ] Verify dashboard shows server

---

## 🎯 Expected Flow (After All Fixes)

1. User selects Terraria plan → Frontend fetches from MySQL ✅
2. User completes Stripe checkout → Uses `stripe_price_id` from MySQL ✅
3. Stripe webhook → `stripe-webhook-mysql` function ✅
4. Function creates order in **MySQL** ✅
5. Function triggers `servers-provision-mysql` ✅
6. Server created in Pterodactyl ✅
7. Frontend queries MySQL via Edge Functions ✅
8. Dashboard shows server ✅

---

## 🚨 Current State

**What's Working:**
- ✅ MySQL database configured
- ✅ Plans in MySQL (Minecraft, Palworld, Rust, Ark)
- ✅ Terraria plans just added
- ✅ Pterodactyl catalog synced
- ✅ Secrets encrypted in MySQL

**What's Broken:**
- ❌ Webhook writes to Supabase (not MySQL)
- ❌ Frontend queries Supabase (not MySQL)
- ❌ Provisioning may read wrong database
- ❌ Terraria order likely in Supabase (not MySQL)

---

**Status:** Multiple critical issues - database mismatch is the root cause!




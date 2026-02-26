# Critical Issue Diagnosis - Terraria Purchase

**Date:** 2025-11-10  
**Issue:** Purchase completed but no server provisioned, no data in dashboard

---

## 🔴 ROOT CAUSE IDENTIFIED

### The Problem: Database Mismatch

**Current State:**
1. ✅ MySQL database is set up and configured
2. ✅ Plans are in MySQL
3. ❌ **Webhook handler (`stripe-webhook`) still uses SUPABASE**
4. ❌ **Frontend may still query SUPABASE**

**What's Happening:**
- User completes Stripe checkout ✅
- Stripe sends webhook to `stripe-webhook` function ✅
- Webhook handler creates order in **Supabase** (not MySQL) ❌
- Frontend queries **Supabase** (or MySQL) but data is in wrong place ❌
- No server provisioned because order is in wrong database ❌

---

## 🔍 Diagnostic Results

### Check 1: Recent Orders
```sql
-- Run in MySQL
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;

-- Run in Supabase (if still accessible)
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;
```

**Expected:** Order should be in one of these databases

### Check 2: Webhook Handler
```bash
# Check which database webhook uses
grep -A 5 "from('orders')" supabase/functions/stripe-webhook/index.ts
```

**If it shows `supabase.from('orders')`** → Webhook writes to Supabase  
**If it shows MySQL queries** → Webhook writes to MySQL

### Check 3: Frontend Queries
```bash
# Check frontend data fetching
grep -r "from('orders')" src/
grep -r "get-user-servers" src/
```

**If frontend uses Supabase queries** → Reads from Supabase  
**If frontend uses Edge Functions** → May read from either

---

## 🚨 IMMEDIATE FIXES REQUIRED

### Fix 1: Update Webhook Handler

**Option A: Use MySQL Webhook (Recommended)**
1. Deploy `stripe-webhook-mysql` function
2. Update Stripe webhook URL to point to `stripe-webhook-mysql`
3. Verify webhook secret matches MySQL database

**Option B: Update Existing Webhook**
1. Modify `stripe-webhook/index.ts` to use MySQL instead of Supabase
2. Replace `supabase.from('orders')` with MySQL queries
3. Redeploy function

### Fix 2: Update Frontend

**If frontend uses Supabase queries:**
1. Update to use `get-plans-mysql` Edge Function
2. Update to use MySQL-based Edge Functions for orders/servers
3. Or create new Edge Functions that read from MySQL

**If frontend uses Edge Functions:**
1. Update Edge Functions to read from MySQL
2. Or create new MySQL-based functions

### Fix 3: Migrate Existing Data

**If orders exist in Supabase:**
1. Export orders from Supabase
2. Import into MySQL
3. Update order statuses

---

## 🔧 Quick Fix Commands

### Check Where Order Was Created

```bash
# Check MySQL
sudo mysql -u root app_core -e "SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;"

# Check Supabase (if accessible)
# Go to Supabase Dashboard → Table Editor → orders
```

### Update Webhook to Use MySQL

```bash
# Option 1: Use MySQL webhook function
# Update Stripe Dashboard webhook URL to:
# https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/stripe-webhook-mysql

# Option 2: Update existing webhook
# Edit supabase/functions/stripe-webhook/index.ts
# Replace Supabase client with MySQL client
```

### Create Missing Edge Functions

If frontend needs to read orders from MySQL, create:
- `get-user-orders-mysql` - Returns user's orders
- `get-user-servers-mysql` - Returns user's servers with Pterodactyl data

---

## 📋 Action Items

1. **IMMEDIATE:** Check which database has the Terraria order
2. **IMMEDIATE:** Update webhook handler to use MySQL
3. **IMMEDIATE:** Update frontend to read from MySQL
4. **IMMEDIATE:** Migrate any existing orders from Supabase to MySQL
5. **TEST:** Make test purchase and verify end-to-end flow

---

## 🎯 Expected Flow (After Fix)

1. User completes Stripe checkout
2. Stripe webhook → `stripe-webhook-mysql` function
3. Function creates order in **MySQL** `orders` table
4. Function triggers `servers-provision-mysql`
5. Provisioning creates server in Pterodactyl
6. Frontend queries MySQL via Edge Functions
7. Dashboard shows server data

---

**Status:** Database mismatch identified - webhook writes to Supabase, but system expects MySQL!




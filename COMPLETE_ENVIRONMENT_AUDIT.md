# Complete Environment Audit - Terraria Purchase Failure

**Date:** $(date)
**Issue:** Terraria server purchase completed but no server provisioned, no data in dashboard

---

## 🔍 Audit Results

### 1. Database State

**MySQL Orders:**
```sql
-- Run: sudo mysql -u root app_core
SELECT COUNT(*) as total_orders FROM orders;
SELECT * FROM orders ORDER BY created_at DESC LIMIT 5;
```

**Supabase Orders (if accessible):**
- Check Supabase Dashboard → Table Editor → orders
- Look for recent Terraria orders

### 2. Webhook Configuration

**Current Webhook Handler:**
- File: `supabase/functions/stripe-webhook/index.ts`
- Uses: `supabase.from('orders')` → **Writes to SUPABASE**
- Should use: MySQL queries → **Write to MySQL**

**Stripe Dashboard Webhook URL:**
- Check: https://dashboard.stripe.com/webhooks
- Current URL: `https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/stripe-webhook`
- Should be: `https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/stripe-webhook-mysql` (if deployed)

### 3. Frontend Data Fetching

**Dashboard Data Sources:**
- `useLiveServerData.ts` - Fetches server data
- `useUserStats.ts` - Fetches user statistics
- Check if they use Supabase queries or Edge Functions

**Files to Check:**
- `src/pages/Dashboard.tsx`
- `src/hooks/useLiveServerData.ts`
- `src/hooks/useUserStats.ts`

### 4. Provisioning Flow

**Provisioning Function:**
- `servers-provision` - Old Supabase version
- `servers-provision-mysql` - New MySQL version (if deployed)

**Check if provisioning is triggered:**
- Look for function invocations in Supabase logs
- Check order status in database
- Check Pterodactyl for server creation

### 5. Terraria Plan Configuration

**Check Plan:**
```sql
SELECT * FROM plans WHERE game = 'terraria' OR id LIKE 'terraria%';
```

**Verify:**
- Plan exists in MySQL
- Has valid `stripe_price_id`
- Has valid `ptero_egg_id`
- `is_active = 1`

---

## 🚨 Identified Issues

### Issue 1: Database Mismatch (CRITICAL)
- **Webhook writes to Supabase**
- **System expects MySQL**
- **Result:** Orders created in wrong database

### Issue 2: Frontend May Query Wrong Database
- Frontend may still use Supabase queries
- Or Edge Functions may query Supabase
- **Result:** Dashboard shows no data

### Issue 3: Provisioning Not Triggered
- If order is in Supabase but provisioning reads MySQL
- Or provisioning function not called
- **Result:** No server created

---

## 🔧 Immediate Fixes

### Fix 1: Check Where Order Was Created

```bash
# Check MySQL
sudo mysql -u root app_core -e "SELECT * FROM orders WHERE plan_id LIKE 'terraria%' ORDER BY created_at DESC LIMIT 5;"

# Check Supabase Dashboard
# Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/editor
# Table: orders
# Filter: plan_id contains 'terraria'
```

### Fix 2: Update Webhook Handler

**Option A: Deploy MySQL Webhook**
```bash
# Deploy MySQL webhook function
npx supabase functions deploy stripe-webhook-mysql --project-ref mjhvkvnshnbnxojnandf

# Update Stripe webhook URL to:
# https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/stripe-webhook-mysql
```

**Option B: Update Existing Webhook**
- Edit `supabase/functions/stripe-webhook/index.ts`
- Replace Supabase client with MySQL client
- Redeploy function

### Fix 3: Update Frontend

**If using Supabase queries:**
- Update to use MySQL Edge Functions
- Or create new Edge Functions that read from MySQL

**If using Edge Functions:**
- Update functions to read from MySQL
- Or deploy MySQL-based functions

### Fix 4: Migrate Existing Data

**If order exists in Supabase:**
```sql
-- Export from Supabase (via Dashboard or API)
-- Import to MySQL:
INSERT INTO orders (id, user_id, plan_id, ...) VALUES (...);
```

---

## 📋 Diagnostic Checklist

- [ ] Check MySQL for recent orders
- [ ] Check Supabase for recent orders
- [ ] Verify webhook handler database target
- [ ] Verify Stripe webhook URL
- [ ] Check frontend data fetching method
- [ ] Verify Terraria plan configuration
- [ ] Check provisioning function logs
- [ ] Verify Pterodactyl API connection

---

## 🎯 Next Steps

1. **Run diagnostic queries** to find where order was created
2. **Update webhook handler** to use MySQL
3. **Update frontend** to read from MySQL
4. **Migrate existing data** if needed
5. **Test purchase flow** end-to-end

---

**Status:** Database mismatch identified - need to align webhook and frontend with MySQL!

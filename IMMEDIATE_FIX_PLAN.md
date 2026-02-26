# Immediate Fix Plan - Terraria Purchase Issue

**Date:** $(date)
**Status:** 🔴 CRITICAL - Database Mismatch

---

## 🔴 ROOT CAUSE

**The Problem:**
1. ✅ User completes Stripe checkout
2. ✅ Stripe sends webhook to `stripe-webhook` function
3. ❌ **Webhook creates order in SUPABASE** (not MySQL)
4. ❌ **Frontend queries SUPABASE** for orders
5. ❌ **Order may be in Supabase, but frontend may not see it**
6. ❌ **Provisioning may not trigger** (if it reads MySQL)

**Result:** Order created in wrong database, dashboard shows nothing, no server provisioned.

---

## 🔧 IMMEDIATE FIXES (Do These Now)

### Fix 1: Check Where Order Was Created

**Check Supabase:**
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/editor
2. Table: `orders`
3. Filter: `plan_id` contains `terraria` OR `created_at` > today
4. **If order exists here** → It's in Supabase, not MySQL

**Check MySQL:**
```bash
sudo mysql -u root app_core -e "SELECT * FROM orders WHERE plan_id LIKE 'terraria%' OR created_at > DATE_SUB(NOW(), INTERVAL 1 DAY);"
```

### Fix 2: Update Webhook to Use MySQL (CRITICAL)

**Option A: Deploy MySQL Webhook (Recommended)**
```bash
# Set environment variables first
export SUPABASE_ACCESS_TOKEN='your_token'
export PROJECT_REF='mjhvkvnshnbnxojnandf'

# Get secrets
MYSQL_PASS=$(grep app_rw PASSWORDS.txt | cut -d: -f2 | xargs)
AES_KEY=$(cat AES_KEY.txt)

# Set secrets
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_HOST=127.0.0.1
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_PORT=3306
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_USER=app_rw
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_PASSWORD="$MYSQL_PASS"
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_DATABASE=app_core
npx supabase secrets set --project-ref $PROJECT_REF AES_KEY="$AES_KEY"

# Deploy MySQL webhook
npx supabase functions deploy stripe-webhook-mysql --project-ref $PROJECT_REF

# Update Stripe webhook URL to:
# https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/stripe-webhook-mysql
```

**Option B: Update Existing Webhook**
- Edit `supabase/functions/stripe-webhook/index.ts`
- Replace Supabase client with MySQL client (use `_shared/mysql-client.ts`)
- Redeploy: `npx supabase functions deploy stripe-webhook --project-ref mjhvkvnshnbnxojnandf`

### Fix 3: Create Edge Functions for Frontend

**Deploy these functions:**
```bash
npx supabase functions deploy get-user-orders-mysql --project-ref mjhvkvnshnbnxojnandf
npx supabase functions deploy get-user-servers-mysql --project-ref mjhvkvnshnbnxojnandf
```

### Fix 4: Update Frontend to Use MySQL Functions

**Update these files:**
- `src/hooks/useLiveServerData.ts`
- `src/hooks/useUserServers.ts`
- `src/hooks/useLiveBillingData.ts`

**Change from:**
```typescript
const { data } = await supabase.from('orders').select('*');
```

**To:**
```typescript
const response = await fetch(
  `${config.supabase.functionsUrl}/get-user-orders-mysql?user_id=${user.id}`,
  { headers: { 'Authorization': `Bearer ${session.access_token}` } }
);
const { orders } = await response.json();
```

### Fix 5: Migrate Existing Order (If in Supabase)

**If order exists in Supabase:**
```sql
-- Export order data from Supabase Dashboard
-- Then insert into MySQL:
INSERT INTO orders (id, user_id, plan_id, item_type, term, region, server_name, status, stripe_sub_id, created_at)
VALUES ('order-id', 'user-id', 'terraria-4gb', 'game', 'monthly', 'us-central', 'server-name', 'paid', 'sub_xxx', NOW());
```

---

## 📋 Quick Fix Checklist

- [ ] Check Supabase for Terraria order
- [ ] Check MySQL for Terraria order
- [ ] Deploy `stripe-webhook-mysql` function
- [ ] Update Stripe webhook URL
- [ ] Deploy `get-user-orders-mysql` function
- [ ] Deploy `get-user-servers-mysql` function
- [ ] Update frontend hooks to use MySQL functions
- [ ] Migrate existing order if needed
- [ ] Test purchase flow

---

## 🎯 Expected Flow (After Fix)

1. User completes Stripe checkout ✅
2. Stripe webhook → `stripe-webhook-mysql` ✅
3. Function creates order in **MySQL** ✅
4. Function triggers `servers-provision-mysql` ✅
5. Server created in Pterodactyl ✅
6. Frontend queries MySQL via Edge Functions ✅
7. Dashboard shows server ✅

---

**Status:** Database mismatch - webhook writes to Supabase, frontend reads from Supabase, but system expects MySQL!

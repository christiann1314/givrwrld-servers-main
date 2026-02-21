# Complete Supabase Removal - MySQL Only Migration

**Date:** 2025-11-10  
**Goal:** Remove all Supabase database dependencies, use MySQL only

---

## ✅ Changes Made

### 1. Webhook Handler Updated ✅
- **File:** `supabase/functions/stripe-webhook/index.ts`
- **Changed:** Now uses MySQL instead of Supabase
- **Uses:** `_shared/mysql-client.ts` for database operations
- **Creates orders in:** MySQL `orders` table
- **Triggers:** `servers-provision-mysql` function

### 2. Checkout Session Updated ✅
- **File:** `supabase/functions/create-checkout-session/index.ts`
- **Changed:** Now fetches plans from MySQL
- **Uses:** `getPlan()` from MySQL client

### 3. Frontend Hooks Updated ✅
- **`src/hooks/useLiveServerData.ts`** → Uses `get-user-servers-mysql`
- **`src/hooks/useUserServers.ts`** → Uses `get-user-servers-mysql`
- **`src/hooks/useLiveBillingData.ts`** → Uses `get-user-orders-mysql`
- **`src/hooks/useUserStats.ts`** → Uses `get-user-orders-mysql`

### 4. Edge Functions Created ✅
- **`get-user-orders-mysql`** - Returns user's orders from MySQL
- **`get-user-servers-mysql`** - Returns user's servers with Pterodactyl data
- **`get-plans-mysql`** - Returns all active plans
- **`stripe-webhook-mysql`** - Processes Stripe webhooks (MySQL version)
- **`create-checkout-session-mysql`** - Creates checkout sessions (MySQL version)
- **`servers-provision-mysql`** - Provisions servers (MySQL version)

---

## 🔧 Remaining Tasks

### 1. Deploy MySQL Functions

```bash
export SUPABASE_ACCESS_TOKEN='your_token'
export PROJECT_REF='mjhvkvnshnbnxojnandf'

# Set MySQL secrets
MYSQL_PASS=$(grep app_rw PASSWORDS.txt | cut -d: -f2 | xargs)
AES_KEY=$(cat AES_KEY.txt)

npx supabase secrets set --project-ref $PROJECT_REF MYSQL_HOST=127.0.0.1
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_PORT=3306
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_USER=app_rw
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_PASSWORD="$MYSQL_PASS"
npx supabase secrets set --project-ref $PROJECT_REF MYSQL_DATABASE=app_core
npx supabase secrets set --project-ref $PROJECT_REF AES_KEY="$AES_KEY"

# Deploy functions
npx supabase functions deploy stripe-webhook --project-ref $PROJECT_REF
npx supabase functions deploy create-checkout-session --project-ref $PROJECT_REF
npx supabase functions deploy get-user-orders-mysql --project-ref $PROJECT_REF
npx supabase functions deploy get-user-servers-mysql --project-ref $PROJECT_REF
npx supabase functions deploy get-plans-mysql --project-ref $PROJECT_REF
npx supabase functions deploy servers-provision-mysql --project-ref $PROJECT_REF
```

### 2. Update Stripe Webhook URL

**Go to:** https://dashboard.stripe.com/webhooks  
**Update endpoint to:** `https://mjhvkvnshnbnxojnandf.supabase.co/functions/v1/stripe-webhook`

(Note: The existing `stripe-webhook` function now uses MySQL, so no URL change needed if already pointing to it)

### 3. Update Other Functions

**Functions that may still use Supabase:**
- `servers-provision` - Update to use MySQL or use `servers-provision-mysql`
- `sync-server-status` - Update to read from MySQL
- `get-server-status` - Update to read from MySQL
- Any other functions that query Supabase database

### 4. Remove Supabase Database Queries

**Search for remaining Supabase queries:**
```bash
grep -r "supabase.from" src/
grep -r "\.from\('" src/
```

**Files that may still have Supabase queries:**
- Check all files in `src/pages/`
- Check all files in `src/components/`
- Check all files in `src/services/`

### 5. Update Authentication (If Needed)

**Note:** Supabase Auth can still be used for authentication
- Only the **database** is being removed
- Auth service can remain (users, sessions, JWT)
- Or migrate to custom auth with MySQL `users` table

---

## 📋 Migration Checklist

### Database
- [x] MySQL database created and configured
- [x] Plans migrated to MySQL
- [x] Pterodactyl catalog synced to MySQL
- [x] Secrets encrypted in MySQL
- [ ] Migrate existing orders from Supabase to MySQL (if any)

### Edge Functions
- [x] `stripe-webhook` updated to use MySQL
- [x] `create-checkout-session` updated to use MySQL
- [x] `get-user-orders-mysql` created
- [x] `get-user-servers-mysql` created
- [x] `get-plans-mysql` created
- [x] `servers-provision-mysql` created
- [ ] Deploy all MySQL functions
- [ ] Update other functions that use Supabase

### Frontend
- [x] `useLiveServerData.ts` updated
- [x] `useUserServers.ts` updated
- [x] `useLiveBillingData.ts` updated
- [x] `useUserStats.ts` updated
- [ ] Update remaining Supabase queries in pages/components
- [ ] Remove Supabase database imports where not needed

### Testing
- [ ] Test purchase flow end-to-end
- [ ] Verify orders created in MySQL
- [ ] Verify servers provisioned
- [ ] Verify dashboard shows data
- [ ] Test all game types

---

## 🚨 Important Notes

### What's Still Using Supabase

**Supabase Auth (Can Keep):**
- User authentication
- JWT tokens
- Session management
- User profiles (if using Supabase Auth)

**Supabase Database (Remove):**
- All `supabase.from('table')` queries
- All database operations
- All real-time subscriptions (replace with polling)

### Real-time Subscriptions

**Old (Supabase):**
```typescript
supabase.channel('orders').on('postgres_changes', ...)
```

**New (MySQL):**
```typescript
// Use polling instead
setInterval(() => fetchData(), 30000);
```

---

## 🎯 Final State

**After migration:**
- ✅ All data in MySQL
- ✅ All Edge Functions read/write MySQL
- ✅ Frontend queries MySQL via Edge Functions
- ✅ No Supabase database dependencies
- ⚠️ Supabase Auth may still be used (optional)

---

**Status:** Code updated, ready for deployment and testing!

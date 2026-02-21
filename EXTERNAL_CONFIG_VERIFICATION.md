# External Configuration Verification Checklist

**Date:** 2025-11-07  
**Purpose:** Verify all external service configurations required for production

---

## 🔴 Critical: Must Verify Before Launch

### 1. Stripe Webhook Configuration (LIVE Mode)

**Status:** ⚠️ **REQUIRES MANUAL VERIFICATION**

**Steps:**
1. Go to: https://dashboard.stripe.com/webhooks
2. **Switch to LIVE mode** (top-right toggle - must say "LIVE", not "Test")
3. Check if this endpoint exists:
   ```
   https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook
   ```

**If endpoint doesn't exist:**
- Click "Add endpoint"
- URL: `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
- Description: "GIVRwrld Production Webhook"
- Events to send:
  - ✅ `checkout.session.completed` (REQUIRED)
  - ✅ `customer.subscription.updated` (recommended)
  - ✅ `customer.subscription.deleted` (recommended)
  - ✅ `invoice.payment_failed` (recommended)
- Click "Add endpoint"

**After creating:**
- Copy the **Signing secret** (starts with `whsec_...`)
- Verify it matches `STRIPE_WEBHOOK_SECRET` in Supabase

**Verification:**
- [ ] Endpoint exists in Stripe Dashboard (LIVE mode)
- [ ] Endpoint status is **Active** (green badge)
- [ ] `checkout.session.completed` event is enabled
- [ ] Signing secret matches Supabase secret
- [ ] Recent events show 200 OK (not 400/500 errors)

---

### 2. Supabase Edge Functions Secrets

**Status:** ⚠️ **REQUIRES MANUAL VERIFICATION**

**Steps:**
1. Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/settings/functions
2. Check "Secrets" section

**Required Secrets Checklist:**

| Secret Name | Required For | Status | Notes |
|------------|--------------|--------|-------|
| `SUPABASE_URL` | All functions | [ ] | Should be: `https://mjhvkvnshnbnxojnandf.supabase.co` |
| `SUPABASE_ANON_KEY` | Most functions | [ ] | JWT format anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side ops | [ ] | Service role key (keep secret!) |
| `STRIPE_SECRET_KEY` | Checkout, webhook | [ ] | **MUST be LIVE key** (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook | [ ] | From Stripe Dashboard (`whsec_...`) |
| `PANEL_URL` | Pterodactyl functions | [ ] | `https://panel.givrwrldservers.com` |
| `PTERO_APP_KEY` | Pterodactyl functions | [ ] | Application API key (`ptla_...`) |
| `PTERODACTYL_URL` | Some functions | [ ] | Same as `PANEL_URL` (fallback) |
| `PTERODACTYL_API_KEY` | Some functions | [ ] | Same as `PTERO_APP_KEY` (fallback) |
| `ALLOW_ORIGINS` | CORS | [ ] | Optional (has defaults) |
| `ALERTS_WEBHOOK` | Notifications | [ ] | Optional (Discord/Slack webhook) |

**Critical Checks:**
- [ ] `STRIPE_SECRET_KEY` starts with `sk_live_` (NOT `sk_test_`)
- [ ] `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- [ ] `PTERO_APP_KEY` has correct permissions (admin/application API)
- [ ] All required secrets are set (no missing values)

---

### 3. Pterodactyl API Key Permissions

**Status:** ⚠️ **REQUIRES MANUAL VERIFICATION**

**Steps:**
1. Log into Pterodactyl Panel: https://panel.givrwrldservers.com
2. Go to: Admin → API → Application API
3. Find the API key used in `PTERO_APP_KEY`

**Required Permissions:**
- [ ] `users.read` - Read user information
- [ ] `users.write` - Create/update users
- [ ] `servers.read` - Read server information
- [ ] `servers.write` - Create/update servers
- [ ] `nodes.read` - Read node information
- [ ] `allocations.read` - Read allocation information
- [ ] `allocations.write` - Assign allocations

**Verification:**
- [ ] API key exists and is active
- [ ] Has all required permissions
- [ ] Key matches `PTERO_APP_KEY` in Supabase secrets

---

## 🟡 Important: Should Verify

### 4. Database Plans Table

**Status:** ⚠️ **VERIFY STRIPE PRICE IDs**

**Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Run:
```sql
SELECT id, display_name, stripe_price_id, is_active 
FROM plans 
WHERE is_active = true
ORDER BY game, ram_gb;
```

**Check:**
- [ ] All plans have Stripe price IDs (not placeholders)
- [ ] Price IDs start with `price_` (Stripe format)
- [ ] Price IDs match Stripe Dashboard (LIVE mode)
- [ ] All plans are marked `is_active = true`

---

### 5. Pterodactyl Nodes Configuration

**Status:** ⚠️ **VERIFY NODE CAPACITY**

**Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Run:
```sql
SELECT 
  id,
  name,
  region,
  max_ram_gb,
  max_disk_gb,
  reserved_headroom_gb,
  enabled,
  pterodactyl_node_id
FROM ptero_nodes
WHERE enabled = true;
```

**Check:**
- [ ] Nodes exist for all regions you support
- [ ] `pterodactyl_node_id` matches actual Pterodactyl node IDs
- [ ] `max_ram_gb` and `max_disk_gb` are accurate
- [ ] `reserved_headroom_gb` is reasonable (2-4 GB)

---

### 6. Stripe Products & Prices (LIVE Mode)

**Status:** ⚠️ **VERIFY LIVE PRICES**

**Steps:**
1. Go to: https://dashboard.stripe.com/products (LIVE mode)
2. Verify all products exist:
   - Minecraft plans (1GB, 2GB, 4GB, 8GB, 16GB)
   - Rust plans (3GB, 6GB, 8GB, 12GB)
   - Palworld plans (4GB, 8GB, 16GB)
   - Other game plans
   - VPS plans
   - Addons

**Check:**
- [ ] All products exist in LIVE mode
- [ ] Price IDs match database `stripe_price_id` values
- [ ] Prices are correct (monthly subscription prices)
- [ ] Products are active (not archived)

---

## 🟢 Optional: Nice to Have

### 7. Frontend Environment Variables

**Status:** ✅ **Already Configured** (but verify production build)

**Verification:**
- [ ] Production build uses LIVE Stripe key (not test key)
- [ ] Production build uses correct Supabase anon key
- [ ] All `VITE_*` variables are set in production

**How to Check:**
```bash
# After building, check the built files
grep -r "pk_test" dist/  # Should return nothing
grep -r "pk_live" dist/  # Should find LIVE key
```

---

### 8. SSL Certificates

**Status:** ✅ **Already Verified** (32-67 days remaining)

**Auto-renewal:**
- [ ] Certbot timer is enabled (already done)
- [ ] Deploy hook is configured (already done)
- [ ] Test renewal works: `sudo certbot renew --dry-run`

---

## 📋 Quick Verification Script

Run this to check what you can verify programmatically:

```bash
# Check Supabase secrets (requires Supabase CLI)
npx supabase secrets list --project-ref mjhvkvnshnbnxojnandf

# Check SSL certificates
sudo certbot certificates

# Check Nginx config
sudo nginx -t

# Check database plans
# (Run in Supabase SQL Editor)
SELECT COUNT(*) as total_plans, 
       COUNT(CASE WHEN stripe_price_id LIKE 'price_%' THEN 1 END) as valid_price_ids
FROM plans 
WHERE is_active = true;
```

---

## ✅ Verification Checklist Summary

**Before Launch, Verify:**
1. [ ] Stripe webhook endpoint exists and is Active (LIVE mode)
2. [ ] Stripe webhook signing secret matches Supabase
3. [ ] All Supabase secrets are set (especially LIVE Stripe key)
4. [ ] Pterodactyl API key has correct permissions
5. [ ] Database plans have valid Stripe price IDs
6. [ ] Pterodactyl nodes are configured correctly
7. [ ] Stripe products/prices exist in LIVE mode

**After Launch, Monitor:**
- [ ] First purchase completes successfully
- [ ] Webhook receives `checkout.session.completed` event
- [ ] Order is created in database
- [ ] Server provisioning triggers
- [ ] Server appears in Pterodactyl panel
- [ ] Server appears in user dashboard

---

**Next Steps:**
1. Complete the verification checklist above
2. Make a test purchase to verify end-to-end flow
3. Monitor logs for any issues
4. Address any findings from verification


# 🔍 Production Audit Report - Purchase Flow Fixes

## Critical Issues Found & Fixed

### 1. **SMOKING GUN: stripe-webhook used wrong env var**
**File:** `supabase/functions/stripe-webhook/index.ts:50`
- **Issue:** Used `SERVICE_ROLE_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`
- **Impact:** Webhook would fail silently when trying to create orders, causing payment to succeed but no server provisioning
- **Fix:** ✅ Changed to `SUPABASE_SERVICE_ROLE_KEY`
- **Status:** ✅ Deployed

### 2. **Missing Game Configurations**
**File:** `supabase/functions/servers-provision/index.ts`
- **Issue:** Only Minecraft, Rust, Palworld configured. Among Us and other games would fail with "Unknown game"
- **Impact:** Even if webhook worked, provisioning would fail for most games
- **Fix:** ✅ Added configurations for:
  - Among Us (egg 34)
  - Terraria (egg 16)
  - ARK (egg 14)
  - Factorio (egg 21)
  - Mindustry (egg 29)
  - Rimworld (egg 26)
  - Vintage Story (egg 32)
  - Teeworlds (egg 33)
- **Status:** ✅ Deployed

### 3. **Stripe Webhook Endpoint Configuration**
**Required Action:** Verify in Stripe Dashboard (Live Mode):
- **Endpoint URL:** `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
- **Events Required:** `checkout.session.completed` (at minimum)
- **Signing Secret:** Must match `STRIPE_WEBHOOK_SECRET` in Supabase secrets
- **Current Secret in Supabase:** Set in Supabase Edge Functions secrets

## Current Production Configuration

### Supabase Secrets (Required)
✅ **STRIPE_SECRET_KEY** = `sk_live_...` (Live Stripe secret key)
✅ **STRIPE_WEBHOOK_SECRET** = `whsec_...` (From Stripe Dashboard webhook endpoint)
✅ **SUPABASE_URL** = `https://mjhvkvnshnbnxojnandf.supabase.co`
✅ **SUPABASE_SERVICE_ROLE_KEY** = Set in Supabase
✅ **PANEL_URL** = `https://panel.givrwrldservers.com`
✅ **PTERO_APP_KEY** = `ptla_...` (Pterodactyl Application API key)
✅ **PTERODACTYL_URL** = `https://panel.givrwrldservers.com` (redundant with PANEL_URL)
✅ **PTERODACTYL_API_KEY** = Same as PTERO_APP_KEY (redundant)

### Redundant Secrets to Clean Up
These are duplicate names for the same values:
- `PTERODACTYL_URL` = `PANEL_URL`
- `PTERODACTYL_API_KEY` = `PTERO_APP_KEY`

**Recommendation:** Keep `PANEL_URL` and `PTERO_APP_KEY`, remove redundant ones to avoid confusion.

### Live Price IDs Mapped
All game plans now have live Stripe price IDs:
- ✅ Minecraft (1/2/4/8/16GB)
- ✅ Rust (3/6/8/12GB)
- ✅ Palworld (4/8/16GB)
- ✅ ARK (4/8/16GB)
- ✅ Terraria (1/2/4GB)
- ✅ Factorio (2/4/8GB)
- ✅ Mindustry (2/4/8GB)
- ✅ Rimworld (2/4/8GB)
- ✅ Vintage Story (2/4/8GB)
- ✅ Teeworlds (1/2/4GB)
- ✅ Among Us (1/2/4GB)

## Purchase Flow (End-to-End)

1. **User clicks "Deploy Server"** → Frontend calls `create-checkout-session`
2. **Stripe Checkout** → User completes payment
3. **Stripe sends webhook** → `checkout.session.completed` to `stripe-webhook` function
4. **Webhook creates order** → Inserts into `orders` table with `status='paid'`
5. **Webhook triggers provisioning** → Calls `servers-provision` function
6. **Provisioning creates server** → Creates in Pterodactyl via API
7. **Order updated** → `status='provisioned'`, `pterodactyl_server_id` set
8. **Dashboard shows server** → Frontend polls `orders` table, displays server

## Next Steps for Testing

1. **Verify Stripe Webhook:**
   - Go to Stripe Dashboard → Developers → Webhooks (Live mode)
   - Ensure endpoint `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook` exists
   - Verify signing secret matches Supabase secret
   - Check recent events for `checkout.session.completed`

2. **Test Purchase:**
   - Make a new purchase (e.g., Among Us 1GB)
   - Monitor Supabase Edge Function logs for `stripe-webhook`
   - Check if order is created in `orders` table
   - Check if `servers-provision` is called
   - Verify server appears in Pterodactyl panel

3. **If Still Not Working:**
   - Check Supabase Edge Function logs for errors
   - Verify user has `external_account` record (created by `create-pterodactyl-user`)
   - Check `ptero_nodes` table has enabled node in user's selected region
   - Verify node has free allocations

## Files Modified
- ✅ `supabase/functions/stripe-webhook/index.ts` - Fixed SERVICE_ROLE_KEY bug
- ✅ `supabase/functions/servers-provision/index.ts` - Added all game configurations

## Deployment Status
- ✅ `stripe-webhook` deployed with fix
- ✅ `servers-provision` deployed with all games
- ✅ All live price IDs mapped in Supabase `plans` table


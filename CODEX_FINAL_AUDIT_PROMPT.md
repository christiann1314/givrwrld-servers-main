# Final Production Readiness Audit Prompt for Codex

## Copy and paste this prompt to Codex:

---

**FINAL PRODUCTION READINESS AUDIT REQUEST**

We've completed multiple rounds of fixes and updates. Please perform a comprehensive final audit to verify all systems are production-ready for launch.

**Recent Updates Completed:**
1. ✅ All 37 game plans now have live Stripe price IDs (Minecraft, Rust, ARK, Terraria, Factorio, Mindustry, Rimworld, Vintage Story, Teeworlds, Among Us, Palworld)
2. ✅ Added Minecraft 16GB plan with live Stripe price
3. ✅ All Stripe prices verified in database (all showing "✅ Live" status)
4. ✅ Security fixes: JWT verification on protected functions
5. ✅ Checkout URL handling with validation
6. ✅ Capacity tracking includes all active order statuses
7. ✅ Panel account creation without password resets
8. ✅ Error handling improvements throughout

**Key Areas to Audit:**

### 1. Stripe Integration & Pricing
- **CRITICAL**: Verify all 37 plans in `plans` table have live Stripe price IDs (not placeholders)
- Check that `create-checkout-session` correctly uses price IDs from database
- Verify webhook signature validation is working
- Check that webhook handles `checkout.session.completed` correctly
- Verify order creation includes all required metadata (plan_id, user_id, region, etc.)
- Check that failed payments are handled gracefully
- Verify Stripe is in LIVE mode (not test mode)

**Files to Review:**
- `supabase/functions/stripe-webhook/index.ts` - Webhook event handling
- `supabase/functions/create-checkout-session/index.ts` - Price ID retrieval
- `supabase/migrations/003_catalog.sql` - All price IDs should be live
- Database: `SELECT id, game, ram_gb, stripe_price_id FROM plans WHERE item_type = 'game' ORDER BY game, ram_gb;`

**Expected Results:**
- All `stripe_price_id` values should start with `price_1SP` or `price_1SQK` (live prices)
- No placeholders like `price_terraria_1gb_monthly` or `price_minecraft_1gb_monthly`
- All prices match Stripe Dashboard live prices

### 2. End-to-End Purchase Flow
Verify the complete flow works correctly:
1. User signs up → `create-pterodactyl-user` creates panel account
2. User selects plan → `create-checkout-session` creates Stripe session
3. User completes payment → Stripe webhook receives `checkout.session.completed`
4. Webhook creates order → Order status = `paid`
5. Webhook triggers `servers-provision` → Server provisioning begins
6. Provisioning checks capacity → Finds available node
7. Server created in Pterodactyl → Order status = `provisioned`
8. User sees server in dashboard → Server appears in UI

**Files to Review:**
- `src/hooks/useAuth.tsx` - Signup and panel account creation
- `src/services/stripeService.ts` - Checkout session creation
- `supabase/functions/create-checkout-session/index.ts` - Session creation with metadata
- `supabase/functions/stripe-webhook/index.ts` - Order creation and provisioning trigger
- `supabase/functions/servers-provision/index.ts` - Server provisioning logic
- `src/hooks/useUserServers.ts` - Dashboard server display

**Flow Verification:**
- Check that metadata flows correctly: plan_id → order → provisioning
- Verify user_id is correctly passed through all steps
- Check that region selection works
- Verify error handling at each step

### 3. Pterodactyl Integration
- Verify all egg IDs in `servers-provision` match actual Pterodactyl panel eggs
- Check that node allocation logic correctly finds available nodes
- Verify capacity calculation includes: `paid`, `provisioning`, `installing`, `active`, `provisioned`
- Check that server creation includes all required environment variables
- Verify `external_accounts` mapping is correct
- Check that `create-pterodactyl-user` doesn't reset existing passwords

**Files to Review:**
- `supabase/functions/servers-provision/index.ts` - Egg IDs, node allocation, capacity
- `supabase/functions/create-pterodactyl-user/index.ts` - Account creation logic
- `supabase/migrations/003_catalog.sql` - Verify egg IDs match panel

**Expected Egg IDs:**
- Minecraft Paper: 39
- Rust: 50
- Palworld: 15
- ARK: 14
- Terraria: 16
- Factorio: 21
- Mindustry: 29
- Rimworld: 26
- Vintage Story: 32
- Teeworlds: 33
- Among Us: 34

### 4. Security & Authentication
- Verify JWT verification is enabled for `servers-provision` and `create-pterodactyl-user` in `supabase/config.toml`
- Check that service-role calls from webhook still work (internal bypass)
- Verify user ID validation prevents unauthorized access
- Check that no sensitive operations happen before authentication
- Verify webhook signature validation uses correct secret
- Check that service role keys are only used server-side

**Files to Review:**
- `supabase/config.toml` - JWT verification settings
- `supabase/functions/servers-provision/index.ts` - Authentication logic
- `supabase/functions/create-pterodactyl-user/index.ts` - User validation
- `supabase/functions/stripe-webhook/index.ts` - Signature validation

### 5. Database Schema & Data
- Verify `ptero_nodes` table has enabled nodes with correct region mapping
- Check that `external_accounts` table structure is correct
- Verify `orders` table supports all required statuses
- Verify all indexes are in place for performance
- Check RLS policies are correctly configured
- Verify all 37 plans exist in database

**Verification Queries:**
```sql
-- Check all plans have live prices
SELECT id, game, ram_gb, stripe_price_id 
FROM plans 
WHERE item_type = 'game' 
ORDER BY game, ram_gb;

-- Check nodes are enabled
SELECT id, region, enabled, max_ram_gb, reserved_headroom_gb 
FROM ptero_nodes 
WHERE enabled = true;

-- Check external_accounts structure
SELECT user_id, pterodactyl_user_id, created_at 
FROM external_accounts 
LIMIT 5;
```

### 6. Error Handling & Logging
- Verify all Edge Functions have proper error handling
- Check that error messages are user-friendly and actionable
- Verify webhook failures don't silently fail
- Check that provisioning errors update order status correctly
- Verify errors are logged for debugging

**Files to Review:**
- All Edge Functions in `supabase/functions/`
- Check for try-catch blocks
- Verify error responses are JSON formatted
- Check that order status is updated on errors

### 7. Configuration & Environment
- Verify all required secrets are set in Supabase:
  - `STRIPE_SECRET_KEY` (live key)
  - `STRIPE_WEBHOOK_SECRET` (live webhook secret)
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `PANEL_URL` / `PTERODACTYL_URL`
  - `PTERO_APP_KEY` / `PTERODACTYL_API_KEY`
- Check that no secrets are hardcoded in code
- Verify fallback values are appropriate
- Check that CORS is configured correctly

### 8. Frontend Integration
- Verify checkout flow works correctly
- Check that success/cancel URLs are handled properly
- Verify dashboard displays servers correctly
- Check that panel account creation doesn't block signup
- Verify error messages are displayed to users

**Files to Review:**
- `src/services/stripeService.ts` - Checkout flow
- `src/hooks/useStripeCheckout.ts` - Purchase hook
- `src/hooks/useUserServers.ts` - Server display
- `src/hooks/useAuth.tsx` - Signup flow

### 9. Code Quality & Best Practices
- Check for any remaining placeholder values
- Verify no hardcoded secrets
- Check for proper type safety (TypeScript)
- Verify consistent error handling patterns
- Check for proper logging throughout

### 10. Production Readiness Checklist
- [ ] All Stripe prices are live (37 plans verified)
- [ ] Webhook is configured in Stripe Dashboard (LIVE mode)
- [ ] All secrets are set in Supabase
- [ ] All egg IDs match Pterodactyl panel
- [ ] Nodes are enabled and have allocations
- [ ] JWT verification is enabled on protected functions
- [ ] Error handling is comprehensive
- [ ] Database schema is correct
- [ ] Frontend-backend flow is complete
- [ ] No critical bugs or missing pieces

**Success Criteria:**
- All 37 plans have live Stripe prices ✅
- End-to-end purchase flow works correctly
- All security measures are in place
- Error handling is comprehensive
- Database schema is correct
- No critical blockers for production

**Deliverables:**
Please provide:
1. **Comprehensive audit report** with findings for each area
2. **Verification checklist** for all 10 areas (✅ Verified / ⚠️ Needs Attention / ❌ Issue)
3. **Critical issues** that would block production (if any)
4. **Recommendations** for improvements
5. **Final production readiness score** (1-10) with detailed justification
6. **Specific code locations** for any issues found
7. **Confirmation** that all Stripe prices are live and correct

**Context:**
- All Stripe prices have been updated to live prices
- Previous security and functionality fixes are in place
- System is ready for final verification before launch
- Database is synced with all 37 plans

**Special Focus:**
- Verify NO placeholder Stripe price IDs remain in the database
- Verify all price IDs match what's in Stripe Dashboard (live mode)
- Confirm end-to-end purchase flow will work correctly

Please verify everything is production-ready and confirm the system is ready for launch.

---

## Usage Instructions

1. Copy the entire prompt above (everything between the --- markers)
2. Paste it into Codex
3. Codex will audit your codebase and provide a comprehensive final report

## What This Audit Will Check

- ✅ All 37 Stripe prices are live (CRITICAL)
- ✅ End-to-end purchase flow works
- ✅ Pterodactyl integration is correct
- ✅ Security measures are in place
- ✅ Error handling is comprehensive
- ✅ Database schema is correct
- ✅ No critical blockers for production

## Expected Results

- Verification that all Stripe prices are live
- Confirmation of end-to-end flow
- Any remaining issues identified
- Final production readiness score
- Go/no-go recommendation for launch


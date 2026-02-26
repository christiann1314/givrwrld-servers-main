# Production Readiness Audit Prompt for Codex

## Copy and paste this prompt to Codex:

---

**PRODUCTION READINESS AUDIT REQUEST**

I need a comprehensive production readiness audit for my game server hosting platform. Please review the entire codebase and verify all systems are production-ready.

**Platform Overview:**
- Game server hosting website: givrwrldservers.com
- Tech Stack: React/TypeScript frontend, Supabase (Edge Functions/Deno), Stripe payments, Pterodactyl game panel
- Users can: sign up, purchase servers via Stripe, manage servers in dashboard, access Pterodactyl panel

**Key Areas to Audit:**

1. **Backend Prerequisites Verification:**
   - Verify all Supabase Edge Function secrets are set and correctly referenced
   - Verify all Pterodactyl credentials (PANEL_URL, PTERO_APP_KEY, PTERODACTYL_URL, PTERODACTYL_API_KEY) are configured
   - Check that egg IDs in `servers-provision` match actual Pterodactyl panel configuration
   - Verify `ptero_nodes` table has enabled nodes with correct region mapping
   - Verify `external_accounts` table structure and that users get panel accounts during onboarding

2. **Stripe Integration:**
   - Verify webhook endpoint is configured in Stripe Dashboard (LIVE mode)
   - Check webhook function (`stripe-webhook`) handles all required events correctly
   - Verify checkout session creation includes all required metadata
   - Check error handling in webhook for failed payments/orders
   - Verify price IDs in `plans` table match Stripe live prices

3. **Pterodactyl Integration:**
   - Verify `servers-provision` function correctly creates servers with proper egg IDs
   - Check that node allocation logic works correctly
   - Verify server provisioning includes all required environment variables
   - Check that `create-pterodactyl-user` function creates panel accounts correctly
   - Verify external_accounts mapping is working

4. **Frontend to Backend Flow:**
   - Verify purchase flow: user clicks purchase → checkout session → payment → webhook → order creation → server provisioning
   - Check that users see their servers in dashboard after purchase
   - Verify panel account creation during signup
   - Check error handling for failed purchases
   - Verify CORS configuration for all Edge Functions

5. **Database Schema & Data:**
   - Verify all required tables exist with correct schema
   - Check that `orders` table has all required fields
   - Verify `plans` table has all game plans with correct Stripe price IDs
   - Check that RLS policies are correctly configured
   - Verify foreign key relationships are correct

6. **Error Handling & Logging:**
   - Check that all Edge Functions have proper error handling
   - Verify error messages are user-friendly and actionable
   - Check that critical errors are logged appropriately
   - Verify webhook failures don't silently fail

7. **Security:**
   - Verify JWT authentication is required for protected functions
   - Check that service role keys are only used server-side
   - Verify RLS policies protect user data
   - Check that API keys are stored as secrets, not in code
   - Verify webhook signature validation is working

8. **Environment Variables:**
   - Check all required environment variables are documented
   - Verify no hardcoded secrets in code
   - Check that fallback values are appropriate

**Specific Files to Review:**
- `supabase/functions/stripe-webhook/index.ts` - Webhook handling
- `supabase/functions/servers-provision/index.ts` - Server provisioning
- `supabase/functions/create-checkout-session/index.ts` - Checkout flow
- `supabase/functions/create-pterodactyl-user/index.ts` - Panel account creation
- `src/hooks/useAuth.tsx` - User authentication and onboarding
- `src/hooks/useStripeCheckout.ts` - Purchase flow
- `supabase/config.toml` - Function configuration
- All migration files in `supabase/migrations/`

**Success Criteria:**
- All secrets are configured correctly
- All API integrations are working
- Error handling is comprehensive
- Database schema is correct
- Frontend-backend flow is complete
- Security best practices are followed
- No critical bugs or missing pieces

**Deliverables:**
Please provide:
1. A comprehensive audit report with findings for each area
2. A checklist of what's working and what needs attention
3. Any critical issues that would block production
4. Recommendations for improvements
5. A final production readiness score (1-10) with justification

**Context:**
We've already completed a backend prerequisites audit and fixed:
- Added missing PTERODACTYL_URL and PTERODACTYL_API_KEY secrets
- Corrected Rust (egg 50) and Palworld (egg 15) egg IDs
- Verified node inventory and external accounts
- Fixed SQL queries to match actual schema
- Improved webhook error handling

Please verify everything is production-ready and identify any remaining issues.

---

## Usage Instructions

1. Copy the entire prompt above (everything between the --- markers)
2. Paste it into Codex
3. Codex will audit your codebase and provide a comprehensive report

## What This Audit Will Check

- ✅ All backend prerequisites are met
- ✅ Stripe integration is complete and working
- ✅ Pterodactyl integration is correct
- ✅ Frontend-backend flow is complete
- ✅ Database schema is correct
- ✅ Error handling is comprehensive
- ✅ Security best practices are followed
- ✅ No critical bugs or missing pieces


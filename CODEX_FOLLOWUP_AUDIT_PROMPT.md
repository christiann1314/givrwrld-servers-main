# Follow-Up Production Readiness Audit Prompt for Codex

## Copy and paste this prompt to Codex:

---

**FOLLOW-UP PRODUCTION READINESS AUDIT REQUEST**

A previous audit identified critical production issues (score: 4/10). We've implemented fixes and need a comprehensive follow-up audit to verify the fixes are correct and identify any remaining issues.

**Previous Issues Fixed:**
1. ✅ Added JWT verification to `servers-provision` and `create-pterodactyl-user` in `supabase/config.toml`
2. ✅ Fixed checkout session to accept frontend-provided URLs with validation
3. ✅ Fixed capacity tracking to include all active order statuses (paid, provisioning, installing, active, provisioned)
4. ✅ Fixed `create-pterodactyl-user` to prevent password resets for existing accounts
5. ✅ Improved error handling in `useAuth.tsx` for panel account creation

**Areas to Verify:**

### 1. Security Verification
- Verify JWT verification is properly implemented in `servers-provision` and `create-pterodactyl-user`
- Check that service-role calls from webhook still work (internal calls should bypass JWT)
- Verify user ID validation prevents unauthorized access
- Check that no sensitive operations happen before authentication
- Verify all functions in `supabase/config.toml` have appropriate `verify_jwt` settings

**Files to Review:**
- `supabase/config.toml` - Verify all function security settings
- `supabase/functions/servers-provision/index.ts` - Check JWT implementation
- `supabase/functions/create-pterodactyl-user/index.ts` - Check JWT and user validation
- `supabase/functions/stripe-webhook/index.ts` - Verify it can still call servers-provision

### 2. Checkout URL Handling
- Verify `create-checkout-session` accepts `success_url` and `cancel_url` from frontend
- Check that URL validation is secure (prevents open redirects)
- Verify fallback behavior when URLs are invalid
- Test that staging/test environments work correctly
- Check that `stripeService.ts` passes URLs correctly

**Files to Review:**
- `supabase/functions/create-checkout-session/index.ts` - URL handling logic
- `src/services/stripeService.ts` - Frontend URL passing

### 3. Capacity Tracking
- Verify capacity calculation includes all statuses: `paid`, `provisioning`, `installing`, `active`, `provisioned`
- Check that nodes aren't overbooked
- Verify the calculation logic is correct
- Check edge cases (e.g., orders transitioning between statuses)

**Files to Review:**
- `supabase/functions/servers-provision/index.ts` - Capacity calculation (around line 258-265)

### 4. Password Reset Prevention
- Verify `create-pterodactyl-user` checks `external_accounts` first
- Check that existing accounts aren't password-reset
- Verify linking existing Pterodactyl users works without password reset
- Check that new users still get passwords created
- Verify `external_accounts` entries are created/updated correctly

**Files to Review:**
- `supabase/functions/create-pterodactyl-user/index.ts` - Account creation logic (lines 64-122)

### 5. Error Handling
- Verify errors in `useAuth.tsx` are properly logged
- Check that users get appropriate feedback
- Verify panel account creation failures don't block signup
- Check that error messages are actionable

**Files to Review:**
- `src/hooks/useAuth.tsx` - Error handling (lines 62-90)

### 6. End-to-End Flow Verification
- Verify complete purchase flow: signup → panel account → checkout → payment → webhook → order → provisioning
- Check that all functions can communicate correctly
- Verify data flows correctly through the system
- Check that all edge cases are handled

**Flow to Verify:**
1. User signs up → `create-pterodactyl-user` called
2. User purchases → `create-checkout-session` creates Stripe session
3. Payment succeeds → `stripe-webhook` receives event
4. Webhook creates order → triggers `servers-provision`
5. Provisioning checks capacity → allocates node → creates server
6. User sees server in dashboard

### 7. Database Schema & Data
- Verify `ptero_nodes` table has correct schema
- Check that `external_accounts` relationships are correct
- Verify `orders` table supports all required statuses
- Check that indexes are in place for performance
- Verify RLS policies are correctly configured

### 8. Configuration & Environment
- Verify all required secrets are documented
- Check that environment variable names are consistent
- Verify fallback values are appropriate
- Check that configuration is production-ready

### 9. Code Quality & Best Practices
- Check for any remaining placeholder values
- Verify error messages are clear and actionable
- Check for proper logging throughout
- Verify no hardcoded secrets
- Check for proper type safety

### 10. Remaining Issues
- Identify any issues from the previous audit that weren't addressed
- Check for new issues introduced by the fixes
- Verify all fixes are complete and correct
- Identify any non-critical improvements needed

**Success Criteria:**
- All security fixes are properly implemented
- All functionality fixes work correctly
- No new security vulnerabilities introduced
- End-to-end flow works correctly
- Error handling is comprehensive
- Code quality is production-ready

**Deliverables:**
Please provide:
1. Verification report for each fixed issue (✅ Fixed / ⚠️ Needs Attention / ❌ Issue)
2. Any remaining critical issues
3. Any new issues introduced by fixes
4. Recommendations for improvements
5. Updated production readiness score (1-10) with justification
6. Specific code locations for any issues found

**Context:**
- All fixes have been deployed to production
- Database has been updated with node data
- All backend prerequisites are verified
- System is ready for testing

Please verify that all fixes are correct and identify any remaining blockers for production launch.

---

## Usage Instructions

1. Copy the entire prompt above (everything between the --- markers)
2. Paste it into Codex
3. Codex will audit the fixes and provide a verification report

## What This Audit Will Check

- ✅ Verify all security fixes are correct
- ✅ Verify all functionality fixes work
- ✅ Check for any new issues
- ✅ Verify end-to-end flow
- ✅ Validate production readiness improvements
- ✅ Identify any remaining blockers

## Expected Results

- Verification of each fix
- Any remaining issues
- Updated production readiness score
- Specific recommendations


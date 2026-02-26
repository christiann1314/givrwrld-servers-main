# Environment Audit - Frontend, Backend & External Apps

**Date:** 2025-11-09  
**Scope:** Complete environment configuration audit across all systems

---

## 1. Frontend Environment Variables

### Current Configuration Files

**Files Found:**
- `src/config/environment.ts` - Main config with fallbacks
- `src/config/env.ts` - Hardcoded values (⚠️ SECURITY RISK)
- `src/integrations/supabase/client.ts` - Auto-generated client
- `src/hooks/useServerStats.ts` - Hardcoded API key (⚠️ SECURITY RISK)

### Issues Found

#### ❌ **CRITICAL: Hardcoded Secrets in Frontend**

**File: `src/config/env.ts`**
```typescript
export const ENV = {
  SUPABASE_URL: 'https://mjhvkvnshnbnxojnandf.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGci...', // HARDCODED - Should use env var
  // ...
}
```
**Risk:** Anon key is public-safe, but should still use env vars for consistency.

**File: `src/hooks/useServerStats.ts` (Line 42)**
```typescript
"apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // HARDCODED
```
**Risk:** ANON key hardcoded - should use env var or config.

#### ✅ **Good: Environment Config with Fallbacks**

**File: `src/config/environment.ts`**
- Uses `import.meta.env.VITE_*` pattern (correct for Vite)
- Has fallback values (good for development)
- But check if production uses correct values

### Required Frontend Environment Variables

| Variable | Current Status | Required Value |
|----------|---------------|----------------|
| `VITE_SUPABASE_URL` | ✅ Has fallback | `https://mjhvkvnshnbnxojnandf.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ⚠️ Hardcoded in env.ts | Should use env var |
| `VITE_SUPABASE_FUNCTIONS_URL` | ✅ Has fallback | `https://mjhvkvnshnbnxojnandf.functions.supabase.co` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ⚠️ Test key in fallback | Should be LIVE key: `pk_live_...` |
| `VITE_PANEL_URL` | ✅ Has fallback | `https://panel.givrwrldservers.com` |
| `VITE_APP_URL` | ✅ Has fallback | `https://givrwrldservers.com` |

### Frontend Recommendations

1. **Remove hardcoded keys** from `src/config/env.ts` and `useServerStats.ts`
2. **Use environment variables** for all sensitive values
3. **Verify Stripe key** is LIVE mode (not test) in production
4. **Check build process** uses correct env vars for production

---

## 2. Backend (Supabase Edge Functions) Secrets

### Required Secrets Checklist

#### ✅ **Core Supabase Secrets** (CRITICAL)

| Secret | Status | Used By | Notes |
|--------|--------|---------|-------|
| `SUPABASE_URL` | ✅ Required | All functions | `https://mjhvkvnshnbnxojnandf.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ Required | Most functions | Public-safe, but required |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Required | Server-side ops | **CRITICAL** - Privileged access |

#### ✅ **Stripe Integration Secrets** (CRITICAL)

| Secret | Status | Used By | Notes |
|--------|--------|---------|-------|
| `STRIPE_SECRET_KEY` | ✅ Required | `stripe-webhook`, `create-checkout-session` | Must be LIVE: `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | ✅ Required | `stripe-webhook` | Must match Stripe Dashboard: `whsec_...` |

#### ⚠️ **Pterodactyl Secrets** (DUPLICATE NAMING - Confusing)

**Issue:** Functions use different variable names for the same credentials:

| Secret Name (Function) | Alternative Name | Status | Used By |
|------------------------|------------------|--------|---------|
| `PANEL_URL` | `PTERODACTYL_URL` | ✅ Required | `servers-provision`, `server-stats`, `panel-sync-user` |
| `PTERO_APP_KEY` | `PTERODACTYL_API_KEY` | ✅ Required | Same functions |
| `PTERO_CLIENT_KEY` | - | ⚠️ Used by `server-stats` | May be different from APP key |

**Functions Using Different Names:**
- `servers-provision`: Uses `PANEL_URL`, `PTERO_APP_KEY`
- `create-pterodactyl-user`: Uses `PTERODACTYL_URL`, `PTERODACTYL_API_KEY`
- `sync-server-status`: Uses `PTERODACTYL_URL`, `PTERODACTYL_API_KEY`
- `server-stats`: Uses `PANEL_URL`, `PTERO_CLIENT_KEY`

**Recommendation:** Set both names to the same values for compatibility:
- `PANEL_URL` = `PTERODACTYL_URL` = `https://panel.givrwrldservers.com`
- `PTERO_APP_KEY` = `PTERODACTYL_API_KEY` = `ptla_...`

#### ⚠️ **Optional Secrets**

| Secret | Status | Used By | Notes |
|--------|--------|---------|-------|
| `ALLOW_ORIGINS` | Optional | CORS handling | Comma-separated origins, has defaults |
| `ALERTS_WEBHOOK` | Optional | `stripe-webhook` | Discord/Slack webhook URL |

### Backend Secret Verification

**To verify all secrets are set in Supabase:**

```bash
# Via CLI (if you have access token)
npx supabase secrets list --project-ref mjhvkvnshnbnxojnandf

# Via Dashboard
# Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/settings/functions
# Click "Secrets" tab
```

---

## 3. Stripe Configuration

### Current Status

**Webhook Endpoint:**
- URL: `https://mjhvkvnshnbnxojnandf.functions.supabase.co/stripe-webhook`
- Status: ✅ Active (LIVE mode)
- Signing Secret: `whsec_dD4wcqqH4sWOJyZrRsYz52w0sHe4rBSt`

**API Keys:**
- **Secret Key:** Should be LIVE: `sk_live_51RZPGzB3VffY65l6...`
- **Publishable Key:** Should be LIVE: `pk_live_...` (verify in frontend)

### Stripe Verification Checklist

- [ ] **Secret Key:** Verify `STRIPE_SECRET_KEY` in Supabase is LIVE (`sk_live_...`)
- [ ] **Publishable Key:** Verify frontend uses LIVE key (`pk_live_...`)
- [ ] **Webhook Secret:** Matches Stripe Dashboard exactly
- [ ] **Webhook Status:** Active in Stripe Dashboard (LIVE mode)
- [ ] **All Prices:** 36 game plans have live price IDs ✅ (already verified)

### Stripe Issues Found

- ⚠️ **Frontend fallback** has test key: `pk_test_51Qj8jR0s2bgEMxG9gjsg_pgaezEI4`
  - **Action:** Verify production build uses LIVE key via env var

---

## 4. Pterodactyl Configuration

### Current Configuration

**Panel URL:** `https://panel.givrwrldservers.com`

**API Keys:**
- **Application API Key:** `ptla_nCMil1ujYSSZ3ooMPiOI9r459kfGztE0Hfdlw8FrFQC`
- **Client API Key:** May be different (used by `server-stats`)

### Pterodactyl Verification Checklist

- [ ] **Panel URL:** Accessible at `https://panel.givrwrldservers.com`
- [ ] **API Key Valid:** `ptla_...` key works in functions
- [ ] **Client Key:** If `server-stats` uses `PTERO_CLIENT_KEY`, verify it's set
- [ ] **Node Allocations:** Nodes have available allocations
- [ ] **Egg IDs:** All 11 games have correct egg IDs ✅ (already verified)

### Pterodactyl Issues Found

- ⚠️ **Duplicate naming:** Functions use `PANEL_URL` vs `PTERODACTYL_URL`
  - **Action:** Set both secrets to same value
- ⚠️ **Client Key:** `server-stats` uses `PTERO_CLIENT_KEY` which may differ from `PTERO_APP_KEY`
  - **Action:** Verify if this is intentional or should be the same

---

## 5. Environment Variable Summary

### Frontend (Vite - Build Time)

**Required for Production:**
```bash
VITE_SUPABASE_URL=https://mjhvkvnshnbnxojnandf.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
VITE_SUPABASE_FUNCTIONS_URL=https://mjhvkvnshnbnxojnandf.functions.supabase.co
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...  # MUST be LIVE key
VITE_PANEL_URL=https://panel.givrwrldservers.com
VITE_APP_URL=https://givrwrldservers.com
```

### Backend (Supabase Edge Functions)

**Required Secrets:**
```bash
SUPABASE_URL=https://mjhvkvnshnbnxojnandf.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
STRIPE_SECRET_KEY=sk_live_...  # MUST be LIVE key
STRIPE_WEBHOOK_SECRET=whsec_...
PANEL_URL=https://panel.givrwrldservers.com
PTERODACTYL_URL=https://panel.givrwrldservers.com  # Same as PANEL_URL
PTERO_APP_KEY=ptla_...
PTERODACTYL_API_KEY=ptla_...  # Same as PTERO_APP_KEY
```

**Optional:**
```bash
ALLOW_ORIGINS=https://givrwrldservers.com,https://www.givrwrldservers.com
ALERTS_WEBHOOK=https://discord.com/api/webhooks/...
PTERO_CLIENT_KEY=ptlc_...  # If different from APP key
```

---

## 6. Critical Issues Found

### 🔴 **HIGH PRIORITY**

1. **Hardcoded API Keys in Frontend**
   - `src/config/env.ts` - Hardcoded anon key
   - `src/hooks/useServerStats.ts` - Hardcoded anon key
   - **Fix:** Use environment variables or config file

2. **Stripe Key Verification**
   - Frontend fallback has test key
   - **Fix:** Verify production build uses LIVE key

3. **Pterodactyl Secret Naming Confusion**
   - Functions use different names (`PANEL_URL` vs `PTERODACTYL_URL`)
   - **Fix:** Document both names are required, set to same values

### ⚠️ **MEDIUM PRIORITY**

4. **Client Key vs App Key**
   - `server-stats` uses `PTERO_CLIENT_KEY` (may be different)
   - **Fix:** Verify if this is intentional or should match `PTERO_APP_KEY`

5. **Environment Variable Documentation**
   - No centralized `.env.example` file
   - **Fix:** Create `.env.example` for frontend

---

## 7. Verification Steps

### Step 1: Verify Supabase Secrets

```bash
# Check secrets are set (requires access token)
npx supabase secrets list --project-ref mjhvkvnshnbnxojnandf
```

Or via Dashboard:
- Go to: https://supabase.com/dashboard/project/mjhvkvnshnbnxojnandf/settings/functions
- Check "Secrets" tab

### Step 2: Verify Stripe Configuration

1. Go to: https://dashboard.stripe.com/webhooks (LIVE mode)
2. Verify webhook endpoint is active
3. Check signing secret matches `STRIPE_WEBHOOK_SECRET` in Supabase
4. Verify API keys are LIVE mode (not test)

### Step 3: Verify Pterodactyl Configuration

1. Test API key: `curl -H "Authorization: Bearer ptla_..." https://panel.givrwrldservers.com/api/application/users`
2. Verify panel URL is accessible
3. Check nodes have allocations

### Step 4: Verify Frontend Build

1. Check production build uses env vars (not hardcoded values)
2. Verify Stripe publishable key is LIVE
3. Test Supabase connection works

---

## 8. Recommendations

### Immediate Actions

1. ✅ **Remove hardcoded keys** from frontend code
2. ✅ **Verify Stripe keys** are LIVE in production
3. ✅ **Set duplicate Pterodactyl secrets** (both `PANEL_URL` and `PTERODACTYL_URL`)
4. ✅ **Create `.env.example`** for frontend
5. ✅ **Document secret naming** confusion

### Long-term Improvements

1. **Consolidate Pterodactyl naming** - Use one set of names consistently
2. **Environment variable validation** - Check all required vars at startup
3. **Secret rotation plan** - Document how to rotate keys
4. **Monitoring** - Alert on missing/invalid secrets

---

## 9. Production Readiness Score

**Environment Configuration:** 7/10

**Breakdown:**
- ✅ Core Supabase secrets: Configured
- ✅ Stripe secrets: Configured (verify LIVE mode)
- ⚠️ Pterodactyl secrets: Configured but confusing naming
- ❌ Frontend hardcoded keys: Need fixing
- ✅ External apps: Configured

**Blockers:**
- None critical, but hardcoded keys should be fixed

**Ready for Production?**
- ✅ Yes, but fix hardcoded keys before launch

---

## 10. Quick Reference Commands

### List Supabase Secrets
```bash
npx supabase secrets list --project-ref mjhvkvnshnbnxojnandf
```

### Set a Secret
```bash
npx supabase secrets set SECRET_NAME="value" --project-ref mjhvkvnshnbnxojnandf
```

### Verify Stripe Webhook
```bash
# Check webhook events in Stripe Dashboard
# Or use Stripe CLI: stripe listen --forward-to https://...
```

### Test Pterodactyl API
```bash
curl -H "Authorization: Bearer ptla_..." \
  https://panel.givrwrldservers.com/api/application/users
```

---

**Last Updated:** 2025-11-09  
**Next Review:** After fixing hardcoded keys


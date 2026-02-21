# ✅ Backend Prerequisites Summary & Action Plan

## Current Status

### ✅ Working
1. **Supabase Secrets (Core)**
   - ✅ `SUPABASE_URL` - SET
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` - SET  
   - ✅ `SUPABASE_ANON_KEY` - SET

2. **Pterodactyl Secrets (Provisioning)**
   - ✅ `PANEL_URL` - SET (used by servers-provision)
   - ✅ `PTERO_APP_KEY` - SET (used by servers-provision)

3. **Onboarding Flow**
   - ✅ `useAuth.tsx` calls `create-pterodactyl-user` during signup (line 65)
   - ⚠️ Silently fails if error occurs (line 79-82)
   - ✅ Users can manually create via `PanelAccess` component

### ❌ Missing
1. **Pterodactyl Secrets (Other Functions)**
   - ❌ `PTERODACTYL_URL` - NOT SET (needed by 12+ functions)
   - ❌ `PTERODACTYL_API_KEY` - NOT SET (needed by 12+ functions)

### ⚠️ Needs Verification
1. **Egg IDs**
   - ⚠️ Rust: eggId 2 (needs verification)
   - ⚠️ Palworld: eggId 3 (needs verification)
   - ✅ All others verified

2. **Database Tables**
   - ❓ `ptero_nodes` - Need to check if populated
   - ❓ `external_accounts` - Need to check if users have entries

## Immediate Actions Required

### 1. Add Missing Secrets (CRITICAL)
**Why:** 12+ functions will fail without these.

```bash
export SUPABASE_ACCESS_TOKEN='sbp_34115bcba57a38fe3af736fbc9b37e704f6aa2fb'
export PROJECT_REF='mjhvkvnshnbnxojnandf'

# Get your actual panel URL and API key, then:
npx supabase secrets set PTERODACTYL_URL="https://your-panel-url.com" --project-ref $PROJECT_REF
npx supabase secrets set PTERODACTYL_API_KEY="ptla_..." --project-ref $PROJECT_REF
```

**Note:** These should be the SAME values as `PANEL_URL` and `PTERO_APP_KEY`, just different names for compatibility.

### 2. Verify Database Tables
Run the queries in `check-database-tables.sql` in Supabase SQL Editor.

**Required:**
- `ptero_nodes` must have at least one enabled node per region
- `external_accounts` should have entries for all users who want to purchase

### 3. Verify Egg IDs
Check your Pterodactyl panel:
- Nests → Rust → What's the actual egg ID?
- Nests → Palworld → What's the actual egg ID?

Update `servers-provision/index.ts` if they're different from 2 and 3.

### 4. Test User Panel Account Creation
**Current behavior:**
- Signup calls `create-pterodactyl-user` but fails silently
- Users can manually create via UI

**Recommendation:**
- Check if users have `external_accounts` entries before allowing checkout
- Show error if missing: "Please set up your game panel account first"

## Files to Check

1. **Database Queries:** `check-database-tables.sql`
2. **Provisioning Config:** `supabase/functions/servers-provision/index.ts` (lines 27-46)
3. **Onboarding:** `src/hooks/useAuth.tsx` (line 65)
4. **Manual Setup:** `src/components/PanelAccess.tsx`

## Testing Checklist

After fixing:
1. ✅ Can users sign up?
2. ✅ Do they get panel accounts created automatically?
3. ✅ Can they purchase servers?
4. ✅ Do servers provision successfully?
5. ✅ Are nodes available in all regions?


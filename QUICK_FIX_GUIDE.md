# 🚀 Quick Fix Guide - Backend Prerequisites

## Critical Issues Found

### 1. Missing Secrets (Blocks 12+ Functions)
**Problem:** `PTERODACTYL_URL` and `PTERODACTYL_API_KEY` are not set, but many functions need them.

**Fix:**
1. Get your Pterodactyl panel URL and API key (Application API key from panel)
2. Run these commands:

```bash
export SUPABASE_ACCESS_TOKEN='sbp_34115bcba57a38fe3af736fbc9b37e704f6aa2fb'
export PROJECT_REF='mjhvkvnshnbnxojnandf'

# Replace with your actual values:
npx supabase secrets set PTERODACTYL_URL="https://your-panel-url.com" --project-ref $PROJECT_REF
npx supabase secrets set PTERODACTYL_API_KEY="ptla_your_actual_key_here" --project-ref $PROJECT_REF
```

**How to get values:**
- Panel URL: Your Pterodactyl panel URL (same as PANEL_URL value)
- API Key: Pterodactyl Dashboard → API Credentials → Application API → Copy the key (starts with `ptla_`)

### 2. Verify Database Tables
Run these in Supabase SQL Editor:

```sql
-- Check nodes
SELECT region, COUNT(*) as nodes, SUM(CASE WHEN enabled THEN 1 ELSE 0 END) as enabled
FROM ptero_nodes GROUP BY region;

-- Check user accounts
SELECT COUNT(*) as total_users, 
       COUNT(DISTINCT ea.user_id) as users_with_panel_accounts
FROM auth.users u
LEFT JOIN external_accounts ea ON ea.user_id = u.id;
```

**Required:**
- At least one enabled node per region you sell
- Users should have external_accounts entries before checkout

### 3. Verify Egg IDs
Check your Pterodactyl panel:
- Go to Nests
- Find Rust nest → Note the egg ID
- Find Palworld nest → Note the egg ID

If different from 2 and 3, update `supabase/functions/servers-provision/index.ts` lines 28 and 46.

### 4. Test Full Flow
1. Sign up a new user
2. Check if `external_accounts` has an entry (query database)
3. Make a test purchase
4. Check if order is created
5. Check if server is provisioned

## Priority Order

1. **Add missing secrets** (5 minutes) - CRITICAL
2. **Check database tables** (5 minutes) - IMPORTANT  
3. **Verify egg IDs** (2 minutes) - QUICK CHECK
4. **Test flow** (10 minutes) - VERIFICATION

## Files Created

- `BACKEND_PREREQUISITES_AUDIT.md` - Full detailed audit
- `FIX_PREREQUISITES.md` - Step-by-step fix guide
- `PREREQUISITES_SUMMARY.md` - Summary of findings
- `check-database-tables.sql` - SQL queries to verify tables
- `QUICK_FIX_GUIDE.md` - This file (quick reference)


# Cleanup & Alignment Summary

## 🎯 Overview

Comprehensive audit completed for Stripe, Pterodactyl, and Supabase alignment.

## 📊 Findings

### Edge Functions
- **Total Functions:** 40+
- **Actually Used:** 20+
- **Unused (Remove):** 8 functions
- **Review Needed:** 2 functions (potential duplicates)

### Database
- **Modpack Support:** Removed ✅
- **Orphaned Orders:** Need cleanup
- **Invalid References:** Need cleanup
- **Unused Tables:** Modpacks (removed)

### Stripe
- **Price Alignment:** Needs verification
- **Placeholder Prices:** Need to be replaced
- **Missing Prices:** Need to be added

### Pterodactyl
- **Egg IDs:** Hardcoded (should be in DB)
- **Unused Env Vars:** 7 games have empty env
- **Node IDs:** Need verification
- **Duplicate Configs:** Some games identical

## 🚀 Quick Actions

### 1. Database Cleanup (5 minutes)
```sql
-- Run in Supabase SQL Editor
\i supabase/migrations/999_cleanup_remove_modpacks.sql
\i supabase/migrations/1000_comprehensive_cleanup.sql
```

### 2. Remove Unused Functions (10 minutes)
```bash
# Remove from config.toml
# Then delete directories:
rm -rf supabase/functions/get-user-stats
rm -rf supabase/functions/health-check
rm -rf supabase/functions/rate-limiter
rm -rf supabase/functions/support-system
rm -rf supabase/functions/gdpr-compliance
rm -rf supabase/functions/notification-system
rm -rf supabase/functions/backup-monitor
rm -rf supabase/functions/error-handler
```

### 3. Stripe Alignment (15 minutes)
1. Go to Stripe Dashboard → Products → Prices
2. Export all active price IDs
3. Run this query to compare:
```sql
SELECT id, display_name, stripe_price_id, is_active
FROM public.plans
ORDER BY game, ram_gb;
```
4. Update plans with correct price IDs
5. Mark inactive any plans not in Stripe

### 4. Pterodactyl Alignment (10 minutes)
1. Verify egg IDs in `servers-provision/index.ts` match your panel
2. Verify node IDs in `ptero_nodes` table
3. Remove empty environment variables from game configs

## 📁 Files Created

1. **COMPREHENSIVE_CLEANUP_AUDIT.md** - Full audit details
2. **FUNCTION_USAGE_AUDIT.md** - Function usage analysis
3. **ALIGNMENT_CHECKLIST.md** - Step-by-step checklist
4. **cleanup-alignment.sh** - Interactive cleanup script
5. **supabase/migrations/1000_comprehensive_cleanup.sql** - Database cleanup
6. **supabase/migrations/1001_remove_unused_functions.sql** - Function removal guide

## ✅ Next Steps

1. **Run cleanup migrations** (see Quick Actions #1)
2. **Remove unused functions** (see Quick Actions #2)
3. **Align Stripe prices** (see Quick Actions #3)
4. **Verify Pterodactyl config** (see Quick Actions #4)
5. **Test everything** (checkout, provisioning, etc.)

## 📝 Notes

- All changes are backward compatible
- No breaking changes to active functions
- Cleanup can be done incrementally
- Test after each cleanup step


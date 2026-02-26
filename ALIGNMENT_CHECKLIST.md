# Alignment Checklist: Stripe, Pterodactyl, Supabase

## ✅ Completed

- [x] Removed modpack support
- [x] Created cleanup migrations
- [x] Identified unused functions
- [x] Created alignment audit

## 📋 Action Items

### 1. Stripe Alignment

- [ ] Get all active Stripe price IDs from dashboard
- [ ] Compare with `plans.stripe_price_id` in database
- [ ] Update plans table with correct price IDs
- [ ] Mark inactive any plans not in Stripe
- [ ] Add any missing plans that exist in Stripe
- [ ] Remove duplicate price update SQL files

**Files to update:**
- `supabase/migrations/003_catalog.sql` (seed data)
- Database `plans` table directly

### 2. Pterodactyl Alignment

- [ ] Verify all egg IDs in `servers-provision/index.ts` match your panel
- [ ] Verify node IDs in `ptero_nodes` table match your panel
- [ ] Remove unused environment variables from game configs
- [ ] Consolidate duplicate game configurations
- [ ] Move egg IDs to database (optional improvement)
- [ ] Remove unused Pterodactyl attributes

**Files to update:**
- `supabase/functions/servers-provision/index.ts`
- Database `ptero_nodes` table
- Supabase secrets (verify API keys)

### 3. Supabase Cleanup

- [ ] Run `999_cleanup_remove_modpacks.sql` (if not done)
- [ ] Run `1000_comprehensive_cleanup.sql`
- [ ] Remove unused functions from `supabase/config.toml`
- [ ] Delete unused function directories
- [ ] Clean up orphaned orders
- [ ] Verify all foreign key constraints

**Functions to remove:**
- `get-user-stats`
- `health-check`
- `rate-limiter`
- `support-system`
- `gdpr-compliance`
- `notification-system`
- `backup-monitor`
- `error-handler`
- `migrate-pterodactyl-data` (after migration complete)

### 4. Code Cleanup

- [ ] Remove unused imports
- [ ] Remove commented code
- [ ] Remove debug console.logs (keep error logs)
- [ ] Consolidate duplicate SQL queries
- [ ] Remove unused type definitions
- [ ] Clean up duplicate utility functions

### 5. Verification

- [ ] Test checkout flow end-to-end
- [ ] Test server provisioning
- [ ] Verify all active functions work
- [ ] Check database integrity
- [ ] Verify Stripe webhook works
- [ ] Test Pterodactyl integration

## 🚀 Quick Start

1. **Run cleanup migrations:**
   ```sql
   -- In Supabase SQL Editor
   \i supabase/migrations/999_cleanup_remove_modpacks.sql
   \i supabase/migrations/1000_comprehensive_cleanup.sql
   ```

2. **Remove unused functions:**
   ```bash
   # Remove from config.toml first
   # Then delete directories
   rm -rf supabase/functions/get-user-stats
   rm -rf supabase/functions/health-check
   # ... etc
   ```

3. **Align Stripe:**
   - Export Stripe prices
   - Update database plans
   - Test checkout

4. **Align Pterodactyl:**
   - Verify egg IDs
   - Verify node IDs
   - Test provisioning


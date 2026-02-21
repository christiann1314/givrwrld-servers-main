# 🔍 Backend Prerequisites Audit

## Summary of Findings

### ✅ 1. Supabase Edge Function Secrets - PARTIAL
- ✅ `SUPABASE_URL` - SET
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - SET
- ✅ `SUPABASE_ANON_KEY` - SET

### ⚠️ 2. Pterodactyl Panel Credentials - INCOMPLETE
**Currently Set:**
- ✅ `PANEL_URL` - SET (used by servers-provision)
- ✅ `PTERO_APP_KEY` - SET (used by servers-provision)

**Missing (used by other functions):**
- ❌ `PTERODACTYL_URL` - NOT SET (used by 12+ functions)
- ❌ `PTERODACTYL_API_KEY` - NOT SET (used by 12+ functions)

**Functions that need PTERODACTYL_URL/PTERODACTYL_API_KEY:**
- `create-pterodactyl-user`
- `sync-server-status`
- `sync-pterodactyl-servers`
- `panel-link`
- `stop-server`
- `start-server`
- `pterodactyl-provision`
- `reset-pterodactyl-allocations`
- `reassign-servers`
- `manual-start-servers`
- `fix-pterodactyl-credentials`
- `get-server-console`

**Solution:** Add these secrets (they can point to the same values as PANEL_URL/PTERO_APP_KEY)

### ⚠️ 3. Egg IDs and Limits - NEEDS VERIFICATION
**Current Configurations:**
- ✅ `minecraft` - eggId: 39 (Paper)
- ⚠️ `rust` - eggId: 2 (Needs verification)
- ⚠️ `palworld` - eggId: 3 (Needs verification)
- ✅ `among-us` - eggId: 34
- ✅ `terraria` - eggId: 16
- ✅ `ark` - eggId: 14
- ✅ `factorio` - eggId: 21
- ✅ `mindustry` - eggId: 29
- ✅ `rimworld` - eggId: 26
- ✅ `vintage-story` - eggId: 32
- ✅ `teeworlds` - eggId: 33

**Action Required:** Verify Rust (2) and Palworld (3) egg IDs match your actual Pterodactyl panel.

### ❓ 4. Node Inventory in Supabase - NEEDS CHECKING
**Required:** `ptero_nodes` table must have:
- `pterodactyl_node_id` (integer)
- `region` (text, matches orders.region)
- `total_ram_gb` (integer)
- `reserved_ram_gb` (integer)
- `enabled` (boolean, must be true)

**Action Required:** Check if table has data and verify node configuration.

### ❓ 5. Customer → Panel Identity Link - NEEDS CHECKING
**Required:** `external_accounts` table must have:
- `user_id` (uuid, matches Supabase auth.users.id)
- `pterodactyl_user_id` (integer)
- `panel_username` (text)

**Functions that create this:**
- `create-pterodactyl-user` - Creates Pterodactyl user and stores in external_accounts
- `panel-sync-user` - Alternative sync function

**Action Required:** 
- Verify users have external_accounts entries before checkout
- Ensure onboarding flow calls `create-pterodactyl-user` or `panel-sync-user`

## Critical Actions Needed

1. **Add Missing Secrets:**
   ```bash
   # Set PTERODACTYL_URL and PTERODACTYL_API_KEY (same values as PANEL_URL/PTERO_APP_KEY)
   ```

2. **Verify Egg IDs:**
   - Check Rust egg ID (currently 2)
   - Check Palworld egg ID (currently 3)

3. **Check Database Tables:**
   - Query `ptero_nodes` - ensure nodes exist and are enabled
   - Query `external_accounts` - verify users have panel accounts

4. **Verify Onboarding Flow:**
   - Ensure `create-pterodactyl-user` is called during signup/onboarding
   - Check frontend calls this function before allowing purchases


# 🔧 Fix Backend Prerequisites

## Step 1: Add Missing Pterodactyl Secrets

**Problem:** Many functions use `PTERODACTYL_URL` and `PTERODACTYL_API_KEY`, but we only have `PANEL_URL` and `PTERO_APP_KEY` set.

**Solution:** Add aliases (they should be the same values):

```bash
# Get your actual panel URL and API key values
# Then run:
export SUPABASE_ACCESS_TOKEN='sbp_34115bcba57a38fe3af736fbc9b37e704f6aa2fb'
export PROJECT_REF='mjhvkvnshnbnxojnandf'

# Set PTERODACTYL_URL (replace YOUR_PANEL_URL with actual URL)
npx supabase secrets set PTERODACTYL_URL=YOUR_PANEL_URL --project-ref $PROJECT_REF

# Set PTERODACTYL_API_KEY (replace YOUR_API_KEY with actual key)
npx supabase secrets set PTERODACTYL_API_KEY=YOUR_API_KEY --project-ref $PROJECT_REF
```

**Note:** You need to get the actual plaintext values from your Supabase dashboard or from your Pterodactyl panel configuration.

## Step 2: Verify Egg IDs

**Current Status:**
- ✅ Minecraft: 39 (Paper)
- ⚠️ Rust: 2 (needs verification)
- ⚠️ Palworld: 3 (needs verification)
- ✅ Among Us: 34
- ✅ Terraria: 16
- ✅ ARK: 14
- ✅ Factorio: 21
- ✅ Mindustry: 29
- ✅ Rimworld: 26
- ✅ Vintage Story: 32
- ✅ Teeworlds: 33

**Action:** Check your Pterodactyl panel → Nests → verify Rust and Palworld egg IDs match.

## Step 3: Check Database Tables

Run the queries in `check-database-tables.sql` in Supabase SQL Editor:

1. **ptero_nodes** - Must have nodes with:
   - `pterodactyl_node_id` (your actual node ID)
   - `region` (matches orders.region like "east", "west")
   - `enabled = true`
   - `total_ram_gb` and `reserved_ram_gb` set correctly

2. **external_accounts** - Must have entries for users:
   - `user_id` (matches auth.users.id)
   - `pterodactyl_user_id` (Pterodactyl panel user ID)
   - `panel_username`

## Step 4: Verify Onboarding Flow

**Check:** Does your frontend call `create-pterodactyl-user` when users sign up?

**Files to check:**
- `src/hooks/usePterodactylCredentials.ts` - Has `setupPterodactylAccount` function
- `src/hooks/useAuth.tsx` - Should call this during onboarding

**Action:** Ensure users have external_accounts entries before they can purchase.


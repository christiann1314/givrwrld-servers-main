# Game Types Alignment Audit

**Date:** 2025-11-09  
**Purpose:** Verify alignment between codebase games, database plans, and Stripe price IDs

---

## 🎮 Games Found in Codebase

### Backend (servers-provision/index.ts)

Games configured with Pterodactyl egg IDs:

| Game | Egg ID | Status | Notes |
|------|--------|--------|-------|
| **minecraft** | 39 | ✅ | Paper egg |
| **rust** | 50 | ✅ | Verified |
| **palworld** | 15 | ✅ | Verified |
| **among-us** | 34 | ✅ | Impostor Server |
| **terraria** | 16 | ✅ | Vanilla |
| **ark** | 14 | ✅ | Survival Evolved |
| **factorio** | 21 | ✅ | |
| **mindustry** | 29 | ✅ | |
| **rimworld** | 26 | ✅ | |
| **vintage-story** | 32 | ✅ | |
| **teeworlds** | 33 | ✅ | |

**Total: 11 games** configured in backend provisioning

---

### Frontend (Config Pages)

Frontend configuration pages found:

| Game | Config Page | Status |
|------|------------|--------|
| **Minecraft** | `MinecraftConfig.tsx` | ✅ |
| **Rust** | `RustConfig.tsx` | ✅ |
| **Palworld** | `PalworldConfig.tsx` | ✅ |
| **Among Us** | `AmongUsConfig.tsx` | ✅ |
| **Terraria** | `TerrariaConfig.tsx` | ✅ |
| **Ark** | `ArkConfig.tsx` | ✅ |
| **Factorio** | `FactorioConfig.tsx` | ✅ |
| **Mindustry** | `MindustryConfig.tsx` | ✅ |
| **Rimworld** | `RimworldConfig.tsx` | ✅ |
| **Vintage Story** | `VintageStoryConfig.tsx` | ✅ |
| **Teeworlds** | `TeeworldsConfig.tsx` | ✅ |
| **Veloren** | `VelorenConfig.tsx` | ⚠️ | Not in backend |

**Total: 12 frontend pages** (11 match backend + 1 extra)

---

### Frontend Game Configs (gameConfigs.ts)

Games in `src/config/gameConfigs.ts`:

| Game | Egg ID | Status | Notes |
|------|--------|--------|-------|
| **minecraft** | 1 | ⚠️ | **MISMATCH** - Backend uses 39 |
| **rust** | 2 | ⚠️ | **MISMATCH** - Backend uses 50 |
| **palworld** | 3 | ⚠️ | **MISMATCH** - Backend uses 15 |

**⚠️ CRITICAL:** Frontend `gameConfigs.ts` has incorrect egg IDs!  
**Action Required:** Update frontend configs to match backend, or remove if unused.

---

## 🗄️ Database Plans Table

### Schema (from migration)

```sql
CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" text NOT NULL,
    "item_type" text NOT NULL,
    "game" text,
    "ram_gb" integer NOT NULL,
    "vcores" integer NOT NULL,
    "ssd_gb" integer NOT NULL,
    "stripe_price_id" text NOT NULL,
    "display_name" text,
    "is_active" boolean DEFAULT true,
    ...
);
```

### Expected Games (from documentation)

Based on `AUDIT_RESPONSE_FIXES.md` and `STRIPE_PRICES_UPDATE_SUMMARY.md`:

| Game | Plans Expected | Status |
|------|----------------|--------|
| **Minecraft** | 5 plans (1GB, 2GB, 4GB, 8GB, 16GB) | ✅ |
| **Rust** | 4 plans (3GB, 6GB, 8GB, 12GB) | ✅ |
| **Palworld** | 3 plans (4GB, 8GB, 16GB) | ⚠️ | Needs Stripe prices |
| **ARK** | 3 plans (4GB, 8GB, 16GB) | ✅ |
| **Terraria** | 3 plans (1GB, 2GB, 4GB) | ✅ |
| **Factorio** | 3 plans (2GB, 4GB, 8GB) | ✅ |
| **Mindustry** | 3 plans (2GB, 4GB, 8GB) | ✅ |
| **Rimworld** | 3 plans (2GB, 4GB, 8GB) | ✅ |
| **Vintage Story** | 3 plans (2GB, 4GB, 8GB) | ✅ |
| **Teeworlds** | 3 plans (1GB, 2GB, 4GB) | ✅ |
| **Among Us** | 3 plans (1GB, 2GB, 4GB) | ✅ |

**Total Expected: 37 plans** across 11 games

---

## 💳 Stripe Price IDs

### Known Live Price IDs (from SQL archives)

#### Minecraft Plans
- `mc-1gb` → `price_1SPmR6B3VffY65l6oa9Vc1T4`
- `mc-2gb` → `price_1SPmR6B3VffY65l6Ya3UxaOt`
- `mc-4gb` → `price_1SPmR7B3VffY65l61o7vcnLj`
- `mc-8gb` → `price_1SPmR7B3VffY65l68V9C5v6W`
- `mc-16gb` → `price_1SPmR8B3VffY65l6eqd679dM` (if exists)

#### Rust Plans
- `rust-3gb` → `price_1SPmUhB3VffY65l6HJUM5I6P`
- `rust-6gb` → `price_1SPmUiB3VffY65l6Yax8JGJT`
- `rust-8gb` → `price_1SPmUiB3VffY65l6zkKjQcsP`
- `rust-12gb` → `price_1SPmUjB3VffY65l6lRm0CDLF`

#### ARK Plans
- `ark-4gb` → `price_1SPmWnB3VffY65l61pDqOIFb`
- `ark-8gb` → `price_1SPmWnB3VffY65l67sv6bQRF`
- `ark-16gb` → `price_1SPmWoB3VffY65l6IuunmP51`

#### Terraria Plans
- `terraria-1gb` → `price_1SPmWoB3VffY65l6h8gabJi1`
- `terraria-2gb` → `price_1SPmWpB3VffY65l6MEZw3ob6`
- `terraria-4gb` → `price_1SPmWpB3VffY65l6LVSBoOrj`

#### Factorio Plans
- `factorio-2gb` → `price_1SPmbFB3VffY65l6UJpNHuoD`
- `factorio-4gb` → `price_1SPmbFB3VffY65l6WnwX5pkK`
- `factorio-8gb` → `price_1SPmbGB3VffY65l6hH7aNUc1`

#### Palworld Plans
- ⚠️ **MISSING** - Need to create in Stripe Dashboard
- `palworld-4gb` → `price_palworld_4gb_monthly` (placeholder)
- `palworld-8gb` → `price_palworld_8gb_monthly` (placeholder)
- `palworld-16gb` → `price_palworld_16gb_monthly` (placeholder)

---

## 🔍 Alignment Issues Found

### 1. Frontend Game Configs Mismatch ⚠️

**Issue:** `src/config/gameConfigs.ts` has incorrect egg IDs

| Game | Frontend Egg ID | Backend Egg ID | Status |
|------|----------------|----------------|--------|
| minecraft | 1 | 39 | ❌ MISMATCH |
| rust | 2 | 50 | ❌ MISMATCH |
| palworld | 3 | 15 | ❌ MISMATCH |

**Impact:** If frontend configs are used, servers will be created with wrong egg IDs.

**Fix:** 
- Update frontend configs to match backend
- OR verify frontend configs are not used in provisioning

### 2. Veloren in Frontend Only ⚠️

**Issue:** `VelorenConfig.tsx` exists but no backend support

**Impact:** Users can configure Veloren but provisioning will fail.

**Fix:**
- Add Veloren to backend provisioning
- OR remove Veloren frontend page

### 3. Palworld Stripe Prices Missing ⚠️

**Issue:** Palworld plans have placeholder Stripe price IDs

**Impact:** Palworld purchases will fail with "No such price" error.

**Fix:**
1. Create Palworld products in Stripe Dashboard
2. Create prices for 4GB, 8GB, 16GB
3. Update database with real price IDs

### 4. Database Schema Status ⚠️

**Issue:** All migrations archived, schema needs verification

**Impact:** Cannot verify current database state.

**Fix:**
1. Query database to see current plans
2. Compare with expected games
3. Verify all Stripe price IDs are live

---

## ✅ Verification Queries

### Check Database Plans

```sql
-- List all games in database
SELECT 
  game,
  COUNT(*) as plan_count,
  MIN(ram_gb) as min_ram,
  MAX(ram_gb) as max_ram,
  COUNT(CASE WHEN stripe_price_id LIKE 'price_1%' THEN 1 END) as live_prices,
  COUNT(CASE WHEN stripe_price_id LIKE 'price_%' AND stripe_price_id NOT LIKE 'price_1%' THEN 1 END) as placeholder_prices
FROM public.plans
WHERE item_type = 'game' AND is_active = true
GROUP BY game
ORDER BY game;
```

### Check Stripe Price IDs

```sql
-- Find plans with invalid/missing Stripe price IDs
SELECT 
  id,
  game,
  ram_gb,
  stripe_price_id,
  display_name,
  CASE 
    WHEN stripe_price_id LIKE 'price_1%' THEN '✅ Live'
    WHEN stripe_price_id LIKE 'price_%' THEN '⚠️ Placeholder'
    WHEN stripe_price_id IS NULL OR stripe_price_id = '' THEN '❌ Missing'
    ELSE '❌ Invalid'
  END as status
FROM public.plans
WHERE item_type = 'game'
ORDER BY game, ram_gb;
```

### Check Game Coverage

```sql
-- Compare backend games vs database games
-- Backend games: minecraft, rust, palworld, among-us, terraria, ark, factorio, mindustry, rimworld, vintage-story, teeworlds
-- Check which are in database
SELECT 
  game,
  COUNT(*) as plans,
  STRING_AGG(id, ', ') as plan_ids
FROM public.plans
WHERE item_type = 'game' AND is_active = true
GROUP BY game
ORDER BY game;
```

---

## 📋 Action Items

### Critical (Before Production)

1. **Verify Database Plans**
   - Run verification queries above
   - Ensure all 11 games have plans
   - Ensure all plans have live Stripe price IDs

2. **Fix Frontend Game Configs**
   - Update egg IDs in `src/config/gameConfigs.ts` to match backend
   - OR verify they're not used in provisioning

3. **Create Palworld Stripe Prices**
   - Create products in Stripe Dashboard
   - Create prices for 4GB, 8GB, 16GB
   - Update database with real price IDs

4. **Handle Veloren**
   - Either add backend support
   - OR remove frontend page

### High Priority

5. **Verify All Stripe Price IDs**
   - Compare database `stripe_price_id` with Stripe Dashboard
   - Update any mismatches
   - Remove any placeholder prices

6. **Test Each Game**
   - Test purchase flow for each game
   - Verify provisioning works
   - Verify correct egg ID is used

---

## 📊 Summary

| Component | Games | Status |
|-----------|-------|--------|
| **Backend Provisioning** | 11 | ✅ Complete |
| **Frontend Pages** | 12 | ⚠️ 1 extra (Veloren) |
| **Frontend Configs** | 3 | ⚠️ Wrong egg IDs |
| **Database Plans** | ? | ⚠️ Needs verification |
| **Stripe Prices** | 10/11 | ⚠️ Palworld missing |

**Overall Alignment:** ⚠️ **Needs Verification**

**Next Steps:**
1. Query database to verify current state
2. Fix frontend config mismatches
3. Create Palworld Stripe prices
4. Test end-to-end for each game

---

**Generated:** 2025-11-09  
**Next Review:** After database verification




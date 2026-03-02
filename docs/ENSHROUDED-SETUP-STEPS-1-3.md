# Enshrouded — Complete Steps 1–3

Steps 1–3 are set up in code; finish them by adding the egg in the Panel, then running the scripts below.

---

## What’s already done

- **Base plans:** `enshrouded-4gb`, `enshrouded-6gb`, `enshrouded-8gb` are in `plans` (via `sql/scripts/seed-12-games-plans.sql`). Already applied if you ran `npm run db:seed:plans`.
- **Sync:** `api/scripts/sync-pterodactyl-catalog.js` maps game `enshrouded` to any Panel egg whose name matches “Enshrouded”.
- **Variant eggs script:** `api/scripts/create-game-variant-eggs.js` includes Enshrouded; it will create **Enshrouded Vanilla** and **Enshrouded Modded** by cloning from **Enshrouded**.
- **Variant plans seed:** `api/scripts/seed-game-variant-plans.js` will create Enshrouded Vanilla and Modded plans and pricing once the eggs exist in the app catalog.

---

## Step 1 (Panel): Add the Enshrouded egg

1. In **Pterodactyl Panel** → **Admin** → **Nests** → create a nest (e.g. **Enshrouded**) or use an existing nest.
2. **Import the egg:**
   - Download: https://raw.githubusercontent.com/pelican-eggs/eggs/master/game_eggs/steamcmd_servers/enshrouded/egg-enshrouded.json  
   - In the nest → **Import Egg** → paste the JSON (or upload the file).  
   - Ensure the egg name is **Enshrouded** (Pelican uses this by default).
3. **Create allocations** for the node(s) that will run Enshrouded: game port **15636** and query port **15637** (or a range that includes both).
4. **Create variant eggs** (clones of Enshrouded so the app catalog has all three names):
   ```bash
   node api/scripts/create-game-variant-eggs.js
   ```
   This creates **Enshrouded Vanilla** and **Enshrouded Modded** in the same nest (by cloning the Enshrouded egg). Requires Panel DB via Docker (`PANEL_DB_CONTAINER` / `pterodactyl-mariadb-1`).

---

## Step 2: Sync and seed

From repo root:

```bash
npm run db:seed:catalog
```

Then:

```bash
node api/scripts/seed-game-variant-plans.js
```

- **Sync** updates `ptero_nests` and `ptero_eggs` from the Panel and sets `ptero_egg_id` on `plans` for `game = 'enshrouded'` to the Enshrouded egg ID.
- **Variant seed** creates plans like `enshrouded-vanilla-4gb`, `enshrouded-vanilla-6gb`, `enshrouded-modded-6gb`, etc., with pricing.

---

## Step 3: Optional — set `enshrouded.eggId` in frontend config

Provisioning uses the **plan’s** `ptero_egg_id` from the database, so this is optional. If you use `src/config/gameConfigs.ts` for Enshrouded defaults elsewhere:

1. After sync, get the Enshrouded egg ID from the app DB:
   ```sql
   SELECT ptero_egg_id, name FROM app_core.ptero_eggs WHERE name = 'Enshrouded';
   ```
2. In `src/config/gameConfigs.ts`, set `enshrouded.eggId` to that value (replace the `0`).

---

## Quick checklist

| Step | Action |
|------|--------|
| 1a | Create Enshrouded nest (or use existing). |
| 1b | Import Pelican egg-enshrouded.json; egg name = **Enshrouded**. |
| 1c | Add allocations 15636 and 15637 on the node. |
| 1d | Run `node api/scripts/create-game-variant-eggs.js`. |
| 2a | Run `npm run db:seed:catalog`. |
| 2b | Run `node api/scripts/seed-game-variant-plans.js`. |
| 3  | (Optional) Set `enshrouded.eggId` in `gameConfigs.ts` from `ptero_eggs`. |

After step 2, the Deploy and Configure Enshrouded flows will use the new plans and eggs.

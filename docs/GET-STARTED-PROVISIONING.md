# Get Started: Auto-Provisioning Audit

Follow these steps to start the per-game provisioning audit. Order: **Rust → Ark → Among Us → Factorio → Mindustry → Rimworld → Palworld → Teeworlds → Terraria → Veloren → Vintage Story**.

---

## Step 1: One-time setup (if you haven’t already)

1. **MySQL/MariaDB** running with database `app_core` (e.g. Docker or local).
2. **api/.env** has `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE=app_core`.
3. **Pterodactyl Panel** running (e.g. `http://localhost:8000`); **Wings** and **nodes** with free allocations.
4. **Region → node:** `ptero_nodes` and `region_node_map` populated for the regions your frontend uses (e.g. `us`, `eu`).

**Sync Panel eggs into app DB (so `ptero_eggs` is populated):**

```bash
cd api
node scripts/sync-pterodactyl-catalog.js --apply
```

(Requires Docker with the panel DB container; see script for `PANEL_DB_CONTAINER` and panel DB credentials.)

**Verify Step 1:**

```bash
cd api
node scripts/verify-step1-setup.js
```

This checks: `ptero_nests`, `ptero_eggs`, `ptero_nodes`, `region_node_map`, and that frontend regions (us-central, us-east, us-west) are mapped. Fix any gaps it reports.

---

## Step 2: Check first game — Rust

From repo root:

```bash
cd api
node scripts/check-game-provisioning.js rust
```

This prints:

- How many **plans** exist for Rust and how many have `ptero_egg_id` set.
- Which **ptero_eggs** rows exist for those egg IDs.
- If something is missing: run the sync script, or set `ptero_egg_id` on plans in MySQL.

**If you have no Rust plans:** seed them, then set egg IDs:

```bash
node scripts/seed-game-variant-plans.js
```

Then in MySQL, set each plan’s `ptero_egg_id` to the correct Pterodactyl egg ID (from Panel → Nests → your Rust egg).

---

## Step 3: Panel check for Rust

1. Open **http://localhost:8000** (or your panel URL).
2. Go to **Nests** → find the nest that has your **Rust** egg(s).
3. Open the egg → **Variables**. Confirm required variables (e.g. `SERVER_PORT`, `RCON_PASS`, `FRAMEWORK`, `LEVEL`) exist and have defaults or are supplied by the API (see `api/routes/servers.js` Rust block).

---

## Step 4: Smoke test for Rust

1. In the frontend, go to the **Rust** config page and start a **test purchase** (use a test plan and PayPal sandbox if needed).
2. Complete checkout; on the success page, **finalize** the order (or wait for the webhook).
3. Check that the order goes to status **provisioned** and has a server in the Panel.
4. In the Panel, start the server if needed and confirm it runs.

If it fails, check the order’s `error_message` in the DB or API logs and fix using **[EGG-AUDIT-PER-GAME.md](./EGG-AUDIT-PER-GAME.md)** “Where Errors Typically Lie”.

---

## Step 5: Mark Rust done and repeat

In **[PROVISIONING-STATE.md](./PROVISIONING-STATE.md)** set Rust’s “Plans + egg in DB”, “Panel egg”, and “Smoke test” to ✅ or Pass.

Then run the same flow for the next game:

```bash
node scripts/check-game-provisioning.js ark
```

Repeat: **Ark → Among Us → Factorio → Mindustry → Rimworld → Palworld → Teeworlds → Terraria → Veloren → Vintage Story**.

---

## Quick reference

| Command | Purpose |
|--------|---------|
| `node api/scripts/check-game-provisioning.js <game>` | Check plans + ptero_eggs for one game (e.g. `rust`, `ark`, `among-us`). |
| `node api/scripts/check-all-games-provisioning.js`   | Run the check for all 11 games in audit order; exits 1 if any have gaps. |
| `node api/scripts/sync-pterodactyl-catalog.js --apply` | Pull eggs from Panel into `ptero_eggs` (run from `api/`). |
| `node api/scripts/seed-game-variant-plans.js` | Seed/update game variant plans (Rust, Ark, Terraria, etc.). |

Game slugs: `rust`, `ark`, `among-us`, `factorio`, `mindustry`, `rimworld`, `palworld`, `teeworlds`, `terraria`, `veloren`, `vintage-story`.

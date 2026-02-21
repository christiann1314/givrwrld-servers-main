# Per-Game Egg Audit: Auto-Provisioning

**Goal:** Ensure every game egg auto-provisions so each purchase results in a running server (great UX at launch).  
**Baseline:** Minecraft variants are confirmed working. This audit covers all other games, one by one.

---

## Where Errors Typically Lie

| # | Failure point | Error / symptom | Fix |
|---|----------------|-----------------|-----|
| 1 | **Plan missing `ptero_egg_id`** | Order stays "provisioning" or goes "error" with "Plan does not have ptero_egg_id configured" | Set `ptero_egg_id` on the plan in MySQL `plans` table to the correct Pterodactyl egg ID. |
| 2 | **Egg not in app DB** | "Egg not found: {id}" | Ensure `ptero_eggs` (MySQL `app_core`) has a row for that egg: `ptero_egg_id`, `ptero_nest_id`, `docker_image`, `startup_cmd`. Run `api/scripts/sync-pterodactyl-catalog.js --apply` to pull from panel. |
| 3 | **Panel egg/nest mismatch** | Env vars empty or wrong; server create fails with validation errors | In Pterodactyl Panel, confirm the egg exists under the expected nest and has variables. Match `ptero_nest_id` in `ptero_eggs` to the panel nest. |
| 4 | **Allocations exhausted** | "No allocation candidates available" or allocation validation errors | Add more allocations on the node (Panel → Nodes → your node → Allocations), or set `PTERO_DEFAULT_ALLOCATION_ID` / `PTERO_ALLOCATION_IDS` in `api/.env`. |
| 5 | **Game-specific env vars** | Server created but won’t start (wrong DOWNLOAD_URL, FRAMEWORK, etc.) | See "Game-specific checks" below. Backend fills many defaults; ensure any required egg variables are either in the panel egg or in `inferRequiredEnvValue` / game blocks in `api/routes/servers.js`. |
| 6 | **Node/region** | "No node found for region: {region}" | Ensure `region_node_map` (or your node lookup) has the order’s region and the node is in Panel and has allocations. |
| 7 | **User not in app DB** | "User not found" | Provisioning reads from MySQL `users`; ensure auth creates/updates `users` so the order’s `user_id` exists. |

---

## Games to Audit (One by One)

Use this order. For each game, complete the checklist before moving on.

| Game | Config page | Notes |
|------|-------------|--------|
| **Minecraft** | `MinecraftConfig.tsx` | ✅ Baseline – variants confirmed working. |
| **Palworld** | `PalworldConfig.tsx` | High demand; often different egg vars. |
| **Rust** | `RustConfig.tsx` | FRAMEWORK (oxide/carbon/vanilla), LEVEL, ports. |
| **Ark** | `ArkConfig.tsx` | SERVER_MAP, ARK_ADMIN_PASSWORD, BATTLE_EYE. |
| **Terraria** | `TerrariaConfig.tsx` | |
| **Factorio** | `FactorioConfig.tsx` | |
| **Valheim** | (if offered) | Check plans + egg mapping. |
| **Among Us** | `AmongUsConfig.tsx` | DOWNLOAD_URL in backend. |
| **Palworld** | (duplicate check) | |
| **Mindustry** | `MindustryConfig.tsx` | DOWNLOAD_URL (server-release.jar). |
| **Rimworld** | `RimworldConfig.tsx` | DOWNLOAD_URL (rimworld server package). |
| **Vintage Story** | `VintageStoryConfig.tsx` | DOWNLOAD_URL. |
| **Veloren** | `VelorenConfig.tsx` | DOWNLOAD_URL. |
| **Teeworlds** | `TeeworldsConfig.tsx` | |

---

## Per-Game Checklist (Run for Each Game)

Do these steps **one game at a time**. Only mark "Pass" when a real purchase → provision → server running end-to-end works.

### 1. Plan ↔ Egg mapping (MySQL)

- [ ] At least one **active** plan for this game exists in `plans` (`game = ?`, `is_active = 1`).
- [ ] That plan has `ptero_egg_id` set to a non-null, valid Pterodactyl egg ID.
- [ ] Optional: Run `npm run ptero:sync` (or `sync-pterodactyl-catalog.js --apply`) so `ptero_eggs` is up to date from the panel.

```sql
-- Example: list plans and egg for a game
SELECT id, game, ram_gb, ptero_egg_id, is_active FROM plans WHERE game = 'palworld' AND is_active = 1;
```

### 2. App DB: `ptero_eggs` row

- [ ] Row exists in `ptero_eggs` where `ptero_egg_id` = plan’s `ptero_egg_id`.
- [ ] `ptero_nest_id` matches the nest that contains this egg in the Panel.
- [ ] `docker_image` and `startup_cmd` look correct (match Panel or known-good template).

```sql
SELECT * FROM ptero_eggs WHERE ptero_egg_id = <egg_id>;
```

### 3. Panel: egg and variables

- [ ] In Panel (localhost:8000): **Nests** → correct nest → egg exists and name matches intent.
- [ ] Egg has **Variables**; required ones have sensible defaults or are supplied by the backend (see `servers.js` game blocks and `inferRequiredEnvValue`).

### 4. Game-specific checks (backend)

In `api/routes/servers.js`:

- [ ] **Rust:** `FRAMEWORK`, `LEVEL`, `RCON_PASS`, ports – already have defaults; confirm egg variables align.
- [ ] **Ark:** `BATTLE_EYE`, `SERVER_MAP`, `ARK_ADMIN_PASSWORD` – already handled; confirm panel egg vars.
- [ ] **Among Us / Mindustry / Vintage Story / Veloren / Rimworld:** `DOWNLOAD_URL` is inferred in `inferRequiredEnvValue`; confirm URLs are valid and egg expects them if required.

If a game needs a new env default, add it in `inferRequiredEnvValue` or in a game-specific block (e.g. rust/ark).

### 5. Smoke test: purchase → provisioned → running

- [ ] Create a **test order** for this game (use a test plan and PayPal sandbox or your normal flow).
- [ ] Trigger provisioning (webhook or `POST /api/paypal/finalize-order` or `POST /api/servers/provision` with `order_id`).
- [ ] Order reaches status **provisioned** and has `ptero_server_id` / `ptero_identifier`.
- [ ] In Panel, server exists and is **running** (or starts successfully once).
- [ ] Optional: connect to the game (e.g. join IP:port) to confirm it’s reachable.

If any step fails, note the **exact error** (order `error_message`, API logs, or Panel error) and fix the matching row in "Where Errors Typically Lie" before moving on.

---

## Suggested Order of Execution

1. **Minecraft** – Already passing; use as reference.
2. **Palworld** – High visibility; many "offline" in your dashboard.
3. **Rust** – Similar volume; FRAMEWORK/ports already in code.
4. **Valheim** – If in your catalog; confirm plan + egg.
5. **Terraria, Factorio** – Often simpler eggs.
6. **Among Us, Mindustry, Vintage Story, Veloren, Rimworld** – Rely on DOWNLOAD_URL and optional game logic.
7. **Teeworlds** – Quick check.
8. **Ark** – More variables; do after the above.

---

## Quick Reference: Provisioning Flow

1. Order is **paid** (PayPal webhook or finalize-order).
2. `provisionServer(orderId)` runs (from webhook or manual `POST /api/servers/provision`).
3. Order + plan loaded: `plan.game`, `plan.ptero_egg_id`, resources.
4. **Check:** `ptero_egg_id` set → **Check:** `ptero_eggs` row → **Check:** node for region → **Check:** user in `users`.
5. Pterodactyl user created/linked.
6. Egg details (and variables) from Panel API: `nests/{nest_id}/eggs/{egg_id}?include=variables`.
7. Env built: panel defaults + static defaults + game-specific (rust/ark) + required vars inferred.
8. Allocation chosen (env or API); server created via Panel API; order updated to **provisioned**.

Any failure in steps 3–8 will set the order to **error** and store the message in `error_message`; use that and API logs to map back to the table above.

---

## After the Audit

- Keep this doc updated: add a game if you add a new egg, and note any new failure mode and fix.
- Before launch: re-run the smoke test (purchase → provisioned → running) for each game you sell.
- Consider a small "stuck order" job that retries `provisionServer` for orders in `provisioning` or `error` with a recent timestamp, so transient issues (e.g. daemon 504) don’t leave users stuck.

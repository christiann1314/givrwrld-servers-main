# Auto-Provisioning State by Game

**Purpose:** Track what’s done per game so you can run DB/Panel checks and smoke tests in order.  
**Backend:** All listed games have code support in `api/routes/servers.js` (env defaults and/or game blocks).  
**Unknown until you run:** Whether each game has a plan with `ptero_egg_id`, a `ptero_eggs` row, and a matching egg in the Panel.

---

## Current state (update as you verify)

| # | Game        | Backend code      | Plans + egg in DB      | Panel egg        | Smoke test (purchase → provisioned → running) |
|---|------------|-------------------|------------------------|------------------|-----------------------------------------------|
| — | **Minecraft** | ✅ (variants)   | ✅ (confirmed)     | ✅               | ✅ **Pass**                                    |
| 1 | **Rust**      | ✅ | ✅ (10 plans, eggs 29–31) | ✅               | ✅ **Pass**                                    |
| 2 | **Ark**       | ✅ | ✅ (7 plans, eggs 32–34)  | ✅               | ✅ **Pass**                                    |
| 3 | **Among Us**  | ✅ | ✅ (3 plans, eggs 53–54) | ✅               | ✅ **Pass**                                    |
| 4 | **Factorio**  | ✅ | ✅ (7 plans, eggs 38–40) | ✅               | ✅ **Pass**                                    |
| 5 | **Mindustry** | ✅ | ✅ (7 plans, eggs 44–46) | ✅               | ✅ **Pass**                                    |
| 6 | **Rimworld**  | ✅ | ✅ (3 plans, eggs 47–48) | ✅               | ✅ **Pass**                                    |
| 7 | **Palworld**  | ✅ | ✅ (7 plans, eggs 41–43) | ✅               | ✅ **Pass**                                    |
| 8 | **Teeworlds** | ✅ | ✅ (4 plans, eggs 51–52) | ✅               | ✅ **Pass**                                    |
| 9 | **Terraria**  | ✅ | ✅ (4 plans, eggs 35–37) | ✅               | ✅ **Pass**                                    |
| 10 | **Veloren**   | ✅ | ✅ (3 plans, eggs 55–56) | ✅               | ✅ **Pass**                                    |
| 11 | **Vintage Story** | ✅ | ✅ (3 plans, eggs 49–50) | ✅               | ✅ **Pass**                                    |

**Legend:** ✅ = done / confirmed · ❓ = needs verification (you run SQL + Panel + test).

---

## Audit order (work through in this order)

1. **Rust**
2. **Ark**
3. **Among Us**
4. **Factorio**
5. **Mindustry**
6. **Rimworld**
7. **Palworld** (already passing; re-verify if needed)
8. **Teeworlds**
9. **Terraria**
10. **Veloren**
11. **Vintage Story**

For each game, do the steps in **[EGG-AUDIT-PER-GAME.md](./EGG-AUDIT-PER-GAME.md)** (plan ↔ egg, `ptero_eggs` row, Panel egg/vars, then smoke test).

---

## One-time / periodic setup (if not done yet)

- **Sync Panel → app DB:**  
  `node api/scripts/sync-pterodactyl-catalog.js --apply`  
  (Requires Docker with panel DB; see script for `PANEL_DB_CONTAINER` and panel DB credentials.)

- **Region → node:**  
  Ensure `ptero_nodes` and `region_node_map` are populated for every `region` the frontend sends (e.g. `us`, `eu`). Otherwise provisioning fails with “No node found for region”.

- **Allocations:**  
  Panel node must have free allocations, or set `PTERO_DEFAULT_ALLOCATION_ID` / `PTERO_ALLOCATION_IDS` in `api/.env`.

---

## Quick SQL (run in MySQL `app_core`)

**List plans and egg for a game (e.g. Rust):**
```sql
SELECT id, game, ram_gb, ptero_egg_id, is_active, display_name
FROM plans
WHERE game = 'rust' AND is_active = 1;
```

**Check `ptero_eggs` for an egg id (use `ptero_egg_id` from above):**
```sql
SELECT ptero_egg_id, ptero_nest_id, name, docker_image, startup_cmd
FROM ptero_eggs
WHERE ptero_egg_id = <egg_id>;
```

**List all games that have at least one plan with an egg:**
```sql
SELECT game, COUNT(*) AS plans, SUM(CASE WHEN ptero_egg_id IS NOT NULL AND ptero_egg_id != 0 THEN 1 ELSE 0 END) AS with_egg
FROM plans
WHERE is_active = 1
GROUP BY game
ORDER BY game;
```

---

## After you run a smoke test

Update the table above: set “Plans + egg in DB” and “Panel egg” to ✅ if they’re correct, and set “Smoke test” to **Pass** or **Fail**. If Fail, note the error in the order’s `error_message` or API logs and fix using **[EGG-AUDIT-PER-GAME.md](./EGG-AUDIT-PER-GAME.md)** “Where Errors Typically Lie”.

---

## Logs (Wings / API)

- **Wings:** `pterodactyl/wings.log` or `wings-debug.log`. If you see `bind source path does not exist: /var/lib/pterodactyl/volumes/<uuid>`, that’s a Wings/Docker volume path issue. Ensure Wings config `FST_*` paths match the node; restart Wings after fixing.
- **API:** Console from `node server.js` in `api/`; provisioning errors also in the order’s `error_message` in MySQL.

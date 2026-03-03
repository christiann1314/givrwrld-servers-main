# Debugging a Failed Provisioning Order

When an order shows **Payment successful** but **Status: Failed** (e.g. Enshrouded Modded 8GB), the failure happens in the provisioner **after** payment. This doc tells you where to look and how to fix common causes.

## 1. Get the stored error and plan/egg state

On the **same machine/DB where the order lives** (e.g. production server with `api/.env` pointing at that DB):

```bash
node api/scripts/diagnose-order.js <order_id>
```

Example:

```bash
node api/scripts/diagnose-order.js fcc38ff57-0418-47e2-a2af-5de3b211e32f
```

The script prints:

- Order: `status`, `last_provision_error`, `plan_id`, `ptero_node_id`
- Plan: `game`, `ptero_egg_id`, `ram_gb`, `ssd_gb`
- Whether that `ptero_egg_id` exists in `ptero_eggs`

`last_provision_error` is the exact message set when provisioning failed (e.g. "Plan does not have ptero_egg_id configured", "Egg not found: 59", "No allocation candidates available...", or a Pterodactyl API error).

## 2. Check worker and API logs

- **PM2:** `pm2 logs givrwrld-provisioner` — look for `provision_worker_job_error` or `provision_worker_job_failed` with your `order_id`; the logged `err` or `message` will match or add detail to `last_provision_error`.
- **API file log:** `api/logs/app.log` (if configured) — search for the order ID or "Provisioning error".

## 3. Common causes for Enshrouded (and other variant plans)

| Stored error | Cause | Fix |
|--------------|--------|-----|
| `Plan does not have ptero_egg_id configured` | Plan in `plans` has `ptero_egg_id` NULL. | Sync catalog so base plans get egg IDs; then run variant seed so **Enshrouded Modded** plans get the variant egg ID: `npm run db:seed:catalog -- --apply`, then `GAME_FILTER=enshrouded node api/scripts/seed-game-variant-plans.js`. |
| `Egg not found: <id>` | That egg ID is not in `ptero_eggs` (e.g. variant egg created in Panel but sync not run, or wrong ID). | Run catalog sync so Panel eggs (including "Enshrouded Modded") are in `ptero_eggs`: `npm run db:seed:catalog -- --apply`. If the variant egg was created **after** the last sync, run sync again. |
| `No allocation candidates available for node X` | No free allocations on the node, or Panel API couldn’t list them and env has no fallback. | In Panel → Nodes → [node] → Allocations, add ports **15636** and **15637** (or a range). Optionally set `PTERO_DEFAULT_ALLOCATION_ID` or `PTERO_ALLOCATION_IDS` in `api/.env`. |
| `No node capacity available for region: ...` | No node with enough free RAM/disk for the plan in that region. | Add capacity or region→node mapping; check `ptero_node_capacity_ledger` and `ptero_nodes`. |
| `Failed to create server in Pterodactyl: ...` | Panel or Wings returned an error (e.g. allocation in use, validation error, or **required egg variables missing**). | Use the exact message in the log. If it says required variables (e.g. `WINDOWS_INSTALL`, `SRCDS_APPID`, `SRV_NAME`), the provisioner must set those in `api/routes/servers.js` (`inferRequiredEnvValue` and `steamAppIdsByGame`). Fix allocation/node/egg in Panel or env as needed. |

## 4. Enshrouded-specific checklist

- **Nest + egg in Panel:** "Enshrouded" egg exists (and "Enshrouded Vanilla", "Enshrouded Modded" if using variants).
- **Sync:** After creating/variant eggs, run `npm run db:seed:catalog -- --apply` so `ptero_eggs` has those eggs.
- **Variant plans:** Run `GAME_FILTER=enshrouded node api/scripts/seed-game-variant-plans.js` so plans like `enshrouded-modded-8gb` have the correct `ptero_egg_id` (Enshrouded Modded egg).
- **Allocations:** Ports 15636 and 15637 (or range) added on the node used for Enshrouded.

## 5. Retry after fixing

If the order is still in `failed` (or `error`), the **reconcile job** may re-queue it after backoff, or you can re-queue manually:

- **API:** `POST /api/servers/provision` with body `{ "order_id": "<order_id>" }` (authenticated as admin or use an internal script).
- **Reconcile:** Reconcile runs periodically and re-enqueues eligible orders; ensure Redis and the provisioner worker are running.

After fixing plan/egg/allocations, re-run the diagnostic script to confirm `ptero_egg_id` and egg row; then trigger provision again.

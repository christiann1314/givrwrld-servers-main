# Pterodactyl eggs, “variants”, and the storefront

## How to install **modded / profile** eggs on the Panel

From the API package (`api/`), with `.env` pointing at `app_core` **and** Panel DB credentials (`PANEL_DB_PASSWORD`, `PANEL_DB_CONTAINER` if not default):

```bash
cd api
npm run catalog:variants:all
```

That runs, in order:

1. **`ptero:bootstrap-eggs`** — `bootstrap-pterodactyl-eggs.js` ensures base community eggs exist in the Panel DB (Minecraft stack, Rust, ARK, …).
2. **`ptero:upgrade-eggs`** — `upgrade-pterodactyl-eggs.js` patches startup/install where we ship overrides.
3. **`ptero:variants`** — `create-game-variant-eggs.js` **clones** each base egg into extra Panel eggs under nest **“GIVRwrld Games”** (e.g. `Rust Oxide (uMod)`, `ARK Primal Fear Ready`, `Terraria tModLoader`, …). These are separate SKUs for billing; most share the same install logic as the upstream egg until you customize them. **Stock “Vanilla” clone eggs are no longer created** by this script.
4. **`ptero:sync`** — `sync-pterodactyl-catalog.js` copies nest/egg rows from Panel into `app_core.ptero_*` and only auto-fills **legacy** Minecraft plans with a default egg when needed (see code; variant plans must already have `ptero_egg_id`).
5. **`plans:minecraft:variants`** — `seed-minecraft-variant-plans.js` creates `mc-paper-*`, `mc-fabric-*`, … (no `mc-vanilla-*`; existing rows are deactivated by the seed).
6. **`plans:games:variants`** — `seed-game-variant-plans.js` creates per-game modded/profile plan ids for each RAM tier we sell (typically **2 / 4 / 6 / 8 / 12 GB**, with **ARK** and **Enshrouded** starting at **6 GB**, **Palworld** at **4 GB** and up, **Among Us** at **4 GB** and up on **Impostor only**). Legacy vanilla plan ids are deactivated at the end of the seed.

**Rollback:** keep a Panel DB backup before mass egg imports; to undo plan rows, restore `app_core.plans` from backup or reactivate specific rows. Migration `20260423140000_deactivate_retail_vanilla_game_plans.sql` deactivates vanilla SKUs; rollback by restoring `plans.is_active` from backup if needed.

---

## Legacy “Vanilla” SKUs

We **no longer sell** Mojang **Minecraft Vanilla** (`mc-vanilla-*`) or per-game **`*-vanilla-*`** plans on the site. The catalog hook filters them client-side; **`eggCatalog.js`** may still list vanilla eggs so the provisioner can handle **existing** servers created before this change.

After deploy, run migrations (or re-run the seeds above) so `plans.is_active = 0` for those ids in production.

---

## Authoritative egg metadata in code

`api/config/eggCatalog.js` is the **reviewed** list of eggs the provisioner understands (startup, docker image, required variables). Panel egg IDs after a reset are reconciled with `EGG_ID_ALIASES` in that file where needed.

If you add a **new** Panel-only variant egg, add it to `create-game-variant-eggs.js`, re-run variants + sync + seed, and extend `eggCatalog.js` / migrations if the provisioner must validate it.

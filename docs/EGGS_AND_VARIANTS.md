# Pterodactyl eggs, “variants”, and the word “Vanilla”

## How to install **all** sellable eggs on the Panel

From the API package (`api/`), with `.env` pointing at `app_core` **and** Panel DB credentials (`PANEL_DB_PASSWORD`, `PANEL_DB_CONTAINER` if not default):

```bash
cd api
npm run catalog:variants:all
```

That runs, in order:

1. **`ptero:bootstrap-eggs`** — `bootstrap-pterodactyl-eggs.js` ensures base community eggs exist in the Panel DB (Minecraft stack, Rust, ARK, …).
2. **`ptero:upgrade-eggs`** — `upgrade-pterodactyl-eggs.js` patches startup/install where we ship overrides.
3. **`ptero:variants`** — `create-game-variant-eggs.js` **clones** each base egg into extra Panel eggs under nest **“GIVRwrld Games”** (e.g. `Rust Vanilla`, `ARK Primal Fear Ready`, …). These are separate SKUs for billing; most share the same install logic as the upstream egg until you customize them.
4. **`ptero:sync`** — `sync-pterodactyl-catalog.js` copies nest/egg rows from Panel into `app_core.ptero_*` and only auto-fills **legacy** Minecraft plans with a default egg when needed (see code; variant plans must already have `ptero_egg_id`).
5. **`plans:minecraft:variants`** — `seed-minecraft-variant-plans.js` creates `mc-paper-*`, `mc-fabric-*`, … rows.
6. **`plans:games:variants`** — `seed-game-variant-plans.js` creates `rust-vanilla-*`, `terraria-tmodloader-*`, … rows.

**Rollback:** keep a Panel DB backup before mass egg imports; to undo plan rows, restore `app_core.plans` from backup or deactivate bad rows (`is_active = 0`).

---

## Why the site said “Vanilla” for games that are not “Minecraft Vanilla”

- **Minecraft** — “Vanilla” means the real Mojang **vanilla Java** egg (official server jar). That is a true distinct egg in `eggCatalog.js` and on the Panel.
- **Terraria** — “Vanilla” vs **tModLoader** is a **real** product split (different stacks).
- **Almost every other title** — we used **“Vanilla” as a SKU label** meaning “standard / stock dedicated server profile”, implemented as a **duplicate Panel egg** (`Rust Vanilla`, `Palworld Vanilla`, …) so checkout can attach a stable `ptero_egg_id` per tier. That is **not** the same as “unmodded Minecraft”.

Plan **display names** from `seed-game-variant-plans.js` now use the label **“Standard”** for those rows (e.g. `Rust Standard 4GB`) while **plan ids** stay `rust-vanilla-4gb` so Stripe and existing orders stay stable. **Terraria** keeps the label **Vanilla** where it is meaningful.

After changing seed scripts, re-run `npm run plans:games:variants` (and Minecraft variant seed if you touch it) on production **only** when you intentionally want to refresh copy in `plans.display_name`.

---

## Authoritative egg metadata in code

`api/config/eggCatalog.js` is the **reviewed** list of eggs the provisioner understands (startup, docker image, required variables). Panel egg IDs after a reset are reconciled with `EGG_ID_ALIASES` in that file where needed.

If you add a **new** Panel-only variant egg, add it to `create-game-variant-eggs.js`, re-run variants + sync + seed, and extend `eggCatalog.js` / migrations if the provisioner must validate it.

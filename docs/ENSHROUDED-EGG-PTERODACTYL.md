# Enshrouded — Pterodactyl Egg

Add the Enshrouded dedicated server to your Pterodactyl Panel so GIVRwrld can provision Enshrouded game servers.

## Source

The egg is based on the [Pelican Eggs Enshrouded egg](https://github.com/pelican-eggs/eggs/tree/master/game_eggs/steamcmd_servers/enshrouded) (Steam App ID **2278520** — Enshrouded Dedicated Server). It uses SteamCMD + Proton to run the Windows dedicated server on Linux.

## Ports

| Port   | Default | Note        |
|--------|---------|------------|
| Game   | 15636   | Primary    |
| Query  | 15637   | Game + 1   |

Allocations in Panel must include both (e.g. 15636–15637 or two separate allocations).

## Import steps

**Full runbook:** After importing the egg and creating variant eggs, run sync and seed. See **[ENSHROUDED-SETUP-STEPS-1-3.md](./ENSHROUDED-SETUP-STEPS-1-3.md)** for the exact order (steps 1–3).

1. **Create a nest** (if needed) for Enshrouded, e.g. name **Enshrouded**, description optional.
2. **Import the egg**  
   - In Panel: **Admin** → **Nests** → select the Enshrouded nest → **Import Egg**.  
   - Use the JSON from [pelican-eggs](https://raw.githubusercontent.com/pelican-eggs/eggs/master/game_eggs/steamcmd_servers/enshrouded/egg-enshrouded.json) (download and paste, or upload file).  
   - Or create a new egg and copy name, docker image, startup, config, and variables from that repo.
3. **Name eggs for GIVRwrld catalog**  
   The app expects these egg **names** (case-sensitive) for plans and variants:
   - **Enshrouded** — source egg (base plans).
   - **Enshrouded Vanilla** — same egg duplicated or same egg; used for “Vanilla” variant.
   - **Enshrouded Modded** — duplicate of the same egg (or a second egg with mod-friendly defaults); used for “Modded” variant.
4. **Sync catalog**  
   Run `node api/scripts/sync-pterodactyl-catalog.js --apply` so `ptero_eggs` has the new eggs.
5. **Create base plans** (if your DB has no enshrouded plans yet)  
   Ensure at least one plan exists with `game = 'enshrouded'` and `ptero_egg_id` = the **Enshrouded** egg ID (e.g. via Panel plan sync or manual insert for 4GB / 6GB / 8GB tiers).
6. **Seed variant plans**  
   Run `node api/scripts/seed-game-variant-plans.js` to generate Enshrouded Vanilla and Modded plans and pricing.

## Variables (egg)

Key variables from the Pelican egg:

- **SRCDS_APPID** — `2278520` (Enshrouded Dedicated Server).
- **SRV_NAME** — Server name (in-game list).
- **SRV_PW** — Server password (optional).
- **MAX_PLAYERS** — 1–16.
- **QUERY_PORT** — Query port (game port + 1 typical).
- **WINDOWS_INSTALL** — `1` (required for this server).

## Notes

- Server may not always appear in the in-game list; players can add via Steam server browser (IP:queryPort).
- Min recommended: 4 GB RAM, 4 cores; 6 GB for 8–12 players, 8 GB for 16 + mods.
- `src/config/gameConfigs.ts` and `api` provisioning use `game: 'enshrouded'`; set `eggId` in `gameConfigs.ts` to your Panel’s Enshrouded egg ID if you use it for defaults.

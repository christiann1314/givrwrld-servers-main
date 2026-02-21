# Nest → Egg → Plan Architecture

## Overview

The GIVRwrld system uses a three-tier architecture:

1. **Nest** = Game (what user selects in frontend)
2. **Egg** = Game Type (what user selects after choosing game)
3. **Plan** = Egg + RAM Tier (what user selects for resources)

## Current Nests (Games)

### Custom Nests
- **Among Us** (ID 15) - 3 eggs
- **Ark Survival** (ID 5) - 1 egg
- **Factorio** (ID 9) - 3 eggs
- **Mindustry** (ID 10) - 1 egg
- **Minecraft** (ID 3) - 10 eggs
- **Palworld** (ID 6) - 1 egg
- **Rimworld** (ID 11) - 2 eggs
- **Rust** (ID 4) - 1 egg
- **Terraria** (ID 7) - 4 eggs
- **Teeworlds** (ID 14) - 1 egg
- **Veloren** (ID 12) - 1 egg
- **Vintage Story** (ID 13) - 1 egg

### Default Pterodactyl Nests
- **Minecraft** (ID 16) - 5 eggs (default Pterodactyl nest)
- **Source Engine** (ID 17) - 6 eggs (default Pterodactyl nest)
- **Voice Servers** (ID 18) - 2 eggs (default Pterodactyl nest)
- **Rust** (ID 19) - 1 egg (default Pterodactyl nest)

## Nest → Game Mapping

| Nest Name | Game Slug | Frontend Display |
|-----------|-----------|-----------------|
| Minecraft | `minecraft` | Minecraft |
| Rust | `rust` | Rust |
| Ark Survival | `ark` | Ark |
| Palworld | `palworld` | Palworld |
| Terraria / Terria | `terraria` | Terraria |
| Factorio | `factorio` | Factorio |
| Mindustry | `mindustry` | Mindustry |
| Rimworld | `rimworld` | Rimworld |
| Veloren | `veloren` | Veloren |
| Vintage Story | `vintage-story` | Vintage Story |
| Teeworlds | `teeworlds` | Teeworlds |
| Among Us | `among-us` | Among Us |
| Source Engine | `source-engine` | Source Engine |
| Voice Servers | `voice-servers` | Voice Servers |

## Plan Structure

### Plan ID Format
```
{egg-slug}-{ram}gb
```

### Examples
- `paper-4gb` - Paper (Minecraft) with 4GB RAM
- `fabric-8gb` - Fabric (Minecraft) with 8GB RAM
- `rust-generic-6gb` - Rust Generic with 6GB RAM
- `palworld-8gb` - Palworld with 8GB RAM

### Plan Fields
- `id` - Unique plan identifier (egg-slug-ramgb)
- `display_name` - Human-readable name (e.g., "Paper 4GB")
- `game` - Game slug (from nest mapping)
- `ptero_egg_id` - Links to Pterodactyl egg
- `ram_gb` - RAM allocation
- `vcores` - vCPU allocation
- `ssd_gb` - SSD storage
- `price_monthly` - Monthly price
- `stripe_price_id` - Stripe price ID for checkout

## RAM Tiers by Game

### Minecraft
- 1GB, 2GB, 4GB, 8GB

### Rust
- 3GB, 6GB, 8GB, 12GB

### Palworld
- 4GB, 8GB, 16GB

### Ark
- 4GB, 8GB, 16GB

### Terraria
- 1GB, 2GB, 4GB

### Factorio
- 2GB, 4GB, 8GB

### Mindustry
- 2GB, 4GB, 8GB

### Rimworld
- 2GB, 4GB, 8GB

### Vintage Story
- 2GB, 4GB, 8GB

### Teeworlds
- 1GB, 2GB, 4GB

### Among Us
- 1GB, 2GB, 4GB

### Default (Other Games)
- 2GB, 4GB, 8GB

## User Flow

1. **User selects Game (Nest)**
   - Frontend shows: "Minecraft", "Rust", "Palworld", etc.
   - Maps to: `ptero_nest_id`

2. **User selects Game Type (Egg)**
   - Frontend shows eggs for selected nest
   - Examples: "Paper", "Fabric", "Vanilla" (for Minecraft)
   - Maps to: `ptero_egg_id`

3. **User selects Plan (RAM Tier)**
   - Frontend shows: "1GB", "2GB", "4GB", "8GB", etc.
   - Maps to: Plan with matching `ptero_egg_id` and `ram_gb`

4. **Checkout**
   - Uses `plan.stripe_price_id` for Stripe checkout
   - Order created with `plan_id`

5. **Provisioning**
   - Uses `plan.ptero_egg_id` to create server in Pterodactyl
   - Server created with correct egg configuration

## Database Queries

### Get all eggs for a game (nest)
```sql
SELECT e.ptero_egg_id, e.name
FROM ptero_eggs e
JOIN ptero_nests n ON n.ptero_nest_id = e.ptero_nest_id
WHERE n.name = 'Minecraft'
ORDER BY e.name;
```

### Get all plans for an egg
```sql
SELECT id, display_name, ram_gb, price_monthly, stripe_price_id
FROM plans
WHERE ptero_egg_id = 39  -- Paper egg
AND is_active = 1
ORDER BY ram_gb;
```

### Get plans for a game
```sql
SELECT p.id, p.display_name, e.name as egg_name, p.ram_gb, p.price_monthly
FROM plans p
JOIN ptero_eggs e ON e.ptero_egg_id = p.ptero_egg_id
JOIN ptero_nests n ON n.ptero_nest_id = e.ptero_nest_id
WHERE n.name = 'Minecraft'
AND p.is_active = 1
ORDER BY e.name, p.ram_gb;
```

## Scripts

### Sync Pterodactyl Catalog
```bash
./scripts/sync-ptero-catalog.sh
```
Fetches all nests and eggs from Pterodactyl API and stores in MySQL.

### Create Plans for All Eggs
```bash
./scripts/create-plans-for-all-eggs.sh
```
Creates plans for all eggs with appropriate RAM tiers.

### Create Stripe Prices
```bash
./scripts/create-all-stripe-prices.sh
```
Creates Stripe products and prices for all plans.

### Verify Plans
```bash
./scripts/verify-plans-by-game.sh
```
Shows all plans grouped by game with Stripe price status.


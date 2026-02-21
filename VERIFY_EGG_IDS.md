# 🔍 How to Verify Egg IDs in Pterodactyl Panel

## Understanding Nests vs Eggs

- **Nest** = A category/collection (e.g., "Minecraft", "Rust")
- **Egg** = A specific server configuration within a nest (e.g., "Paper", "Vanilla")

Each nest can contain multiple eggs, and each egg has its own unique ID.

## How to Find Egg IDs

### Method 1: Via Panel UI
1. Go to: https://panel.givrwrldservers.com/admin/nests
2. Click on a nest (e.g., "Rust" nest ID 4 or 19)
3. You'll see a list of eggs in that nest
4. Click on each egg to see its details
5. The **Egg ID** is shown in the URL or in the egg details

### Method 2: Via API (Recommended)
Use the Pterodactyl API to list all eggs and their IDs:

```bash
curl -X GET "https://panel.givrwrldservers.com/api/application/nests" \
  -H "Authorization: Bearer ptla_nCMil1ujYSSZ3ooMPiOI9r459kfGztE0Hfdlw8FrFQC" \
  -H "Accept: application/json" | jq '.data[] | {nest_id: .attributes.id, name: .attributes.name, egg_count: .attributes.relationships.eggs.data | length}'
```

Then get eggs for a specific nest:

```bash
# For Rust nest (assume nest ID 4)
curl -X GET "https://panel.givrwrldservers.com/api/application/nests/4/eggs" \
  -H "Authorization: Bearer ptla_nCMil1ujYSSZ3ooMPiOI9r459kfGztE0Hfdlw8FrFQC" \
  -H "Accept: application/json" | jq '.data[] | {egg_id: .attributes.id, name: .attributes.name}'
```

## Current Configuration to Verify

Based on your nests, here's what to check:

### Rust
- **Nest ID:** 4 or 19 (you have two Rust nests)
- **Current egg ID in code:** 2
- **Action:** Check which nest's egg is ID 2, or if it's different

### Palworld
- **Nest ID:** 6
- **Current egg ID in code:** 3
- **Action:** Verify the single egg in nest 6 is actually ID 3

### Minecraft
- **Nest ID:** 3 (10 eggs) or 16 (5 eggs)
- **Current egg ID in code:** 39 (Paper)
- **Action:** Find which nest contains egg ID 39

### Other Games
- **Terraria** (nest 7, 4 eggs) - verify egg ID 16
- **ARK** (nest 5, 1 egg) - verify egg ID 14
- **Factorio** (nest 9, 3 eggs) - verify egg ID 21
- **Mindustry** (nest 10, 1 egg) - verify egg ID 29
- **Rimworld** (nest 11, 2 eggs) - verify egg ID 26
- **Vintage Story** (nest 13, 1 egg) - verify egg ID 32
- **Teeworlds** (nest 14, 1 egg) - verify egg ID 33
- **Among Us** (nest 15, 3 eggs) - verify egg ID 34

## Quick Verification Script

I'll create a script to verify all egg IDs at once.


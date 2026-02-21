#!/bin/bash
# Create Plans for All Eggs (Game Types)
# Architecture: Nest = Game, Egg = Game Type
# Each egg needs plans for different RAM tiers

set -e

DB_USER="app_rw"
DB_PASS=$(grep app_rw PASSWORDS.txt | cut -d: -f2 | tr -d ' ')
DB_NAME="app_core"

echo "🎮 Creating Plans for All Game Types (Eggs)"
echo "==========================================="
echo ""
echo "Architecture:"
echo "  • Nest = Game (Minecraft, Rust, Palworld, etc.)"
echo "  • Egg = Game Type (Paper, Fabric, Rust Generic, etc.)"
echo "  • Plan = Egg + RAM Tier (paper-4gb, fabric-8gb, etc.)"
echo ""

# Define RAM tiers and their specs
declare -A RAM_TIERS
RAM_TIERS["1"]="1|0.5|10|2.99"
RAM_TIERS["2"]="2|1|20|3.99"
RAM_TIERS["3"]="3|1|30|8.99"
RAM_TIERS["4"]="4|2|40|6.99"
RAM_TIERS["6"]="6|2|50|16.99"
RAM_TIERS["8"]="8|3|80|12.99"
RAM_TIERS["12"]="12|4|120|36.99"
RAM_TIERS["16"]="16|4|160|24.99"

# Game-specific pricing overrides (game|ram|price)
declare -a PRICE_OVERRIDES=(
    "rust|3|8.99"
    "rust|6|16.99"
    "rust|8|24.99"
    "rust|12|36.99"
    "palworld|4|11.99"
    "palworld|8|23.99"
    "palworld|16|47.99"
    "ark|4|9.99"
    "ark|8|14.99"
    "ark|16|24.99"
    "terraria|1|2.99"
    "terraria|2|4.99"
    "terraria|4|7.99"
    "factorio|2|4.99"
    "factorio|4|6.99"
    "factorio|8|12.99"
    "mindustry|2|3.99"
    "mindustry|4|5.99"
    "mindustry|8|9.99"
    "rimworld|2|5.99"
    "rimworld|4|7.99"
    "rimworld|8|12.99"
    "vintage-story|2|5.99"
    "vintage-story|4|7.99"
    "vintage-story|8|12.99"
    "teeworlds|1|2.49"
    "teeworlds|2|3.99"
    "teeworlds|4|6.99"
    "among-us|1|1.99"
    "among-us|2|2.99"
    "among-us|4|4.99"
)

# Function to get price override
get_price_override() {
    local game=$1
    local ram=$2
    for override in "${PRICE_OVERRIDES[@]}"; do
        IFS='|' read -r ogame oram oprice <<< "$override"
        if [ "$ogame" = "$game" ] && [ "$oram" = "$ram" ]; then
            echo "$oprice"
            return 0
        fi
    done
    echo ""
}

# Function to get RAM tiers for a game
get_ram_tiers_for_game() {
    local game=$1
    case "$game" in
        rust)
            echo "3 6 8 12"
            ;;
        palworld)
            echo "4 8 16"
            ;;
        ark)
            echo "4 8 16"
            ;;
        terraria)
            echo "1 2 4"
            ;;
        factorio)
            echo "2 4 8"
            ;;
        mindustry)
            echo "2 4 8"
            ;;
        rimworld)
            echo "2 4 8"
            ;;
        vintage-story|vintage_story)
            echo "2 4 8"
            ;;
        teeworlds)
            echo "1 2 4"
            ;;
        among-us|among_us)
            echo "1 2 4"
            ;;
        minecraft)
            echo "1 2 4 8"
            ;;
        veloren)
            echo "2 4 8"
            ;;
        *)
            # Default tiers for unknown games
            echo "2 4 8"
            ;;
    esac
}

echo "📋 Step 1: Fetching all eggs with their nests..."
echo ""

# Get all eggs with nest info
EGGS_DATA=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
SELECT 
    e.ptero_egg_id,
    e.name as egg_name,
    e.ptero_nest_id,
    n.name as nest_name,
    CASE 
        WHEN n.name = 'Minecraft' THEN 'minecraft'
        WHEN n.name = 'Rust' THEN 'rust'
        WHEN n.name = 'Ark Survival' THEN 'ark'
        WHEN n.name = 'Palworld' THEN 'palworld'
        WHEN n.name = 'Terraria' OR n.name = 'Terria' THEN 'terraria'
        WHEN n.name = 'Factorio' THEN 'factorio'
        WHEN n.name = 'Mindustry' THEN 'mindustry'
        WHEN n.name = 'Rimworld' THEN 'rimworld'
        WHEN n.name = 'Veloren' THEN 'veloren'
        WHEN n.name = 'Vintage Story' THEN 'vintage-story'
        WHEN n.name = 'Teeworlds' THEN 'teeworlds'
        WHEN n.name = 'Among Us' THEN 'among-us'
        WHEN n.name = 'Source Engine' THEN 'source-engine'
        WHEN n.name = 'Voice Servers' THEN 'voice-servers'
        ELSE LOWER(REPLACE(REPLACE(REPLACE(n.name, ' ', '-'), ':', ''), '.', ''))
    END as game_slug
FROM ptero_eggs e
JOIN ptero_nests n ON n.ptero_nest_id = e.ptero_nest_id
ORDER BY n.name, e.name;
" 2>&1 | grep -v "Warning")

if [ -z "$EGGS_DATA" ]; then
    echo "❌ No eggs found. Run sync-ptero-catalog.sh first."
    exit 1
fi

EGG_COUNT=$(echo "$EGGS_DATA" | wc -l)
echo "   ✅ Found $EGG_COUNT eggs"
echo ""

echo "📦 Step 2: Creating plans for each egg..."
echo ""

CREATED=0
UPDATED=0
SKIPPED=0

# Save to temp file to avoid subshell issues
TMPFILE=$(mktemp)
echo "$EGGS_DATA" > "$TMPFILE"

# Process each egg
while IFS=$'\t' read -r egg_id egg_name nest_id nest_name game_slug; do
    # Game slug is already set from SQL CASE statement, just ensure it's clean
    game_slug=$(echo "$game_slug" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
    
    # Clean up egg name for plan ID
    egg_slug=$(echo "$egg_name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g' | cut -c1-30)
    
    # Get RAM tiers for this game
    RAM_TIERS_LIST=$(get_ram_tiers_for_game "$game_slug")
    
    if [ -z "$RAM_TIERS_LIST" ]; then
        RAM_TIERS_LIST="2 4 8"  # Default
    fi
    
    echo "   🥚 $nest_name → $egg_name (ID: $egg_id)"
    
    # Create plan for each RAM tier
    for ram in $RAM_TIERS_LIST; do
        # Get tier specs
        TIER_DATA="${RAM_TIERS[$ram]}"
        if [ -z "$TIER_DATA" ]; then
            echo "      ⚠️  Skipping unknown RAM tier: ${ram}GB"
            continue
        fi
        
        IFS='|' read -r tier_ram tier_vcpu tier_ssd tier_price <<< "$TIER_DATA"
        
        # Check for price override
        PRICE_OVERRIDE=$(get_price_override "$game_slug" "$ram")
        if [ -n "$PRICE_OVERRIDE" ]; then
            tier_price="$PRICE_OVERRIDE"
        fi
        
        # Create plan ID: egg-slug-ramgb
        PLAN_ID="${egg_slug}-${ram}gb"
        
        # Escape for SQL
        PLAN_ID_ESC=$(echo "$PLAN_ID" | sed "s/'/''/g")
        EGG_NAME_ESC=$(echo "$egg_name" | sed "s/'/''/g")
        GAME_SLUG_ESC=$(echo "$game_slug" | sed "s/'/''/g")
        DISPLAY_NAME="${egg_name} ${ram}GB"
        DISPLAY_NAME_ESC=$(echo "$DISPLAY_NAME" | sed "s/'/''/g")
        
        # Check if plan exists
        PLAN_EXISTS=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
        SELECT COUNT(*) FROM plans WHERE id = '$PLAN_ID_ESC';
        " 2>/dev/null)
        
        if [ "$PLAN_EXISTS" -eq 0 ]; then
            # Create new plan
            mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
            INSERT INTO plans (
                id, display_name, game, item_type,
                ram_gb, vcores, ssd_gb,
                ptero_egg_id, is_active,
                price_monthly, price_quarterly, price_yearly
            ) VALUES (
                '$PLAN_ID_ESC',
                '$DISPLAY_NAME_ESC',
                '$GAME_SLUG_ESC',
                'game',
                $tier_ram, $tier_vcpu, $tier_ssd,
                $egg_id,
                1,
                $tier_price, $(echo "$tier_price * 3 * 0.95" | bc | cut -d. -f1).$(echo "$tier_price * 3 * 0.95" | bc | cut -d. -f2 | cut -c1-2), $(echo "$tier_price * 12 * 0.8" | bc | cut -d. -f1).$(echo "$tier_price * 12 * 0.8" | bc | cut -d. -f2 | cut -c1-2)
            );
            " 2>/dev/null
            
            if [ $? -eq 0 ]; then
                echo "      ✅ Created: $PLAN_ID (${ram}GB, \$${tier_price}/mo)"
                CREATED=$((CREATED + 1))
            else
                echo "      ❌ Failed: $PLAN_ID"
            fi
        else
            # Update existing plan to ensure egg_id is correct
            mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
            UPDATE plans 
            SET ptero_egg_id = $egg_id,
                game = '$GAME_SLUG_ESC',
                display_name = '$DISPLAY_NAME_ESC',
                ram_gb = $tier_ram,
                vcores = $tier_vcpu,
                ssd_gb = $tier_ssd,
                price_monthly = $tier_price
            WHERE id = '$PLAN_ID_ESC';
            " 2>/dev/null
            
            echo "      ↻ Updated: $PLAN_ID"
            UPDATED=$((UPDATED + 1))
        fi
    done
    echo ""
done

echo ""
echo "✅ Complete!"
echo "============"
echo "   Created: $CREATED plans"
echo "   Updated: $UPDATED plans"
echo ""

# Summary by game
echo "📊 Plans by Game:"
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
SELECT 
    game as 'Game',
    COUNT(*) as 'Plans',
    COUNT(CASE WHEN stripe_price_id IS NOT NULL AND stripe_price_id != '' THEN 1 END) as 'With Stripe'
FROM plans
WHERE is_active = 1
GROUP BY game
ORDER BY game;
" 2>&1 | grep -v "Warning"

echo ""
echo "💡 Next Step: Create Stripe prices for plans missing them"
echo "   Run: ./scripts/create-all-stripe-prices.sh"
echo ""


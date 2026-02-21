#!/bin/bash
# Simple plan creation script that actually works
set -e

DB_USER="app_rw"
DB_PASS=$(grep app_rw PASSWORDS.txt | cut -d: -f2 | tr -d ' ')
DB_NAME="app_core"

echo "🎮 Creating Plans for All Eggs (Simple Version)"
echo "================================================"
echo ""

# RAM tier definitions
declare -A RAM_SPECS
RAM_SPECS["1"]="1|0.5|10"
RAM_SPECS["2"]="2|1|20"
RAM_SPECS["3"]="3|1|30"
RAM_SPECS["4"]="4|2|40"
RAM_SPECS["6"]="6|2|50"
RAM_SPECS["8"]="8|3|80"
RAM_SPECS["12"]="12|4|120"
RAM_SPECS["16"]="16|4|160"

# Price overrides (game|ram|price)
declare -A PRICES
PRICES["rust|3"]="8.99"
PRICES["rust|6"]="16.99"
PRICES["rust|8"]="24.99"
PRICES["rust|12"]="36.99"
PRICES["palworld|4"]="11.99"
PRICES["palworld|8"]="23.99"
PRICES["palworld|16"]="47.99"
PRICES["ark|4"]="9.99"
PRICES["ark|8"]="14.99"
PRICES["ark|16"]="24.99"
PRICES["terraria|1"]="2.99"
PRICES["terraria|2"]="4.99"
PRICES["terraria|4"]="7.99"
PRICES["factorio|2"]="4.99"
PRICES["factorio|4"]="6.99"
PRICES["factorio|8"]="12.99"
PRICES["mindustry|2"]="3.99"
PRICES["mindustry|4"]="5.99"
PRICES["mindustry|8"]="9.99"
PRICES["rimworld|2"]="5.99"
PRICES["rimworld|4"]="7.99"
PRICES["rimworld|8"]="12.99"
PRICES["vintage-story|2"]="5.99"
PRICES["vintage-story|4"]="7.99"
PRICES["vintage-story|8"]="12.99"
PRICES["teeworlds|1"]="2.49"
PRICES["teeworlds|2"]="3.99"
PRICES["teeworlds|4"]="6.99"
PRICES["among-us|1"]="1.99"
PRICES["among-us|2"]="2.99"
PRICES["among-us|4"]="4.99"

# Get RAM tiers for game
get_ram_tiers() {
    case "$1" in
        rust) echo "3 6 8 12" ;;
        palworld) echo "4 8 16" ;;
        ark) echo "4 8 16" ;;
        terraria) echo "1 2 4" ;;
        factorio) echo "2 4 8" ;;
        mindustry) echo "2 4 8" ;;
        rimworld) echo "2 4 8" ;;
        vintage-story) echo "2 4 8" ;;
        teeworlds) echo "1 2 4" ;;
        among-us) echo "1 2 4" ;;
        minecraft) echo "1 2 4 8" ;;
        *) echo "2 4 8" ;;
    esac
}

# Get price for game+ram
get_price() {
    local key="$1|$2"
    if [ -n "${PRICES[$key]}" ]; then
        echo "${PRICES[$key]}"
    else
        # Default pricing
        case "$2" in
            1) echo "2.99" ;;
            2) echo "3.99" ;;
            3) echo "8.99" ;;
            4) echo "6.99" ;;
            6) echo "16.99" ;;
            8) echo "12.99" ;;
            12) echo "36.99" ;;
            16) echo "24.99" ;;
            *) echo "9.99" ;;
        esac
    fi
}

CREATED=0
UPDATED=0

# Process each egg
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -N -e "
SELECT 
    e.ptero_egg_id,
    e.name,
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
    END as game
FROM ptero_eggs e
JOIN ptero_nests n ON n.ptero_nest_id = e.ptero_nest_id
ORDER BY n.name, e.name;
" 2>/dev/null | while IFS=$'\t' read -r egg_id egg_name nest_name game; do
    
    # Clean egg name for plan ID
    egg_slug=$(echo "$egg_name" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g' | cut -c1-30)
    
    # Get RAM tiers
    rams=$(get_ram_tiers "$game")
    
    echo "   🥚 $nest_name → $egg_name"
    
    for ram in $rams; do
        # Get specs
        specs="${RAM_SPECS[$ram]}"
        IFS='|' read -r ram_gb vcpu ssd <<< "$specs"
        
        # Get price
        price=$(get_price "$game" "$ram")
        
        # Create plan ID
        plan_id="${egg_slug}-${ram}gb"
        
        # Escape for SQL
        plan_id_esc=$(echo "$plan_id" | sed "s/'/''/g")
        egg_name_esc=$(echo "$egg_name" | sed "s/'/''/g")
        game_esc=$(echo "$game" | sed "s/'/''/g")
        display_name="${egg_name} ${ram}GB"
        display_name_esc=$(echo "$display_name" | sed "s/'/''/g")
        
        # Check if exists
        exists=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "SELECT COUNT(*) FROM plans WHERE id='$plan_id_esc';" 2>/dev/null)
        
        if [ "$exists" -eq 0 ]; then
            # Create plan
            mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
            INSERT INTO plans (id, display_name, game, item_type, ram_gb, vcores, ssd_gb, ptero_egg_id, is_active, price_monthly)
            VALUES ('$plan_id_esc', '$display_name_esc', '$game_esc', 'game', $ram_gb, $vcpu, $ssd, $egg_id, 1, $price);
            " 2>/dev/null
            
            if [ $? -eq 0 ]; then
                echo "      ✅ $plan_id (\$${price}/mo)"
                CREATED=$((CREATED + 1))
            fi
        else
            # Update
            mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
            UPDATE plans SET ptero_egg_id=$egg_id, game='$game_esc', display_name='$display_name_esc', ram_gb=$ram_gb, vcores=$vcpu, ssd_gb=$ssd, price_monthly=$price WHERE id='$plan_id_esc';
            " 2>/dev/null
            UPDATED=$((UPDATED + 1))
        fi
    done
    echo ""
done

echo "✅ Complete!"
echo "   Created: $CREATED plans"
echo "   Updated: $UPDATED plans"
echo ""


#!/bin/bash
# Compare UI Plans vs Database Plans
# Shows what the UI expects vs what's actually in the database

DB_USER="app_rw"
DB_PASS=$(grep app_rw PASSWORDS.txt | cut -d: -f2 | tr -d ' ')
DB_NAME="app_core"

echo "🎮 UI vs Database Plan Comparison"
echo "================================="
echo ""

# Define expected plans from UI screenshots
declare -A UI_PLANS

# Rust
UI_PLANS["rust-3gb"]="3|1|30|8.99"
UI_PLANS["rust-6gb"]="6|2|60|16.99"
UI_PLANS["rust-8gb"]="8|3|80|24.99"
UI_PLANS["rust-12gb"]="12|4|120|36.99"

# Palworld
UI_PLANS["palworld-4gb"]="4|2|40|11.99"
UI_PLANS["palworld-8gb"]="8|3|80|23.99"
UI_PLANS["palworld-16gb"]="16|4|160|47.99"

# Ark
UI_PLANS["ark-4gb"]="4|2|40|9.99"
UI_PLANS["ark-8gb"]="8|3|80|14.99"
UI_PLANS["ark-16gb"]="16|4|160|24.99"

# Terraria
UI_PLANS["terraria-1gb"]="1|0.5|10|2.99"
UI_PLANS["terraria-2gb"]="2|1|20|4.99"
UI_PLANS["terraria-4gb"]="4|2|40|7.99"

# Factorio
UI_PLANS["factorio-2gb"]="2|1|20|4.99"
UI_PLANS["factorio-4gb"]="4|2|40|6.99"
UI_PLANS["factorio-8gb"]="8|3|80|12.99"

# Mindustry
UI_PLANS["mindustry-2gb"]="2|1|20|3.99"
UI_PLANS["mindustry-4gb"]="4|2|40|5.99"
UI_PLANS["mindustry-8gb"]="8|3|80|9.99"

# Rimworld
UI_PLANS["rimworld-2gb"]="2|1|20|5.99"
UI_PLANS["rimworld-4gb"]="4|2|40|7.99"
UI_PLANS["rimworld-8gb"]="8|3|80|12.99"

echo "📋 Checking Each Game..."
echo ""

MISMATCHES=0
MISSING=0
EXTRA=0

# Check each game
for GAME in rust palworld ark terraria factorio mindustry rimworld; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎮 Game: $GAME"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Get database plans for this game
    DB_PLANS=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
    SELECT id, ram_gb, vcores, ssd_gb, price_monthly, stripe_price_id
    FROM plans
    WHERE game = '$GAME' AND is_active = 1
    ORDER BY ram_gb;
    " 2>&1 | grep -v "Warning")
    
    if [ -z "$DB_PLANS" ]; then
        echo "   ⚠️  No plans found in database for $GAME"
        echo ""
        continue
    fi
    
    echo "   Database Plans:"
    echo "$DB_PLANS" | while IFS=$'\t' read -r plan_id ram vcpu ssd price stripe_id; do
        # Check if this plan exists in UI expectations
        UI_DATA="${UI_PLANS[$plan_id]}"
        
        if [ -z "$UI_DATA" ]; then
            echo "   ⚠️  $plan_id: RAM=${ram}GB, vCPU=${vcpu}, SSD=${ssd}GB, Price=\$${price}"
            echo "      → Not expected in UI (extra plan)"
            EXTRA=$((EXTRA + 1))
        else
            IFS='|' read -r ui_ram ui_vcpu ui_ssd ui_price <<< "$UI_DATA"
            
            # Compare values
            MISMATCH=0
            ISSUES=""
            
            if [ "$ram" != "$ui_ram" ]; then
                ISSUES="${ISSUES}RAM: ${ram}GB (DB) vs ${ui_ram}GB (UI); "
                MISMATCH=1
            fi
            
            # vCPU comparison (handle decimals)
            if [ "$(echo "$vcpu != $ui_vcpu" | bc 2>/dev/null)" = "1" ]; then
                ISSUES="${ISSUES}vCPU: ${vcpu} (DB) vs ${ui_vcpu} (UI); "
                MISMATCH=1
            fi
            
            if [ "$ssd" != "$ui_ssd" ]; then
                ISSUES="${ISSUES}SSD: ${ssd}GB (DB) vs ${ui_ssd}GB (UI); "
                MISMATCH=1
            fi
            
            if [ "$(echo "$price != $ui_price" | bc 2>/dev/null)" = "1" ]; then
                ISSUES="${ISSUES}Price: \$${price} (DB) vs \$${ui_price} (UI); "
                MISMATCH=1
            fi
            
            if [ "$MISMATCH" -eq 1 ]; then
                echo "   ❌ $plan_id: MISMATCH"
                echo "      → $ISSUES"
                MISMATCHES=$((MISMATCHES + 1))
            else
                if [ -z "$stripe_id" ] || [ "$stripe_id" = "NULL" ]; then
                    echo "   ⚠️  $plan_id: ✅ Matches UI but missing Stripe price"
                else
                    echo "   ✅ $plan_id: Matches UI (RAM=${ram}GB, Price=\$${price}, Stripe=${stripe_id:0:20}...)"
                fi
            fi
        fi
    done
    
    echo ""
    echo "   UI Expected Plans (not in DB):"
    for plan_key in "${!UI_PLANS[@]}"; do
        if [[ "$plan_key" == "$GAME"* ]]; then
            # Check if exists in DB
            EXISTS=$(echo "$DB_PLANS" | grep -c "^$plan_key" || echo "0")
            if [ "$EXISTS" -eq 0 ]; then
                IFS='|' read -r ui_ram ui_vcpu ui_ssd ui_price <<< "${UI_PLANS[$plan_key]}"
                echo "   ❌ $plan_key: Missing from DB (UI expects: ${ui_ram}GB RAM, \$${ui_price}/mo)"
                MISSING=$((MISSING + 1))
            fi
        fi
    done
    
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   ❌ Mismatches: $MISMATCHES"
echo "   ❌ Missing Plans: $MISSING"
echo "   ⚠️  Extra Plans: $EXTRA"
echo ""

if [ "$MISMATCHES" -eq 0 ] && [ "$MISSING" -eq 0 ] && [ "$EXTRA" -eq 0 ]; then
    echo "   ✅ All plans match UI expectations!"
else
    echo "   💡 Action needed: Update database to match UI"
fi
echo ""


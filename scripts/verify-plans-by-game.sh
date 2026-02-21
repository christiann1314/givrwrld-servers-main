#!/bin/bash
# Verify Plans by Game
# Shows all plans grouped by game with their Stripe price status

DB_USER="app_rw"
DB_PASS=$(grep app_rw PASSWORDS.txt | cut -d: -f2 | tr -d ' ')
DB_NAME="app_core"

echo "🎮 Plans Verification by Game"
echo "=============================="
echo ""

# Get all games
GAMES=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
SELECT DISTINCT game 
FROM plans 
WHERE is_active=1 
ORDER BY game;
" 2>&1 | grep -v "Warning")

if [ -z "$GAMES" ]; then
    echo "❌ No games found"
    exit 1
fi

TOTAL_PLANS=0
TOTAL_WITH_PRICES=0
TOTAL_WITHOUT_PRICES=0

# For each game, show plans
for GAME in $GAMES; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 Game: $GAME"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Get plans for this game
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
    SELECT 
        id as 'Plan ID',
        display_name as 'Display Name',
        ram_gb as 'RAM (GB)',
        vcores as 'vCPU',
        ssd_gb as 'SSD (GB)',
        CONCAT('\$', price_monthly) as 'Price/Month',
        ptero_egg_id as 'Egg ID',
        CASE 
            WHEN stripe_price_id IS NULL OR stripe_price_id = '' THEN '❌ Missing'
            ELSE CONCAT('✅ ', LEFT(stripe_price_id, 20), '...')
        END as 'Stripe Price',
        CASE 
            WHEN stripe_product_id IS NULL OR stripe_product_id = '' THEN '❌ Missing'
            ELSE CONCAT('✅ ', LEFT(stripe_product_id, 20), '...')
        END as 'Stripe Product'
    FROM plans
    WHERE game = '$GAME' AND is_active = 1
    ORDER BY ram_gb, display_name;
    " 2>&1 | grep -v "Warning"
    
    # Count stats for this game
    GAME_PLANS=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
    SELECT COUNT(*) FROM plans WHERE game = '$GAME' AND is_active = 1;
    " 2>&1 | grep -v "Warning")
    
    GAME_WITH_PRICES=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
    SELECT COUNT(*) FROM plans 
    WHERE game = '$GAME' AND is_active = 1 
    AND stripe_price_id IS NOT NULL AND stripe_price_id != '';
    " 2>&1 | grep -v "Warning")
    
    GAME_WITHOUT_PRICES=$((GAME_PLANS - GAME_WITH_PRICES))
    
    echo ""
    echo "   📊 Stats: $GAME_PLANS plans | $GAME_WITH_PRICES with Stripe prices | $GAME_WITHOUT_PRICES missing prices"
    echo ""
    
    TOTAL_PLANS=$((TOTAL_PLANS + GAME_PLANS))
    TOTAL_WITH_PRICES=$((TOTAL_WITH_PRICES + GAME_WITH_PRICES))
    TOTAL_WITHOUT_PRICES=$((TOTAL_WITHOUT_PRICES + GAME_WITHOUT_PRICES))
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Overall Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "   Total Plans: $TOTAL_PLANS"
echo "   ✅ With Stripe Prices: $TOTAL_WITH_PRICES"
echo "   ❌ Missing Stripe Prices: $TOTAL_WITHOUT_PRICES"
echo ""

# Show which plans are missing prices
if [ "$TOTAL_WITHOUT_PRICES" -gt 0 ]; then
    echo "⚠️  Plans Missing Stripe Prices:"
    echo ""
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
    SELECT 
        game as 'Game',
        id as 'Plan ID',
        display_name as 'Display Name',
        CONCAT('\$', price_monthly, '/mo') as 'Price'
    FROM plans
    WHERE is_active = 1 
    AND (stripe_price_id IS NULL OR stripe_price_id = '')
    ORDER BY game, display_name;
    " 2>&1 | grep -v "Warning"
    echo ""
    echo "💡 To create Stripe prices for these plans, run:"
    echo "   ./scripts/create-all-stripe-prices.sh"
    echo ""
fi

# Check Pterodactyl egg mapping
echo "🥚 Pterodactyl Egg Mapping:"
EGGS_WITHOUT_PLANS=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
SELECT COUNT(*) FROM ptero_eggs e
LEFT JOIN plans p ON p.ptero_egg_id = e.ptero_egg_id
WHERE p.id IS NULL;
" 2>&1 | grep -v "Warning")

if [ "$EGGS_WITHOUT_PLANS" -gt 0 ]; then
    echo "   ⚠️  $EGGS_WITHOUT_PLANS eggs without plans"
    echo "   💡 Run: ./scripts/sync-plans-stripe-ptero.sh"
else
    echo "   ✅ All eggs have plans"
fi

echo ""


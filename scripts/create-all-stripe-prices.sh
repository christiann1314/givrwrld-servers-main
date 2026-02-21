#!/bin/bash
# Create Stripe Products and Prices for All Plans
# Usage: ./scripts/create-all-stripe-prices.sh

set -e

DB_USER="app_rw"
DB_PASS=$(grep app_rw PASSWORDS.txt | cut -d: -f2 | tr -d ' ')
DB_NAME="app_core"

echo "💳 Creating Stripe Products and Prices"
echo "======================================"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Install: https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Check if logged in
if ! stripe config --list &> /dev/null; then
    echo "❌ Not logged into Stripe CLI. Run: stripe login"
    exit 1
fi

echo "✅ Stripe CLI ready"
echo ""

# Get all active plans without Stripe prices
echo "📋 Fetching plans..."
PLANS_JSON=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
SELECT JSON_ARRAYAGG(
  JSON_OBJECT(
    'id', id,
    'display_name', display_name,
    'game', game,
    'ram_gb', ram_gb,
    'price_monthly', price_monthly,
    'stripe_price_id', IFNULL(stripe_price_id, '')
  )
)
FROM plans
WHERE is_active = 1
ORDER BY game, display_name;
" 2>/dev/null | jq -r '.')

if [ -z "$PLANS_JSON" ] || [ "$PLANS_JSON" = "null" ]; then
    echo "❌ No plans found"
    exit 1
fi

PLAN_COUNT=$(echo "$PLANS_JSON" | jq 'length')
echo "   Found $PLAN_COUNT plans"
echo ""

# Group plans by game to create products
echo "📦 Creating Stripe Products (one per game)..."
echo ""

# Track products by game
declare -A PRODUCT_MAP

# First pass: Create products for each game
for i in $(seq 0 $((PLAN_COUNT - 1))); do
    GAME=$(echo "$PLANS_JSON" | jq -r ".[$i].game")
    
    if [ -z "${PRODUCT_MAP[$GAME]}" ]; then
        GAME_DISPLAY=$(echo "$GAME" | sed 's/.*/\u&/')
        echo "   Creating product for: $GAME_DISPLAY"
        
        PRODUCT_OUTPUT=$(stripe products create \
            --name "$GAME_DISPLAY Server" \
            --description "$GAME_DISPLAY game server hosting" \
            --metadata game="$GAME" 2>&1)
        
        if [ $? -eq 0 ]; then
            PRODUCT_ID=$(echo "$PRODUCT_OUTPUT" | jq -r '.id')
            PRODUCT_MAP[$GAME]=$PRODUCT_ID
            echo "   ✅ Product created: $PRODUCT_ID"
        else
            echo "   ❌ Failed to create product for $GAME"
            echo "   Error: $PRODUCT_OUTPUT"
            continue
        fi
    fi
done

echo ""
echo "💰 Creating Stripe Prices (one per plan)..."
echo ""

CREATED=0
UPDATED=0
FAILED=0

# Second pass: Create prices for each plan
for i in $(seq 0 $((PLAN_COUNT - 1))); do
    PLAN_ID=$(echo "$PLANS_JSON" | jq -r ".[$i].id")
    DISPLAY_NAME=$(echo "$PLANS_JSON" | jq -r ".[$i].display_name")
    GAME=$(echo "$PLANS_JSON" | jq -r ".[$i].game")
    RAM_GB=$(echo "$PLANS_JSON" | jq -r ".[$i].ram_gb")
    PRICE_MONTHLY=$(echo "$PLANS_JSON" | jq -r ".[$i].price_monthly")
    EXISTING_PRICE_ID=$(echo "$PLANS_JSON" | jq -r ".[$i].stripe_price_id")
    
    # Skip if already has a price ID
    if [ -n "$EXISTING_PRICE_ID" ] && [ "$EXISTING_PRICE_ID" != "null" ] && [ "$EXISTING_PRICE_ID" != "" ]; then
        echo "   ⏭️  Skipping $PLAN_ID (already has price: $EXISTING_PRICE_ID)"
        continue
    fi
    
    # Get product ID for this game
    PRODUCT_ID="${PRODUCT_MAP[$GAME]}"
    
    if [ -z "$PRODUCT_ID" ]; then
        echo "   ❌ No product ID for game: $GAME"
        FAILED=$((FAILED + 1))
        continue
    fi
    
    # Convert price to cents
    PRICE_CENTS=$(echo "$PRICE_MONTHLY * 100" | bc | cut -d. -f1)
    
    echo "   Creating price for: $DISPLAY_NAME ($PRICE_MONTHLY/month)"
    
    # Create monthly price
    PRICE_OUTPUT=$(stripe prices create \
        --product "$PRODUCT_ID" \
        --unit-amount "$PRICE_CENTS" \
        --currency usd \
        --recurring interval=month \
        --metadata plan_id="$PLAN_ID" game="$GAME" ram_gb="$RAM_GB" 2>&1)
    
    if [ $? -eq 0 ]; then
        NEW_PRICE_ID=$(echo "$PRICE_OUTPUT" | jq -r '.id')
        
        # Update database
        mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
        UPDATE plans 
        SET stripe_price_id = '$NEW_PRICE_ID',
            stripe_product_id = '$PRODUCT_ID'
        WHERE id = '$PLAN_ID';
        " 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo "   ✅ Price created: $NEW_PRICE_ID"
            CREATED=$((CREATED + 1))
        else
            echo "   ⚠️  Price created but DB update failed: $NEW_PRICE_ID"
            FAILED=$((FAILED + 1))
        fi
    else
        echo "   ❌ Failed to create price"
        echo "   Error: $PRICE_OUTPUT"
        FAILED=$((FAILED + 1))
    fi
    
    # Small delay to avoid rate limits
    sleep 0.5
done

echo ""
echo "✅ Complete!"
echo "============"
echo "   Products created: ${#PRODUCT_MAP[@]}"
echo "   Prices created: $CREATED"
echo "   Already had prices: $((PLAN_COUNT - CREATED - FAILED))"
echo "   Failed: $FAILED"
echo ""

# Verify
echo "📊 Verification:"
PLANS_WITH_PRICES=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
SELECT COUNT(*) FROM plans 
WHERE is_active=1 
AND stripe_price_id IS NOT NULL 
AND stripe_price_id != '';
" 2>/dev/null)

echo "   Plans with Stripe prices: $PLANS_WITH_PRICES / $PLAN_COUNT"
echo ""

if [ "$PLANS_WITH_PRICES" -lt "$PLAN_COUNT" ]; then
    echo "⚠️  Some plans still missing prices. Check errors above."
    echo ""
    echo "To see which plans need prices:"
    echo "  mysql -u app_rw -p app_core -e \"SELECT id, display_name FROM plans WHERE is_active=1 AND (stripe_price_id IS NULL OR stripe_price_id = '');\""
fi


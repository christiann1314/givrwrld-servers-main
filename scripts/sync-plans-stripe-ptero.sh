#!/bin/bash
# Sync Plans: Pterodactyl Eggs → Plans → Stripe Prices
# This script ensures every Pterodactyl egg has a corresponding plan with Stripe price

set -e

DB_USER="app_rw"
DB_PASS=$(grep app_rw PASSWORDS.txt | cut -d: -f2 | tr -d ' ')
DB_NAME="app_core"
AES_KEY=$(cat AES_KEY.txt)

echo "🔄 Syncing Plans: Pterodactyl Eggs → Plans → Stripe"
echo "=================================================="
echo ""

# Step 1: Get all Pterodactyl eggs
echo "1️⃣  Fetching Pterodactyl eggs..."
EGGS_JSON=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
SELECT JSON_ARRAYAGG(
  JSON_OBJECT(
    'egg_id', ptero_egg_id,
    'name', name,
    'nest_id', ptero_nest_id,
    'docker_image', docker_image,
    'startup', startup_cmd
  )
)
FROM ptero_eggs;
" 2>/dev/null | jq -r '.')

if [ -z "$EGGS_JSON" ] || [ "$EGGS_JSON" = "null" ]; then
  echo "   ❌ No eggs found. Run sync-ptero-catalog.sh first."
  exit 1
fi

EGG_COUNT=$(echo "$EGGS_JSON" | jq 'length')
echo "   ✅ Found $EGG_COUNT eggs"
echo ""

# Step 2: For each egg, ensure a plan exists
echo "2️⃣  Ensuring plans exist for each egg..."
echo ""

CREATED=0
UPDATED=0

for i in $(seq 0 $((EGG_COUNT - 1))); do
  EGG_ID=$(echo "$EGGS_JSON" | jq -r ".[$i].egg_id")
  EGG_NAME=$(echo "$EGGS_JSON" | jq -r ".[$i].name")
  NEST_ID=$(echo "$EGGS_JSON" | jq -r ".[$i].nest_id")
  DOCKER_IMAGE=$(echo "$EGGS_JSON" | jq -r ".[$i].docker_image")
  STARTUP=$(echo "$EGGS_JSON" | jq -r ".[$i].startup")
  
  # Get nest name
  NEST_NAME=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
    SELECT name FROM ptero_nests WHERE ptero_nest_id = $NEST_ID;
  " 2>/dev/null)
  
  # Determine game type from egg name or nest
  # Clean up the name to create a valid plan ID
  GAME_TYPE=$(echo "$EGG_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g' | cut -c1-30)
  PLAN_ID="${GAME_TYPE}-${EGG_ID}"
  
  # Check if plan exists for this egg
  PLAN_EXISTS=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
    SELECT COUNT(*) FROM plans WHERE ptero_egg_id = $EGG_ID;
  " 2>/dev/null)
  
  if [ "$PLAN_EXISTS" -eq 0 ]; then
    # Create default plan with reasonable defaults
    # You can customize RAM, CPU, disk, and pricing later
    DISPLAY_NAME="$EGG_NAME"
    
    # Escape single quotes for SQL
    DISPLAY_NAME_ESC=$(echo "$DISPLAY_NAME" | sed "s/'/''/g")
    PLAN_ID_ESC=$(echo "$PLAN_ID" | sed "s/'/''/g")
    GAME_TYPE_ESC=$(echo "$GAME_TYPE" | sed "s/'/''/g")
    
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
    INSERT INTO plans (
      id, display_name, game, item_type, 
      ram_gb, vcores, ssd_gb,
      ptero_egg_id, is_active,
      price_monthly, price_quarterly, price_yearly
    ) VALUES (
      '$PLAN_ID_ESC',
      '$DISPLAY_NAME_ESC',
      '$GAME_TYPE_ESC',
      'game',
      4, 2, 20,
      $EGG_ID,
      1,
      9.99, 27.99, 99.99
    ) ON DUPLICATE KEY UPDATE
      ptero_egg_id = $EGG_ID,
      display_name = '$DISPLAY_NAME_ESC';
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
      echo "   ✅ Created plan: $PLAN_ID for egg: $EGG_NAME"
      CREATED=$((CREATED + 1))
    else
      echo "   ⚠️  Failed to create plan for: $EGG_NAME"
    fi
  else
    # Update plan to ensure egg_id is set (if somehow missing)
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
    UPDATE plans 
    SET ptero_egg_id = $EGG_ID 
    WHERE ptero_egg_id IS NULL OR ptero_egg_id = 0
    AND id LIKE '%${GAME_TYPE}%'
    LIMIT 1;
    " 2>/dev/null
    
    UPDATED=$((UPDATED + 1))
  fi
done

echo ""
echo "   ✅ Created: $CREATED plans"
echo "   ✅ Updated: $UPDATED plans"
echo ""

# Step 3: Report on Stripe price mapping
echo "3️⃣  Checking Stripe price mapping..."
PLANS_WITH_PRICE=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
  SELECT COUNT(*) FROM plans 
  WHERE is_active=1 
  AND stripe_price_id IS NOT NULL 
  AND stripe_price_id != '';
" 2>/dev/null)

PLANS_WITHOUT_PRICE=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
  SELECT COUNT(*) FROM plans 
  WHERE is_active=1 
  AND (stripe_price_id IS NULL OR stripe_price_id = '');
" 2>/dev/null)

echo "   📊 Plans with Stripe prices: $PLANS_WITH_PRICE"
echo "   ⚠️  Plans without Stripe prices: $PLANS_WITHOUT_PRICE"
echo ""

if [ "$PLANS_WITHOUT_PRICE" -gt 0 ]; then
  echo "   💡 To add Stripe prices, use:"
  echo "      ./scripts/update-stripe-prices.sh"
  echo ""
fi

# Step 4: Summary
TOTAL_PLANS=$(mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -sN -e "
  SELECT COUNT(*) FROM plans WHERE is_active=1;
" 2>/dev/null)

echo "✅ Sync Complete!"
echo "=================="
echo "   Total active plans: $TOTAL_PLANS"
echo "   Total Pterodactyl eggs: $EGG_COUNT"
echo "   Plans with Stripe prices: $PLANS_WITH_PRICE"
echo ""
echo "📋 Next Steps:"
echo "   1. Review plans in database"
echo "   2. Create Stripe products/prices for missing plans"
echo "   3. Update stripe_price_id in plans table"
echo ""


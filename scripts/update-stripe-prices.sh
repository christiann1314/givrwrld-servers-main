#!/usr/bin/env bash
# Update Stripe Price IDs for Plans
# Usage: bash scripts/update-stripe-prices.sh

echo "💰 Stripe Price ID Updater"
echo "=========================="
echo ""
echo "This script helps you update Stripe price IDs for your plans."
echo ""
echo "To get your Stripe price IDs:"
echo "  1. Go to: https://dashboard.stripe.com/products"
echo "  2. Click on each product"
echo "  3. Copy the Price ID (starts with price_)"
echo ""
read -p "Press Enter to continue..."

sudo mysql -u root app_core << 'SQL'
-- Show current plans
SELECT 'Current Plans:' AS info;
SELECT id, game, ram_gb, stripe_price_id, price_monthly 
FROM plans 
WHERE is_active=1 
ORDER BY game, ram_gb;
SQL

echo ""
echo "To update a plan, run:"
echo "  sudo mysql -u root app_core -e \"UPDATE plans SET stripe_price_id = 'price_YOUR_ID' WHERE id = 'PLAN_ID';\""
echo ""
echo "Or update interactively:"
read -p "Enter plan ID to update (or 'skip'): " plan_id
if [ "$plan_id" != "skip" ]; then
  read -p "Enter Stripe price ID: " price_id
  sudo mysql -u root app_core -e "UPDATE plans SET stripe_price_id = '$price_id' WHERE id = '$plan_id';"
  echo "✅ Updated $plan_id with price ID: $price_id"
fi

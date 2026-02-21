#!/bin/bash
# End-to-End Test Script for Checkout Flow

API_URL="${API_URL:-http://localhost:3001}"
echo "🧪 Testing Checkout Flow"
echo "======================="
echo ""
echo "API URL: $API_URL"
echo ""

# 1. Test Plans Endpoint
echo "1️⃣  Testing Plans Endpoint..."
PLANS_RESPONSE=$(curl -s "$API_URL/api/plans")
if echo "$PLANS_RESPONSE" | grep -q "plans"; then
    echo "   ✅ Plans endpoint working"
    PLAN_COUNT=$(echo "$PLANS_RESPONSE" | jq '.plans | length' 2>/dev/null || echo "?")
    echo "   📊 Found $PLAN_COUNT plans"
else
    echo "   ❌ Plans endpoint failed"
    echo "   Response: $PLANS_RESPONSE"
    exit 1
fi

echo ""

# 2. Test Health
echo "2️⃣  Testing Health Endpoint..."
HEALTH=$(curl -s "$API_URL/health")
if echo "$HEALTH" | grep -q "ok"; then
    echo "   ✅ API server healthy"
else
    echo "   ❌ Health check failed"
    exit 1
fi

echo ""

# 3. Check Database
echo "3️⃣  Checking Database..."
echo "   Recent orders:"
mysql -u app_rw -p$(grep app_rw PASSWORDS.txt | cut -d: -f2 | tr -d ' ') app_core -e "SELECT id, status, plan_id, created_at FROM orders ORDER BY created_at DESC LIMIT 3;" 2>&1 | grep -v "Warning" || echo "   (No orders yet)"

echo ""
echo "   Recent sessions:"
mysql -u app_rw -p$(grep app_rw PASSWORDS.txt | cut -d: -f2 | tr -d ' ') app_core -e "SELECT order_id, stripe_session_id, status FROM order_sessions ORDER BY created_at DESC LIMIT 3;" 2>&1 | grep -v "Warning" || echo "   (No sessions yet)"

echo ""
echo "   Recent webhook events:"
mysql -u app_rw -p$(grep app_rw PASSWORDS.txt | cut -d: -f2 | tr -d ' ') app_core -e "SELECT event_id, type, received_at FROM stripe_events_log ORDER BY received_at DESC LIMIT 5;" 2>&1 | grep -v "Warning" || echo "   (No events yet)"

echo ""
echo "✅ Test script complete"
echo ""
echo "📋 Manual Test Steps:"
echo "   1. Make a purchase in frontend"
echo "   2. Complete payment with test card"
echo "   3. Check orders table for new order"
echo "   4. Check order_sessions for session link"
echo "   5. Check stripe_events_log for webhook"
echo "   6. Verify order status: pending → paid → provisioning → provisioned"


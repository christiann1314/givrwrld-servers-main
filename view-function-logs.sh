#!/bin/bash
# Script to view Edge Function logs summary and provide dashboard links

PROJECT_REF="mjhvkvnshnbnxojnandf"
ACCESS_TOKEN=$(cat ~/.supabase/access-token 2>/dev/null)

echo "📊 Edge Function Logs Summary"
echo "=============================="
echo ""
echo "🔗 Dashboard Links:"
echo "  • All Functions: https://supabase.com/dashboard/project/${PROJECT_REF}/functions"
echo "  • Edge Functions Logs: https://supabase.com/dashboard/project/${PROJECT_REF}/logs/edge-functions-logs"
echo ""
echo "📋 Recent Function Activity:"
echo ""

# Get function list
FUNCTIONS=$(curl -s "https://api.supabase.com/v1/projects/${PROJECT_REF}/functions" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" 2>/dev/null)

if [ $? -eq 0 ] && [ ! -z "$FUNCTIONS" ]; then
  echo "Active Functions (sorted by last update):"
  echo "$FUNCTIONS" | jq -r '.[] | "  • \(.name) (v\(.version)) - Updated: \(.updated_at | tonumber / 1000 | strftime("%Y-%m-%d %H:%M:%S UTC"))"' 2>/dev/null | head -20
  
  echo ""
  echo "🔍 Key Functions to Monitor:"
  echo "  • sync-all-data: https://supabase.com/dashboard/project/${PROJECT_REF}/functions/sync-all-data/logs"
  echo "  • stripe-webhook: https://supabase.com/dashboard/project/${PROJECT_REF}/functions/stripe-webhook/logs"
  echo "  • servers-provision: https://supabase.com/dashboard/project/${PROJECT_REF}/functions/servers-provision/logs"
  echo "  • create-checkout-session: https://supabase.com/dashboard/project/${PROJECT_REF}/functions/create-checkout-session/logs"
else
  echo "⚠️  Could not fetch function list. Please check your access token."
fi

echo ""
echo "💡 Tip: Use the Supabase Dashboard to view detailed logs with:"
echo "   - Request/response details"
echo "   - Error messages"
echo "   - Execution time"
echo "   - Filter by time range, status, or function"
echo ""


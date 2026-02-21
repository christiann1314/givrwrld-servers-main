#!/bin/bash
# Start API Server Script

echo "🚀 Starting GIVRwrld API Server..."
echo ""

cd "$(dirname "$0")/api"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: api/.env file not found!"
    echo "   Please create api/.env with required configuration"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Starting server on http://localhost:3001"
echo "   Press Ctrl+C to stop"
echo ""

npm start


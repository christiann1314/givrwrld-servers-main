#!/bin/bash
# Start API Server Script

cd "$(dirname "$0")"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed"
  exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Start server
echo "🚀 Starting GIVRwrld API Server..."
node server.js



#!/bin/bash

set -e

echo "🚀 Setting up Agent View workspace..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Make sure you're in the agent-view directory."
    exit 1
fi

# Check if Node.js or Bun is available
if command -v bun &> /dev/null; then
    echo "📦 Installing dependencies with Bun..."
    bun install
elif command -v npm &> /dev/null; then
    echo "📦 Installing dependencies with npm..."
    npm install
else
    echo "❌ Error: Neither Bun nor npm found. Please install Node.js or Bun."
    exit 1
fi

# Copy environment variables from root if they exist
if [ -f "$CONDUCTOR_ROOT_PATH/.env" ]; then
    echo "📋 Copying .env file from root..."
    cp "$CONDUCTOR_ROOT_PATH/.env" .env
fi

echo "ℹ️  Note: Agent View uses your local Claude Code installation"
echo "   Make sure you have Claude Code installed and logged in with a Pro or Max plan"

echo "✅ Agent View workspace setup complete!"
echo "   Run 'npm run dev' to start the development server."
echo "   Access the UI at http://localhost:3000"
#!/bin/bash

# Check if the debug environment is ready

echo "Checking Safari WebSocket Debug Environment..."
echo ""

READY=true

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✓ Node.js installed: $NODE_VERSION"
else
    echo "✗ Node.js not found"
    READY=false
fi

# Check required packages
if node -e "require('ws')" 2>/dev/null; then
    echo "✓ ws package installed"
else
    echo "✗ ws package not installed"
    echo "  Run: npm install ws"
    READY=false
fi

if node -e "require('webdriverio')" 2>/dev/null; then
    echo "✓ webdriverio package installed"
else
    echo "✗ webdriverio package not installed"
    echo "  Run: npm install webdriverio"
    READY=false
fi

if node -e "require('dotenv')" 2>/dev/null; then
    echo "✓ dotenv package installed"
else
    echo "✗ dotenv package not installed"
    echo "  Run: npm install dotenv"
    READY=false
fi

# Check environment variables
if [ -f .env ]; then
    source .env
    echo "✓ .env file found"
else
    echo "⚠ .env file not found (will check environment variables)"
fi

if [ ! -z "$BROWSERSTACK_USERNAME" ]; then
    echo "✓ BROWSERSTACK_USERNAME set: $BROWSERSTACK_USERNAME"
else
    echo "✗ BROWSERSTACK_USERNAME not set"
    READY=false
fi

if [ ! -z "$BROWSERSTACK_ACCESS_KEY" ]; then
    echo "✓ BROWSERSTACK_ACCESS_KEY set: ${BROWSERSTACK_ACCESS_KEY:0:8}..."
else
    echo "✗ BROWSERSTACK_ACCESS_KEY not set"
    READY=false
fi

# Check if port 8888 is available
if lsof -Pi :8888 -sTCP:LISTEN -t >/dev/null 2>&1; then
    PID=$(lsof -Pi :8888 -sTCP:LISTEN -t)
    echo "⚠ Port 8888 is already in use (PID: $PID)"
    echo "  Run: kill $PID"
else
    echo "✓ Port 8888 is available"
fi

# Check debug scripts exist
if [ -f "debug-safari-ws-server.js" ]; then
    echo "✓ debug-safari-ws-server.js exists"
else
    echo "✗ debug-safari-ws-server.js not found"
    READY=false
fi

if [ -f "debug-safari-webdriver.js" ]; then
    echo "✓ debug-safari-webdriver.js exists"
else
    echo "✗ debug-safari-webdriver.js not found"
    READY=false
fi

if [ -f "run-safari-debug.sh" ]; then
    echo "✓ run-safari-debug.sh exists"
    if [ -x "run-safari-debug.sh" ]; then
        echo "✓ run-safari-debug.sh is executable"
    else
        echo "⚠ run-safari-debug.sh is not executable"
        echo "  Run: chmod +x run-safari-debug.sh"
    fi
else
    echo "✗ run-safari-debug.sh not found"
    READY=false
fi

echo ""
echo "=========================================="
if [ "$READY" = true ]; then
    echo "✓ Environment is ready!"
    echo ""
    echo "To run the debug test:"
    echo "  1. Start BrowserStack Local in another terminal:"
    echo "     npx browserstack-local --key \$BROWSERSTACK_ACCESS_KEY --force-local"
    echo ""
    echo "  2. Run the debug test:"
    echo "     ./run-safari-debug.sh"
    echo ""
    echo "OR run components separately:"
    echo "  Terminal 1: node debug-safari-ws-server.js"
    echo "  Terminal 2: npx browserstack-local --key \$BROWSERSTACK_ACCESS_KEY --force-local"
    echo "  Terminal 3: node debug-safari-webdriver.js"
else
    echo "✗ Environment is NOT ready"
    echo "Please fix the issues above"
fi
echo "=========================================="

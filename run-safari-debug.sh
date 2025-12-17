#!/bin/bash

# Safari WebSocket Debug Test Runner
# This script coordinates running the debug server and BrowserStack test

set -e

echo "================================================================================"
echo "Safari WebSocket Debug Test"
echo "================================================================================"
echo ""

# Check if required commands exist
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Check environment variables
if [ -z "$BROWSERSTACK_USERNAME" ] || [ -z "$BROWSERSTACK_ACCESS_KEY" ]; then
    echo "Error: BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set"
    echo "Loading from .env file..."
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    else
        echo "Error: .env file not found"
        exit 1
    fi
fi

# Create logs directory
mkdir -p logs
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SERVER_LOG="logs/debug-server-$TIMESTAMP.log"
WEBDRIVER_LOG="logs/debug-webdriver-$TIMESTAMP.log"

echo "Log files:"
echo "  Server log: $SERVER_LOG"
echo "  WebDriver log: $WEBDRIVER_LOG"
echo ""

# Start debug server in background
echo "Starting debug server..."
node debug-safari-ws-server.js > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
echo "Debug server started (PID: $SERVER_PID)"
echo ""

# Wait for server to be ready
sleep 2

# Check if server is running
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "Error: Debug server failed to start"
    cat "$SERVER_LOG"
    exit 1
fi

echo "Debug server is running on http://0.0.0.0:8888"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "Cleaning up..."
    if [ ! -z "$SERVER_PID" ]; then
        echo "Stopping debug server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
    echo "Cleanup complete"
}

trap cleanup EXIT INT TERM

echo "================================================================================"
echo "IMPORTANT: Make sure BrowserStack Local tunnel is running!"
echo "================================================================================"
echo ""
echo "If not already running, open another terminal and run:"
echo "  npx browserstack-local --key $BROWSERSTACK_ACCESS_KEY --force-local"
echo ""
read -p "Press Enter when BrowserStack Local is ready..."
echo ""

# Run WebDriver test
echo "Starting WebDriver test..."
echo ""
node debug-safari-webdriver.js | tee "$WEBDRIVER_LOG"

echo ""
echo "================================================================================"
echo "Test Complete"
echo "================================================================================"
echo ""
echo "Server log: $SERVER_LOG"
echo "WebDriver log: $WEBDRIVER_LOG"
echo ""
echo "To view server logs:"
echo "  cat $SERVER_LOG"
echo ""
echo "To view WebDriver logs:"
echo "  cat $WEBDRIVER_LOG"
echo ""

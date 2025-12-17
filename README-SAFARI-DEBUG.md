# Safari WebSocket Debug Test

This directory contains debug scripts to isolate the Safari WebSocket issue on BrowserStack.

## Files

- **debug-safari-ws-server.js** - HTTP + WebSocket server with extensive logging
- **debug-safari-webdriver.js** - WebDriver script to launch Safari on BrowserStack
- **run-safari-debug.sh** - Helper script to run everything
- **logs/** - Directory for log files (created automatically)

## Quick Start

### Option 1: Automated (Recommended)

```bash
# Make sure BrowserStack Local is running in another terminal:
npx browserstack-local --key $BROWSERSTACK_ACCESS_KEY --force-local

# Then run the automated test:
./run-safari-debug.sh
```

### Option 2: Manual (for more control)

**Terminal 1 - Debug Server:**
```bash
node debug-safari-ws-server.js | tee logs/server.log
```

**Terminal 2 - BrowserStack Local:**
```bash
npx browserstack-local --key $BROWSERSTACK_ACCESS_KEY --force-local
```

**Terminal 3 - WebDriver Test:**
```bash
node debug-safari-webdriver.js | tee logs/webdriver.log
```

## What This Tests

### Server Side (debug-safari-ws-server.js)

The server logs:
- ✅ HTTP socket lifecycle (open, close, errors)
- ✅ Each HTTP request with full details (method, URL, host, headers, socket ID)
- ✅ WebSocket upgrade requests
- ✅ WebSocket connection lifecycle (open, close, errors)
- ✅ WebSocket messages (sent & received)
- ✅ WebSocket pings/pongs
- ✅ Unique socket IDs for correlation

### Client Side (HTML page served by server)

The browser page logs to console:
- ✅ Page load states (DOMContentLoaded, window.load)
- ✅ WebSocket connection attempts
- ✅ WebSocket state changes (CONNECTING → OPEN → CLOSING → CLOSED)
- ✅ WebSocket events (onopen, onmessage, onerror, onclose)
- ✅ Detailed error information
- ✅ Auto-reconnect attempts
- ✅ Heartbeat every 10 seconds
- ✅ All logs are visible on the page AND in browser console

### WebDriver Side (debug-safari-webdriver.js)

The WebDriver script:
- ✅ Uses trace-level logging for maximum detail
- ✅ Monitors page state every 2 seconds
- ✅ Extracts and displays browser console logs
- ✅ Reports WebSocket connection status
- ✅ Detects successful connection or failures
- ✅ Captures final state snapshot

## Debug Capabilities Enabled

### BrowserStack Options
- ✅ `debug: true` - Enable debug mode
- ✅ `networkLogs: true` - Capture network traffic
- ✅ `consoleLogs: 'verbose'` - Capture browser console
- ✅ `video: true` - Record video
- ✅ `seleniumLogs: true` - Capture Selenium logs
- ✅ `wsLocalSupport: true` - Enable WebSocket through Local tunnel

### Safari-Specific Capabilities
- ✅ `acceptInsecureCerts: true` - Accept self-signed certificates
- ✅ `webkit:WebRTC` - Enable WebRTC features
- ✅ `safari:automaticInspection: false` - Disable automatic inspection
- ✅ `safari:automaticProfiling: false` - Disable automatic profiling
- ✅ `webSocketUrl: true` - Enable WebSocket URLs

### WebDriverIO Options
- ✅ `logLevel: 'trace'` - Maximum logging verbosity
- ✅ `connectionRetryTimeout: 180000` - 3 minute timeout
- ✅ `connectionRetryCount: 3` - Retry failed connections

## How localhost → bs-local.com Works

The test uses `http://localhost:8888` URLs in the browser. BrowserStack Local tunnel automatically redirects:
- `http://localhost:8888` → `http://bs-local.com:8888`
- `ws://localhost:8888/ws` → `ws://bs-local.com:8888/ws`

This redirection happens transparently at the network level by BrowserStack Local.

## Expected Behavior

### If Working Correctly

1. Server logs show:
   - HTTP request for `/`
   - WebSocket upgrade request
   - WebSocket connection opened
   - "hello" message received
   - Echo message sent back

2. Browser logs show:
   - Page loaded successfully
   - WebSocket connecting
   - WebSocket opened
   - Hello message sent
   - Echo message received
   - Connection stays open

3. WebDriver logs show:
   - Page state shows "Connected!"
   - Browser logs captured successfully

### If Safari Blocks WebSocket

1. Server logs show:
   - HTTP request for `/`
   - WebSocket upgrade request
   - WebSocket connection opened
   - **WebSocket connection closed immediately** (no messages)

2. Browser logs show:
   - Page loaded successfully
   - WebSocket connecting
   - **WebSocket closed with error code**
   - Auto-reconnect attempts

3. WebDriver logs show:
   - Page state shows "Disconnected" or "Error"
   - Browser error logs captured

## Collecting Data for Analysis

After running the test, collect:

1. **Server logs** - All server-side events
   ```bash
   cat logs/server.log
   ```

2. **WebDriver logs** - All WebDriver and extracted browser logs
   ```bash
   cat logs/webdriver.log
   ```

3. **BrowserStack Dashboard**
   - Go to: https://automate.browserstack.com/dashboard/v2/builds
   - Find the session (look for "Safari WebSocket Debug")
   - Download:
     - Video recording
     - Console logs
     - Network logs
     - Selenium logs

4. **BrowserStack Local logs**
   - Check the terminal where BrowserStack Local is running
   - Look for any errors or connection issues

## Analysis

Once you have all the data, look for:

1. **Does the WebSocket upgrade succeed?**
   - Check server logs for `WS_CONNECTION_OPEN`

2. **How long does the connection stay open?**
   - Compare timestamps of `WS_CONNECTION_OPEN` and `WS_CONNECTION_CLOSE`

3. **Why did it close?**
   - Check the close code and reason in both server and browser logs

4. **Are there any errors in between?**
   - Look for `WS_ERROR` in server logs
   - Look for `WEBSOCKET onerror` in browser logs

5. **Does the pattern differ from manual access?**
   - Run the same test by manually opening Safari and visiting the URL
   - Compare the logs

## Socket ID Correlation

Each HTTP connection and WebSocket connection has a unique ID. Use these to correlate events:

- `socketId` - The underlying TCP socket ID (same for HTTP and WS upgrade)
- `wsId` - The WebSocket connection ID (unique per WebSocket)

Example:
```
[HTTP_SOCKET_OPEN] { socketId: 1, ... }
[HTTP_REQUEST] { socketId: 1, url: '/', ... }
[WS_CONNECTION_OPEN] { wsId: 'ws-2', socketId: 1, ... }
[WS_MESSAGE_RECEIVED] { wsId: 'ws-2', socketId: 1, ... }
[WS_CONNECTION_CLOSE] { wsId: 'ws-2', socketId: 1, ... }
[HTTP_SOCKET_CLOSE] { socketId: 1, ... }
```

## Troubleshooting

### Server won't start
```bash
# Check if port 8888 is in use
lsof -ti:8888 | xargs kill -9

# Restart server
node debug-safari-ws-server.js
```

### BrowserStack Local not connecting
```bash
# Stop any existing instances
pkill -f browserstack-local

# Restart with force-local flag
npx browserstack-local --key $BROWSERSTACK_ACCESS_KEY --force-local --verbose
```

### WebDriver can't connect to BrowserStack
```bash
# Check environment variables
echo $BROWSERSTACK_USERNAME
echo $BROWSERSTACK_ACCESS_KEY

# Make sure .env file is loaded
source .env
```

## Next Steps

After collecting all debug data:

1. Share the server logs (shows what actually happens on the server)
2. Share the WebDriver logs (shows what the browser reports)
3. Share BrowserStack dashboard links (video, console, network logs)
4. I will analyze the correlation between server-side and client-side events
5. We'll identify the exact point of failure and root cause

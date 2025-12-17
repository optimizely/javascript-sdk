# Safari WebSocket Debug Test - Quick Summary

## What This Does

This creates an isolated test environment to debug Safari WebSocket issues on BrowserStack, completely separate from Vitest.

## Files Created

1. **debug-safari-ws-server.js** - Standalone HTTP + WebSocket server with comprehensive logging
2. **debug-safari-webdriver.js** - WebDriver script to launch Safari on BrowserStack
3. **run-safari-debug.js** - Automated runner that manages everything
4. **README-SAFARI-DEBUG.md** - Detailed documentation

## Run the Test

```bash
# Single command - does everything automatically:
node run-safari-debug.js
```

This will:
1. ✅ Check environment (Node.js, packages, credentials)
2. ✅ Start BrowserStack Local tunnel automatically
3. ✅ Start the debug HTTP/WebSocket server
4. ✅ Launch Safari 14 on BrowserStack
5. ✅ Monitor the WebSocket connection for 2 minutes
6. ✅ Collect all logs (server + browser + WebDriver)
7. ✅ Clean up everything when done

## What Gets Logged

### Server Side (debug-safari-ws-server.js)
- Every HTTP request (method, URL, headers, socket ID)
- Every WebSocket upgrade request
- WebSocket connection lifecycle (open, close, errors)
- All WebSocket messages (sent & received)
- Socket IDs for correlation

### Browser Side (HTML page)
- Page load events
- WebSocket connection attempts
- WebSocket state transitions (CONNECTING → OPEN → CLOSED)
- WebSocket errors with codes
- All events visible on page AND in console

### WebDriver Side (debug-safari-webdriver.js)
- Every 2 seconds: page state, WebSocket status
- Browser console logs extracted and displayed
- Success/failure detection
- Final snapshot of all logs

## Output

After running, check:

1. **Terminal output** - Real-time monitoring
2. **logs/debug-server-*.log** - Complete server-side log
3. **logs/debug-webdriver-*.log** - Complete WebDriver + browser log
4. **BrowserStack Dashboard** - Video, console, network logs

## Key Differences from Vitest Test

| Feature | Vitest Test | Debug Test |
|---------|-------------|------------|
| Purpose | Run actual tests | Debug WebSocket |
| Server | Vite dev server | Simple HTTP server |
| Client | Vitest orchestrator | Simple HTML page |
| WebSocket | Vitest protocol | Echo server |
| Logging | Limited | Comprehensive |
| Browser URL | `/__vitest_test__/` | `/` |
| Complexity | High | Minimal |

## Expected Outcomes

### If WebSocket Works ✅
```
Server logs:
  - HTTP_REQUEST for /
  - WS_CONNECTION_OPEN
  - WS_MESSAGE_RECEIVED (hello)
  - WS_MESSAGE_SENT (echo)
  - Connection stays open

Browser logs:
  - WebSocket OPENED
  - Hello message sent
  - Echo message received
  - Status: Connected!
```

### If Safari Blocks WebSocket ❌
```
Server logs:
  - HTTP_REQUEST for /
  - WS_CONNECTION_OPEN
  - WS_CONNECTION_CLOSE (immediately, code 1006)
  - No messages exchanged

Browser logs:
  - WebSocket connecting
  - WebSocket CLOSED (code 1006)
  - Status: Disconnected
  - Auto-reconnect attempts
```

## Analysis Plan

1. Run the test: `node run-safari-debug.js`
2. Collect all logs from `logs/` directory
3. Check BrowserStack dashboard for video/console/network
4. Compare with manual browser test results
5. Identify exact failure point using socket IDs
6. Correlate server-side vs client-side events
7. Determine root cause

## Socket ID Correlation

Every connection has unique IDs for tracking:

```
[HTTP_SOCKET_OPEN] { socketId: 1 }
[HTTP_REQUEST] { socketId: 1, url: '/' }
[WS_CONNECTION_OPEN] { wsId: 'ws-2', socketId: 1 }
[WS_MESSAGE_RECEIVED] { wsId: 'ws-2', socketId: 1 }
[WS_CONNECTION_CLOSE] { wsId: 'ws-2', socketId: 1, code: 1006 }
[HTTP_SOCKET_CLOSE] { socketId: 1 }
```

Use `socketId` to trace the full lifecycle of a connection.

## Next Steps After Test

Once you run this and collect the logs, share:
1. Complete server log output
2. Complete WebDriver log output
3. BrowserStack session URL (for video/console/network)

I will analyze to determine:
- Does WebSocket upgrade succeed?
- How long does connection stay open?
- What's the close code/reason?
- Any differences between automated vs manual access?
- Root cause of Safari WebDriver blocking WebSocket

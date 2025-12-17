#!/usr/bin/env node

/**
 * Debug server for Safari WebSocket on BrowserStack
 * This creates both HTTP and WebSocket servers with detailed logging
 */

const http = require('http');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 8888;
let socketIdCounter = 0;
const socketMap = new WeakMap();

// Get unique ID for a socket
function getSocketId(socket) {
  if (!socketMap.has(socket)) {
    socketMap.set(socket, ++socketIdCounter);
  }
  return socketMap.get(socket);
}

// Format log with timestamp and all details
function log(type, data) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}]`, JSON.stringify(data, null, 2));
}

// Create HTTP server
const server = http.createServer((req, res) => {
  const socketId = getSocketId(req.socket);

  log('HTTP_REQUEST', {
    socketId,
    method: req.method,
    url: req.url,
    host: req.headers.host,
    headers: req.headers,
    remoteAddress: req.socket.remoteAddress,
    remotePort: req.socket.remotePort,
  });

  // Serve the test HTML page
  if (req.url === '/' || req.url === '/index.html') {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Safari WebSocket Debug Test</title>
  <style>
    body {
      font-family: monospace;
      padding: 20px;
      background: #1e1e1e;
      color: #d4d4d4;
    }
    .status { padding: 10px; margin: 5px 0; border-radius: 4px; }
    .success { background: #0e4d0e; }
    .error { background: #4d0e0e; }
    .info { background: #0e0e4d; }
    .warning { background: #4d4d0e; }
    #logs {
      border: 1px solid #555;
      padding: 10px;
      height: 400px;
      overflow-y: auto;
      margin-top: 20px;
      background: #2d2d2d;
    }
    .log-entry {
      margin: 2px 0;
      padding: 4px;
      border-left: 3px solid #888;
      padding-left: 8px;
    }
  </style>
</head>
<body>
  <h1>Safari WebSocket Debug Test</h1>

  <div id="status-container">
    <div class="status info" id="page-status">Page Loading...</div>
    <div class="status info" id="ws-status">WebSocket Not Connected</div>
  </div>

  <div id="info">
    <p><strong>User Agent:</strong> <span id="user-agent"></span></p>
    <p><strong>Location:</strong> <span id="location"></span></p>
    <p><strong>Test ID:</strong> <span id="test-id"></span></p>
  </div>

  <div id="logs"></div>

  <script>
    // Generate unique test ID
    const testId = 'test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    // Logging function
    const logs = [];
    function addLog(type, message, data) {
      const timestamp = new Date().toISOString();
      const logEntry = { timestamp, type, message, data };
      logs.push(logEntry);

      console.log('[' + type + ']', message, data || '');

      const logDiv = document.getElementById('logs');
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.textContent = timestamp + ' [' + type + '] ' + message + (data ? ' ' + JSON.stringify(data) : '');
      logDiv.appendChild(entry);
      logDiv.scrollTop = logDiv.scrollHeight;
    }

    // Update status
    function updateStatus(elementId, message, className) {
      const el = document.getElementById(elementId);
      el.textContent = message;
      el.className = 'status ' + className;
      addLog('STATUS', elementId + ': ' + message);
    }

    // Page load tracking
    addLog('PAGE', 'Script started', { testId });
    document.getElementById('test-id').textContent = testId;
    document.getElementById('user-agent').textContent = navigator.userAgent;
    document.getElementById('location').textContent = window.location.href;

    // Track document ready state
    addLog('PAGE', 'Document readyState', { readyState: document.readyState });

    document.addEventListener('DOMContentLoaded', () => {
      addLog('PAGE', 'DOMContentLoaded event fired');
      updateStatus('page-status', 'DOM Ready', 'success');
    });

    window.addEventListener('load', () => {
      addLog('PAGE', 'Window load event fired');
      updateStatus('page-status', 'Page Fully Loaded', 'success');
    });

    // WebSocket connection
    let ws = null;
    let wsConnectionAttempt = 0;
    let wsReconnectTimer = null;

    function connectWebSocket() {
      wsConnectionAttempt++;
      const attemptNum = wsConnectionAttempt;

      // Use localhost - BrowserStack Local should redirect to bs-local.com
      const wsUrl = 'ws://localhost:${PORT}/ws?testId=' + testId + '&attempt=' + attemptNum;

      addLog('WEBSOCKET', 'Attempting connection', {
        url: wsUrl,
        attempt: attemptNum,
        WebSocketAvailable: typeof WebSocket !== 'undefined'
      });

      updateStatus('ws-status', 'Connecting (attempt ' + attemptNum + ')...', 'warning');

      try {
        ws = new WebSocket(wsUrl);

        addLog('WEBSOCKET', 'WebSocket object created', {
          readyState: ws.readyState,
          url: ws.url,
          protocol: ws.protocol,
          extensions: ws.extensions
        });

        ws.onopen = function(event) {
          addLog('WEBSOCKET', 'onopen event fired', {
            readyState: ws.readyState,
            url: ws.url,
            protocol: ws.protocol,
            extensions: ws.extensions
          });
          updateStatus('ws-status', 'Connected!', 'success');

          // Send hello message
          const helloMsg = JSON.stringify({
            type: 'hello',
            testId: testId,
            attempt: attemptNum,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          });
          addLog('WEBSOCKET', 'Sending hello message', { message: helloMsg });
          ws.send(helloMsg);
        };

        ws.onmessage = function(event) {
          addLog('WEBSOCKET', 'Message received', {
            data: event.data,
            readyState: ws.readyState
          });
        };

        ws.onerror = function(event) {
          addLog('WEBSOCKET', 'onerror event fired', {
            type: event.type,
            readyState: ws.readyState,
            // Error events don't expose much detail in browsers
            message: event.message || 'WebSocket error (details not available)'
          });
          updateStatus('ws-status', 'Error occurred', 'error');
        };

        ws.onclose = function(event) {
          addLog('WEBSOCKET', 'onclose event fired', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            readyState: ws.readyState
          });
          updateStatus('ws-status', 'Disconnected (code: ' + event.code + ')', 'error');

          // Auto-reconnect after 3 seconds
          if (wsReconnectTimer) clearTimeout(wsReconnectTimer);
          wsReconnectTimer = setTimeout(() => {
            addLog('WEBSOCKET', 'Auto-reconnecting...');
            connectWebSocket();
          }, 3000);
        };

        // Monitor readyState changes
        let lastReadyState = ws.readyState;
        const stateMonitor = setInterval(() => {
          if (ws.readyState !== lastReadyState) {
            const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
            addLog('WEBSOCKET', 'ReadyState changed', {
              from: states[lastReadyState] + '(' + lastReadyState + ')',
              to: states[ws.readyState] + '(' + ws.readyState + ')'
            });
            lastReadyState = ws.readyState;
          }

          // Stop monitoring if closed
          if (ws.readyState === 3) { // CLOSED
            clearInterval(stateMonitor);
          }
        }, 100);

      } catch (error) {
        addLog('WEBSOCKET', 'Exception creating WebSocket', {
          error: error.message,
          stack: error.stack
        });
        updateStatus('ws-status', 'Exception: ' + error.message, 'error');
      }
    }

    // Start WebSocket connection when page is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', connectWebSocket);
    } else {
      connectWebSocket();
    }

    // Send periodic heartbeat to show page is alive
    setInterval(() => {
      addLog('HEARTBEAT', 'Page still active', {
        wsReadyState: ws ? ws.readyState : null,
        logsCount: logs.length
      });
    }, 10000);

    // Expose logs for debugging
    window.debugLogs = logs;
    window.getAllLogs = function() {
      return JSON.stringify(logs, null, 2);
    };

    addLog('PAGE', 'Script initialization complete');
  </script>
</body>
</html>`;

    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    });
    res.end(html);

    log('HTTP_RESPONSE', {
      socketId,
      statusCode: 200,
      contentType: 'text/html',
      contentLength: html.length
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');

    log('HTTP_RESPONSE', {
      socketId,
      statusCode: 404
    });
  }
});

// Track HTTP socket lifecycle
server.on('connection', (socket) => {
  const socketId = getSocketId(socket);

  log('HTTP_SOCKET_OPEN', {
    socketId,
    remoteAddress: socket.remoteAddress,
    remotePort: socket.remotePort,
    localAddress: socket.localAddress,
    localPort: socket.localPort
  });

  socket.on('close', (hadError) => {
    log('HTTP_SOCKET_CLOSE', {
      socketId,
      hadError,
      remoteAddress: socket.remoteAddress
    });
  });

  socket.on('error', (error) => {
    log('HTTP_SOCKET_ERROR', {
      socketId,
      error: error.message,
      code: error.code
    });
  });
});

// Create WebSocket server
const wss = new WebSocketServer({
  server,
  path: '/ws'
});

log('SERVER_INIT', {
  message: 'WebSocket server created',
  path: '/ws'
});

wss.on('connection', (ws, req) => {
  const socketId = getSocketId(req.socket);
  const wsId = 'ws-' + (++socketIdCounter);

  log('WS_CONNECTION_OPEN', {
    wsId,
    socketId,
    url: req.url,
    host: req.headers.host,
    origin: req.headers.origin,
    userAgent: req.headers['user-agent'],
    remoteAddress: req.socket.remoteAddress,
    remotePort: req.socket.remotePort,
    headers: req.headers
  });

  ws.on('message', (data) => {
    const message = data.toString();
    log('WS_MESSAGE_RECEIVED', {
      wsId,
      socketId,
      message,
      length: message.length,
      parsed: (() => {
        try {
          return JSON.parse(message);
        } catch (e) {
          return null;
        }
      })()
    });

    // Echo back
    const response = JSON.stringify({
      type: 'echo',
      received: message,
      serverTime: new Date().toISOString()
    });

    ws.send(response);

    log('WS_MESSAGE_SENT', {
      wsId,
      socketId,
      message: response
    });
  });

  ws.on('close', (code, reason) => {
    log('WS_CONNECTION_CLOSE', {
      wsId,
      socketId,
      code,
      reason: reason.toString(),
      remoteAddress: req.socket.remoteAddress
    });
  });

  ws.on('error', (error) => {
    log('WS_ERROR', {
      wsId,
      socketId,
      error: error.message,
      code: error.code
    });
  });

  ws.on('ping', (data) => {
    log('WS_PING', {
      wsId,
      socketId,
      data: data.toString()
    });
  });

  ws.on('pong', (data) => {
    log('WS_PONG', {
      wsId,
      socketId,
      data: data.toString()
    });
  });

  // Send periodic pings
  const pingInterval = setInterval(() => {
    if (ws.readyState === 1) { // OPEN
      ws.ping();
      log('WS_PING_SENT', { wsId, socketId });
    } else {
      clearInterval(pingInterval);
    }
  }, 5000);
});

wss.on('error', (error) => {
  log('WSS_ERROR', {
    error: error.message,
    code: error.code
  });
});

// Start server on all interfaces
server.listen(PORT, '0.0.0.0', () => {
  log('SERVER_LISTENING', {
    port: PORT,
    host: '0.0.0.0',
    address: server.address(),
    message: `Server running on http://0.0.0.0:${PORT}`
  });
  console.log('');
  console.log('='.repeat(80));
  console.log('DEBUG SERVER READY');
  console.log('='.repeat(80));
  console.log(`HTTP Server: http://0.0.0.0:${PORT}`);
  console.log(`WebSocket Server: ws://0.0.0.0:${PORT}/ws`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Start BrowserStack Local tunnel');
  console.log('2. Run: node debug-safari-webdriver.js');
  console.log('='.repeat(80));
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  log('SERVER_SHUTDOWN', { signal: 'SIGINT' });
  server.close(() => {
    log('SERVER_CLOSED', { message: 'HTTP server closed' });
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  log('SERVER_SHUTDOWN', { signal: 'SIGTERM' });
  server.close(() => {
    log('SERVER_CLOSED', { message: 'HTTP server closed' });
    process.exit(0);
  });
});

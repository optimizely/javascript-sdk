// Capture all console methods and send to server
(function() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };

  ['log', 'error', 'warn', 'info'].forEach(method => {
    console[method] = function(...args) {
      // Send to server via fetch
      fetch('/__vitest_console__', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: method,
          message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
          timestamp: Date.now()
        })
      }).catch(() => {});

      // Call original
      originalConsole[method].apply(console, args);
    };
  });

  // Capture uncaught errors
  window.addEventListener('error', (e) => {
    fetch('/__vitest_console__', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'error',
        message: 'Uncaught: ' + e.message + ' at ' + e.filename + ':' + e.lineno,
        timestamp: Date.now()
      })
    }).catch(() => {});
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    fetch('/__vitest_console__', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'error',
        message: 'Unhandled Promise Rejection: ' + (e.reason?.message || e.reason),
        timestamp: Date.now()
      })
    }).catch(() => {});
  });

  // Log that capture is active
  console.log('[Console Capture] Initialized successfully');

  // Debug: Check if Vitest browser globals are set
  console.log('[Debug] window.__vitest_browser_runner__:', typeof window.__vitest_browser_runner__, window.__vitest_browser_runner__);

  // Intercept XMLHttpRequest to log headers for __vitest_api__ requests
  const OriginalXMLHttpRequest = window.XMLHttpRequest;
  window.XMLHttpRequest = function() {
    const xhr = new OriginalXMLHttpRequest();
    const originalOpen = xhr.open;
    const originalSetRequestHeader = xhr.setRequestHeader;
    const originalSend = xhr.send;

    let requestUrl = '';
    let requestMethod = '';
    const requestHeaders = {};

    xhr.open = function(method, url, ...args) {
      requestUrl = url;
      requestMethod = method;
      if (url.includes('__vitest_api__')) {
        console.log('[XHR BROWSER] Opening request:', method, url);
      }
      return originalOpen.apply(this, [method, url, ...args]);
    };

    xhr.setRequestHeader = function(header, value) {
      requestHeaders[header] = value;
      if (requestUrl.includes('__vitest_api__')) {
        console.log('[XHR BROWSER] Setting header:', header, '=', value);
      }
      return originalSetRequestHeader.apply(this, arguments);
    };

    xhr.send = function(...args) {
      if (requestUrl.includes('__vitest_api__')) {
        console.log('[XHR BROWSER] Sending request to:', requestUrl);
        console.log('[XHR BROWSER] All request headers:', JSON.stringify(requestHeaders, null, 2));
      }
      return originalSend.apply(this, args);
    };

    return xhr;
  };

  // Intercept fetch API to log headers for __vitest_api__ requests
  const originalFetch = window.fetch;
  window.fetch = function(url, options) {
    if (url.includes && url.includes('__vitest_api__')) {
      console.log('[FETCH BROWSER] Request URL:', url);
      console.log('[FETCH BROWSER] Request options:', JSON.stringify(options, null, 2));
      if (options && options.headers) {
        console.log('[FETCH BROWSER] Request headers:', JSON.stringify(options.headers, null, 2));
      }
    }
    return originalFetch.apply(this, arguments);
  };

  // Intercept WebSocket constructor to log all WebSocket creation attempts
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    const isVitestApi = url.includes('__vitest_api__');

    console.log('[WebSocket] Creating WebSocket:', url);
    console.log('[WebSocket] Protocols:', protocols);
    console.log('[WebSocket] Current location:', window.location.href);

    if (isVitestApi) {
      console.log('[WebSocket BROWSER] ==================== VITEST API WEBSOCKET ====================');
      console.log('[WebSocket BROWSER] URL:', url);
      console.log('[WebSocket BROWSER] Protocols:', protocols);
      console.log('[WebSocket BROWSER] Location origin:', window.location.origin);
      console.log('[WebSocket BROWSER] Location protocol:', window.location.protocol);
      console.log('[WebSocket BROWSER] Location host:', window.location.host);
      console.log('[WebSocket BROWSER] Location hostname:', window.location.hostname);
      console.log('[WebSocket BROWSER] Location port:', window.location.port);
      console.log('[WebSocket BROWSER] Location href:', window.location.href);
      console.log('[WebSocket BROWSER] User Agent:', navigator.userAgent);
      console.log('[WebSocket BROWSER] =================================================================');
    }

    // Add debug parameter to track if URL is preserved through BrowserStack tunnel
    const debugId = 'debug-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    const separator = url.includes('?') ? '&' : '?';
    const debugUrl = url + separator + 'wsDebugId=' + debugId;

    console.log('[WebSocket] Original URL:', url);
    console.log('[WebSocket] Debug URL:', debugUrl);
    console.log('[WebSocket] Debug ID:', debugId);

    try {
      const ws = new OriginalWebSocket(debugUrl, protocols);

      // Log initial state
      const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
      console.log('[WebSocket] State:', stateNames[ws.readyState], '(', ws.readyState, ') - URL:', url);

      // Intercept send() to log outgoing data
      const originalSend = ws.send.bind(ws);
      ws.send = function(data) {
        console.log('[WebSocket] SENDING to:', url);
        console.log('[WebSocket] Data type:', typeof data);
        console.log('[WebSocket] Data length:', data.length || data.byteLength || 0);

        // Log data preview
        if (typeof data === 'string') {
          console.log('[WebSocket] Data preview:', data.substring(0, 200));
        } else if (data instanceof ArrayBuffer) {
          console.log('[WebSocket] ArrayBuffer size:', data.byteLength);
        } else if (data instanceof Blob) {
          console.log('[WebSocket] Blob size:', data.size, 'type:', data.type);
        }

        if (isVitestApi) {
          console.log('[WebSocket BROWSER] SENDING data to __vitest_api__');
        }

        return originalSend(data);
      };

      // Track state changes
      let lastState = ws.readyState;
      const stateCheckInterval = setInterval(() => {
        if (ws.readyState !== lastState) {
          console.log('[WebSocket] STATE CHANGE:', stateNames[lastState], '->', stateNames[ws.readyState], '- URL:', url);
          if (isVitestApi) {
            console.log('[WebSocket BROWSER] __vitest_api__ state changed to:', stateNames[ws.readyState]);
          }
          lastState = ws.readyState;
        }

        // Stop checking after WebSocket is closed
        if (ws.readyState === 3) { // CLOSED
          clearInterval(stateCheckInterval);
        }
      }, 100);

      // Listen for incoming messages
      ws.addEventListener('message', (event) => {
        console.log('[WebSocket] MESSAGE RECEIVED from:', url);
        console.log('[WebSocket] Data type:', typeof event.data);
        console.log('[WebSocket] Data length:', event.data.length || event.data.byteLength || event.data.size || 0);

        if (typeof event.data === 'string') {
          console.log('[WebSocket] Message preview:', event.data.substring(0, 200));
        } else if (event.data instanceof ArrayBuffer) {
          console.log('[WebSocket] ArrayBuffer received, size:', event.data.byteLength);
        } else if (event.data instanceof Blob) {
          console.log('[WebSocket] Blob received, size:', event.data.size, 'type:', event.data.type);
        }

        if (isVitestApi) {
          console.log('[WebSocket BROWSER] __vitest_api__ message received');
        }
      });

      ws.addEventListener('open', () => {
        console.log('[WebSocket] OPENED:', url);
        console.log('[WebSocket] State:', stateNames[ws.readyState], '(', ws.readyState, ') - URL:', url);
        console.log('[WebSocket] Extensions:', ws.extensions);
        console.log('[WebSocket] Protocol:', ws.protocol);
        console.log('[WebSocket] BufferedAmount:', ws.bufferedAmount);

        if (isVitestApi) {
          console.log('[WebSocket BROWSER] __vitest_api__ connection OPENED successfully');
          console.log('[WebSocket BROWSER] Extensions:', ws.extensions);
          console.log('[WebSocket BROWSER] Protocol:', ws.protocol);
        }
      });

      ws.addEventListener('error', (event) => {
        console.log('[WebSocket] ERROR:', url, event);
        console.log('[WebSocket] State at error:', stateNames[ws.readyState], '(', ws.readyState, ')');

        if (isVitestApi) {
          console.log('[WebSocket BROWSER] __vitest_api__ connection ERROR');
        }
      });

      ws.addEventListener('close', (event) => {
        console.log('[WebSocket] CLOSED:', url);
        console.log('[WebSocket] Close code:', event.code);
        console.log('[WebSocket] Close reason:', event.reason || '(none)');
        console.log('[WebSocket] Was clean:', event.wasClean);
        console.log('[WebSocket] Final state:', stateNames[ws.readyState], '(', ws.readyState, ')');

        // Clear state check interval
        clearInterval(stateCheckInterval);

        if (isVitestApi) {
          console.log('[WebSocket BROWSER] __vitest_api__ connection CLOSED');
          console.log('[WebSocket BROWSER] Close code:', event.code);
          console.log('[WebSocket BROWSER] Close reason:', event.reason || '(none)');
          console.log('[WebSocket BROWSER] Was clean:', event.wasClean);
        }
      });

      return ws;
    } catch (error) {
      console.error('[WebSocket] FAILED to create:', url, error);
      if (isVitestApi) {
        console.error('[WebSocket BROWSER] __vitest_api__ connection FAILED to create:', error);
      }
      throw error;
    }
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;
})();

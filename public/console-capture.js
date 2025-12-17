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

      ws.addEventListener('open', () => {
        console.log('[WebSocket] OPENED:', url);
        if (isVitestApi) {
          console.log('[WebSocket BROWSER] __vitest_api__ connection OPENED successfully');
        }
      });

      ws.addEventListener('error', (event) => {
        console.log('[WebSocket] ERROR:', url, event);
        if (isVitestApi) {
          console.log('[WebSocket BROWSER] __vitest_api__ connection ERROR');
        }
      });

      ws.addEventListener('close', (event) => {
        console.log('[WebSocket] CLOSED:', url, 'code:', event.code, 'reason:', event.reason);
        if (isVitestApi) {
          console.log('[WebSocket BROWSER] __vitest_api__ connection CLOSED - code:', event.code, 'reason:', event.reason);
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

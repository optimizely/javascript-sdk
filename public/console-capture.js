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
  // const OriginalXMLHttpRequest = window.XMLHttpRequest;
  // window.XMLHttpRequest = function() {
  //   const xhr = new OriginalXMLHttpRequest();
  //   const originalOpen = xhr.open;
  //   const originalSetRequestHeader = xhr.setRequestHeader;
  //   const originalSend = xhr.send;

  //   let requestUrl = '';
  //   let requestMethod = '';
  //   const requestHeaders = {};

  //   xhr.open = function(method, url, ...args) {
  //     requestUrl = url;
  //     requestMethod = method;
  //     if (url.includes('__vitest_api__')) {
  //       console.log('[XHR BROWSER] Opening request:', method, url);
  //     }
  //     return originalOpen.apply(this, [method, url, ...args]);
  //   };

  //   xhr.setRequestHeader = function(header, value) {
  //     requestHeaders[header] = value;
  //     if (requestUrl.includes('__vitest_api__')) {
  //       console.log('[XHR BROWSER] Setting header:', header, '=', value);
  //     }
  //     return originalSetRequestHeader.apply(this, arguments);
  //   };

  //   xhr.send = function(...args) {
  //     if (requestUrl.includes('__vitest_api__')) {
  //       console.log('[XHR BROWSER] Sending request to:', requestUrl);
  //       console.log('[XHR BROWSER] All request headers:', JSON.stringify(requestHeaders, null, 2));
  //     }
  //     return originalSend.apply(this, args);
  //   };

  //   return xhr;
  // };

  // Intercept fetch API to log headers for __vitest_api__ requests
  // const originalFetch = window.fetch;
  // window.fetch = function(url, options) {
  //   if (url.includes && url.includes('__vitest_api__')) {
  //     console.log('[FETCH BROWSER] Request URL:', url);
  //     console.log('[FETCH BROWSER] Request options:', JSON.stringify(options, null, 2));
  //     if (options && options.headers) {
  //       console.log('[FETCH BROWSER] Request headers:', JSON.stringify(options.headers, null, 2));
  //     }
  //   }
  //   return originalFetch.apply(this, arguments);
  // };

  // Intercept WebSocket constructor to log connection attempts and status changes
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    // Log the connection request with full URL including protocol
    const fullUrl = url.startsWith('ws://') || url.startsWith('wss://')
      ? url
      : (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + url;

    console.log('[WebSocket] Connecting to:', fullUrl);

    try {
      const ws = new OriginalWebSocket(url, protocols);

      // Log connection status change events
      ws.addEventListener('open', () => {
        console.log('[WebSocket] Connection OPENED:', fullUrl);
      });

      ws.addEventListener('error', () => {
        console.log('[WebSocket] Connection ERROR:', fullUrl);
      });

      ws.addEventListener('close', (event) => {
        console.log('[WebSocket] Connection CLOSED:', fullUrl, '- Code:', event.code, '- Reason:', event.reason || '(none)');
      });

      return ws;
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', fullUrl, error);
      throw error;
    }
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;
})();

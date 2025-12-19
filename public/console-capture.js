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
})();

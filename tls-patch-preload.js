/**
 * TLS Module Preload Patch
 *
 * This script MUST be loaded via Node's --require flag BEFORE any other modules load.
 * It patches the TLS module to intercept WebSocket upgrade requests and inject missing headers.
 *
 * Usage: node --require ./tls-patch-preload.js <your-script>
 */

const Module = require('module');

let connectionCounter = 0;

// Function to patch TLS module
function patchTLSModule(module, source) {
  if (!module.TLSSocket || module.TLSSocket.__tlsPatched) {
    return false;
  }

  console.log(`[TLS-PRELOAD] 🎯 Patching TLSSocket from ${source}`);

  const OriginalTLSSocket = module.TLSSocket;

  // Replace TLSSocket constructor
  module.TLSSocket = function (socket, options) {
    const connId = ++connectionCounter;
    console.log(`[TLS-PRELOAD-${connId}] 🔐 TLSSocket created`);

    // Call original constructor
    const instance = new OriginalTLSSocket(socket, options);

    // Mark this instance as our patched socket
    instance.__tlsPatched = true;
    instance.__tlsPatchedConnId = connId;

    let headerBuffer = Buffer.alloc(0);
    let headersProcessed = false;

    // Wait for TLS handshake to complete
    instance.once('secure', () => {
      console.log(`[TLS-PRELOAD-${connId}] 🔒 Secure connection established`);

      if (!instance._handle || !instance._handle.onread) {
        console.log(`[TLS-PRELOAD-${connId}] ⚠️  No _handle.onread available`);
        return;
      }

      const originalOnread = instance._handle.onread;

      // Intercept raw data BEFORE HTTP parser processes it
      instance._handle.onread = function (nread, buffer) {
        if (nread > 0 && buffer && !headersProcessed) {
          console.log(`[TLS-PRELOAD-${connId}] 📦 Intercepted ${nread} bytes`);

          const chunk = buffer.slice(0, nread);
          headerBuffer = Buffer.concat([headerBuffer, chunk]);
          const text = headerBuffer.toString('utf8');
          const headerEndIndex = text.indexOf('\r\n\r\n');

          if (headerEndIndex !== -1) {
            headersProcessed = true;
            console.log(`[TLS-PRELOAD-${connId}] ✅ Complete HTTP headers received`);

            const hasWebSocketKey = text.toLowerCase().includes('sec-websocket-key');
            const hasUpgrade = /upgrade:\s*websocket/i.test(text);
            const hasConnection = /connection:.*upgrade/i.test(text);

            // Inject missing headers for Safari WebSocket requests
            // Universal detection: any request with sec-websocket-key but missing upgrade headers
            if (hasWebSocketKey && (!hasUpgrade || !hasConnection)) {
              console.log('\n' + '='.repeat(80));
              console.log(`[TLS-PRELOAD-${connId}] 🎯 WEBSOCKET REQUEST DETECTED (missing headers)`);
              console.log(`[TLS-PRELOAD-${connId}]   Has Sec-WebSocket-Key: ${hasWebSocketKey}`);
              console.log(`[TLS-PRELOAD-${connId}]   Has Upgrade header: ${hasUpgrade}`);
              console.log(`[TLS-PRELOAD-${connId}]   Has Connection header: ${hasConnection}`);
              console.log(`[TLS-PRELOAD-${connId}]   Request line: ${text.split('\r\n')[0]}`);
              console.log('='.repeat(80) + '\n');
              console.log(`[TLS-PRELOAD-${connId}] 🔧 INJECTING MISSING WEBSOCKET HEADERS!`);

              const lines = text.substring(0, headerEndIndex).split('\r\n');
              const requestLine = lines[0];
              const headers = new Map();

              // Parse existing headers
              for (let i = 1; i < lines.length; i++) {
                const colonIdx = lines[i].indexOf(':');
                if (colonIdx > 0) {
                  const key = lines[i].substring(0, colonIdx).toLowerCase();
                  headers.set(key, lines[i]);
                }
              }

              // Inject missing headers
              if (!hasUpgrade) {
                headers.set('upgrade', 'Upgrade: websocket');
                console.log(`[TLS-PRELOAD-${connId}]   ✅ Injected: Upgrade: websocket`);
              }
              if (!hasConnection) {
                headers.set('connection', 'Connection: Upgrade');
                console.log(`[TLS-PRELOAD-${connId}]   ✅ Injected: Connection: Upgrade`);
              }

              // Reconstruct HTTP request with injected headers
              const newLines = [requestLine, ...Array.from(headers.values()), '', ''];
              const body = text.substring(headerEndIndex + 4);
              const modifiedRequest = Buffer.concat([
                Buffer.from(newLines.join('\r\n'), 'utf8'),
                Buffer.from(body, 'utf8')
              ]);

              // Replace buffer contents with modified request
              modifiedRequest.copy(buffer);
              console.log(`[TLS-PRELOAD-${connId}] ✅ Headers injected! Forwarding ${modifiedRequest.length} bytes`);
              return originalOnread.call(this, modifiedRequest.length, buffer);
            }
          }
        }

        // Pass through unmodified
        return originalOnread.call(this, nread, buffer);
      };
    });

    return instance;
  };

  // Copy prototype and static properties to maintain compatibility
  Object.setPrototypeOf(module.TLSSocket, OriginalTLSSocket);
  Object.setPrototypeOf(module.TLSSocket.prototype, OriginalTLSSocket.prototype);
  module.TLSSocket.__tlsPatched = true;

  // ALSO patch the prototype to intercept _handle being set
  // This catches TLSSockets created internally by C++ code
  const originalHandleDescriptor = Object.getOwnPropertyDescriptor(OriginalTLSSocket.prototype, '_handle');

  if (originalHandleDescriptor || true) { // Always try to patch
    console.log(`[TLS-PRELOAD] 🎯 Patching TLSSocket.prototype._handle property`);

    let _internalHandle = null;

    Object.defineProperty(module.TLSSocket.prototype, '_handle', {
      get() {
        return _internalHandle;
      },
      set(newHandle) {
        const connId = ++connectionCounter;
        console.log(`[TLS-PRELOAD-${connId}] 🔌 _handle being SET on TLSSocket!`);

        _internalHandle = newHandle;

        if (newHandle && newHandle.onread && typeof newHandle.onread === 'function') {
          console.log(`[TLS-PRELOAD-${connId}] ⚡ onread EXISTS in _handle setter! Wrapping it NOW...`);

          const originalOnread = newHandle.onread;
          let headerBuffer = Buffer.alloc(0);
          let headersProcessed = false;

          newHandle.onread = function (...args) {
            const nread = args[0];
            const buffer = args[1];
            console.log(`[TLS-PRELOAD-${connId}] 🔔 PROTOTYPE-PATCHED onread! nread=${nread}, bufferLen=${buffer ? buffer.length : 'null'}`);

            if (nread > 0 && buffer && !headersProcessed) {
              console.log(`[TLS-PRELOAD-${connId}] 📊 GOT REAL DATA! ${nread} bytes`);
              // TODO: Add header injection logic here
            }

            return originalOnread.apply(this, args);
          };

          console.log(`[TLS-PRELOAD-${connId}] ✅ onread wrapped in _handle setter`);
        }
      },
      configurable: true,
      enumerable: originalHandleDescriptor?.enumerable ?? false
    });
  }

  console.log(`[TLS-PRELOAD] ✅ TLSSocket patched successfully`);
  return true;
}

// Patch any already-cached tls modules
try {
  const tlsModule = require('tls');
  if (patchTLSModule(tlsModule, 'require(tls)')) {
    console.log('[TLS-PRELOAD] Patched already-loaded tls module');
  }
} catch (e) {
  // tls not loaded yet
}

// Also hook Module.prototype.require to catch future loads
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  const module = originalRequire.apply(this, arguments);

  // Log HTTPS/TLS module loads
  if (id === 'https' || id === 'http2' || id === 'tls' || id === '_tls_wrap' || id === 'net') {
    console.log(`[TLS-PRELOAD] Module loaded: ${id}`);
  }

  if (id === 'tls' || id === '_tls_wrap') {
    patchTLSModule(module, `require(${id})`);
  }

  // Patch https module
  if (id === 'https') {
    // Patch https.createServer
    if (module.createServer) {
      const originalCreateServer = module.createServer;
      module.createServer = function(...args) {
        console.log('[TLS-PRELOAD] 🎯 https.createServer() called!');
        const server = originalCreateServer.apply(this, args);
        console.log('[TLS-PRELOAD] HTTPS server created');
        return server;
      };
      console.log('[TLS-PRELOAD] Patched https.createServer');
    }

    // Patch https.Server constructor
    if (module.Server) {
      const OriginalServer = module.Server;
      module.Server = function(...args) {
        console.log('[TLS-PRELOAD] 🎯 new https.Server() called!');
        const server = new OriginalServer(...args);
        console.log('[TLS-PRELOAD] HTTPS Server instance created');
        return server;
      };
      Object.setPrototypeOf(module.Server, OriginalServer);
      Object.setPrototypeOf(module.Server.prototype, OriginalServer.prototype);
      console.log('[TLS-PRELOAD] Patched https.Server constructor');
    }
  }

  // Patch tls.createServer
  if (id === 'tls' && module.createServer) {
    const originalTLSCreateServer = module.createServer;
    module.createServer = function(...args) {
      console.log('[TLS-PRELOAD] 🎯 tls.createServer() called!');
      const server = originalTLSCreateServer.apply(this, args);
      console.log('[TLS-PRELOAD] TLS server created');
      return server;
    };
    console.log('[TLS-PRELOAD] Patched tls.createServer');
  }

  // Patch tls.Server constructor
  if (id === 'tls' && module.Server) {
    const OriginalTLSServer = module.Server;
    module.Server = function(...args) {
      console.log('[TLS-PRELOAD] 🎯 new tls.Server() called!');
      const server = new OriginalTLSServer(...args);
      console.log('[TLS-PRELOAD] TLS Server instance created, hooking secureConnection event');

      // Hook into secureConnection event to intercept TLS sockets
      server.on('secureConnection', (tlsSocket) => {
        const connId = ++connectionCounter;
        console.log(`[TLS-PRELOAD-${connId}] 🔐 Secure connection established`);

        // Intercept socket.write to log outgoing data (server responses)
        const originalWrite = tlsSocket.write.bind(tlsSocket);
        tlsSocket.write = function(data, ...args) {
          const dataStr = data.toString('utf8', 0, Math.min(data.length, 500));
          console.log(`[TLS-PRELOAD-${connId}] 📤 OUTGOING DATA (${data.length} bytes):`);

          // Check if this looks like a WebSocket upgrade response
          if (dataStr.includes('HTTP/1.1 101') || dataStr.includes('Upgrade: websocket')) {
            console.log(`[TLS-PRELOAD-${connId}] 🎯 WEBSOCKET UPGRADE RESPONSE DETECTED!`);
            console.log(`[TLS-PRELOAD-${connId}] Response:\n${dataStr}`);

            // Parse response headers
            const lines = dataStr.split('\r\n');
            console.log(`[TLS-PRELOAD-${connId}] Status line: ${lines[0]}`);
            console.log(`[TLS-PRELOAD-${connId}] Response headers:`);
            for (let i = 1; i < lines.length && lines[i]; i++) {
              console.log(`[TLS-PRELOAD-${connId}]   ${lines[i]}`);
            }
          } else if (dataStr.includes('HTTP/')) {
            // Regular HTTP response - log all responses with headers
            const lines = dataStr.split('\r\n');
            const firstLine = lines[0];
            console.log(`[TLS-PRELOAD-${connId}] HTTP Response: ${firstLine}`);

            // Log response headers
            console.log(`[TLS-PRELOAD-${connId}] Response headers:`);
            for (let i = 1; i < lines.length && lines[i]; i++) {
              console.log(`[TLS-PRELOAD-${connId}]   ${lines[i]}`);
            }

            // Log body preview if response is small
            const headerEndIndex = dataStr.indexOf('\r\n\r\n');
            if (headerEndIndex !== -1 && dataStr.length < 500) {
              const body = dataStr.substring(headerEndIndex + 4);
              if (body) {
                console.log(`[TLS-PRELOAD-${connId}] Body preview: ${body.substring(0, 200)}`);
              }
            }
          } else if (Buffer.isBuffer(data) && data.length >= 2) {
            // WebSocket frame detection
            const firstByte = data[0];
            const isFin = (firstByte & 0x80) !== 0;
            const opcode = firstByte & 0x0F;
            const opcodes = {
              0x0: 'Continuation',
              0x1: 'Text',
              0x2: 'Binary',
              0x8: 'Close',
              0x9: 'Ping',
              0xA: 'Pong'
            };

            if (opcode === 0x8) {
              // WebSocket close frame
              console.log(`[TLS-PRELOAD-${connId}] 🔴 WEBSOCKET CLOSE FRAME SENT!`);
              console.log(`[TLS-PRELOAD-${connId}]   FIN: ${isFin}`);
              if (data.length >= 4) {
                const closeCode = data.readUInt16BE(2);
                const reason = data.length > 4 ? data.toString('utf8', 4) : '';
                console.log(`[TLS-PRELOAD-${connId}]   Close Code: ${closeCode}`);
                console.log(`[TLS-PRELOAD-${connId}]   Close Reason: ${reason || '(none)'}`);
              }
            } else if (opcodes[opcode]) {
              console.log(`[TLS-PRELOAD-${connId}] WebSocket ${opcodes[opcode]} frame (FIN: ${isFin})`);
            }

            // Binary data (WebSocket frames, etc.)
            console.log(`[TLS-PRELOAD-${connId}] Binary data (first 100 bytes hex): ${data.toString('hex', 0, Math.min(100, data.length))}`);
          } else {
            console.log(`[TLS-PRELOAD-${connId}] Data (first 100 chars): ${dataStr.substring(0, 100)}`);
          }

          return originalWrite(data, ...args);
        };

        // Intercept socket.end to log connection termination
        const originalEnd = tlsSocket.end.bind(tlsSocket);
        tlsSocket.end = function(...args) {
          console.log(`[TLS-PRELOAD-${connId}] 🔚 Socket.end() called - connection terminating`);
          console.log(`[TLS-PRELOAD-${connId}] Arguments passed to .end():`, args.length);
          if (args.length > 0) {
            args.forEach((arg, i) => {
              console.log(`[TLS-PRELOAD-${connId}] Arg ${i}:`, typeof arg, arg);
            });
          }

          // Capture stack trace to see WHERE .end() was called from
          const stack = new Error().stack;
          console.log(`[TLS-PRELOAD-${connId}] Call stack:\n${stack}`);

          return originalEnd(...args);
        };

        // Intercept socket.destroy to log forced termination
        const originalDestroy = tlsSocket.destroy.bind(tlsSocket);
        tlsSocket.destroy = function(error) {
          console.log(`[TLS-PRELOAD-${connId}] 💥 Socket.destroy() called - connection force closed`);
          if (error) {
            console.log(`[TLS-PRELOAD-${connId}] Destroy error:`, error.message);
          }

          // Capture stack trace to see WHERE .destroy() was called from
          const stack = new Error().stack;
          console.log(`[TLS-PRELOAD-${connId}] Call stack:\n${stack}`);

          return originalDestroy(error);
        };

        // Check what event listeners are already registered
        const dataListeners = tlsSocket.listeners('data');
        console.log(`[TLS-PRELOAD-${connId}] 📋 Found ${dataListeners.length} 'data' listeners`);

        if (dataListeners.length > 0) {
          console.log(`[TLS-PRELOAD-${connId}] 🎯 Wrapping existing 'data' listener(s)!`);

          // State machine: "readingHeaders" -> "passingThrough"
          let state = 'readingHeaders';
          let headerBuffer = Buffer.alloc(0);
          let requestCount = 0;

          // Remove all existing 'data' listeners
          tlsSocket.removeAllListeners('data');

          // Add our interceptor
          tlsSocket.on('data', (chunk) => {
            console.log(`[TLS-PRELOAD-${connId}] 📦 INTERCEPTED DATA! ${chunk.length} bytes (state: ${state})`);

            if (state === 'passingThrough') {
              // Just forward all data directly to original handlers
              console.log(`[TLS-PRELOAD-${connId}] 🔄 Passing through ${chunk.length} bytes`);
              for (const originalListener of dataListeners) {
                originalListener.call(tlsSocket, chunk);
              }
              return;
            }

            // State: readingHeaders - accumulate until we find header end marker
            headerBuffer = Buffer.concat([headerBuffer, chunk]);
            const text = headerBuffer.toString('utf8');
            const headerEndIndex = text.indexOf('\r\n\r\n');

            if (headerEndIndex !== -1) {
              // Found end of headers!
              requestCount++;
              console.log(`[TLS-PRELOAD-${connId}] ✅ Complete HTTP headers received (request #${requestCount})`);

              const hasWebSocketKey = text.toLowerCase().includes('sec-websocket-key');
              const hasUpgrade = /upgrade:\s*websocket/i.test(text);
              const hasConnection = /connection:.*upgrade/i.test(text);
              const isWebSocketUpgrade = hasWebSocketKey || hasUpgrade;

              // Log all headers for WebSocket requests
              if (isWebSocketUpgrade) {
                console.log('\n' + '='.repeat(80));
                console.log(`[TLS-PRELOAD-${connId}] 🎯 INCOMING WEBSOCKET REQUEST HEADERS`);
                console.log(`[TLS-PRELOAD-${connId}]   Request line: ${text.split('\r\n')[0]}`);

                const lines = text.substring(0, headerEndIndex).split('\r\n');
                console.log(`[TLS-PRELOAD-${connId}]   All request headers:`);
                for (let i = 1; i < lines.length; i++) {
                  if (lines[i]) {
                    console.log(`[TLS-PRELOAD-${connId}]     ${lines[i]}`);
                  }
                }

                console.log(`[TLS-PRELOAD-${connId}]   Has Sec-WebSocket-Key: ${hasWebSocketKey}`);
                console.log(`[TLS-PRELOAD-${connId}]   Has Upgrade header: ${hasUpgrade}`);
                console.log(`[TLS-PRELOAD-${connId}]   Has Connection header: ${hasConnection}`);
                console.log('='.repeat(80) + '\n');
              }

              // If request has Sec-WebSocket-Key but is missing Upgrade/Connection headers, inject them
              if (hasWebSocketKey && (!hasUpgrade || !hasConnection)) {
                console.log('\n' + '='.repeat(80));
                console.log(`[TLS-PRELOAD-${connId}] 🔧 INJECTING MISSING WEBSOCKET HEADERS!`);
                console.log('='.repeat(80) + '\n');

                // Inject missing headers for Safari WebSocket requests
                console.log(`[TLS-PRELOAD-${connId}] 🔧 INJECTING MISSING WEBSOCKET HEADERS!`);

                const lines = text.substring(0, headerEndIndex).split('\r\n');
                const requestLine = lines[0];
                const headers = new Map();

                // Parse existing headers (preserving order for non-duplicate keys)
                for (let i = 1; i < lines.length; i++) {
                  const colonIdx = lines[i].indexOf(':');
                  if (colonIdx > 0) {
                    const key = lines[i].substring(0, colonIdx).toLowerCase();
                    headers.set(key, lines[i]);
                  }
                }

                // Inject missing headers
                if (!hasUpgrade) {
                  headers.set('upgrade', 'Upgrade: websocket');
                  console.log(`[TLS-PRELOAD-${connId}]   ✅ Injected: Upgrade: websocket`);
                }
                if (!hasConnection) {
                  headers.set('connection', 'Connection: Upgrade');
                  console.log(`[TLS-PRELOAD-${connId}]   ✅ Injected: Connection: Upgrade`);
                }

                // Reconstruct HTTP request with injected headers
                const newLines = [requestLine, ...Array.from(headers.values()), '', ''];
                const modifiedRequest = newLines.join('\r\n');

                console.log(`[TLS-PRELOAD-${connId}] ✅ Headers injected! Forwarding modified headers`);

                // Replace header buffer with modified version (just the headers part)
                headerBuffer = Buffer.from(modifiedRequest, 'utf8');
              }

              // Forward the accumulated header buffer (possibly modified) to original handlers
              console.log(`[TLS-PRELOAD-${connId}] 📨 Forwarding ${headerBuffer.length} bytes to original handlers`);
              for (const originalListener of dataListeners) {
                originalListener.call(tlsSocket, headerBuffer);
              }

              // Switch to passingThrough state
              state = 'passingThrough';
              console.log(`[TLS-PRELOAD-${connId}] ✅ Switched to passingThrough state - will forward all subsequent data`);

              // Reset header buffer for next request (Keep-Alive)
              headerBuffer = Buffer.alloc(0);
            }
            // else: Still accumulating headers, keep buffering
          });

          console.log(`[TLS-PRELOAD-${connId}] ✅ Data event interceptor installed`);
        }
      });

      return server;
    };
    Object.setPrototypeOf(module.Server, OriginalTLSServer);
    Object.setPrototypeOf(module.Server.prototype, OriginalTLSServer.prototype);
    console.log('[TLS-PRELOAD] Patched tls.Server constructor');
  }

  return module;
};

console.log('🎯 TLS preload script loaded - Module.require patched');

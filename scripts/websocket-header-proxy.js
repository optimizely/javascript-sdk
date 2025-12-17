#!/usr/bin/env node

/**
 * WebSocket Header Injection Proxy for Safari on BrowserStack
 *
 * Problem: BrowserStack tunnel strips Upgrade/Connection headers from Safari WebSocket requests
 * Solution: TCP-level proxy that intercepts raw HTTP bytes and injects missing headers
 *
 * This proxy:
 * 1. Listens on port 63315 (BrowserStack connects here)
 * 2. Forwards to Vite on port 5173
 * 3. Detects WebSocket upgrade requests by sec-websocket-key header
 * 4. Injects Upgrade: websocket and Connection: Upgrade if missing
 */

const net = require('net');
const tls = require('tls');
const fs = require('fs');

const PROXY_PORT = 7777;  // Port where proxy listens (BrowserStack Local will use this as proxy)
const VITEST_API_PORT = 63315;    // Vitest API server port
const VITEST_API_HOST = 'bs-local.com'; // Vitest API listens on bs-local.com
const PROXY_HOST = '127.0.0.1'; // Proxy listens on localhost

// Load TLS certificates
const tlsOptions = {
  key: fs.readFileSync('.cert/key.pem'),
  cert: fs.readFileSync('.cert/cert.pem'),
};

let connectionCounter = 0;

function log(message, ...args) {
  console.log(`[WS-PROXY] ${message}`, ...args);
}

// Parse HTTP headers from raw buffer
function parseHttpHeaders(buffer) {
  const text = buffer.toString('utf8');
  const lines = text.split('\r\n');
  const requestLine = lines[0];
  const headers = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') break; // End of headers

    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).toLowerCase();
      const value = line.substring(colonIndex + 1).trim();
      headers[key] = value;
    }
  }

  return { requestLine, headers, raw: text };
}

// Rebuild HTTP request with injected headers
function injectHeaders(buffer, headersToInject) {
  const text = buffer.toString('utf8');
  const headerEndIndex = text.indexOf('\r\n\r\n');

  if (headerEndIndex === -1) {
    return buffer; // Incomplete request, don't modify
  }

  const lines = text.substring(0, headerEndIndex).split('\r\n');
  const requestLine = lines[0];
  const body = text.substring(headerEndIndex + 4);

  // Parse existing headers
  const existingHeaders = new Map();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).toLowerCase();
      existingHeaders.set(key, line);
    }
  }

  // Add missing headers
  for (const [key, value] of Object.entries(headersToInject)) {
    const lowerKey = key.toLowerCase();
    if (!existingHeaders.has(lowerKey)) {
      existingHeaders.set(lowerKey, `${key}: ${value}`);
      log(`  ✅ Injected ${key}: ${value}`);
    }
  }

  // Rebuild request
  const newLines = [requestLine];
  for (const headerLine of existingHeaders.values()) {
    newLines.push(headerLine);
  }
  newLines.push('');
  newLines.push('');

  const newHeaders = newLines.join('\r\n');
  return Buffer.concat([
    Buffer.from(newHeaders, 'utf8'),
    Buffer.from(body, 'utf8')
  ]);
}

// Create TLS proxy server
const proxyServer = tls.createServer(tlsOptions, (clientSocket) => {
  const connId = ++connectionCounter;
  log(`[${connId}] New connection from ${clientSocket.remoteAddress}:${clientSocket.remotePort}`);

  // Connect to Vitest API server via TLS (since Vitest uses HTTPS)
  const serverSocket = tls.connect({
    host: VITEST_API_HOST,
    port: VITEST_API_PORT,
    rejectUnauthorized: false, // Accept self-signed certificate
  });

  let isFirstChunk = true;
  let headerBuffer = Buffer.alloc(0);
  let headersProcessed = false;

  // Client -> Server (intercept and inject headers)
  clientSocket.on('data', (data) => {
    if (!headersProcessed && isFirstChunk) {
      // Accumulate data until we have complete headers
      headerBuffer = Buffer.concat([headerBuffer, data]);

      // Check if we have complete headers (ends with \r\n\r\n)
      const headerEndIndex = headerBuffer.toString('utf8').indexOf('\r\n\r\n');

      if (headerEndIndex !== -1) {
        isFirstChunk = false;
        headersProcessed = true;

        // Parse headers
        const { requestLine, headers } = parseHttpHeaders(headerBuffer);

        // Check if this is a WebSocket upgrade request
        const hasWebSocketKey = headers['sec-websocket-key'];
        const hasUpgrade = headers['upgrade']?.toLowerCase() === 'websocket';
        const hasConnection = headers['connection']?.toLowerCase().includes('upgrade');
        const isVitestApi = requestLine.includes('__vitest_api');

        if (isVitestApi && hasWebSocketKey && (!hasUpgrade || !hasConnection)) {
          log(`[${connId}] 🔧 Detected Safari WebSocket upgrade with missing headers!`);
          log(`[${connId}]   Request: ${requestLine}`);
          log(`[${connId}]   Has sec-websocket-key: true`);
          log(`[${connId}]   Has Upgrade header: ${hasUpgrade}`);
          log(`[${connId}]   Has Connection header: ${hasConnection}`);

          // Inject missing headers
          const headersToInject = {};
          if (!hasUpgrade) {
            headersToInject['Upgrade'] = 'websocket';
          }
          if (!hasConnection) {
            headersToInject['Connection'] = 'Upgrade';
          }

          const modifiedBuffer = injectHeaders(headerBuffer, headersToInject);
          serverSocket.write(modifiedBuffer);
          log(`[${connId}] ✅ Headers injected and forwarded to Vite`);
        } else {
          // Normal request, forward as-is
          serverSocket.write(headerBuffer);
        }

        headerBuffer = Buffer.alloc(0); // Clear buffer
      }
    } else {
      // Already processed headers or not first chunk, forward as-is
      serverSocket.write(data);
    }
  });

  // Server -> Client (pass through)
  serverSocket.on('data', (data) => {
    clientSocket.write(data);
  });

  // Handle errors and cleanup
  clientSocket.on('error', (err) => {
    log(`[${connId}] Client error:`, err.message);
    serverSocket.destroy();
  });

  serverSocket.on('error', (err) => {
    log(`[${connId}] Server error:`, err.message);
    clientSocket.destroy();
  });

  clientSocket.on('close', () => {
    log(`[${connId}] Client disconnected`);
    serverSocket.destroy();
  });

  serverSocket.on('close', () => {
    log(`[${connId}] Server disconnected`);
    clientSocket.destroy();
  });
});

proxyServer.listen(PROXY_PORT, PROXY_HOST, () => {
  console.log('\n' + '='.repeat(80));
  log(`WebSocket Header Injection TLS Proxy started`);
  log(`Time: ${new Date().toISOString()}`);
  log(`Listening on: ${PROXY_HOST}:${PROXY_PORT} (HTTPS)`);
  log(`Forwarding to: ${VITEST_API_HOST}:${VITEST_API_PORT}`);
  log(`Certificates: .cert/cert.pem, .cert/key.pem`);
  log(`Ready to inject WebSocket headers for Safari!`);
  console.log('='.repeat(80) + '\n');
});

proxyServer.on('error', (err) => {
  console.error('[WS-PROXY] Fatal error:', err);
  process.exit(1);
});

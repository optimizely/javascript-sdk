/**
 * Copyright 2024-2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/// <reference types="@vitest/browser/providers/webdriverio" />
// NOTE: TLS patching happens in tls-patch-preload.js (loaded via NODE_OPTIONS=--require)

import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vitest/config'
import type { BrowserInstanceOption } from 'vitest/node'
import { transform } from 'esbuild'
import dotenv from 'dotenv';
import tsconfigPaths from 'vite-tsconfig-paths'
import { Duplex } from 'stream'
import net from 'net'

// Load environment variables from .env file
dotenv.config();

// Check if we should use local browser instead of BrowserStack
const useLocalBrowser = process.env.USE_LOCAL_BROWSER === 'true';

// Define browser configuration types
interface BrowserConfig {
  name: string;
  browserName: string;
  browserVersion: string;
  os: string;
  osVersion: string;
}

// Define browser configurations
// Testing minimum supported versions: Edge 84+, Firefox 91+, Safari 15+, Chrome 102+, Opera 76+
// Note: Safari 15+ required for proper ES6 module circular dependency handling
const allBrowserConfigs: BrowserConfig[] = [
  // { name: 'chrome', browserName: 'chrome', browserVersion: '102', os: 'Windows', osVersion: '11' },
  // { name: 'firefox', browserName: 'firefox', browserVersion: '91', os: 'Windows', osVersion: '11' },
  // { name: 'edge', browserName: 'edge', browserVersion: '84', os: 'Windows', osVersion: '10' },
  { name: 'safari', browserName: 'safari', browserVersion: '15', os: 'OS X', osVersion: 'Monterey' },
    // { name: 'chrome', browserName: 'chrome', browserVersion: '102', os: 'OS X', osVersion: 'Big Sur' },
  // { name: 'opera', browserName: 'opera', browserVersion: '76', os: 'Windows', osVersion: '11' },
];

// Filter browsers based on VITEST_BROWSER environment variable
const browserFilter = process.env.VITEST_BROWSER;
const browserConfigs = browserFilter
  ? allBrowserConfigs.filter(config => config.name === browserFilter.toLowerCase())
  : allBrowserConfigs;

// Local browser capabilities type
interface LocalCapabilities {
  browserName: string;
  'goog:chromeOptions'?: {
    args: string[];
  };
  'webkit:WebRTC'?: {
    DisableICECandidateFiltering?: boolean;
  };
}

// Build local browser capabilities
function buildLocalCapabilities(browserName: string): LocalCapabilities {
  const baseCapabilities: LocalCapabilities = {
    browserName,
  };

  // Add browser-specific options
  if (browserName === 'chrome' || browserName === 'edge') {
    baseCapabilities['goog:chromeOptions'] = {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    };
  } else if (browserName === 'safari') {
    // Safari uses safaridriver and doesn't need special options for basic testing
    // safaridriver is built into macOS and starts automatically
    baseCapabilities['webkit:WebRTC'] = {
      DisableICECandidateFiltering: true,
    };
  }

  return baseCapabilities;
}

// Build BrowserStack capabilities
function buildBrowserStackCapabilities(config: typeof allBrowserConfigs[0]) {
  const capabilities: any = {
    browserName: config.browserName,
    // Global W3C capability to accept insecure certificates
    acceptInsecureCerts: true,
    'bstack:options': {
      os: config.os,
      osVersion: config.osVersion,
      browserVersion: config.browserVersion,
      buildName: process.env.VITEST_BUILD_NAME || 'Vitest Browser Tests',
      projectName: 'Optimizely JavaScript SDK',
      sessionName: `${config.browserName} ${config.browserVersion} on ${config.os} ${config.osVersion}`,
      local: process.env.BROWSERSTACK_LOCAL === 'true' ? true : false,
      // Enable WebSocket support for BrowserStack Local tunnel
      wsLocalSupport: true,
      disableCorsRestrictions: true,
      debug: true,
      networkLogs: true,
      consoleLogs: 'errors' as const,
      idleTimeout: 300, // 5 minutes idle timeout
      acceptInsecureCerts: true,
    },
  };

  // Add browser-specific options
  if (config.browserName === 'chrome' || config.browserName === 'edge') {
    capabilities['goog:chromeOptions'] = {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    };
  } else if (config.browserName === 'safari') {
    // Safari-specific W3C capabilities
    capabilities['webkit:WebRTC'] = {
      DisableICECandidateFiltering: true,
    };

    // Safari automation capabilities
    capabilities['safari:automaticInspection'] = false;
    capabilities['safari:automaticProfiling'] = false;

    // Safari-specific options for debugging
    capabilities['safari:diagnose'] = true;

    // Enable WebDriver BiDi for better WebSocket support
    capabilities['webSocketUrl'] = true;
  }

  return capabilities;
}

// Build browser instance configuration
function buildBrowserInstances(): BrowserInstanceOption[] {
  if (useLocalBrowser) {
    // Local browser configurations - all browsers
    return browserConfigs.map((config: BrowserConfig): BrowserInstanceOption => ({
      browser: config.browserName,
      capabilities: buildLocalCapabilities(config.browserName),
      logLevel: 'error' as const,
    }));
  } else {
    // BrowserStack remote configurations - all browsers
    const username = process.env.BROWSERSTACK_USERNAME || process.env.BROWSER_STACK_USERNAME;
    const key = process.env.BROWSERSTACK_ACCESS_KEY || process.env.BROWSER_STACK_ACCESS_KEY;

    return browserConfigs.map((config: BrowserConfig): BrowserInstanceOption => ({
      browser: config.browserName,
      user: username,
      key: key,
      capabilities: buildBrowserStackCapabilities(config),
      // WebDriverIO options to handle session cleanup and stability
      connectionRetryTimeout: 60000, // 1 minute
      connectionRetryCount: 3,
      waitforTimeout: 60000, // 1 minute
      logLevel: 'error' as const,
    }));
  }
}

export default defineConfig({
  plugins: [
    // forceTranspilePlugin(),
    // tsconfigPaths({
    //   projects: ['./tsconfig.spec.json'],
    // }),
    // {
    //   name: 'patch-vitest-websocket',
    //   enforce: 'pre',
    //   transform(code: string, id: string) {
    //     // Target Vite client file specifically - this is where WebSocket is created
    //     if (id.includes('node_modules/vitest/node_modules/vite/dist/client/client.mjs')) {
    //       console.log(`[WS Patch] Patching Vite client file: ${id.replace(process.cwd(), '.')}`);
    //
    //       // Simple regex replacement: replace 'localhost' with 'bs-local.com' in WebSocket URLs
    //       // This is safer than monkey-patching the constructor
    //       const patchedCode = code.replace(
    //         /new WebSocket\(`\$\{socketProtocol\}:\/\/\$\{socketHost\}/g,
    //         'new WebSocket(`${socketProtocol}://${socketHost.replace(/localhost/g, "bs-local.com")}'
    //       );
    //
    //       if (patchedCode !== code) {
    //         console.log('[WS Patch] Successfully patched WebSocket URL construction');
    //         return {
    //           code: patchedCode,
    //           map: null,
    //         };
    //       }
    //     }
    //     return null;
    //   },
    // },
    // TLS module patched at top of file - no plugin needed
    {
      name: 'vitest-api-host-fix',
      enforce: 'pre', // Run before Vitest plugin in plugin order
      configureServer(server) {
        // Handle HTTP requests to /__vitest_api__ (Safari makes these before WebSocket upgrade)
        // Return 204 No Content to prevent 404 errors
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith('/__vitest_api__')) {
            console.log('\n' + '='.repeat(100));
            console.log(`[VITEST API SERVER] ${req.method} request to ${req.url}`);
            console.log('='.repeat(100));

            // Check for debug parameter
            if (req.url.includes('wsDebugId=')) {
              const match = req.url.match(/wsDebugId=([^&]+)/);
              if (match) {
                console.log(`[VITEST API SERVER] 🔍 DEBUG ID FOUND: ${match[1]} - Request reached server!`);
              }
            }

            // Log ALL headers
            console.log('[VITEST API SERVER] ALL HEADERS:');
            console.log(JSON.stringify(req.headers, null, 2));

            // Log specific important headers
            console.log('\n[VITEST API SERVER] KEY HEADERS:');
            console.log(`  Host: "${req.headers.host}"`);
            console.log(`  Origin: "${req.headers.origin}"`);
            console.log(`  Referer: "${req.headers.referer}"`);
            console.log(`  User-Agent: "${req.headers['user-agent']}"`);
            console.log(`  Upgrade: "${req.headers.upgrade}"`);
            console.log(`  Connection: "${req.headers.connection}"`);
            console.log(`  Sec-WebSocket-Key: "${req.headers['sec-websocket-key']}"`);
            console.log(`  Sec-WebSocket-Version: "${req.headers['sec-websocket-version']}"`);
            console.log(`  Sec-WebSocket-Extensions: "${req.headers['sec-websocket-extensions']}"`);
            console.log(`  Sec-WebSocket-Protocol: "${req.headers['sec-websocket-protocol']}"`);

            const hasUpgradeWebsocket = req.headers.upgrade?.toLowerCase() === 'websocket';
            const hasConnectionUpgrade = req.headers.connection?.toLowerCase().includes('upgrade');

            console.log('\n[VITEST API SERVER] VALIDATION:');
            console.log(`  Upgrade=websocket: ${hasUpgradeWebsocket}`);
            console.log(`  Connection includes 'upgrade': ${hasConnectionUpgrade}`);

            const isWebSocketUpgrade = hasUpgradeWebsocket && hasConnectionUpgrade;
            console.log(`  Is valid WebSocket upgrade: ${isWebSocketUpgrade}`);

            if (hasUpgradeWebsocket && !hasConnectionUpgrade) {
              console.log(`  ⚠️  WARNING: Upgrade header is correct but Connection header is wrong!`);
            }
            if (!hasUpgradeWebsocket && hasConnectionUpgrade) {
              console.log(`  ⚠️  WARNING: Connection header is correct but Upgrade header is wrong!`);
            }

            // Log socket information
            console.log('\n[VITEST API SERVER] SOCKET INFO:');
            console.log(`  Remote Address: ${req.socket.remoteAddress}`);
            console.log(`  Remote Port: ${req.socket.remotePort}`);
            console.log(`  Local Address: ${req.socket.localAddress}`);
            console.log(`  Local Port: ${req.socket.localPort}`);
            console.log(`  Encrypted (TLS): ${(req.socket as any).encrypted || false}`);

            // Only intercept non-upgrade GET requests
            if (req.method === 'GET' && !isWebSocketUpgrade) {
              console.log('\n[VITEST API SERVER] -> Returning 204 No Content (not a WebSocket upgrade)');
              console.log('='.repeat(100) + '\n');
              res.writeHead(204, { 'Content-Length': '0' });
              res.end();
              return;
            }

            console.log('\n[VITEST API SERVER] -> Passing through to Vitest (WebSocket upgrade or other method)');
            console.log('='.repeat(100) + '\n');
          }
          next();
        });

        // Fix Vitest API 404 when accessed from vite.bs-local.com subdomain
        // Use direct middleware.use to run in pre-mode (before internal middleware)
        server.middlewares.use((req, res, next) => {
          const originalHost = req.headers.host;
          const originalUrl = req.url;

          // Log all requests to see what's coming through
          console.log(`[MIDDLEWARE] ${req.method} ${req.url} - Host: ${originalHost}`);

          // Chrome doesn't send Host header (undefined) and works fine
          // Safari sends vite.bs-local.com which causes Vite to misroute the request
          // Solution: Remove the Host header and normalize URL to match Chrome's behavior
          if (req.url?.includes('/__vitest')) {
            if (req.headers.host) {
              delete req.headers.host;
              console.log(`[MIDDLEWARE] Host header removed (was: ${originalHost})`);
            }
            // Also ensure URL doesn't have any host-specific prefixes
            // Though this is unlikely, normalize just in case
            if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
              const urlObj = new URL(req.url);
              req.url = urlObj.pathname + urlObj.search;
              console.log(`[MIDDLEWARE] URL normalized to: ${req.url}`);
            }
          }

          // Log responses
          const originalWriteHead = res.writeHead.bind(res);
          res.writeHead = function(statusCode: any, ...args: any[]) {
            // Check if URL was modified by later middleware
            if (req.url !== originalUrl) {
              console.log(`[RESPONSE] ${req.method} ${originalUrl} -> ${req.url} - Status: ${statusCode}`);
            } else {
              console.log(`[RESPONSE] ${req.method} ${req.url} - Status: ${statusCode}`);
            }
            return originalWriteHead(statusCode, ...args);
          } as any;

          next();
        });

        // Add endpoint to receive browser console logs
        server.middlewares.use((req, res, next) => {
          if (req.url === '/__vitest_console__' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
              try {
                const log = JSON.parse(body);
                console.log(`\n[BROWSER ${log.type.toUpperCase()}] ${log.message}\n`);
                res.writeHead(200);
                res.end('OK');
              } catch (e) {
                res.writeHead(400);
                res.end('Bad Request');
              }
            });
          } else {
            next();
          }
        });
      },
    },
    {
      name: 'log-session-id',
      enforce: 'pre', // Run before other plugins
      configureServer(server) {
        // Socket ID tracking - similar to debug server
        let socketIdCounter = 0;
        const socketMap = new WeakMap();

        function getSocketId(socket: any) {
          if (!socketMap.has(socket)) {
            socketMap.set(socket, ++socketIdCounter);
          }
          return socketMap.get(socket);
        }

        function formatLog(type: string, data: any) {
          const timestamp = new Date().toISOString();
          console.log(`[${timestamp}] [${type}] ${JSON.stringify(data, null, 2)}`);
        }

        // Track socket lifecycle FIRST (before any requests)
        server.httpServer?.on('connection', (socket) => {
          getSocketId(socket); // Track socket ID for WebSocket correlation
          // HTTP socket logs commented out for cleaner output
        });

        // Intercept at the HTTP server level to catch ALL requests
        const originalEmit = server.httpServer?.emit;
        if (server.httpServer && originalEmit) {
          const httpServer: any = server.httpServer;
          httpServer.emit = function(this: any, event: any, ...args: any[]): any {
            if (event === 'request') {
              const req = args[0];
              const socketId = getSocketId(req.socket);
              const url = req.url || '';

              formatLog('HTTP_REQUEST', {
                socketId,
                method: req.method,
                url,
                host: req.headers.host,
                origin: req.headers.origin,
                referer: req.headers.referer,
                userAgent: req.headers['user-agent'],
                remoteAddress: req.socket.remoteAddress,
                remotePort: req.socket.remotePort,
                headers: {
                  host: req.headers.host,
                  origin: req.headers.origin,
                  referer: req.headers.referer,
                  connection: req.headers.connection,
                  upgrade: req.headers.upgrade,
                  'user-agent': req.headers['user-agent'],
                },
              });

              // Special logging for Vitest test page
              if (url.includes('__vitest_test__') && url.includes('sessionId=')) {
                const fullUrl = new URL(url, `http://${req.headers.host}`);
                const sessionId = fullUrl.searchParams.get('sessionId');
                console.log('\n' + '='.repeat(80));
                console.log(`[VITEST TEST PAGE REQUEST]`);
                console.log(`Session ID: ${sessionId}`);
                console.log(`Socket ID: ${socketId}`);
                console.log(`Full URL: http://${req.headers.host}${url}`);
                console.log(`Time: ${new Date().toISOString()}`);
                console.log('='.repeat(80) + '\n');
              }
            } else if (event === 'upgrade') {
              const req = args[0];
              const socketId = getSocketId(req.socket);
              const url = req.url || '';
              const isWebSocket = req.headers.upgrade?.toLowerCase() === 'websocket';
              // Determine protocol - check if socket is encrypted (TLS)
              const protocol = (req.socket as any).encrypted ? 'https' : 'http';

              formatLog('WEBSOCKET_UPGRADE_REQUEST', {
                socketId,
                protocol,
                url: req.url,
                host: req.headers.host,
                origin: req.headers.origin,
                userAgent: req.headers['user-agent'],
                upgradeHeader: req.headers.upgrade,
                connectionHeader: req.headers.connection,
                isWebSocket,
                remoteAddress: req.socket.remoteAddress,
                remotePort: req.socket.remotePort,
                wsKey: req.headers['sec-websocket-key'],
                wsVersion: req.headers['sec-websocket-version'],
                wsExtensions: req.headers['sec-websocket-extensions'],
              });

              console.log('\n' + '-'.repeat(80));
              console.log(`[WEBSOCKET UPGRADE]`);
              console.log(`Socket ID: ${socketId}`);
              console.log(`Protocol: ${protocol}`);
              console.log(`URL: ${req.url}`);
              console.log(`Full URL: ${protocol}://${req.headers.host}${url}`);
              console.log(`Origin: ${req.headers.origin || 'none'}`);
              console.log(`Upgrade: ${req.headers.upgrade}`);
              console.log(`Connection: ${req.headers.connection}`);
              console.log(`Is WebSocket: ${isWebSocket}`);

              if (url.includes('sessionId=')) {
                const fullUrl = new URL(url, `${protocol}://${req.headers.host}`);
                const sessionId = fullUrl.searchParams.get('sessionId');
                console.log(`Session ID: ${sessionId}`);
              }
              console.log(`Time: ${new Date().toISOString()}`);
              console.log('-'.repeat(80) + '\n');
            }
            return originalEmit.apply(this, [event, ...args] as any);
          };
        }

        // Server lifecycle logging - commented out for cleaner output
        // server.httpServer?.on('listening', () => {
        //   const address = server.httpServer?.address();
        //   const port = typeof address === 'object' ? address?.port : 5173;
        //   console.log('\n' + '='.repeat(80));
        //   console.log(`[VITE SERVER READY]`);
        //   console.log(`Port: ${port}`);
        //   console.log(`Host: ${server.config.server.host || '0.0.0.0'}`);
        //   console.log(`Time: ${new Date().toISOString()}`);
        //   console.log('='.repeat(80) + '\n');
        // });

        // server.httpServer?.on('close', () => {
        //   console.log('\n' + '='.repeat(80));
        //   console.log(`[VITE SERVER CLOSED]`);
        //   console.log(`Time: ${new Date().toISOString()}`);
        //   console.log('='.repeat(80) + '\n');
        // });

        // Hook into Vite's WebSocket server to log WebSocket events
        // Vite uses 'ws' library internally
        if (server.ws) {
          const wss = (server.ws as any).wss || (server.ws as any);

          if (wss && wss.on) {
            wss.on('connection', (ws: any, req: any) => {
              const socketId = req.socket ? getSocketId(req.socket) : 'unknown';
              const wsId = 'ws-' + (++socketIdCounter);

              formatLog('WEBSOCKET_CONNECTION_ESTABLISHED', {
                wsId,
                socketId,
                url: req.url,
                origin: req.headers?.origin,
                upgradeProtocol: req.headers?.['sec-websocket-protocol'],
              });

              console.log(`[WEBSOCKET CONNECTED] wsId: ${wsId}, socketId: ${socketId}`);

              // Log messages
              ws.on('message', (data: any) => {
                const message = data.toString();
                formatLog('WEBSOCKET_MESSAGE_RECEIVED', {
                  wsId,
                  socketId,
                  message: message.length > 200 ? message.substring(0, 200) + '...' : message,
                  length: message.length,
                });
              });

              // Log pings
              ws.on('ping', (data: any) => {
                formatLog('WEBSOCKET_PING', {
                  wsId,
                  socketId,
                  data: data.toString(),
                });
              });

              // Log pongs
              ws.on('pong', (data: any) => {
                formatLog('WEBSOCKET_PONG', {
                  wsId,
                  socketId,
                  data: data.toString(),
                });
              });

              // Log close
              ws.on('close', (code: number, reason: any) => {
                formatLog('WEBSOCKET_CONNECTION_CLOSED', {
                  wsId,
                  socketId,
                  code,
                  reason: reason.toString(),
                });

                console.log(`[WEBSOCKET CLOSED] wsId: ${wsId}, socketId: ${socketId}, code: ${code}`);
              });

              // Log errors
              ws.on('error', (error: any) => {
                formatLog('WEBSOCKET_ERROR', {
                  wsId,
                  socketId,
                  error: error.message,
                  code: error.code,
                });

                console.error(`[WEBSOCKET ERROR] wsId: ${wsId}, socketId: ${socketId}, error: ${error.message}`);
              });
            });

            // Log WebSocket server errors
            wss.on('error', (error: any) => {
              formatLog('WEBSOCKET_SERVER_ERROR', {
                error: error.message,
                code: error.code,
              });
            });
          }
        }
      },
    },
  ],
  base: '/',
  resolve: {
    alias: {
      'error_message': path.resolve(__dirname, './lib/message/error_message'),
      'log_message': path.resolve(__dirname, './lib/message/log_message'),
    },
  },
  esbuild: {
    target: 'es2015',  // Match tsconfig.json target - transpile user code to ES6
    format: 'esm',  // Match tsconfig.json module: ESNext
  },
  build: {
    target: 'es2015',  // Ensure build output is ES6
  },
  // ssr: {
  //   // Not needed for Safari 15+ which handles circular deps properly
  //   noExternal: [/@vitest\/browser/],
  // },
  optimizeDeps: {
    // Force chai to be pre-bundled with ES6 target to remove class static blocks
    include: ['chai'],
    esbuildOptions: {
      target: 'es6',
    },
  },
  server: {
    host: 'bs-local.com',
    cors: true,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '.cert/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '.cert/cert.pem')),
    },
    // Try setting origin to force browser URL
    // origin: 'http://bs-local.com',
    strictPort: false,
    fs: {
      strict: false, // Allow serving files outside root to prevent favicon issues
    },
    // hmr: {
    //   // Force HMR to use the vite subdomain
    //   // Safari requires this to match the page's domain for WebSocket connections
    //   host: 'vite.bs-local.com',
    //   protocol: 'wss',
    //   // Don't specify clientPort - let Vite auto-detect from the page
    // },
    watch: {
      // Disable file watching in browser tests
      ignored: ['**/*'],
    },
  },
  test: {
    isolate: false,
    fileParallelism: true,
    browser: {
      enabled: true,
      provider: 'webdriverio',
      headless: useLocalBrowser ? (process.env.CI === 'true' || process.env.HEADLESS === 'true') : false,
      // Vitest 3 browser mode configuration
      instances: buildBrowserInstances(),
      // Browser connection timeout
      connectTimeout: 60000, // 1 minute
      // Add scripts to capture console output from the browser
      orchestratorScripts: [
        {
          // Use absolute path from project root to avoid /@fs/ prefix
          src: path.resolve(__dirname, 'public/console-capture.js'),
        },
      ] as any,
    },
    reporters: [
      'default',
      {
        onInit(ctx: any) {
          console.log('onInit - Browser test session starting');
          // Print all browser session IDs when they're created
          setTimeout(() => {
            const sessions = ctx.vitest?._browserSessions;
            if (sessions && sessions.sessionIds) {
              console.log('\n' + '='.repeat(80));
              console.log(`[VITEST BROWSER SESSIONS]`);
              console.log(`Total Sessions: ${sessions.sessionIds.size}`);
              for (const sessionId of sessions.sessionIds) {
                console.log(`  Session ID: ${sessionId}`);
              }
              console.log(`Time: ${new Date().toISOString()}`);
              console.log('='.repeat(80) + '\n');
            }
          }, 1000); // Wait 1 second for sessions to be created
        },
      } as any,
    ],
    onConsoleLog: (log, type) => {
      console.log(`[${type}]`, log);
      return true;
    },
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 60000, // 1 minute timeout
    hookTimeout: 60000,
    // pool: 'forks', // Use forks pool to avoid threading issues with BrowserStack
    // bail: 1, // Stop on first failure to avoid cascading errors
    // Include all .spec.ts files in lib directory, but exclude react_native tests
    include: ['lib/**/user_event.spec.ts'],
    exclude: [
      'lib/**/*.react_native.spec.ts',
      'lib/**/*.node.spec.ts',
    ],
    typecheck: {
      enabled: true,
      tsconfig: 'tsconfig.spec.json',
    },
  },
});

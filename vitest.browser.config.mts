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
import path from 'path';
import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv';
// import type { BrowserInstanceOption } from 'vitest/node'
// import { transform } from 'esbuild'
// import tsconfigPaths from 'vite-tsconfig-paths'

// Load environment variables from .env file
dotenv.config();

// Check if we should use local browser instead of BrowserStack
const useLocalBrowser = process.env.USE_LOCAL_BROWSER === 'true';

// Plugin to force transpilation of ALL JavaScript to ES6
// function forceTranspilePlugin() {
//   const seenFiles = new Set();

//   async function transpileCode(code: string, id: string) {
//     // Check if code contains class static blocks BEFORE transpilation
//     const hasStaticBlockBefore = code.includes('static {');

//     // Log files with static blocks that we're processing
//     if (hasStaticBlockBefore && !seenFiles.has(id)) {
//       const msg = `[TRANSPILE] Found static block BEFORE transpiling: ${id.replace(process.cwd(), '.')}`;
//       console.error(msg); // Use console.error to ensure it's visible
//       process.stderr.write(msg + '\n');
//       seenFiles.add(id);
//     }

//     // Prepend URL polyfill
//     const polyfill = `
// // Polyfill for Firefox - handle undefined in URL constructor
// (function() {
//   if (typeof window !== 'undefined' && !window.__URL_POLYFILL_APPLIED__) {
//     const OriginalURL = window.URL;
//     window.URL = function(url, base) {
//       if (url === undefined || url === null) {
//         url = window.location.href;
//       }
//       return new OriginalURL(url, base);
//     };
//     window.URL.prototype = OriginalURL.prototype;
//     window.URL.createObjectURL = OriginalURL.createObjectURL;
//     window.URL.revokeObjectURL = OriginalURL.revokeObjectURL;
//     Object.setPrototypeOf(window.URL, OriginalURL);
//     window.__URL_POLYFILL_APPLIED__ = true;
//   }
// })();
// `;

//     // Prepend polyfill to Vite client code specifically
//     if (id.includes('vite') && id.includes('client')) {
//       code = polyfill + code;
//     }

//     // Transpile to ES6 to remove class static blocks
//     const loader = id.endsWith('.ts') || id.endsWith('.tsx') ? 'ts' : 'js';
//     const result = await transform(code, {
//       target: 'es6',
//       loader: loader,
//       format: 'esm',
//     });

//     // Verify static blocks were removed
//     if (hasStaticBlockBefore && result.code.includes('static {')) {
//       const msg = `[TRANSPILE] WARNING: Static block still present AFTER transpiling: ${id.replace(process.cwd(), '.')}`;
//       console.error(msg);
//       process.stderr.write(msg + '\n');
//     }

//     return result.code;
//   }

//   return {
//     name: 'force-transpile-to-es6',
//     enforce: 'pre' as const, // Run BEFORE other plugins to ensure we catch everything

//     async load(id: string) {
//       // Skip virtual modules and query params
//       if (id.startsWith('\0') || id.includes('?')) {
//         return;
//       }

//       // Log chai files
//       if (id.includes('chai')) {
//         process.stderr.write(`[LOAD] Checking chai file: ${id}\n`);
//       }

//       // Specifically handle chai files - force load and transpile
//       if (id.includes('chai') && id.includes('node_modules') && /\.(?:m?js|cjs)$/.test(id)) {
//         try {
//           const fs = await import('fs/promises');
//           const code = await fs.readFile(id, 'utf-8');
//           process.stderr.write(`[LOAD] Loading and transpiling chai: ${id.replace(process.cwd(), '.')}\n`);
//           const transpiledCode = await transpileCode(code, id);
//           return { code: transpiledCode };
//         } catch (error) {
//           process.stderr.write(`[LOAD] Failed to load chai: ${error}\n`);
//           return;
//         }
//       }

//       // Handle other node_modules files
//       if (id.includes('node_modules') && /\.(?:m?js|cjs)$/.test(id)) {
//         try {
//           const fs = await import('fs/promises');
//           const code = await fs.readFile(id, 'utf-8');
//           const transpiledCode = await transpileCode(code, id);
//           return { code: transpiledCode };
//         } catch (error) {
//           return;
//         }
//       }
//     },

//     async transform(code: string, id: string) {
//       // Skip virtual modules and query params
//       if (id.startsWith('\0') || id.includes('?')) {
//         return;
//       }

//       // Only process JavaScript/TypeScript files
//       if (!/\.(?:m?js|cjs|ts|tsx)$/.test(id)) {
//         return;
//       }

//       // Log all node_modules transforms to see what we're processing
//       if (id.includes('node_modules')) {
//         process.stderr.write(`[TRANSPILE] Processing: ${id.replace(process.cwd(), '.')}\n`);
//       }

//       // Special logging for tester file
//       if (id.includes('tester-')) {
//         const hasBefore = code.includes('static {');
//         process.stderr.write(`[TRANSPILE] tester file has static blocks BEFORE: ${hasBefore}\n`);
//       }

//       // Transpile all files
//       try {
//         const transpiledCode = await transpileCode(code, id);

//         // Special logging for tester file
//         if (id.includes('tester-')) {
//           const hasAfter = transpiledCode.includes('static {');
//           process.stderr.write(`[TRANSPILE] tester file has static blocks AFTER: ${hasAfter}\n`);
//         }

//         return { code: transpiledCode };
//       } catch (error) {
//         console.error(`Failed to transpile ${id}:`, error);
//         throw error;
//       }
//     },
//   };
// }

// Get browser configuration from TEST_* environment variables
const testBrowser = process.env.TEST_BROWSER || 'chrome';
const testBrowserVersion = process.env.TEST_BROWSER_VERSION || 'latest';
const testOsName = process.env.TEST_OS_NAME || 'Windows';
const testOsVersion = process.env.TEST_OS_VERSION || '11';

const browserConfig = {
  name: testBrowser,
  browserName: testBrowser,
  browserVersion: testBrowserVersion,
  os: testOsName,
  osVersion: testOsVersion,
};

const browserConfigs = [browserConfig];

// Build local browser capabilities
function buildLocalCapabilities(browserName: string) {
  return {
    browserName,
    'goog:chromeOptions': {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    },
  };
}

// Build BrowserStack capabilities
function buildBrowserStackCapabilities(config: typeof browserConfig) {
  return {
    browserName: config.browserName,
    // webSocketUrl: true, // Disable WebDriver Bidi for BrowserStack
    'wdio:enforceWebDriverClassic': true,
    'goog:chromeOptions': {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    },
    'bstack:options': {
      os: config.os,
      osVersion: config.osVersion,
      browserVersion: config.browserVersion,
      buildName: process.env.VITEST_BUILD_NAME || 'Vitest Browser Tests',
      projectName: 'Optimizely JavaScript SDK',
      sessionName: `${config.browserName} ${config.browserVersion} on ${config.os} ${config.osVersion}`,
      local: process.env.BROWSERSTACK_LOCAL === 'true' ? true : false,
      // debug: true,
      networkLogs: false,
      // consoleLogs: 'verbose' as const,
      seleniumLogs: true,
      idleTimeout: 1800, // 30 minutes idle timeout,
    },
  };
}

// Build browser instance configuration
function buildBrowserInstances() {
  if (useLocalBrowser) {
    // Local browser configurations - all browsers
    return browserConfigs.map(config => ({
      browser: config.browserName,
      capabilities: buildLocalCapabilities(config.browserName),
      logLevel: 'error' as const,
      connectionRetryTimeout: 540000, // 9 minutes
      connectionRetryCount: 9,
      // webSocketUrl: false, // Enable WebDriver Bidi
    }));
  } else {
    // BrowserStack remote configurations - all browsers
    const username = process.env.BROWSERSTACK_USERNAME || process.env.BROWSER_STACK_USERNAME;
    const key = process.env.BROWSERSTACK_ACCESS_KEY || process.env.BROWSER_STACK_ACCESS_KEY;

    return browserConfigs.map(config => ({
      browser: config.browserName,
      user: username,
      key: key,
      capabilities: buildBrowserStackCapabilities(config),
      logLevel: 'info' as const, // Enable verbose logging to debug Bidi issue
      connectionRetryTimeout: 540000, // 9 minutes
      connectionRetryCount: 9,
      automationProtocol: 'webdriver', // Force classic WebDriver protocol
      waitforTimeout: 120000, // 2 minutes wait timeout
      waitforInterval: 2000, // Poll every 2 seconds
    }));
  }
}

export default defineConfig({
  plugins: [
    // forceTranspilePlugin(),
    // tsconfigPaths({
    //   projects: ['./tsconfig.spec.json'],
    // }),
    {
      name: 'request-response-logger',
      enforce: 'pre',
      configureServer(server) {
        console.log('[Request/Response Logger] Enabled');

        let requestCounter = 0;
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';
          const method = req.method || '';
          const requestTime = new Date().toISOString();
          const requestId = ++requestCounter;

          // Log incoming request
          console.log('→'.repeat(40));
          console.log(`[INCOMING REQUEST #${requestId}] ${method} ${url}`);
          console.log(`Time: ${requestTime}`);
          console.log('→'.repeat(40));

          const originalWrite = res.write;
          const originalEnd = res.end;
          const chunks: any[] = [];

          // @ts-ignore
          res.write = function(chunk: any, ..._args: any[]) {
            chunks.push(Buffer.from(chunk));
            return true;
          };

          // @ts-ignore
          res.end = function(chunk: any, ...args: any[]) {
            if (chunk) {
              chunks.push(Buffer.from(chunk));
            }

            const buffer = Buffer.concat(chunks);
            const body = buffer.toString('utf8');

            // Log outgoing response
            const contentType = res.getHeader('content-type')?.toString() || 'unknown';
            const statusCode = res.statusCode;
            const contentLength = res.getHeader('content-length') || buffer.length;
            const responseTime = new Date().toISOString();

            console.log('←'.repeat(40));
            console.log(`[OUTGOING RESPONSE #${requestId}] ${method} ${url}`);
            console.log(`Status: ${statusCode}`);
            console.log(`Content-Type: ${contentType}`);
            console.log(`Content-Length: ${contentLength}`);
            console.log(`Time: ${responseTime}`);
            console.log('←'.repeat(40));

            // Restore original methods and send response
            res.write = originalWrite;
            res.end = originalEnd;
            res.end(body, ...args);
          };

          next();
        });
      },
    },
    {
      name: 'console-capture-plugin',
      enforce: 'pre', // Run before other plugins
      configureServer(server) {
        // Check if console capture is enabled (default to false)
        const consoleCaptureEnabled = process.env.VITEST_CONSOLE_CAPTURE === 'true';

        if (!consoleCaptureEnabled) {
          console.log('[Console Capture] Disabled (set VITEST_CONSOLE_CAPTURE=true to enable)');
          return;
        }

        console.log('[Console Capture] Enabled');

        // Add middleware to handle console log posts from browser
        server.middlewares.use((req, res, next) => {
          if (req.url === '/__vitest_console__' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
              body += chunk.toString();
            });
            req.on('end', () => {
              try {
                const data = JSON.parse(body);
                const timestamp = new Date(data.timestamp).toISOString();
                console.log(`\n[BROWSER ${data.type.toUpperCase()}] ${timestamp}`);
                console.log(data.message);
              } catch (error) {
                console.error('[Console Capture] Failed to parse browser log:', error);
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true }));
            });
            return;
          }
          next();
        });

        // Add middleware to inject console-capture script into HTML responses
        server.middlewares.use((_req, res, next) => {
          const originalWrite = res.write;
          const originalEnd = res.end;
          const chunks: any[] = [];

          // @ts-ignore
          res.write = function(chunk: any, ..._args: any[]) {
            chunks.push(Buffer.from(chunk));
            return true;
          };

          // @ts-ignore
          res.end = function(chunk: any, ...args: any[]) {
            if (chunk) {
              chunks.push(Buffer.from(chunk));
            }

            const buffer = Buffer.concat(chunks);
            let body = buffer.toString('utf8');

            // Inject console-capture script into HTML responses
            if (res.getHeader('content-type')?.toString().includes('text/html')) {
              const scriptTag = '<script src="/console-capture.js"></script>';
              if (body.includes('</head>') && !body.includes('console-capture.js')) {
                body = body.replace('</head>', `${scriptTag}\n</head>`);
                res.setHeader('content-length', Buffer.byteLength(body));
              }
            }

            // Restore original methods and send response
            res.write = originalWrite;
            res.end = originalEnd;
            res.end(body, ...args);
          };

          next();
        });

        // Intercept at the HTTP server level to catch ALL requests
        // const originalEmit = server.httpServer?.emit;
        // if (server.httpServer && originalEmit) {
        //   const httpServer: any = server.httpServer;
        //   httpServer.emit = function(this: any, event: any, ...args: any[]): any {
        //     if (event === 'request') {
        //       const req = args[0];
        //       const url = req.url || '';

        //       // Detect protocol from request
        //       const isSecure = req.connection?.encrypted || req.socket?.encrypted || req.headers['x-forwarded-proto'] === 'https';
        //       const protocol = isSecure ? 'https' : 'http';

        //       console.log(`[HTTP REQUEST] ${req.method} ${protocol}://${req.headers.host}${url}`);

        //       if (url.includes('__vitest_test__') && url.includes('sessionId=')) {
        //         const fullUrl = new URL(url, `${protocol}://${req.headers.host}`);
        //         const sessionId = fullUrl.searchParams.get('sessionId');
        //         console.log('\n' + '='.repeat(80));
        //         console.log(`[VITEST TEST PAGE REQUEST]`);
        //         console.log(`Session ID: ${sessionId}`);
        //         console.log(`Full URL: ${protocol}://${req.headers.host}${url}`);
        //         console.log(`Time: ${new Date().toISOString()}`);
        //         console.log('='.repeat(80) + '\n');
        //       }
        //     } else if (event === 'upgrade') {
        //       const req = args[0];
        //       const url = req.url || '';
        //       const isWebSocket = req.headers.upgrade?.toLowerCase() === 'websocket';

        //       // Detect protocol from request
        //       const isSecure = req.connection?.encrypted || req.socket?.encrypted || req.headers['x-forwarded-proto'] === 'https';
        //       const protocol = isSecure ? 'https' : 'http';

        //       console.log('\n' + '-'.repeat(80));
        //       console.log(`[WEBSOCKET UPGRADE REQUEST]`);
        //       console.log(`URL: ${protocol}://${req.headers.host}${url}`);
        //       console.log(`Upgrade Header: ${req.headers.upgrade}`);
        //       console.log(`Connection Header: ${req.headers.connection}`);
        //       console.log(`Is WebSocket: ${isWebSocket}`);
        //       console.log(`Time: ${new Date().toISOString()}`);

        //       if (url.includes('sessionId=')) {
        //         const fullUrl = new URL(url, `${protocol}://${req.headers.host}`);
        //         const sessionId = fullUrl.searchParams.get('sessionId');
        //         console.log(`Session ID: ${sessionId}`);
        //       }
        //       console.log('-'.repeat(80) + '\n');
        //     }
        //     return originalEmit.apply(this, [event, ...args] as any);
        //   };
        // }

        // // Also log on server listening
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
  //   // Force all dependencies to go through our transform pipeline
  //   noExternal: true,
  // },
  optimizeDeps: {
    // Force chai to be pre-bundled with ES6 target to remove class static blocks
    include: ['chai'],
    esbuildOptions: {
      target: 'es6',
    },
  },
  server: {
    host: '0.0.0.0', // Listen on all interfaces for BrowserStack Local tunnel
    port: 5173, // Use fixed port for consistency
    strictPort: true, // Enforce port 5173 to avoid dynamic port issues
    allowedHosts: ['bs-local.com', 'localhost'],
    cors: true,
    fs: {
      strict: false, // Allow serving files outside root to prevent favicon issues
    },
    hmr: false,
    // hmr: {
    //   // Configure WebSocket for Safari compatibility
    //   protocol: 'ws',
    //   host: 'bs-local.com',
    //   port: 5173,
    // },
    watch: {
      // Disable file watching in browser tests
      ignored: ['**/*'],
    },
  },
  test: {
    // api: {
    //   port: Math.floor(Math.random() * 30001) + 30000,
    // },
    isolate: false,
    fileParallelism: true,
    browser: {
      enabled: true,
      provider: 'webdriverio',
      headless: false,
      // Vitest 3 browser mode configuration
      instances: buildBrowserInstances(),
      // Increase browser connection timeout for Safari on BrowserStack (default is 60s)
      connectTimeout: 1080000, // 18 minutes to allow Safari to connect through BrowserStack Local tunnel
    },
    retry: 6, // Retry failed tests up to 6 times
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
    testTimeout: 720000, // 12 minutes timeout for stability
    hookTimeout: 720000,
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

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
import type { BrowserInstanceOption } from 'vitest/node'
import { transform } from 'esbuild'
import dotenv from 'dotenv';
import tsconfigPaths from 'vite-tsconfig-paths'

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

// Define browser configuration types
interface BrowserConfig {
  name: string;
  browserName: string;
  browserVersion: string;
  os: string;
  osVersion: string;
}

// Define browser configurations
// Testing minimum supported versions: Edge 84+, Firefox 91+, Safari 13+, Chrome 102+, Opera 76+
const allBrowserConfigs: BrowserConfig[] = [
  { name: 'chrome', browserName: 'chrome', browserVersion: '102', os: 'Windows', osVersion: '11' },
  // { name: 'firefox', browserName: 'firefox', browserVersion: '91', os: 'Windows', osVersion: '11' },
  // { name: 'edge', browserName: 'edge', browserVersion: '84', os: 'Windows', osVersion: '10' },
  // { name: 'safari', browserName: 'safari', browserVersion: '14', os: 'OS X', osVersion: 'Big Sur' },
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
    'bstack:options': {
      os: config.os,
      osVersion: config.osVersion,
      browserVersion: config.browserVersion,
      buildName: process.env.VITEST_BUILD_NAME || 'Vitest Browser Tests',
      projectName: 'Optimizely JavaScript SDK',
      sessionName: `${config.browserName} ${config.browserVersion} on ${config.os} ${config.osVersion}`,
      local: process.env.BROWSERSTACK_LOCAL === 'true' ? true : false,
      wsLocalSupport: true,
      disableCorsRestrictions: true,
      debug: true,
      networkLogs: true,
      consoleLogs: 'verbose' as const,
      idleTimeout: 300, // 5 minutes idle timeout
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
    // Safari-specific capabilities to enable WebSocket connections
    capabilities['webkit:WebRTC'] = {
      DisableICECandidateFiltering: true,
    };
    // Disable automatic HTTPS to allow HTTP connections (needed for ws:// WebSocket)
    capabilities['acceptInsecureCerts'] = true;
    // Enable technology preview features for better WebSocket support
    capabilities['safari:automaticInspection'] = false;
    capabilities['safari:automaticProfiling'] = false;
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
      // Safari on BrowserStack can be slow to start, increase timeouts
      connectionRetryTimeout: config.browserName === 'safari' ? 300000 : 180000, // 5 minutes for Safari, 3 for others
      connectionRetryCount: 3,
      waitforTimeout: config.browserName === 'safari' ? 180000 : 120000, // 3 minutes for Safari, 2 for others
      logLevel: 'trace' as const,
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
      name: 'log-session-id',
      enforce: 'pre', // Run before other plugins
      configureServer(server) {
        // Intercept at the HTTP server level to catch ALL requests
        const originalEmit = server.httpServer?.emit;
        if (server.httpServer && originalEmit) {
          const httpServer: any = server.httpServer;
          httpServer.emit = function(this: any, event: any, ...args: any[]): any {
            if (event === 'request') {
              const req = args[0];
              const url = req.url || '';
              console.log(`[HTTP REQUEST] ${req.method} http://${req.headers.host}${url}`);

              if (url.includes('__vitest_test__') && url.includes('sessionId=')) {
                const fullUrl = new URL(url, `http://${req.headers.host}`);
                const sessionId = fullUrl.searchParams.get('sessionId');
                console.log('\n' + '='.repeat(80));
                console.log(`[VITEST TEST PAGE REQUEST]`);
                console.log(`Session ID: ${sessionId}`);
                console.log(`Full URL: http://${req.headers.host}${url}`);
                console.log(`Time: ${new Date().toISOString()}`);
                console.log('='.repeat(80) + '\n');
              }
            } else if (event === 'upgrade') {
              const req = args[0];
              const url = req.url || '';
              const isWebSocket = req.headers.upgrade?.toLowerCase() === 'websocket';

              console.log('\n' + '-'.repeat(80));
              console.log(`[WEBSOCKET UPGRADE REQUEST]`);
              console.log(`URL: http://${req.headers.host}${url}`);
              console.log(`Upgrade Header: ${req.headers.upgrade}`);
              console.log(`Connection Header: ${req.headers.connection}`);
              console.log(`Is WebSocket: ${isWebSocket}`);
              console.log(`Time: ${new Date().toISOString()}`);

              if (url.includes('sessionId=')) {
                const fullUrl = new URL(url, `http://${req.headers.host}`);
                const sessionId = fullUrl.searchParams.get('sessionId');
                console.log(`Session ID: ${sessionId}`);
              }
              console.log('-'.repeat(80) + '\n');
            }
            return originalEmit.apply(this, [event, ...args] as any);
          };
        }

        // Also log on server listening
        server.httpServer?.on('listening', () => {
          const address = server.httpServer?.address();
          const port = typeof address === 'object' ? address?.port : 5173;
          console.log('\n' + '='.repeat(80));
          console.log(`[VITE SERVER READY]`);
          console.log(`Port: ${port}`);
          console.log(`Host: ${server.config.server.host || '0.0.0.0'}`);
          console.log(`Time: ${new Date().toISOString()}`);
          console.log('='.repeat(80) + '\n');
        });
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
    hmr: {
      // Configure WebSocket for Safari compatibility
      protocol: 'ws',
      host: 'bs-local.com',
      port: 5173,
    },
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
      // Increase browser connection timeout for Safari on BrowserStack (default is 60s)
      connectTimeout: 180000, // 3 minutes to allow Safari to connect through BrowserStack Local tunnel
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
    testTimeout: 120000, // 2 minutes timeout for stability
    hookTimeout: 120000,
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

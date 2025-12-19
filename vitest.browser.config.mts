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

// Load environment variables from .env file
dotenv.config();

// Check if we should use local browser instead of BrowserStack
const useLocalBrowser = process.env.USE_LOCAL_BROWSER === 'true';


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
        '--start-maximized', // Start browser maximized to avoid viewport resizing
        '--window-size=1920,1080', // Set initial window size
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
        '--start-maximized', // Start browser maximized to avoid viewport resizing
        '--window-size=1920,1080', // Set initial window size
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
      resolution: '1920x1080', // Set BrowserStack VM resolution to prevent viewport resizing
      // debug: true,
      networkLogs: false,
      // consoleLogs: 'verbose' as const,
      seleniumLogs: true,
      idleTimeout: 300, // 5 minutes idle timeout - session closes if browser is idle for 5 minutes
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
      logLevel: 'silent' as const,
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
      logLevel: 'silent' as const, // Suppress WebDriver logs
      connectionRetryTimeout: 120000, // 2 minutes connection retry timeout
      connectionRetryCount: 3, // Retry 3 times on connection failure
      automationProtocol: 'webdriver', // Force classic WebDriver protocol
      waitforTimeout: 30000, // 30 seconds wait timeout - matches test expectations
      waitforInterval: 1000, // Poll every 1 second - faster feedback
    }));
  }
}

export default defineConfig({
  // plugins: [
  //   // forceTranspilePlugin(),
  //   // tsconfigPaths({
  //   //   projects: ['./tsconfig.spec.json'],
  //   // }),
  //   {
  //     name: 'request-response-logger',
  //     enforce: 'pre',
  //     configureServer(server) {
  //       console.log('[Request/Response Logger] Enabled');

  //       let requestCounter = 0;
  //       server.middlewares.use((req, res, next) => {
  //         const url = req.url || '';
  //         const method = req.method || '';
  //         const requestTime = new Date().toISOString();
  //         const requestId = ++requestCounter;

  //         // Log incoming request
  //         console.log('→'.repeat(40));
  //         console.log(`[INCOMING REQUEST #${requestId}] ${method} ${url}`);
  //         console.log(`Time: ${requestTime}`);
  //         console.log('→'.repeat(40));

  //         const originalWrite = res.write;
  //         const originalEnd = res.end;
  //         const chunks: any[] = [];

  //         // @ts-ignore
  //         res.write = function(chunk: any, ..._args: any[]) {
  //           chunks.push(Buffer.from(chunk));
  //           return true;
  //         };

  //         // @ts-ignore
  //         res.end = function(chunk: any, ...args: any[]) {
  //           if (chunk) {
  //             chunks.push(Buffer.from(chunk));
  //           }

  //           const buffer = Buffer.concat(chunks);
  //           const body = buffer.toString('utf8');

  //           // Log outgoing response
  //           const contentType = res.getHeader('content-type')?.toString() || 'unknown';
  //           const statusCode = res.statusCode;
  //           const contentLength = res.getHeader('content-length') || buffer.length;
  //           const responseTime = new Date().toISOString();

  //           console.log('←'.repeat(40));
  //           console.log(`[OUTGOING RESPONSE #${requestId}] ${method} ${url}`);
  //           console.log(`Status: ${statusCode}`);
  //           console.log(`Content-Type: ${contentType}`);
  //           console.log(`Content-Length: ${contentLength}`);
  //           console.log(`Time: ${responseTime}`);
  //           console.log('←'.repeat(40));

  //           // Restore original methods and send response
  //           res.write = originalWrite;
  //           res.end = originalEnd;
  //           res.end(body, ...args);
  //         };

  //         next();
  //       });
  //     },
  //   },
  //   {
  //     name: 'console-capture-plugin',
  //     enforce: 'pre', // Run before other plugins
  //     configureServer(server) {
  //       // Check if console capture is enabled (default to false)
  //       const consoleCaptureEnabled = process.env.VITEST_CONSOLE_CAPTURE === 'true';

  //       if (!consoleCaptureEnabled) {
  //         console.log('[Console Capture] Disabled (set VITEST_CONSOLE_CAPTURE=true to enable)');
  //         return;
  //       }

  //       console.log('[Console Capture] Enabled');

  //       // Add middleware to handle console log posts from browser
  //       server.middlewares.use((req, res, next) => {
  //         if (req.url === '/__vitest_console__' && req.method === 'POST') {
  //           let body = '';
  //           req.on('data', chunk => {
  //             body += chunk.toString();
  //           });
  //           req.on('end', () => {
  //             try {
  //               const data = JSON.parse(body);
  //               const timestamp = new Date(data.timestamp).toISOString();
  //               console.log(`\n[BROWSER ${data.type.toUpperCase()}] ${timestamp}`);
  //               console.log(data.message);
  //             } catch (error) {
  //               console.error('[Console Capture] Failed to parse browser log:', error);
  //             }
  //             res.writeHead(200, { 'Content-Type': 'application/json' });
  //             res.end(JSON.stringify({ success: true }));
  //           });
  //           return;
  //         }
  //         next();
  //       });

  //       // Add middleware to inject console-capture script into HTML responses
  //       server.middlewares.use((_req, res, next) => {
  //         const originalWrite = res.write;
  //         const originalEnd = res.end;
  //         const chunks: any[] = [];

  //         // @ts-ignore
  //         res.write = function(chunk: any, ..._args: any[]) {
  //           chunks.push(Buffer.from(chunk));
  //           return true;
  //         };

  //         // @ts-ignore
  //         res.end = function(chunk: any, ...args: any[]) {
  //           if (chunk) {
  //             chunks.push(Buffer.from(chunk));
  //           }

  //           const buffer = Buffer.concat(chunks);
  //           let body = buffer.toString('utf8');

  //           // Inject console-capture script into HTML responses
  //           if (res.getHeader('content-type')?.toString().includes('text/html')) {
  //             const scriptTag = '<script src="/console-capture.js"></script>';
  //             if (body.includes('</head>') && !body.includes('console-capture.js')) {
  //               body = body.replace('</head>', `${scriptTag}\n</head>`);
  //               res.setHeader('content-length', Buffer.byteLength(body));
  //             }
  //           }

  //           // Restore original methods and send response
  //           res.write = originalWrite;
  //           res.end = originalEnd;
  //           res.end(body, ...args);
  //         };

  //         next();
  //       });

  //     },
  //   },
  // ],
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
  optimizeDeps: {
    // Force chai to be pre-bundled with ES6 target to remove class static blocks
    include: ['chai'],
    esbuildOptions: {
      target: 'es6',
    },
  },
  server: {
    host: '0.0.0.0', // Listen on all interfaces for BrowserStack Local tunnel
    allowedHosts: ['bs-local.com', 'localhost'],
  },
  test: {
    isolate: false, // Keep tests in same browser context to reduce connection overhead
    fileParallelism: true, // Enable parallel execution
    maxConcurrency: 5, // Moderate concurrency - faster execution while maintaining stability
    onConsoleLog: () => true,
    browser: {
      enabled: true,
      provider: 'webdriverio',
      headless: false,
      // Vitest 3 browser mode configuration
      instances: buildBrowserInstances(),
      // Browser connection timeout (default is 60s)
      connectTimeout: 300000, // 5 minutes to establish initial browser connection
    },
    retry: 0, // No retries - fail fast to identify real issues
    testTimeout: 60000, // 60 seconds per test - if longer, something is wrong
    hookTimeout: 30000, // 30 seconds for hooks
    include: [
      'lib/**/*.spec.ts',
    ],
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

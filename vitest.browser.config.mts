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

// Load environment variables from .env file
dotenv.config();

// Check if we should use local browser instead of BrowserStack
const useLocalBrowser = process.env.USE_LOCAL_BROWSER === 'true';

// Plugin to force transpilation of Vitest browser runtime code to ES6
function forceTranspilePlugin() {
  return {
    name: 'force-transpile-to-es6',
    enforce: 'pre' as const,
    async transform(code: string, id: string) {
      // Check if this is a Vite/Vitest/chai module
      const isViteModule = /\.(?:m?js|cjs)$/.test(id) &&
        (id.includes('/@vite/client') ||
         id.includes('/vite/dist/client') ||
         id.includes('/@vitest/') ||
         id.includes('/vitest/') ||
         id.includes('/chai/') ||
         id.includes('node_modules/@vitest') ||
         id.includes('node_modules/vitest') ||
         id.includes('node_modules/chai'));

      if (isViteModule) {
        // Prepend URL polyfill before transpilation
        const polyfill = `
// Polyfill for Firefox - handle undefined in URL constructor
(function() {
  if (typeof window !== 'undefined' && !window.__URL_POLYFILL_APPLIED__) {
    const OriginalURL = window.URL;
    window.URL = function(url, base) {
      if (url === undefined || url === null) {
        url = window.location.href;
      }
      return new OriginalURL(url, base);
    };
    window.URL.prototype = OriginalURL.prototype;
    window.URL.createObjectURL = OriginalURL.createObjectURL;
    window.URL.revokeObjectURL = OriginalURL.revokeObjectURL;
    Object.setPrototypeOf(window.URL, OriginalURL);
    window.__URL_POLYFILL_APPLIED__ = true;
  }
})();
`;

        // Prepend polyfill to Vite client code specifically
        if (id.includes('vite') && id.includes('client')) {
          code = polyfill + code;
        }

        // Transpile to ES6 to remove class static blocks
        const result = await transform(code, {
          target: 'es6',
          loader: 'js',
          format: 'esm',
        });

        return {
          code: result.code,
        };
      }
    },
  };
}

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
  // { name: 'chrome', browserName: 'chrome', browserVersion: '102', os: 'Windows', osVersion: '11' },
  { name: 'firefox', browserName: 'firefox', browserVersion: '95', os: 'Windows', osVersion: '11' },
  // { name: 'edge', browserName: 'edge', browserVersion: '84', os: 'Windows', osVersion: '10' },
  // { name: 'safari', browserName: 'safari', browserVersion: '13.1', os: 'OS X', osVersion: 'Catalina' },
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
  'goog:chromeOptions': {
    args: string[];
  };
}

// Build local browser capabilities
function buildLocalCapabilities(browserName: string): LocalCapabilities {
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
function buildBrowserStackCapabilities(config: typeof allBrowserConfigs[0]) {
  return {
    browserName: config.browserName,
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
      debug: false,
      networkLogs: false,
      consoleLogs: 'errors' as const,
      idleTimeout: 300, // 5 minutes idle timeout
    },
  };
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
      connectionRetryTimeout: 180000, // 3 minutes
      connectionRetryCount: 3,
      waitforTimeout: 120000, // 2 minutes
      logLevel: 'error' as const,
    }));
  }
}

export default defineConfig({
  plugins: [forceTranspilePlugin()],
  base: '/',
  resolve: {
    alias: {
      'error_message': path.resolve(__dirname, './lib/message/error_message'),
      'log_message': path.resolve(__dirname, './lib/message/log_message'),
    },
  },
  // Don't transpile user code, only dependencies via plugin
  optimizeDeps: {
    // Exclude vite/vitest/chai from pre-bundling so they get transpiled by our plugin
    exclude: ['chai', 'vitest', '@vitest/browser', '@vitest/utils', '@vitest/runner'],
  },
  server: {
    host: 'localhost',
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
    },
    onConsoleLog: () => true,
    testTimeout: 120000, // 2 minutes timeout for stability
    hookTimeout: 120000,
    pool: 'forks', // Use forks pool to avoid threading issues with BrowserStack
    bail: 1, // Stop on first failure to avoid cascading errors
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

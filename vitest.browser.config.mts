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
import path from 'path';
import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Check if we should use local browser instead of BrowserStack
const useLocalBrowser = process.env.USE_LOCAL_BROWSER === 'true';

// Build local browser capabilities
function buildLocalCapabilities() {
  return {
    browserName: process.env.VITEST_BROWSER_NAME || 'chrome',
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
function buildBrowserStackCapabilities() {
  return {
    browserName: process.env.VITEST_BROWSER_NAME || 'chrome',
    'goog:chromeOptions': {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    },
    'bstack:options': {
      os: process.env.VITEST_BROWSER_OS || 'Windows',
      osVersion: process.env.VITEST_BROWSER_OS_VERSION || '11',
      browserVersion: process.env.VITEST_BROWSER_VERSION || 'latest',
      buildName: process.env.VITEST_BUILD_NAME || 'Vitest Browser Tests',
      projectName: 'Optimizely JavaScript SDK',
      sessionName: process.env.VITEST_SESSION_NAME || 'Browser Tests',
      local: process.env.BROWSERSTACK_LOCAL === 'true' ? true : false,
      debug: false,
      networkLogs: false,
      consoleLogs: 'errors' as const,
      idleTimeout: 300, // 5 minutes idle timeout
    },
  };
}

// Build browser instance configuration
function buildBrowserInstances() {
  if (useLocalBrowser) {
    // Local browser configuration
    return [
      {
        browser: process.env.VITEST_BROWSER_NAME || 'chrome',
        capabilities: buildLocalCapabilities(),
        logLevel: 'error' as const,
      },
    ];
  } else {
    // BrowserStack remote configuration
    return [
      {
        browser: process.env.VITEST_BROWSER_NAME || 'chrome',
        // WebDriverIO connection options for BrowserStack
        user: process.env.BROWSERSTACK_USERNAME || process.env.BROWSER_STACK_USERNAME,
        key: process.env.BROWSERSTACK_ACCESS_KEY || process.env.BROWSER_STACK_ACCESS_KEY,
        capabilities: buildBrowserStackCapabilities(),
        logLevel: 'error' as const,
      },
    ];
  }
}

export default defineConfig({
  resolve: {
    alias: {
      'error_message': path.resolve(__dirname, './lib/message/error_message'),
      'log_message': path.resolve(__dirname, './lib/message/log_message'),
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
    },
    onConsoleLog: () => true,
    // testTimeout: 90000, // Increase test timeout for BrowserStack (1.5 minutes)
    // hookTimeout: 90000,
    // pool: 'forks', // Use forks pool to avoid threading issues with BrowserStack
    // bail: 1, // Stop on first failure to avoid cascading errors
    // Include all .spec.ts files in lib directory, but exclude react_native tests
    include: ['lib/**/event_processor_factory.browser.spec.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.react_native.spec.ts',
    ],
    typecheck: {
      enabled: true,
      tsconfig: 'tsconfig.spec.json',
    },
  },
});

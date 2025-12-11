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

// Define browser configurations
// Testing minimum supported versions: Edge 84+, Firefox 91+, Safari 13+, Chrome 102+, Opera 76+
const allBrowserConfigs = [
  { name: 'chrome', browserName: 'chrome', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
  // { name: 'firefox', browserName: 'firefox', browserVersion: '91', os: 'Windows', osVersion: '11' },
  // { name: 'edge', browserName: 'edge', browserVersion: '84', os: 'Windows', osVersion: '10' },
  // { name: 'safari', browserName: 'safari', browserVersion: '13.1', os: 'OS X', osVersion: 'Catalina' },
  // { name: 'opera', browserName: 'opera', browserVersion: '76', os: 'Windows', osVersion: '11' },
];

// Filter browsers based on VITEST_BROWSER environment variable
const browserFilter = process.env.VITEST_BROWSER;
const browserConfigs = browserFilter
  ? allBrowserConfigs.filter(config => config.name === browserFilter.toLowerCase())
  : allBrowserConfigs;

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
    // Disable WebDriver Bidi to avoid protocol issues
    webSocketUrl: false,
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
    // Disable WebDriver Bidi to avoid protocol issues
    webSocketUrl: false,
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
      logLevel: 'error' as const,
    }));
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
      headless: true,
      // headless: useLocalBrowser ? (process.env.CI === 'true' || process.env.HEADLESS === 'true') : false,
      // Vitest 3 browser mode configuration
      instances: buildBrowserInstances(),
    },
    onConsoleLog: () => true,
    // testTimeout: 90000, // Increase test timeout for BrowserStack (1.5 minutes)
    // hookTimeout: 90000,
    // pool: 'forks', // Use forks pool to avoid threading issues with BrowserStack
    // bail: 1, // Stop on first failure to avoid cascading errors
    // Include all .spec.ts files in lib directory, but exclude react_native tests
    include: ['lib/**/*.spec.ts'],
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

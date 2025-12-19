/**
 * Copyright 2025, Optimizely
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
import { requestLoggerPlugin } from './vitest/request-logger-plugin';
import { consoleCapturePlugin } from './vitest/console-capture-plugin';

// Check if we should use local browser instead of BrowserStack
const useLocalBrowser = process.env.USE_LOCAL_BROWSER === 'true';


// Get browser configuration from TEST_* environment variables
const testBrowser = process.env.TEST_BROWSER || 'chrome';
const testBrowserVersion = process.env.TEST_BROWSER_VERSION;
const testOsName = process.env.TEST_OS_NAME;
const testOsVersion = process.env.TEST_OS_VERSION;

// const browserConfig = {
//   name: testBrowser,
//   browserName: testBrowser,
//   browserVersion: testBrowserVersion,
//   os: testOsName,
//   osVersion: testOsVersion,
// };

// const browserConfigs = [browserConfig];

// Build local browser capabilities
function buildLocalCapabilities() {
  return {
    testBrowser,
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
    browserName: testBrowser,
    'wdio:enforceWebDriverClassic': true, // this doesn't work due to vitest bug, still keeping here for future reference
    'goog:chromeOptions': {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    },
    'bstack:options': {
      os: testOsName,
      osVersion: testOsVersion,
      browserVersion: testBrowserVersion,
      buildName: process.env.VITEST_BUILD_NAME || 'Vitest Browser Tests',
      projectName: 'Optimizely JavaScript SDK',
      sessionName: `${testBrowser} ${testBrowserVersion || ''} on ${testOsName} ${testOsVersion}`,
      local: true,
      debug: false,
      networkLogs: false,
      consoleLogs: 'errors' as const,
      seleniumLogs: false,
      idleTimeout: 300, // 5 minutes idle timeout - session closes if browser is idle for 5 minutes
    },
  };
}

function buildBrowserInstances() {
  if (useLocalBrowser) {
    // Local browser configurations - all browsers
    return [{
      browser: testBrowser,
      capabilities: buildLocalCapabilities(),
    }];
  } else {

    const username = process.env.BROWSERSTACK_USERNAME || process.env.BROWSER_STACK_USERNAME;
    const key = process.env.BROWSERSTACK_ACCESS_KEY || process.env.BROWSER_STACK_ACCESS_KEY;

    return [{
      browser: testBrowser,
      user: username,
      key: key,
      capabilities: buildBrowserStackCapabilities(),
      connectionRetryTimeout: 120000, // 2 minutes connection retry timeout
      connectionRetryCount: 3, // Retry 3 times on connection failure
      waitforTimeout: 30000, // 30 seconds wait timeout - matches test expectations
      waitforInterval: 1000, // Poll every 1 second - faster feedback
    }];
  }
}

export default defineConfig({
  plugins: [
    ...(process.env.VITEST_REQUEST_LOGGER === 'true' ? [requestLoggerPlugin()] : []),
    ...(process.env.VITEST_CONSOLE_CAPTURE === 'true' ? [consoleCapturePlugin()] : []),
  ],
  resolve: {
    alias: {
      'error_message': path.resolve(__dirname, './lib/message/error_message'),
      'log_message': path.resolve(__dirname, './lib/message/log_message'),
    },
  },
  esbuild: {
    target: 'es2015',  
    format: 'esm', 
  },
  build: {
    target: 'es2015',  
  },
  optimizeDeps: {
    // Force chai to be pre-bundled with ES6 target to remove class static blocks
    // This avoids issues with browsers that do not support class static blocks like firefox 91
    include: ['chai'],
    esbuildOptions: {
      target: 'es6',
    },
  },
  server: {
    host: '0.0.0.0',
    // for safari, browserstack redirects localhost to bs-local.com
    allowedHosts: ['bs-local.com', 'localhost'],
  },
  test: {
    isolate: false, 
    fileParallelism: true, 
    maxConcurrency: 5,
    onConsoleLog: () => true,
    browser: {
      enabled: true,
      provider: 'webdriverio',
      headless: false,
      instances: buildBrowserInstances(),
      connectTimeout: 300000, 
    },
    testTimeout: 60000, 
    hookTimeout: 30000,
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

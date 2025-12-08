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

// Check if BrowserStack credentials are available
function hasBrowserStackCredentials() {
  const username = process.env.BROWSERSTACK_USERNAME || process.env.BROWSER_STACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY || process.env.BROWSER_STACK_ACCESS_KEY;
  return !!(username && accessKey);
}

// Build BrowserStack CDP WebSocket URL with capabilities
function buildBrowserStackCdpUrl() {
  const username = process.env.BROWSERSTACK_USERNAME || process.env.BROWSER_STACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY || process.env.BROWSER_STACK_ACCESS_KEY;

  // Get browser name from environment
  const browserName = process.env.VITEST_BROWSER_NAME || 'chromium';

  // Map Playwright browser names to BrowserStack browser names for local fallback
  // When using BrowserStack, you can also pass actual BrowserStack browser names directly
  const browserMapping: Record<string, string> = {
    'chromium': 'chrome',
    'firefox': 'firefox',
    'webkit': 'safari',
    // You can also use BrowserStack browser names directly:
    // 'edge': 'edge',
    // 'chrome': 'chrome',
    // 'safari': 'safari',
  };

  const caps = {
    'browserstack.username': username,
    'browserstack.accessKey': accessKey,
    'browser': browserMapping[browserName] || browserName, // Support both mapped and direct browser names
    'browser_version': process.env.VITEST_BROWSER_VERSION || 'latest',
    'os': process.env.VITEST_BROWSER_OS || 'Windows',
    'os_version': process.env.VITEST_BROWSER_OS_VERSION || '11',
    'build': process.env.VITEST_BUILD_NAME || 'Vitest Browser Tests',
    'name': process.env.VITEST_SESSION_NAME || 'Playwright Browser Tests',
    'browserstack.local': process.env.BROWSERSTACK_LOCAL === 'true' ? 'true' : 'false',
    'browserstack.debug': 'true',
    'browserstack.networkLogs': 'true',
    'browserstack.console': 'info',
    'client.playwrightVersion': '1.57.0', // Match the installed Playwright version
  };

  const capsJson = JSON.stringify(caps);
  const encodedCaps = encodeURIComponent(capsJson);

  return `wss://cdp.browserstack.com/playwright?caps=${encodedCaps}`;
}

// Build provider options based on whether BrowserStack credentials are available
function buildProviderOptions() {
  if (hasBrowserStackCredentials()) {
    console.log('Using BrowserStack for Playwright tests');
    return {
      connectOptions: {
        wsEndpoint: buildBrowserStackCdpUrl(),
      },
    };
  } else {
    console.log('BrowserStack credentials not found, using local Playwright browsers');
    return {
      launch: {
        args: ['--disable-blink-features=AutomationControlled'],
        // Keep browser open after tests finish (useful for debugging)
        // Set PLAYWRIGHT_CLOSE=true to override and close the browser
        devtools: false,
      },
      context: {
        // Additional context options can be added here
      },
    };
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
    browser: {
      enabled: true,
      provider: 'playwright',
      name: process.env.VITEST_BROWSER_NAME || 'chromium',
      headless: hasBrowserStackCredentials()
        ? false // BrowserStack controls headless mode
        : (process.env.CI === 'true' || process.env.HEADLESS === 'true'),
      providerOptions: buildProviderOptions(),
    },
    onConsoleLog: () => true,
    testTimeout: 30000,
    hookTimeout: 30000,
    // Include all .spec.ts files in lib directory, but exclude react_native tests
    include: ['lib/**/*.spec.ts'],
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

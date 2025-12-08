#!/usr/bin/env node

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

// Load environment variables from .env file
require('dotenv').config();

const { execSync } = require('child_process');

// Define browser configurations for BrowserStack Playwright
// BrowserStack supports any browser/OS combination via the CDP endpoint
// You can use either Playwright browser names (chromium, firefox, webkit) or
// actual BrowserStack browser names (chrome, edge, safari, etc.)
const allBrowsers = [
  {
    name: 'chromium',
    browserVersion: 'latest',
    os: 'Windows',
    osVersion: '11',
    displayName: 'Chrome on Windows 11',
  },
  {
    name: 'firefox',
    browserVersion: 'latest',
    os: 'Windows',
    osVersion: '11',
    displayName: 'Firefox on Windows 11',
  },
  {
    name: 'webkit',
    browserVersion: 'latest',
    os: 'OS X',
    osVersion: 'Sonoma',
    displayName: 'Safari on macOS Sonoma',
  },
  // Additional BrowserStack browser/OS combinations (commented out):
  //
  // Microsoft Edge on Windows 11
  // {
  //   name: 'edge',
  //   browserVersion: 'latest',
  //   os: 'Windows',
  //   osVersion: '11',
  //   displayName: 'Edge on Windows 11',
  // },
  //
  // Chrome on Windows 10
  // {
  //   name: 'chrome',
  //   browserVersion: '119.0',
  //   os: 'Windows',
  //   osVersion: '10',
  //   displayName: 'Chrome 119 on Windows 10',
  // },
  //
  // Firefox on macOS Ventura
  // {
  //   name: 'firefox',
  //   browserVersion: 'latest',
  //   os: 'OS X',
  //   osVersion: 'Ventura',
  //   displayName: 'Firefox on macOS Ventura',
  // },
  //
  // Safari on macOS Monterey
  // {
  //   name: 'safari',
  //   browserVersion: '15.6',
  //   os: 'OS X',
  //   osVersion: 'Monterey',
  //   displayName: 'Safari 15.6 on macOS Monterey',
  // },
  //
  // Edge on Windows 10
  // {
  //   name: 'edge',
  //   browserVersion: '118.0',
  //   os: 'Windows',
  //   osVersion: '10',
  //   displayName: 'Edge 118 on Windows 10',
  // },
  //
  // Chrome on macOS Big Sur
  // {
  //   name: 'chrome',
  //   browserVersion: 'latest',
  //   os: 'OS X',
  //   osVersion: 'Big Sur',
  //   displayName: 'Chrome on macOS Big Sur',
  // },
];

// Allow filtering browsers via command line argument
// Usage: node run-browser-tests-playwright.js chromium
const browserFilter = process.argv[2];
const browsers = browserFilter
  ? allBrowsers.filter(b => b.name === browserFilter.toLowerCase())
  : allBrowsers;

if (browsers.length === 0) {
  console.error(`Error: Unknown browser "${browserFilter}". Valid options: chromium, firefox, webkit`);
  process.exit(1);
}

let hasFailures = false;

function runTests() {
  // Run tests for each browser
  browsers.forEach((browser) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Running tests on ${browser.displayName}...`);
    console.log('='.repeat(80));

    try {
      // Set environment variables for this browser configuration
      const env = {
        ...process.env,
        VITEST_BROWSER_NAME: browser.name,
        VITEST_BROWSER_VERSION: browser.browserVersion,
        VITEST_BROWSER_OS: browser.os,
        VITEST_BROWSER_OS_VERSION: browser.osVersion,
        VITEST_SESSION_NAME: browser.displayName,
      };

      // Run vitest with the playwright browser config
      execSync('npm run test-vitest -- --config vitest.browser.playwright.config.mts', {
        stdio: 'inherit',
        env,
      });

      console.log(`✓ Tests passed on ${browser.displayName}`);
    } catch (error) {
      console.error(`✗ Tests failed on ${browser.displayName}`);
      hasFailures = true;
    }
  });

  console.log(`\n${'='.repeat(80)}`);
  console.log('Browser test summary:');
  console.log('='.repeat(80));

  if (hasFailures) {
    console.error('Some browser tests failed. See above for details.');
  } else {
    console.log('All browser tests passed!');
  }

  process.exit(hasFailures ? 1 : 0);
}

// Run the tests
try {
  runTests();
} catch (error) {
  console.error('Fatal error:', error);
  process.exit(1);
}

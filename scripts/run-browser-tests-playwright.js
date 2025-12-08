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

// Define browser configurations for Playwright
const allBrowsers = [
  {
    name: 'chromium',
    displayName: 'Chromium',
  },
  {
    name: 'firefox',
    displayName: 'Firefox',
  },
  {
    name: 'webkit',
    displayName: 'WebKit (Safari)',
  },
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

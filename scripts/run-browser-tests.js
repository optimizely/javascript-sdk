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
const browserstack = require('browserstack-local');


// Define browser configurations for BrowserStack
const allBrowsers = [
  {
    name: 'chrome',
    browserName: 'chrome',
    os: 'Windows',
    osVersion: '11',
    browserVersion: 'latest',
    sessionName: 'Chrome on Windows 11',
  },
  {
    name: 'firefox',
    browserName: 'firefox',
    os: 'Windows',
    osVersion: '11',
    browserVersion: 'latest',
    sessionName: 'Firefox on Windows 11',
  },
  {
    name: 'edge',
    browserName: 'edge',
    os: 'Windows',
    osVersion: '11',
    browserVersion: 'latest',
    sessionName: 'Edge on Windows 11',
  },
];

// Allow filtering browsers via command line argument
// Usage: node run-browser-tests.js chrome
const browserFilter = process.argv[2];
const browsers = browserFilter
  ? allBrowsers.filter(b => b.name === browserFilter.toLowerCase())
  : allBrowsers;

if (browsers.length === 0) {
  console.error(`Error: Unknown browser "${browserFilter}". Valid options: chrome, firefox, edge`);
  process.exit(1);
}

// Determine if we should use local browser or BrowserStack
// Priority: USE_LOCAL_BROWSER env var, then check for BrowserStack credentials
let useLocalBrowser = process.env.USE_LOCAL_BROWSER === 'true';

if (!useLocalBrowser) {
  // Check for BrowserStack credentials
  const username = process.env.BROWSERSTACK_USERNAME || process.env.BROWSER_STACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY || process.env.BROWSER_STACK_ACCESS_KEY;

  if (!username || !accessKey) {
    console.log('BrowserStack credentials not found - falling back to local browser mode');
    useLocalBrowser = true;
  }
}

// BrowserStack Local is optional - only needed if tests require localhost access
const useBrowserStackLocal = process.env.BROWSERSTACK_LOCAL === 'true';
let bs_local = null;

function startTunnel() {
  if (!useBrowserStackLocal) {
    console.log('BrowserStack Local tunnel disabled (tests run without local server access)');
    return Promise.resolve();
  }

  const username = process.env.BROWSERSTACK_USERNAME || process.env.BROWSER_STACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY || process.env.BROWSER_STACK_ACCESS_KEY;

  console.log('Starting BrowserStack Local tunnel...');
  bs_local = new browserstack.Local();
  const bsLocalArgs = {
    key: accessKey,
    force: true,
    forceLocal: true,
  };

  return new Promise((resolve, reject) => {
    bs_local.start(bsLocalArgs, (error) => {
      if (error) {
        console.error('Error starting BrowserStack Local:', error);
        reject(error);
      } else {
        console.log('BrowserStack Local tunnel started successfully');
        console.log(`Local Identifier: ${bs_local.pid}`);
        // Wait longer for tunnel to fully establish and register with BrowserStack
        console.log('Waiting for tunnel to establish...');
        setTimeout(() => {
          console.log('Tunnel ready!');
          resolve();
        }, 10000);
      }
    });
  });
}

function stopTunnel() {
  if (!bs_local) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    bs_local.stop(() => {
      console.log('BrowserStack Local tunnel stopped');
      resolve();
    });
  });
}

let hasFailures = false;

async function runTests() {
  try {
    // Only start tunnel if using BrowserStack
    if (!useLocalBrowser) {
      await startTunnel();
    } else {
      console.log('Using local browser mode - no BrowserStack connection needed');
    }

    // Run tests for each browser
    browsers.forEach((browser) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Running tests on ${useLocalBrowser ? 'local ' : ''}${browser.sessionName}...`);
      console.log('='.repeat(80));

      try {
        // Set environment variables for this browser configuration
        const env = {
          ...process.env,
          USE_LOCAL_BROWSER: useLocalBrowser ? 'true' : 'false',
          VITEST_BROWSER_NAME: browser.browserName,
          VITEST_BROWSER_OS: browser.os,
          VITEST_BROWSER_OS_VERSION: browser.osVersion,
          VITEST_BROWSER_VERSION: browser.browserVersion,
          VITEST_SESSION_NAME: browser.sessionName,
        };

        // Run vitest with the browser config
        execSync('npm run test-vitest -- --config vitest.browser.config.mts', {
          stdio: 'inherit',
          env,
        });

        console.log(`✓ Tests passed on ${browser.sessionName}`);
      } catch (error) {
        console.error(`✗ Tests failed on ${browser.sessionName}`);
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
  } finally {
    // Only stop tunnel if using BrowserStack
    if (!useLocalBrowser) {
      await stopTunnel();
    }
  }

  process.exit(hasFailures ? 1 : 0);
}

// Run the tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

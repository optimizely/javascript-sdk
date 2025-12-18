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

// Browser configurations grouped by browser name
const BROWSER_CONFIGS = {
  chrome: [
    { name: 'chrome-windows-latest', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
    { name: 'chrome-windows-102', browserVersion: '102', os: 'Windows', osVersion: '11' },
  ],
  firefox: [
    { name: 'firefox-windows-latest', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
    { name: 'firefox-windows-91', browserVersion: '91', os: 'Windows', osVersion: '11' },
  ],
  edge: [
    { name: 'edge-windows-latest', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
    { name: 'edge-windows-84', browserVersion: '84', os: 'Windows', osVersion: '10' },
  ],
  safari: [
    { name: 'safari-monterey', os: 'OS X', osVersion: 'Monterey' },
    // { name: 'safari-ventura', os: 'OS X', osVersion: 'Ventura' },
    { name: 'safari-sonoma', os: 'OS X', osVersion: 'Sonoma' },
  ]
};

// Determine if we should use local browser or BrowserStack
// Priority: USE_LOCAL_BROWSER env var, then check for BrowserStack credentials
let useLocalBrowser = process.env.USE_LOCAL_BROWSER === 'true';

if (!useLocalBrowser) {
  // Check for BrowserStack credentials
  const username = process.env.BROWSERSTACK_USERNAME || process.env.BROWSER_STACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY || process.env.BROWSER_STACK_ACCESS_KEY;

  console.log('\n' + '='.repeat(80));
  console.log('BrowserStack Credentials Check:');
  console.log('='.repeat(80));
  console.log(`BROWSERSTACK_USERNAME: ${username ? '✓ Available' : '✗ Not found'}`);
  console.log(`BROWSERSTACK_ACCESS_KEY: ${accessKey ? '✓ Available' : '✗ Not found'}`);
  console.log('='.repeat(80) + '\n');

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

async function runTests() {
  try {
    // Get browser name from environment variable (default to chrome)
    const browserName = (process.env.TEST_BROWSER || 'chrome').toLowerCase();

    // Get configs for this browser
    const configs = BROWSER_CONFIGS[browserName];
    if (!configs || configs.length === 0) {
      console.error(`Error: No configurations found for browser '${browserName}'`);
      console.error(`Available browsers: ${Object.keys(BROWSER_CONFIGS).join(', ')}`);
      process.exit(1);
    }

    // Only start tunnel if using BrowserStack
    if (!useLocalBrowser) {
      await startTunnel();
    } else {
      console.log('Using local browser mode - no BrowserStack connection needed');
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Running tests for browser: ${browserName}`);
    console.log(`Total configurations: ${configs.length}`);
    console.log('='.repeat(80) + '\n');

    const results = [];

    // Run each config serially
    for (const config of configs) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Running: ${config.name}`);
      console.log(`Browser: ${browserName}${config.browserVersion ? ` ${config.browserVersion}` : ''}`);
      console.log(`OS: ${config.os} ${config.osVersion}`);
      console.log('='.repeat(80));

      // Set environment variables for this config
      const env = {
        ...process.env,
        USE_LOCAL_BROWSER: useLocalBrowser ? 'true' : 'false',
        TEST_BROWSER: browserName,
        TEST_BROWSER_VERSION: config.browserVersion || '',
        TEST_OS_NAME: config.os,
        TEST_OS_VERSION: config.osVersion,
        WDIO_LOG_LEVEL: 'info', // Enable WebdriverIO logging
      };

      // Add delay before starting test to ensure tunnel is stable
      console.log('Waiting 10 seconds for tunnel stability...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      try {
        console.log('Starting vitest browser test...');
        // Run vitest with the browser config
        execSync('npm run test-vitest -- --config vitest.browser.config.mts', {
          stdio: 'inherit',
          env,
        });

        console.log(`\n✓ ${config.name} passed!`);
        results.push({ config: config.name, success: true });
      } catch (error) {
        console.error(`\n✗ ${config.name} failed`);
        if (error.message) {
          console.error('Error message:', error.message);
        }
        results.push({ config: config.name, success: false });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log(`Browser test summary for ${browserName}:`);
    console.log('='.repeat(80));

    const failures = [];
    const successes = [];

    results.forEach(({ config, success }) => {
      if (success) {
        successes.push(config);
        console.log(`✓ ${config}: PASSED`);
      } else {
        failures.push(config);
        console.error(`✗ ${config}: FAILED`);
      }
    });

    console.log('='.repeat(80));
    console.log(`Total: ${results.length} configurations`);
    console.log(`Passed: ${successes.length}`);
    console.log(`Failed: ${failures.length}`);
    console.log('='.repeat(80));

    // Exit with failure if any config failed
    if (failures.length > 0) {
      console.error(`\nSome ${browserName} configurations failed. See above for details.`);
      process.exit(1);
    } else {
      console.log(`\nAll ${browserName} configurations passed!`);
      process.exit(0);
    }
  } finally {
    // Only stop tunnel if using BrowserStack
    if (!useLocalBrowser) {
      await stopTunnel();
    }
  }
}

// Run the tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

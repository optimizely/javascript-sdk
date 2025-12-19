#!/usr/bin/env node

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
const { execSync } = require('child_process');
const browserstack = require('browserstack-local');

// Browser configurations grouped by browser name
const BROWSER_CONFIGS = {
  chrome: [
    { name: 'chrome-windows-latest', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
    { name: 'chrome-windows-102', browserVersion: '102', os: 'Windows', osVersion: '11' },
  ],
  firefox: [
    { name: 'firefox-windows-91', browserVersion: '91', os: 'Windows', osVersion: '11' },
  ],
  edge: [
    { name: 'edge-windows-latest', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
    { name: 'edge-windows-84', browserVersion: '84', os: 'Windows', osVersion: '10' },
  ],
  safari: [
    { name: 'safari-monterey', os: 'OS X', osVersion: 'Monterey' },
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
  let exitCode = 0;

  try {
    // Patch Vitest viewport command to prevent WebDriver Bidi errors
    console.log('Patching Vitest viewport command...');
    try {
      execSync('node ./scripts/patch-vitest-viewport.js', { stdio: 'inherit' });
    } catch (error) {
      console.error('Failed to patch Vitest viewport command:', error.message);
      exitCode = 1;
      return;
    }

    // Get browser name from environment variable (default to chrome)
    const browserName = (process.env.TEST_BROWSER || 'chrome').toLowerCase();

    let configs;

    if (useLocalBrowser) {
      configs = [{
        name: `${browserName}`,
      }];
      console.log('Local browser mode: using local browser installation');
    } else {
      // For BrowserStack, use the defined configs
      configs = BROWSER_CONFIGS[browserName];
      if (!configs || configs.length === 0) {
        console.error(`Error: No configurations found for browser '${browserName}'`);
        console.error(`Available browsers: ${Object.keys(BROWSER_CONFIGS).join(', ')}`);
        exitCode = 1;
        return;
      }
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
        TEST_BROWSER: browserName,
        TEST_BROWSER_VERSION: config.browserVersion,
        TEST_OS_NAME: config.os,
        TEST_OS_VERSION: config.osVersion,
      };


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

    // Set exit code based on results
    if (failures.length > 0) {
      console.error(`\nSome ${browserName} configurations failed. See above for details.`);
      exitCode = 1;
    } else {
      console.log(`\nAll ${browserName} configurations passed!`);
      exitCode = 0;
    }
  } finally {
    // Only stop tunnel if using BrowserStack
    if (!useLocalBrowser) {
      await stopTunnel();
    }

    // Exit after tunnel is properly closed
    process.exit(exitCode);
  }
}

// Run the tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

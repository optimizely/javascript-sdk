#!/usr/bin/env node

/**
 * Copyright 2026, Optimizely
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

// Runs the browser or UMD spec files in real browsers, locally or on BrowserStack.
// Usage: node run.js <browser|umd> [extra vitest args...]
// e.g. node run.js browser --reporter=verbose ../../lib/core/bucketer/index.spec.ts

const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const browserstack = require('browserstack-local');

const MODES = {
  browser: { label: 'browser', config: 'vitest.browser.config.mts' },
  umd: { label: 'UMD', config: 'vitest.umd.config.mts' },
};

const mode = MODES[process.argv[2]];
// Passed through to vitest unchanged, e.g. a reporter or specific spec files
const extraVitestArgs = process.argv.slice(3);
// Vitest's CLI script. Running it with node (no shell) passes the arguments
// through exactly, and works the same on Windows, where npx is a .cmd file.
const vitestCli = path.join(
  path.dirname(require.resolve('vitest/package.json')),
  require('vitest/package.json').bin.vitest
);
if (!mode) {
  console.error(`Usage: node run.js <${Object.keys(MODES).join('|')}>`);
  process.exit(1);
}

const projectDir = __dirname;
const repoRoot = path.resolve(projectDir, '../..');

// Browser configurations grouped by browser name
const BROWSER_CONFIGS = {
  chrome: [
    { name: 'chrome-102-windows', browserVersion: '102', os: 'Windows', osVersion: '11' },
    { name: 'chrome-latest-windows', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
  ],
  firefox: [
    { name: 'firefox-91-windows', browserVersion: '91', os: 'Windows', osVersion: '11' },
    { name: 'firefox-latest-windows', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
  ],
  edge: [
    { name: 'edge-89-windows', browserVersion: '89', os: 'Windows', osVersion: '11' },
    { name: 'edge-latest-windows', browserVersion: 'latest', os: 'Windows', osVersion: '11' },
  ],
  safari: [
    { name: 'safari-monterey', os: 'OS X', osVersion: 'Monterey' },
    { name: 'safari-sequoia', os: 'OS X', osVersion: 'Sequoia' },
  ]
};

// Determine if we should use local browser or BrowserStack
// Priority: USE_LOCAL_BROWSER env var, then check for BrowserStack credentials
let useLocalBrowser = process.env.USE_LOCAL_BROWSER === 'true';

if (!useLocalBrowser) {
  const username = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

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

let bs_local = null;

function startTunnel(localIdentifier) {
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

  console.log(`Starting BrowserStack Local tunnel with identifier: ${localIdentifier}...`);
  bs_local = new browserstack.Local();
  const bsLocalArgs = {
    key: accessKey,
    // No `force: true` here: it kills every other BrowserStack Local tunnel on
    // the machine, which breaks runs going in parallel. The unique
    // localIdentifier keeps parallel tunnels apart.
    forceLocal: true,
    // Enable verbose logging to debug tunnel issues
    verbose: true,
    localIdentifier: localIdentifier,
  };

  return new Promise((resolve, reject) => {
    bs_local.start(bsLocalArgs, (error) => {
      if (error) {
        console.error('Error starting BrowserStack Local:', error);
        reject(error);
      } else {
        console.log('BrowserStack Local tunnel started successfully');
        console.log(`BrowserStack Local PID: ${bs_local.pid}`);
        console.log(`Local Identifier: ${localIdentifier}`);
        // Wait for tunnel to fully establish and register with BrowserStack
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

// Builds the UMD bundle in the repo root and copies it to public/dist/, where
// the umd plugin's <script> tag loads it from.
function buildUmdBundle() {
  console.log('\n' + '='.repeat(80));
  console.log('Building UMD bundle...');
  console.log('='.repeat(80));
  execSync('npm run build-browser-umd', { stdio: 'inherit', cwd: repoRoot });

  const sourceFile = path.join(repoRoot, 'dist/optimizely.browser.umd.min.js');
  const destDir = path.join(projectDir, 'public/dist');
  const destFile = path.join(destDir, 'optimizely.browser.umd.min.js');

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(sourceFile, destFile);
  console.log(`Copied ${sourceFile} to ${destFile}`);
}

async function runTests() {
  let exitCode = 0;

  try {
    if (mode === MODES.umd) {
      try {
        buildUmdBundle();
      } catch (error) {
        console.error('Failed to build UMD bundle:', error.message);
        exitCode = 1;
        return;
      }
    }

    // Get browser name from environment variable (default to chrome)
    const browserName = (process.env.TEST_BROWSER || 'chrome').toLowerCase();

    let configs;

    if (useLocalBrowser) {
      configs = [{ name: browserName }];
      console.log('Local browser mode: using local browser installation');
    } else {
      configs = BROWSER_CONFIGS[browserName];
      if (!configs || configs.length === 0) {
        console.error(`Error: No configurations found for browser '${browserName}'`);
        console.error(`Available browsers: ${Object.keys(BROWSER_CONFIGS).join(', ')}`);
        exitCode = 1;
        return;
      }
    }

    // Only start tunnel if using BrowserStack
    let localIdentifier;
    if (!useLocalBrowser) {
      // Unique per run, so several runs (e.g. one per browser) can each have
      // their own tunnel at the same time
      localIdentifier = `vitest5-${mode.label.toLowerCase()}-${browserName}-${process.pid}-${Date.now()}`;
      await startTunnel(localIdentifier);
    } else {
      console.log('Using local browser mode - no BrowserStack connection needed');
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Running ${mode.label} tests for browser: ${browserName}`);
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

      const env = {
        ...process.env,
        USE_LOCAL_BROWSER: useLocalBrowser ? 'true' : 'false',
        TEST_BROWSER: browserName,
        TEST_BROWSER_VERSION: config.browserVersion,
        TEST_OS_NAME: config.os,
        TEST_OS_VERSION: config.osVersion,
        // Pass the local identifier to vitest config for BrowserStack capabilities
        BROWSERSTACK_LOCAL_IDENTIFIER: localIdentifier,
      };

      try {
        execFileSync(process.execPath, [vitestCli, 'run', '--config', mode.config, ...extraVitestArgs], {
          stdio: 'inherit',
          cwd: projectDir,
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
    console.log(`${mode.label} test summary for ${browserName}:`);
    console.log('='.repeat(80));

    const failures = results.filter((r) => !r.success);

    results.forEach(({ config, success }) => {
      if (success) {
        console.log(`✓ ${config}: PASSED`);
      } else {
        console.error(`✗ ${config}: FAILED`);
      }
    });

    console.log('='.repeat(80));
    console.log(`Total: ${results.length} configurations`);
    console.log(`Passed: ${results.length - failures.length}`);
    console.log(`Failed: ${failures.length}`);
    console.log('='.repeat(80));

    if (failures.length > 0) {
      console.error(`\nSome ${browserName} configurations failed. See above for details.`);
      exitCode = 1;
    } else {
      console.log(`\nAll ${browserName} configurations passed!`);
    }
  } catch (error) {
    // Report here: process.exit() in finally would otherwise end the process
    // before the error reaches the caller, with exit code 0.
    console.error('Fatal error:', error);
    exitCode = 1;
  } finally {
    if (!useLocalBrowser) {
      await stopTunnel();
    }

    process.exit(exitCode);
  }
}

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

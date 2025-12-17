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

const { execSync, spawn } = require('child_process');
const browserstack = require('browserstack-local');
const path = require('path');


// Note: Browser instances are now configured in vitest.browser.config.mts
// The Vitest config will run all browsers (Chrome, Firefox, Edge, Safari, Opera) automatically

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
let proxyProcess = null;

// Start WebSocket header injection proxy for Safari
function startProxy() {
  return new Promise((resolve, reject) => {
    console.log('Starting WebSocket header injection proxy...');

    const proxyPath = path.join(__dirname, 'websocket-header-proxy.js');
    const logPath = path.join(__dirname, '..', 'header-proxy.log');

    // Open log file in append mode synchronously
    const fs = require('fs');
    const logFd = fs.openSync(logPath, 'a');

    proxyProcess = spawn('node', [proxyPath], {
      stdio: ['ignore', logFd, logFd], // stdin ignored, stdout/stderr to log file descriptor
      detached: false,
    });

    proxyProcess.on('error', (error) => {
      console.error('Error starting proxy:', error);
      fs.closeSync(logFd);
      reject(error);
    });

    proxyProcess.on('exit', () => {
      fs.closeSync(logFd);
    });

    // Give proxy time to start
    setTimeout(() => {
      console.log('Proxy ready! (logs: header-proxy.log)');
      resolve();
    }, 2000);
  });
}

function stopProxy() {
  if (!proxyProcess) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    proxyProcess.kill();
    proxyProcess = null;
    console.log('WebSocket header injection proxy stopped');
    resolve();
  });
}

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
    // 'onlyHosts': 'asdffasdf.com,63315,1,vite.asdffasdf.com.com,63315,1', // Allowlist hosts and ports
    // Enable WebSocket support through the BrowserStack Local tunnel
    // This preserves WebSocket upgrade headers (especially critical for Safari)
    // wsLocalSupport: true,
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
    // Start WebSocket header injection proxy (for Safari compatibility)
    await startProxy();

    // Only start tunnel if using BrowserStack
    if (!useLocalBrowser) {
      await startTunnel();
    } else {
      console.log('Using local browser mode - no BrowserStack connection needed');
    }

    console.log(`\n${'='.repeat(80)}`);
    const browserList = process.env.VITEST_BROWSER || 'Chrome 102, Firefox 91, Edge 84, Safari 13.1, Opera 76';
    console.log(`Running tests on ${useLocalBrowser ? 'local browsers' : 'BrowserStack'} (${browserList})...`);
    console.log('='.repeat(80));

    // Set environment variables
    const env = {
      ...process.env,
      USE_LOCAL_BROWSER: useLocalBrowser ? 'true' : 'false',
    };

    try {
      // Run vitest with TLS preload script to intercept WebSocket headers
      // The preload script patches the TLS module BEFORE any other modules load
      const preloadPath = path.resolve(__dirname, '..', 'tls-patch-preload.js');
      const envWithPreload = {
        ...env,
        NODE_OPTIONS: `--require ${preloadPath}${env.NODE_OPTIONS ? ' ' + env.NODE_OPTIONS : ''}`
      };

      execSync('npm run test-vitest -- --config vitest.browser.config.mts', {
        stdio: 'inherit',
        env: envWithPreload,
      });

      console.log('\n✓ All browser tests passed!');
    } catch (error) {
      console.error('\n✗ Some browser tests failed');
      hasFailures = true;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('Browser test summary:');
    console.log('='.repeat(80));

    if (hasFailures) {
      console.error('Some browser tests failed. See above for details.');
    } else {
      console.log('All browser tests passed!');
    }
  } finally {
    // Stop proxy and tunnel
    await stopProxy();

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

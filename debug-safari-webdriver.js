#!/usr/bin/env node

/**
 * WebDriver script to launch Safari on BrowserStack and connect to debug server
 * This will help isolate WebSocket issues with Safari automation
 */

const { remote } = require('webdriverio');
require('dotenv').config();

async function debugSafariWebSocket() {
  console.log('='.repeat(80));
  console.log('SAFARI WEBDRIVER DEBUG TEST');
  console.log('='.repeat(80));
  console.log('');

  const capabilities = {
    browserName: 'safari',
    browserVersion: '14',
    platformName: 'macOS',
    acceptInsecureCerts: true,
    'bstack:options': {
      os: 'OS X',
      osVersion: 'Big Sur',
      buildName: 'Safari WebSocket Debug',
      projectName: 'WebSocket Debug',
      sessionName: 'Safari 14 Big Sur WebSocket Debug',
      local: true,
      wsLocalSupport: true,
      debug: true,
      networkLogs: true,
      consoleLogs: 'verbose',
      video: true,
      // Enable all possible debug options
      seleniumLogs: true,
      appiumLogs: true,
      seleniumVersion: '3.14.0',
    },
    // Safari-specific W3C capabilities
    'webkit:WebRTC': {
      DisableICECandidateFiltering: true,
    },
    'safari:automaticInspection': false,
    'safari:automaticProfiling': false,
    webSocketUrl: true,
  };

  console.log('Capabilities:');
  console.log(JSON.stringify(capabilities, null, 2));
  console.log('');

  console.log('Connecting to BrowserStack...');

  const browser = await remote({
    user: process.env.BROWSERSTACK_USERNAME,
    key: process.env.BROWSERSTACK_ACCESS_KEY,
    hostname: 'hub-cloud.browserstack.com',
    port: 443,
    path: '/wd/hub',
    capabilities,
    logLevel: 'trace', // Maximum logging
    connectionRetryTimeout: 180000,
    connectionRetryCount: 3,
  });

  try {
    console.log('');
    console.log('Session created successfully!');
    console.log('Session ID:', browser.sessionId);
    console.log('');

    // Navigate to debug server
    const testUrl = 'http://localhost:8888/';
    console.log('Navigating to:', testUrl);
    console.log('(BrowserStack Local will redirect localhost to bs-local.com)');
    console.log('');

    await browser.url(testUrl);

    console.log('Page loaded, waiting for WebSocket connection...');
    console.log('');

    // Wait and monitor page state
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      try {
        // Get page title
        const title = await browser.getTitle();

        // Execute script to get debug info from page
        const debugInfo = await browser.execute(() => {
          return {
            location: window.location.href,
            readyState: document.readyState,
            title: document.title,
            userAgent: navigator.userAgent,
            logsCount: window.debugLogs ? window.debugLogs.length : 0,
            lastLogs: window.debugLogs ? window.debugLogs.slice(-5) : [],
            wsStatus: document.getElementById('ws-status') ? document.getElementById('ws-status').textContent : 'unknown',
            pageStatus: document.getElementById('page-status') ? document.getElementById('page-status').textContent : 'unknown',
          };
        });

        console.log(`[${i * 2}s] Page State:`, {
          title,
          wsStatus: debugInfo.wsStatus,
          pageStatus: debugInfo.pageStatus,
          logsCount: debugInfo.logsCount,
        });

        // Print recent logs from browser
        if (debugInfo.lastLogs && debugInfo.lastLogs.length > 0) {
          console.log('  Recent browser logs:');
          debugInfo.lastLogs.forEach(log => {
            console.log('   ', log.type, log.message, log.data || '');
          });
        }

        // Check if WebSocket is connected
        if (debugInfo.wsStatus && debugInfo.wsStatus.includes('Connected')) {
          console.log('');
          console.log('✓ WebSocket connected successfully!');
          console.log('');

          // Get all logs
          const allLogs = await browser.execute(() => {
            return window.getAllLogs ? window.getAllLogs() : '[]';
          });

          console.log('All browser logs:');
          console.log(allLogs);

          // Wait a bit more to see if connection stays stable
          console.log('Waiting 30 more seconds to verify connection stability...');
          await new Promise(resolve => setTimeout(resolve, 30000));

          const finalStatus = await browser.execute(() => {
            return {
              wsStatus: document.getElementById('ws-status') ? document.getElementById('ws-status').textContent : 'unknown',
              logsCount: window.debugLogs ? window.debugLogs.length : 0,
            };
          });

          console.log('Final status after 30s:', finalStatus);

          break;
        }

        // Check if WebSocket failed
        if (debugInfo.wsStatus && (debugInfo.wsStatus.includes('Error') || debugInfo.wsStatus.includes('Disconnected'))) {
          console.log('');
          console.log('✗ WebSocket connection failed or disconnected');
          console.log('');

          // Get all logs for analysis
          const allLogs = await browser.execute(() => {
            return window.getAllLogs ? window.getAllLogs() : '[]';
          });

          console.log('All browser logs:');
          console.log(allLogs);

          // Continue monitoring to see if it reconnects
        }

      } catch (error) {
        console.error('Error getting page state:', error.message);
      }
    }

    console.log('');
    console.log('Test duration completed (120 seconds)');
    console.log('');

    // Final snapshot
    try {
      const finalLogs = await browser.execute(() => {
        return window.getAllLogs ? window.getAllLogs() : '[]';
      });

      console.log('FINAL BROWSER LOGS:');
      console.log(finalLogs);
    } catch (error) {
      console.error('Error getting final logs:', error.message);
    }

    console.log('');
    console.log('BrowserStack Session URL:');
    console.log(`https://automate.browserstack.com/dashboard/v2/builds`);
    console.log('Session ID:', browser.sessionId);
    console.log('');
    console.log('Please check BrowserStack dashboard for:');
    console.log('  - Video recording');
    console.log('  - Console logs');
    console.log('  - Network logs');
    console.log('  - Selenium logs');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('ERROR:', error);
    console.error('');
  } finally {
    console.log('Closing browser session...');
    await browser.deleteSession();
    console.log('Browser session closed');
    console.log('');
    console.log('='.repeat(80));
    console.log('TEST COMPLETE');
    console.log('='.repeat(80));
  }
}

// Check environment variables
if (!process.env.BROWSERSTACK_USERNAME || !process.env.BROWSERSTACK_ACCESS_KEY) {
  console.error('Error: BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY must be set');
  process.exit(1);
}

debugSafariWebSocket().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

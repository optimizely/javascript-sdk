#!/usr/bin/env node

/**
 * Simple test to verify Safari WebSocket connectivity through BrowserStack
 * This helps isolate whether the issue is with Vitest or Safari automation in general
 */

const { remote } = require('webdriverio');
require('dotenv').config();

async function testSafariWebSocket() {
  const capabilities = {
    browserName: 'safari',
    browserVersion: '14',
    acceptInsecureCerts: true,
    'bstack:options': {
      os: 'OS X',
      osVersion: 'Big Sur',
      local: true,
      wsLocalSupport: true,
      debug: true,
      consoleLogs: 'verbose',
    },
    'webkit:WebRTC': {
      DisableICECandidateFiltering: true,
    },
    'safari:automaticInspection': false,
    'safari:automaticProfiling': false,
    webSocketUrl: true,
  };

  console.log('Connecting to BrowserStack Safari...');

  const browser = await remote({
    user: process.env.BROWSERSTACK_USERNAME,
    key: process.env.BROWSERSTACK_ACCESS_KEY,
    capabilities,
    logLevel: 'trace',
  });

  try {
    console.log('Navigating to simple WebSocket test page...');

    // Navigate to a simple test page
    await browser.url('http://bs-local.com:5173');

    console.log('Page loaded, waiting 5 seconds...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Checking if WebSocket is available...');
    const result = await browser.execute(() => {
      return {
        hasWebSocket: typeof WebSocket !== 'undefined',
        userAgent: navigator.userAgent,
        location: window.location.href,
      };
    });

    console.log('WebSocket check result:', result);

    console.log('Attempting to create WebSocket connection...');
    const wsResult = await browser.execute(() => {
      try {
        const ws = new WebSocket('ws://bs-local.com:5173');

        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve({ status: 'timeout', readyState: ws.readyState });
          }, 5000);

          ws.onopen = () => {
            clearTimeout(timeout);
            resolve({ status: 'connected', readyState: ws.readyState });
            ws.close();
          };

          ws.onerror = (error) => {
            clearTimeout(timeout);
            resolve({ status: 'error', readyState: ws.readyState, error: error.toString() });
          };
        });
      } catch (error) {
        return { status: 'exception', error: error.toString() };
      }
    });

    console.log('WebSocket connection result:', wsResult);

  } finally {
    console.log('Closing browser session...');
    await browser.deleteSession();
  }
}

testSafariWebSocket().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});

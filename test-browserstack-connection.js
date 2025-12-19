#!/usr/bin/env node

/**
 * Simple test to verify BrowserStack Playwright WebSocket connection works
 */

require('dotenv').config();
const { chromium } = require('playwright');

const username = process.env.BROWSERSTACK_USERNAME || process.env.BROWSER_STACK_USERNAME;
const accessKey = process.env.BROWSERSTACK_ACCESS_KEY || process.env.BROWSER_STACK_ACCESS_KEY;

if (!username || !accessKey) {
  console.error('Error: BrowserStack credentials not found in environment');
  process.exit(1);
}

const caps = {
  'browserstack.username': username,
  'browserstack.accessKey': accessKey,
  'browser': 'chrome',
  'browser_version': 'latest',
  'os': 'Windows',
  'os_version': '11',
  'build': 'Test Connection',
  'name': 'Simple Connection Test',
  'browserstack.debug': 'true',
  'client.playwrightVersion': '1.57.0',
};

const capsJson = JSON.stringify(caps);
const encodedCaps = encodeURIComponent(capsJson);
const wsEndpoint = `wss://cdp.browserstack.com/playwright?caps=${encodedCaps}`;

console.log('Testing BrowserStack connection...');
console.log('WebSocket URL:', wsEndpoint);
console.log('\nAttempting to connect...\n');

async function testConnection() {
  let browser;
  try {
    browser = await chromium.connect(wsEndpoint, {
      timeout: 120000, // 2 minutes
    });

    console.log('✅ Successfully connected to BrowserStack!');

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://www.example.com', { timeout: 30000 });
    const title = await page.title();

    console.log(`✅ Successfully loaded page: ${title}`);

    await browser.close();
    console.log('✅ Connection test completed successfully!');

  } catch (error) {
    console.error('❌ Connection failed:');
    console.error(error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testConnection();

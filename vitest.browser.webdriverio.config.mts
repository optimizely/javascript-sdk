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
import path from 'path';
import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
  resolve: {
    alias: {
      'error_message': path.resolve(__dirname, './lib/message/error_message'),
      'log_message': path.resolve(__dirname, './lib/message/log_message'),
    },
  },
  test: {
    isolate: false,
    browser: {
      enabled: true,
      provider: 'webdriverio',
      name: process.env.VITEST_BROWSER_NAME || 'chrome',
      headless: process.env.CI === 'true' || process.env.HEADLESS === 'true',
      providerOptions: {
        capabilities: {
          browserName: process.env.VITEST_BROWSER_NAME || 'chrome',
          browserVersion: process.env.VITEST_BROWSER_VERSION || 'stable',
          'goog:chromeOptions': {
            args: [
              '--disable-blink-features=AutomationControlled',
              '--disable-dev-shm-usage',
              '--no-sandbox',
            ],
            binary: process.env.CHROME_BIN, // For CI environments that need custom Chrome path
          },
          'moz:firefoxOptions': {
            args: process.env.HEADLESS === 'true' || process.env.CI === 'true' ? ['-headless'] : [],
            binary: process.env.FIREFOX_BIN, // For CI environments that need custom Firefox path
          },
          'ms:edgeOptions': {
            args: [
              '--disable-blink-features=AutomationControlled',
              '--disable-dev-shm-usage',
              '--no-sandbox',
            ],
            binary: process.env.EDGE_BIN, // For CI environments that need custom Edge path
          },
        },
        // WebDriverIO timeouts
        connectionRetryTimeout: 120000,
        connectionRetryCount: 3,
        waitforTimeout: 30000,
      }
    },
    onConsoleLog: () => true,
    testTimeout: 30000,
    hookTimeout: 30000,
    // Include all .spec.ts files in lib directory, but exclude react_native tests
    include: ['lib/**/*.spec.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.react_native.spec.ts',
    ],
    typecheck: {
      enabled: true,
      tsconfig: 'tsconfig.spec.json',
    },
  },
});

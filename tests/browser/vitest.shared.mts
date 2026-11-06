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
/// <reference types="@vitest/browser-webdriverio" />

// Shared config for running the SDK's spec files (in ../../lib) in real browsers.
//
// The Vite root intentionally stays at this directory (not the repo root), so
// that `vitest` resolves to this project's Vitest. Vitest pre-bundles `vitest`
// from its root, and the spec files' `import ... from 'vitest'` is mapped to that
// pre-bundled copy, even though the root node_modules has its own, older Vitest
// (used for the Node tests).
import path from 'node:path';
import { defineConfig, type ViteUserConfig } from 'vitest/config';
import { webdriverio, type WebdriverProviderOptions } from '@vitest/browser-webdriverio';
import { legacyPolyfillsPlugin, legacyPolyfillsOrchestratorScript } from './legacy-polyfills-plugin';

export const repoRoot = path.resolve(__dirname, '../..');

const useLocalBrowser = process.env.USE_LOCAL_BROWSER === 'true';

const testBrowser = process.env.TEST_BROWSER || 'chrome';
const testBrowserVersion = process.env.TEST_BROWSER_VERSION;
const testOsName = process.env.TEST_OS_NAME;
const testOsVersion = process.env.TEST_OS_VERSION;

const chromeOptions = {
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-dev-shm-usage',
    '--no-sandbox',
  ],
};

// Set WDIO_LOG_LEVEL (e.g. "info" or "trace") to see webdriverio's commands
const logLevelOption = process.env.WDIO_LOG_LEVEL
  ? { logLevel: process.env.WDIO_LOG_LEVEL as WebdriverProviderOptions['logLevel'] }
  : {};

function buildProviderOptions(): WebdriverProviderOptions {
  return { ...logLevelOption, ...buildConnectionOptions() };
}

function buildConnectionOptions(): WebdriverProviderOptions {
  if (useLocalBrowser) {
    return {
      capabilities: {
        browserName: testBrowser,
        'goog:chromeOptions': chromeOptions,
      },
    };
  }

  const localIdentifier = process.env.BROWSERSTACK_LOCAL_IDENTIFIER;

  return {
    user: process.env.BROWSERSTACK_USERNAME,
    key: process.env.BROWSERSTACK_ACCESS_KEY,
    capabilities: {
      browserName: testBrowser,
      // Use classic WebDriver. Older browser drivers don't support the BiDi
      // viewport command; with BiDi off, Vitest resizes with the classic
      // window-size command instead.
      'wdio:enforceWebDriverClassic': true,
      'goog:chromeOptions': chromeOptions,
      'bstack:options': {
        os: testOsName,
        osVersion: testOsVersion,
        browserVersion: testBrowserVersion,
        buildName: process.env.VITEST_BUILD_NAME || 'Vitest Browser Tests',
        projectName: 'Optimizely JavaScript SDK',
        sessionName: `${testBrowser} ${testBrowserVersion || ''} on ${testOsName} ${testOsVersion}`,
        local: true,
        // Include localIdentifier for parallel tunnel support
        ...(localIdentifier && { localIdentifier }),
        debug: false,
        networkLogs: false,
        consoleLogs: 'errors',
        seleniumLogs: false,
        idleTimeout: 900, // 15 minutes idle timeout - prevents premature session closure during long test runs
      },
    } as WebdriverProviderOptions['capabilities'],
    connectionRetryTimeout: 120000, // 2 minutes connection retry timeout
    connectionRetryCount: 3, // Retry 3 times on connection failure
    waitforTimeout: 30000, // 30 seconds wait timeout - matches test expectations
    waitforInterval: 1000, // Poll every 1 second - faster feedback
    keepAlive: true,
    keepAliveInterval: 30000,
  } as WebdriverProviderOptions;
}

export function createBrowserConfig(options: {
  plugins?: ViteUserConfig['plugins'];
  include: string[];
  exclude?: string[];
}) {
  return defineConfig({
    plugins: [
      // Built-ins Vitest's browser runtime needs but Edge 89/90 and Firefox 91 lack
      // (test iframe; the orchestrator page gets them via orchestratorScripts)
      legacyPolyfillsPlugin(),
      ...(options.plugins ?? []),
    ],
    resolve: {
      alias: {
        'error_message': path.resolve(repoRoot, './lib/message/error_message'),
        'log_message': path.resolve(repoRoot, './lib/message/log_message'),
      },
    },
    // Vite 8 transforms source with Oxc instead of esbuild (`esbuild.target` is ignored).
    // This can't be 'es2015': the modules Vitest generates for vi.mock use
    // top-level await and string export names
    // (`export { x as "name" }`), which can't be lowered, and Oxc breaks those
    // modules when asked to. So target the oldest browsers we test instead.
    // Edge is listed as 90 although Edge 89 is tested: compatibility tables put
    // string export names at Chromium 90, so 'edge89' could make Oxc refuse the
    // mock modules again. Edge 89 runs them fine (full suite passes on
    // BrowserStack), and 'edge90' lowers the same syntax otherwise.
    oxc: {
      target: ['chrome102', 'edge90', 'firefox91', 'safari15'],
    },
    build: {
      target: 'es2015',
    },
    optimizeDeps: {
      // Vite 8 pre-bundles dependencies with Rolldown instead of esbuild
      // (`optimizeDeps.esbuildOptions.target` is ignored). Lowering the
      // pre-bundled deps to ES2015 removes syntax such as class static blocks
      // in chai (used by vitest's expect), which older browsers like Firefox 91
      // don't support.
      rolldownOptions: {
        transform: {
          target: 'es2015',
        },
      },
    },
    // console-capture.js, and the UMD bundle (copied to public/dist by run.js)
    publicDir: path.resolve(__dirname, 'public'),
    server: {
      host: '0.0.0.0',
      // for safari, browserstack redirects localhost to bs-local.com
      allowedHosts: ['bs-local.com', 'localhost'],
      fs: {
        // The spec files and SDK source live outside this project's root
        allow: [repoRoot],
      },
    },
    test: {
      // Scan for spec files from the repo root (the Vite root stays at this directory)
      dir: repoRoot,
      // Each spec file gets its own iframe. With `isolate: false` files share one
      // document, which breaks vi.mock: a module loaded unmocked by one file
      // stays unmocked for later files that mock it.
      isolate: true,
      // Vitest defaults this to true. Clearing mocks before each test wipes calls
      // made when a module first loads, e.g. the `new DefaultEventDispatcher(...)`
      // in default_dispatcher.browser.ts that default_dispatcher.browser.spec.ts
      // asserts on.
      clearMocks: false,
      // Makes vi.restoreAllMocks() also reset vi.fn() mocks, which the specs rely on
      setupFiles: [path.resolve(__dirname, 'restore-all-mocks.setup.ts')],
      fileParallelism: true,
      maxConcurrency: 5,
      onConsoleLog: () => true,
      browser: {
        enabled: true,
        provider: webdriverio(buildProviderOptions()),
        // Always mock modules by intercepting requests. Vitest would otherwise
        // use import maps only in browsers that support them
        // (Chromium 133+, Safari 18.4+), so the old and latest browser versions
        // would mock differently. Import-map mocking also fails
        // event_processor_factory.browser.spec.ts.
        importMapMocks: false,
        // Same polyfills as legacyPolyfillsPlugin, for the orchestrator page
        orchestratorScripts: [legacyPolyfillsOrchestratorScript],
        headless: false,
        instances: [{ browser: testBrowser as 'chrome' | 'firefox' | 'edge' | 'safari' }],
        connectTimeout: 300000,
      },
      testTimeout: 60000,
      hookTimeout: 30000,
      include: options.include,
      exclude: options.exclude,
      // Type tests are not run here. They run tsc in Node (not in the browser)
      // and are already covered by the root `npm test`. This Vitest also fails
      // type-test files that have no test() blocks ("No test suite found"),
      // which is how lib/entrypoint*.test-d.ts are written.
      typecheck: {
        enabled: false,
      },
    },
  });
}

# Browser and UMD tests

Runs the SDK's spec files from `../../lib` in real browsers, locally or on BrowserStack, with Vitest 5. It's a separate project because the root project's Vitest has to keep supporting Node 18 for the Node tests.

Requires Node 22.23.4+, 24.22.1+ or 26.12.1+ (the minimums of the locked webdriverio packages).

```sh
cd tests/browser
npm install

npm run test-browser-local                       # Chrome on this machine
TEST_BROWSER=firefox npm run test-browser-local  # a different local browser
npm run test-umd-local                           # builds the UMD bundle in the repo root first

npm run test-browser   # BrowserStack if credentials are set, local otherwise
npm run test-umd
```

Environment variables:

- `TEST_BROWSER`: `chrome` (default), `firefox`, `edge` or `safari`.
- `USE_LOCAL_BROWSER`: `true` to use a browser on this machine. Without it, runs use BrowserStack when credentials are set.
- `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY`: BrowserStack credentials.
- `VITEST_REQUEST_LOGGER` / `VITEST_CONSOLE_CAPTURE`: `true` to log dev-server requests, or to print the browser's console output in the terminal.
- `WDIO_LOG_LEVEL`: e.g. `info` to see webdriverio's commands.

On BrowserStack each browser runs its oldest supported version and its latest (see `BROWSER_CONFIGS` in `run.js`). Runs can go in parallel, for example one terminal per browser: each run starts its own BrowserStack Local tunnel with a unique identifier.

Extra arguments go to Vitest, for example `node run.js browser --reporter=verbose ../../lib/core/bucketer/index.spec.ts`.

## Setup notes

- Each spec file runs in its own iframe (`isolate: true`). Shared iframes break `vi.mock`.
- Modules are always mocked by request interception (`browser.importMapMocks: false`), so every browser version mocks the same way. Old browsers can't use import-map mocking.
- `clearMocks: false` plus `restore-all-mocks.setup.ts` give the mock-reset behavior the specs rely on.
- Source is compiled for the oldest tested browsers, not ES2015, because Vitest's mock modules can't be compiled down to ES2015. Dependencies are still compiled to ES2015.
- Classic WebDriver is used on BrowserStack (`wdio:enforceWebDriverClassic`), because older browser drivers don't support the BiDi viewport command.
- `legacy-polyfills-plugin.ts` adds `Array.prototype.at`, `findLast`/`findLastIndex` and `Object.hasOwn` to both pages Vitest loads (the orchestrator page and the test iframe). Vitest's browser runtime calls them, and Edge 89/90 and Firefox 91 don't have them; without the polyfills the run hangs until it times out. The SDK code under test sees the polyfills too (`lib/` doesn't use these functions today).
- `lightningcss` is replaced by an empty stub (`stubs/lightningcss`, wired in through `overrides` in `package.json`). It's MPL-2.0, which our license policy doesn't allow. Vite 8 depends on it but only loads it for `css.transformer: 'lightningcss'` or CSS minification in production builds, neither of which happens here. If something ever loads it, the stub throws an error saying so.
- Type tests (`*.test-d.ts`) are skipped. The root `npm test` already runs them.

See the comments in `vitest.shared.mts` for details.

# Browser and UMD tests on Vitest 5

Runs the same browser and UMD spec files as the root setup (`npm run test-browser` / `npm run test-umd`), but with Vitest 5 instead of Vitest 3. It's a separate project because the root has to stay on Vitest 3 for Node 18. The root setup is unchanged and still works.

Requires Node 22.23.4+, 24.22.1+ or 26.12.1+ (the minimums of the locked webdriverio packages; Vitest 5 itself needs 22.12+).

```sh
cd tests/browser
npm install

npm run test-browser-local                       # Chrome on this machine
TEST_BROWSER=firefox npm run test-browser-local  # a different local browser
npm run test-umd-local                           # builds the UMD bundle in the repo root first

npm run test-browser   # BrowserStack if credentials are set, local otherwise
npm run test-umd
```

Same environment variables as the root setup: `TEST_BROWSER`, `USE_LOCAL_BROWSER`, `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY`, `VITEST_REQUEST_LOGGER`, `VITEST_CONSOLE_CAPTURE`. Same browser matrix as the root setup (see `BROWSER_CONFIGS` in `run.js`).

Runs can go in parallel, for example one terminal per browser: each run starts its own BrowserStack Local tunnel with a unique identifier. (The root scripts start the tunnel with `force: true`, which kills other tunnels, so they can't run alongside each other or this project.)

Extra arguments go to Vitest, for example `node run.js browser --reporter=verbose ../../lib/core/bucketer/index.spec.ts`.

## Differences from the root (Vitest 3) setup

- No viewport patch. Vitest 5 falls back to classic WebDriver when BiDi is off.
- Each spec file runs in its own iframe (`isolate: true`). Shared iframes break `vi.mock` under Vitest 5.
- Modules are always mocked by request interception (`browser.importMapMocks: false`), the same way Vitest 3 does it and the way old browsers must.
- `clearMocks: false` plus `vitest3-compat.setup.ts` keep the Vitest 3 mock-reset behavior the specs rely on.
- Source is compiled for the oldest tested browsers, not ES2015, because Vitest 5's mock modules can't be compiled down to ES2015. Dependencies are still compiled to ES2015.
- `legacy-polyfills-plugin.ts` adds `Array.prototype.at`, `findLast`/`findLastIndex` and `Object.hasOwn` to both pages Vitest loads (the orchestrator page and the test iframe). Vitest 5's browser runtime calls them, and Edge 89/90 and Firefox 91 don't have them; without the polyfills the run hangs until it times out. The SDK code under test sees the polyfills too (`lib/` doesn't use these functions today).
- `lightningcss` is replaced by an empty stub (`stubs/lightningcss`, wired in through `overrides` in `package.json`). It's MPL-2.0, which our license policy doesn't allow. Vite 8 depends on it but only loads it for `css.transformer: 'lightningcss'` or CSS minification in production builds, neither of which happens here. If something ever loads it, the stub throws an error saying so.
- Type tests (`*.test-d.ts`) are skipped. The root `npm test` already runs them.

See the comments in `vitest.shared.mts` for details.

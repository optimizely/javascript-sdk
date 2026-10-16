# React Native Metro tests

These tests check how the SDK behaves in React Native apps when optional dependencies are installed or missing: `fast-text-encoding`, `react-native-get-random-values` and `@react-native-async-storage/async-storage`. They run on a Metro version with the dependency-map bug (Metro 0.80, React Native 0.73) and on one with the fix (Metro 0.87, React Native 0.87). See `lib/import.react_native/README.md` for the bug and how the SDK's optional import shims avoid it.

Run them with:

```sh
npm run test-rn-metro
```

To test a specific package or a subset: `node tests/react-native-metro/run.mjs [--sdk <package.tgz>] [--fixture rn-0.73] [--case P2]`.

## How it works

For each case, the test app in `app/` is bundled with a real Metro and React Native's own Metro config, then run in Node:

1. **The SDK is packed and installed** into `.sdk/` the way an app installs it: `npm pack` (which builds it, as `npm publish` does), with its dependencies and without its optional peer dependencies.
2. **The bundle is built** by `build.cjs` with the fixture's Metro, through `metro-config`'s `loadConfig` as the React Native CLI does. `metro.config.base.js` wraps the fixture's `@react-native/metro-config`, so transforms, inline requires, the serializer and React Native's JS polyfills (including `ErrorUtils`) match an app build. It changes two things:
   - **React Native's startup module is skipped** (`getModulesRunBeforeMainModule`), because it needs native code.
   - **`resolveRequest` decides which optional packages exist.** An installed package resolves to the real `fast-text-encoding` or to a stand-in from `stubs/`, for packages that need native code. A missing package fails to resolve, so Metro handles it as an optional dependency that isn't installed. netinfo always resolves to its stand-in, and bundling `react-native` itself fails the build.
3. **The bundle runs in a fresh Node `vm` context.** It only has standard JS built-ins, so there is no `TextEncoder` or `crypto`, like Hermes before React Native 0.74. Cases with `nativeTextEncoder` add Node's `TextEncoder`.
4. **The app records what happened and `run.mjs` checks it against the case's expectation.** The app records which implementation provides `TextEncoder` and `crypto.getRandomValues`, decisions, dispatched events, and any errors. Decisions must match `EXPECTED_DECISIONS` in `cases.mjs` exactly, so failed decisions don't pass. In failure cases, every recorded error must be the expected one.

Metro's `require` is part of the bundle (`metro-runtime`), so the bundle's modules are loaded by the same code as in an app. Two things make the run behave like an app:

- **`app/setup.js` installs a non-throwing `ErrorUtils` handler.** React Native's startup code replaces the polyfill's handler, which rethrows, with one that reports the error (red box or fatal) and returns. Without it, a failed `require` outside module loading would be rethrown to the caller instead of reported as fatal, and the test couldn't tell the two apart. The test treats a recorded fatal error as the red box.
- **The SDK is loaded on a later tick (`app/index.js`),** when no module is loading, as app code does after startup.

## Files

| Path | Purpose |
|---|---|
| `run.mjs` | Packs and installs the SDK, builds the bundles, runs and checks every case, prints a results table |
| `cases.mjs` | The cases and their expected results |
| `build.cjs` | Builds one bundle with a fixture's Metro |
| `metro.config.base.js` | Metro config shared by the fixtures |
| `app/` | The test app: `index.js` (entry), `setup.js` (error handler, custom polyfills), `test.js` (the test), `datafile.json` |
| `stubs/` | Stand-ins for netinfo, async-storage (v2 with `multiGet`, v3 with `getMany`) and `react-native-get-random-values` |
| `fixtures/rn-0.73`, `fixtures/rn-0.87` | The Metro setup of each React Native version: `@react-native/metro-config`, `metro`, `metro-config`, `@babel/core`, `@babel/runtime` and `fast-text-encoding`, pinned by the committed lockfiles |

`.sdk/` and `.out/` (the bundles) are generated and not committed.

## Adding a case

Add an entry to `CASES` in `cases.mjs`. `modules` sets which optional packages are installed, `runtime` sets what the app does at runtime, and `expect` is one of:
- `works`: which implementation of `TextEncoder` and `getRandomValues` the SDK must use;
- `fatal`: the error reported while the SDK loads;
- `caught`: the error thrown to the app's code.

The comment at the top of `cases.mjs` lists every option.

## Updating a fixture

Change the versions in the fixture's `package.json` to what that React Native version uses, then run `npm install` in the fixture folder and commit the updated lockfile. A fixture only needs React Native's Metro setup, not the `react-native` package.

# React Native optional import shims

Each file in this directory loads one optional React Native dependency (a peer dependency the app may not have installed) and tells the rest of the SDK whether it is available.

The shims are not bundled into the main SDK bundle. Rollup builds each one to the same path under `dist/import.react_native/`, and the main React Native bundles `require` it by relative path (see `rollup.config.mjs`). The rest of this section explains why.

## Why the shims are separate modules

### How Metro connects a `require` to a module

1. **Every file in an app's bundle is a module with a numeric ID.**
2. **When Metro transforms a module, each `require('some-package')` becomes a local index.** Metro lists the module's `require`s in order of appearance and rewrites each one to `_$$_REQUIRE(_dependencyMap[i])`. These indices are fixed at transform time, before Metro checks whether the packages are installed.
3. **When Metro writes the bundle, it gives each module a dependency map.** That's an array mapping local index → module ID, passed as an argument to the module's definition:

   ```js
   // the module's code, as transformed:
   _$$_REQUIRE(_dependencyMap[16], "fast-text-encoding")
   _$$_REQUIRE(_dependencyMap[17], "react-native-get-random-values")

   // the module's definition in the bundle: id 538, then its dependency map
   __d(function (...) { /* module code */ }, 538, [76, 27, /* ... */, 541, 547, 556], "…/index.react_native.min.js");
   ```

### The bug in Metro before 0.82.5

A `require` inside `try/catch` is an *optional dependency*, as long as the app's Metro config has `allowOptionalDependencies` on (React Native's and Expo's defaults turn it on). If the package isn't installed, Metro doesn't fail the build.

Metro 0.82.4 and older also **removes the missing dependency from the module's dependency map**, so the array closes the gap. The module's code still uses the original indices, so every `require` after the missing one shifts by one.

This used to hit the SDK when all of its React Native code was one Rollup bundle, meaning one Metro module. Its dependency map ended with:

| Index | Dependency |
|---|---|
| 14 | `@react-native-async-storage/async-storage` (optional) |
| 15 | `@react-native-community/netinfo` |
| 16 | `fast-text-encoding` (optional) |
| 17 | `react-native-get-random-values` (optional) |

With `fast-text-encoding` not installed, index 16 got `react-native-get-random-values`'s module ID and index 17 pointed past the end of the array:

- **`require("fast-text-encoding")` silently loaded `react-native-get-random-values`.** No error was thrown, no `TextEncoder` was set up, and decisions failed later.
- **`require("react-native-get-random-values")` became `require(undefined)`,** which throws "Requiring unknown module". The SDK then reported "install react-native-get-random-values" even though that package was installed.
- **A missing async-storage would have shifted netinfo and both polyfill `require`s.**

How `require(undefined)` fails also depends on timing:
- **While a module is loading:** the error is thrown to the caller, so a `try/catch` around the `require` catches it.
- **Any other time** (for example a `require` inside a function called later): Metro's loader catches the error itself and reports it as a fatal error. That's a red box in dev and usually a crash in release. The caller's `catch` never sees it.

Metro 0.82.5 fixed the bug by keeping a `null` placeholder for a missing dependency. Requiring `null` throws "Cannot find module", wherever it happens.

**Who's affected:** apps on React Native 0.78 or older, and on 0.79 or 0.80 if their Metro is below 0.82.5. Apps with every optional package installed aren't affected, because nothing gets removed.

### How the shims avoid it

- **Each optional `require` is alone in its own module.** A shim's dependency map has a single entry: its package. If the package is missing, the map is empty and the `require` becomes `require(undefined)`. There is no other `require` in the module that could shift.
- **Each shim does its `require` while the module loads.** The `require(undefined)` error is then thrown to the shim's `try/catch`, which sets `isAvailable = false`. On Metro 0.82.5 and later the `require` throws "Cannot find module", with the same result.
- **The main bundle loads shims by relative path,** for example `require("./import.react_native/fast-text-encoding.js")`. Those files always exist, so the main bundle's dependency map never has a missing entry, and none of its `require`s can shift.

The rules below keep those guarantees.

## Rules for a shim

### One file per optional dependency, named after the package

Two optional `require`s in one module could shift each other, as described above, so each optional package gets its own shim. The file path is the package name plus `.ts`. A scoped package goes in a folder named after its scope.

| Package | Shim |
|---|---|
| `fast-text-encoding` | `fast-text-encoding.ts` |
| `react-native-get-random-values` | `react-native-get-random-values.ts` |
| `@react-native-async-storage/async-storage` | `@react-native-async-storage/async-storage.ts` |

A test goes next to its shim as `<name>.spec.ts`. Spec files are not built as shims.

### Exports: `isAvailable`, plus what the SDK uses from the package

- **`isAvailable`:** `true` if the package loaded, `false` if its `require` threw.
- **The package's exports, under the same names:** if the package isn't installed they are `undefined`. A shim may adapt a value as long as it keeps the package's shape. For example, the async-storage shim adds `multiGet` on AsyncStorage v3.
- **Only the exports the SDK uses:** this isn't required for correctness. Re-exporting more would still be one `require`. It just keeps the shims small.
- **Packages loaded only for side effects:** polyfills like `fast-text-encoding` only need `isAvailable`.
- **A shim can use `export default` when the package has a default export,** as the async-storage shim does. This works because of a setting in `rollup.config.mjs`:
  - Shims are built as CommonJS. A default export becomes `exports.default`, and the file is marked with `__esModule`.
  - In the main CJS bundles, Rollup by default treats a default import from an external CommonJS module as the whole `module.exports`. `import AsyncStorage from '…/async-storage'` would then get the shim's exports object instead of the storage.
  - `rollup.config.mjs` therefore sets `interop: 'esModule'` for shim imports, so the CJS bundles read `exports.default`.
  - Shims are only built as CommonJS; the ESM main bundle imports the same CommonJS files. It doesn't need the setting: the app's bundler (Metro, or webpack) reads `exports.default` for a default import from a CommonJS module marked with `__esModule`.
- **Never throw.** A shim catches the `require` error, sets `isAvailable = false`, and leaves its exports `undefined`. The importer decides what a missing package means. For example, `index.react_native.ts` throws if `TextEncoder` is still missing after the polyfill shims run, and `AsyncStorageCache` throws "Module not found" when there's no AsyncStorage.

### Exactly one `require` in the built file

The optional `require` must be the only `require` in the built shim (`dist/import.react_native/<name>.js`). Any other `require` in the module could shift when the optional package is missing.

**The build enforces this.** The `rn-import-shim-check` plugin in `rollup.config.mjs` fails the build if a built shim contains any `require` other than its own package's. The package is taken from the shim's name, so the check also enforces the naming convention.

- **Wrap the `require` directly in `try/catch`.** Metro only treats a `require` as optional when it is directly inside a `try` block. Without that, a missing package fails the app's build.
- **Run it at module load, not later in a function.** Only then is a failed `require` thrown to the shim's `catch`. Later, Metro before 0.82.5 reports it as a fatal error instead (see "The bug in Metro before 0.82.5").
- **Type-only imports are fine.** TypeScript removes them, for example `import { Platform } from '../platform_support'`.
- **No other runtime imports, not even of guaranteed packages.** Each of these adds a `require` to the built shim:
  - A package import, even of a regular dependency, stays a `require` in the shim. It would only be safe if Metro listed it before the optional `require` in the shim's dependency map, and Metro's inline requires move imports around, so that order can't be relied on.
  - SDK code imported by more than one shim goes into a shared file that each of them `require`s.

  SDK code imported by only one shim is copied into it and adds no `require`, so the check allows it. It is a separate copy from the one in the main bundle, though, so any module state is not shared. Keep shims self-contained.
- **No syntax that needs `tslib` helpers.** With the repo's ES6 target, `async`/`await` compiles to a `tslib` `__awaiter` import, which adds a `require('tslib')`. Use `.then()` instead.
- **Export `__platforms`,** as every file in `lib/` does for the platform-isolation check.

## Template

```ts
import { Platform } from '../platform_support';

export let isAvailable = true;

// Only the exports the SDK uses, under the package's names.
export let someExport: SomeType | undefined;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  someExport = require('some-package').someExport;
} catch (e) {
  isAvailable = false;
}

export const __platforms: Platform[] = ['react_native'];
```

Importers use a shim through a normal relative import, for example `import { isAvailable, someExport } from './import.react_native/some-package'`. The Rollup plugin turns that into the relative `require` of the built shim.

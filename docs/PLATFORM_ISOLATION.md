# Platform Isolation

## Overview

This project supports multiple runtime platforms (Browser, Node.js, React Native, and Universal), with separate entry points for each. To ensure the build artifacts work correctly, platform-specific code must not be mixed.

## Platform Declaration

**Every non-test source file MUST export a `__platforms` array** to declare which platforms it supports. This is enforced by ESLint and validated at build time.

### Export Declaration (Required)

All files must include a `__platforms` export:

**For universal files (all platforms):**
```typescript
export const __platforms = ['__universal__'];
```

**For platform-specific files:**
```typescript
export const __platforms = ['browser'];  // Browser only
export const __platforms = ['node'];     // Node.js only
export const __platforms = ['react_native'];  // React Native only
```

**For multi-platform files:**

```typescript
// lib/utils/web-features.ts
export const __platforms = ['browser', 'react_native'];

// Your code that works on both browser and react_native
export function makeHttpRequest() {
  // Implementation that works on both platforms
}
```

Valid platform identifiers: `'browser'`, `'node'`, `'react_native'`, `'__universal__'`

**Important**: Only files that explicitly include `'__universal__'` in their `__platforms` array are considered universal. Files that list all concrete platforms (e.g., `['browser', 'node', 'react_native']`) are treated as multi-platform files, NOT universal files. They must still ensure imports support all their declared platforms.

### File Naming Convention (Optional)

While not enforced, you should use file name suffixes for clarity:
- `.browser.ts` - Typically browser-specific
- `.node.ts` - Typically Node.js-specific
- `.react_native.ts` - Typically React Native-specific
- `.ts` (no suffix) - Typically universal

**Note:** The validator currently enforces only the `__platforms` export declaration. File naming is informational and not validated. The `__platforms` export is the source of truth.

## Import Rules

Each platform-specific file can **only** import from:

1. **Universal files** (no platform restrictions)
2. **Compatible platform files** (files that support ALL the required platforms)
3. **External packages** (node_modules)

A file is compatible if:
- It's universal (no platform restrictions)
- For single-platform files: The import supports at least that platform
- For multi-platform files: The import supports ALL of those platforms

### Compatibility Examples

**Core Principle**: When file A imports file B, file B must support ALL platforms that file A runs on.

**Universal File (`__platforms = ['__universal__']`)**
- ✅ Can import from: universal files (with `__universal__`)
- ❌ Cannot import from: any platform-specific files, even `['browser', 'node', 'react_native']`
- **Why**: Universal files run everywhere, so all imports must explicitly be universal
- **Note**: Listing all platforms like `['browser', 'node', 'react_native']` is NOT considered universal

**Single Platform File (`__platforms = ['browser']`)**
- ✅ Can import from: universal files, files with `['browser']`, multi-platform files that include browser like `['browser', 'react_native']`
- ❌ Cannot import from: files without browser support like `['node']` or `['react_native']` only
- **Why**: The import must support the browser platform

**Multi-Platform File (`__platforms = ['browser', 'react_native']`)**
- ✅ Can import from: universal files, files with `['browser', 'react_native']`, supersets like `['browser', 'node', 'react_native']`
- ❌ Cannot import from: files missing any platform like `['browser']` only or `['node']`
- **Why**: The import must support BOTH browser AND react_native

**All-Platforms File (`__platforms = ['browser', 'node', 'react_native']`)**
- ✅ Can import from: universal files, files with exactly `['browser', 'node', 'react_native']`
- ❌ Cannot import from: any subset like `['browser']`, `['browser', 'react_native']`, etc.
- **Why**: This is NOT considered universal - imports must support all three platforms
- **Note**: If your code truly works everywhere, use `['__universal__']` instead

### Examples

✅ **Valid Imports**

```typescript
// In lib/index.browser.ts (Browser platform only)
import { Config } from './shared_types';  // ✅ Universal file
import { BrowserRequestHandler } from './utils/http_request_handler/request_handler.browser'; // ✅ browser + react_native (supports browser)
import { uuid } from 'uuid'; // ✅ External package
```

```typescript
// In lib/index.node.ts (Node platform only)
import { Config } from './shared_types';  // ✅ Universal file
import { NodeRequestHandler } from './utils/http_request_handler/request_handler.node'; // ✅ Same platform
```

```typescript
// In lib/vuid/vuid_manager_factory.react_native.ts (React Native platform only)
import { AsyncStorageCache } from '../utils/cache/async_storage_cache.react_native'; // ✅ Compatible (react_native only)
```



```typescript
// In lib/event_processor/event_processor_factory.browser.ts (Browser platform only)
import { Config } from '../shared_types';  // ✅ Universal file
import defaultEventDispatcher from './event_dispatcher/default_dispatcher.browser'; // ✅ Compatible (browser + react_native, includes browser)
```

```typescript
// In lib/event_processor/event_dispatcher/default_dispatcher.browser.ts (Multi-platform: browser + react_native)
import { Config } from '../../shared_types';  // ✅ Universal file
import { BrowserRequestHandler } from '../../utils/http_request_handler/request_handler.browser'; // ✅ Compatible (also browser + react_native)
```

❌ **Invalid Imports**

```typescript
// In lib/index.browser.ts (Browser platform only)
import { NodeRequestHandler } from './utils/http_request_handler/request_handler.node'; // ❌ Node-only file
```

```typescript
// In lib/index.node.ts (Node platform only)
import { BrowserRequestHandler } from './utils/http_request_handler/request_handler.browser'; // ❌ browser + react_native, doesn't support node
```

```typescript
// In lib/shared_types.ts (Universal file)
import { AsyncStorageCache } from './utils/cache/async_storage_cache.react_native'; // ❌ React Native only, universal file needs imports that work everywhere
```

```typescript
// In lib/event_processor/event_dispatcher/default_dispatcher.browser.ts
import { NodeRequestHandler } from '../../utils/http_request_handler/request_handler.node'; // ❌ Node-only, doesn't support browser or react_native
// This file needs imports that work in BOTH browser AND react_native
```

## Automatic Validation

Platform isolation is enforced automatically during the build process.

### Running Validation

```bash
# Run validation manually
npm run validate-platform-isolation

# Validation runs automatically before build
npm run build
```

### How It Works

The validation script (`scripts/validate-platform-isolation.js`):

1. Scans all TypeScript/JavaScript files configured in the in the `.platform-isolation.config.js` config file.
2. **Verifies every file has a `__platforms` export** - fails immediately if any file is missing this
3. **Validates all platform values** - ensures values in `__platforms` arrays are valid (read from Platform type)
4. Parses import statements using TypeScript AST (ES6 imports, require, dynamic imports)
5. **Checks import compatibility**: For each import, verifies that the imported file supports ALL platforms that the importing file runs on
6. Fails the build if violations are found or if any file lacks `__platforms` export

**ESLint Integration:** The `require-platform-declaration` ESLint rule also enforces the `__platforms` export requirement during development.

### Build Integration

The validation is integrated into the build process:

```json
{
  "scripts": {
    "build": "npm run validate-platform-isolation && tsc --noEmit && ..."
  }
}
```

If platform isolation is violated, the build will fail with a detailed error message showing:
- Which files have violations
- The line numbers of problematic imports
- What platform the file belongs to
- What platform it's incorrectly importing from



## Creating New Modules

### Universal Code

For code that works across all platforms, use `['__universal__']`:

**Example: Universal utility function**

```typescript
// lib/utils/string-helpers.ts
export const __platforms = ['__universal__'];

// Pure JavaScript that works everywhere
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, '_');
}
```

### Platform-Specific Code

**Single Platform**

1. **Add `__platforms` export** declaring the platform (e.g., `export const __platforms = ['browser'];`)
2. Name the file with a platform suffix for clarity (e.g., `my-feature.browser.ts`)
3. Only import from universal or compatible platform files

**Example:**

```typescript
// lib/features/my-feature.ts (universal interface)
export const __platforms = ['__universal__'];

export interface MyFeature {
  doSomething(): void;
}

// lib/features/my-feature.browser.ts
export const __platforms = ['browser'];

export class BrowserMyFeature implements MyFeature {
  doSomething(): void {
    // Browser-specific implementation
  }
}

// lib/features/my-feature.node.ts
export const __platforms = ['node'];

export class NodeMyFeature implements MyFeature {
  doSomething(): void {
    // Node.js-specific implementation
  }
}
```

**Multiple Platforms (But Not Universal)**

For code that works on multiple platforms but is not universal, use the `__platforms` export to declare the list of supported platforms:

**Example: Browser + React Native only**

```typescript
// lib/utils/http-helpers.ts
export const __platforms = ['browser', 'react_native'];

// This code works on both browser and react_native, but not node
export function makeRequest(url: string): Promise<string> {
  // XMLHttpRequest is available in both browser and react_native
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.onload = () => resolve(xhr.responseText);
    xhr.onerror = () => reject(new Error('Request failed'));
    xhr.send();
  });
}
```

## Benefits

- ✅ Prevents runtime errors from platform-incompatible code
- ✅ Catches issues at build time, not in production
- ✅ Makes platform boundaries explicit and maintainable
- ✅ Ensures each bundle only includes relevant code

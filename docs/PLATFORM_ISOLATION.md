# Platform Isolation

## Overview

This project supports multiple runtime platforms (Browser, Node.js, React Native, and Universal), with separate entry points for each. To ensure the build artifacts work correctly, platform-specific code must not be mixed.

## Naming Convention

Platform-specific files can be identified in two ways:

### 1. File Naming Convention (Single Platform)

For files specific to a single platform, use a suffix pattern:
- `.browser.ts` - Browser-specific implementation
- `.node.ts` - Node.js-specific implementation
- `.react_native.ts` - React Native-specific implementation
- `.ts` (no suffix) - Universal code (works across all platforms)

### 2. Export Declaration (Multiple Platforms)

For files that support multiple platforms but not all (e.g., Browser + React Native, but not Node.js), export a `__platforms` array:

```typescript
// lib/utils/web-features.ts
export const __platforms = ['browser', 'react_native'];

// Your code that works on both browser and react_native
export function getWindowSize() {
  // Implementation that works on both platforms
}
```

Valid platform identifiers: `'browser'`, `'node'`, `'react_native'`

### Priority

If a file has both a platform suffix in its name AND a `__platforms` export, the `__platforms` export **takes priority**. This allows you to keep the `.browser.ts` naming convention while expanding support to additional platforms like React Native.

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

**Single Platform File (`.browser.ts` or `__platforms = ['browser']`)**
- ✅ Can import from: universal files, `.browser.ts` files, files with `['browser']` or `['browser', 'react_native']`
- ❌ Cannot import from: `.node.ts` files, files with `['node']` or `['react_native']` only

**Multi-Platform File (`__platforms = ['browser', 'react_native']`)**
- ✅ Can import from: universal files, files with exactly `['browser', 'react_native']`
- ❌ Cannot import from: `.browser.ts` (browser only), `.react_native.ts` (react_native only), `.node.ts`
- **Why?** A file supporting both platforms needs imports that work in BOTH environments

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
// In lib/index.react_native.ts (React Native platform only)
import { Config } from './shared_types';  // ✅ Universal file

// If web-features.ts has: __platforms = ['browser', 'react_native']
import { getWindowSize } from './utils/web-features'; // ✅ Compatible (supports react_native)
```

```typescript
// In lib/utils/web-api.ts
// export const __platforms = ['browser', 'react_native'];

import { Config } from './shared_types';  // ✅ Universal file

// If dom-helpers.ts has: __platforms = ['browser', 'react_native']
import { helpers } from './dom-helpers'; // ✅ Compatible (supports BOTH browser and react_native)
```

❌ **Invalid Imports**

```typescript
// In lib/index.browser.ts (Browser platform only)
import { NodeRequestHandler } from './utils/http_request_handler/request_handler.node'; // ❌ Node-only file
```

```typescript
// In lib/index.node.ts (Node platform only)
// If web-features.ts has: __platforms = ['browser', 'react_native']
import { getWindowSize } from './utils/web-features'; // ❌ Not compatible with Node
```

```typescript
// In lib/utils/web-api.ts  
// export const __platforms = ['browser', 'react_native'];

// If helper.browser.ts is browser-only (no __platforms export)
import { helper } from './helper.browser'; // ❌ Browser-only, doesn't support react_native

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

1. Scans all source files in the `lib/` directory
2. Identifies platform-specific files by their suffix
3. Parses import statements (ES6 imports, require, dynamic imports)
4. Checks that each import follows the platform isolation rules
5. Fails the build if violations are found

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

## Creating New Platform-Specific Code

When creating new platform-specific implementations:

### Single Platform

1. Name the file with the appropriate platform suffix (e.g., `my-feature.browser.ts`)
2. Only import from universal or same-platform files
3. Create a universal factory or interface if multiple platforms need different implementations

**Example:**

```typescript
// lib/features/my-feature.ts (universal interface)
export interface MyFeature {
  doSomething(): void;
}

// lib/features/my-feature.browser.ts
export class BrowserMyFeature implements MyFeature {
  doSomething(): void {
    // Browser-specific implementation
  }
}

// lib/features/my-feature.node.ts
export class NodeMyFeature implements MyFeature {
  doSomething(): void {
    // Node.js-specific implementation
  }
}

// lib/features/factory.browser.ts
import { BrowserMyFeature } from './my-feature.browser';
export const createMyFeature = () => new BrowserMyFeature();

// lib/features/factory.node.ts
import { NodeMyFeature } from './my-feature.node';
export const createMyFeature = () => new NodeMyFeature();
```

### Multiple Platforms (But Not All)

For code that works on multiple platforms but not all, use the `__platforms` export:

**Example: Browser + React Native only**

```typescript
// lib/utils/dom-helpers.ts
export const __platforms = ['browser', 'react_native'];

// This code works on both browser and react_native, but not node
export function getElementById(id: string): Element | null {
  if (typeof document !== 'undefined') {
    return document.getElementById(id);
  }
  // React Native polyfill or alternative
  return null;
}
```

**Example: Node + React Native only**

```typescript
// lib/utils/native-crypto.ts
export const __platforms = ['node', 'react_native'];

import crypto from 'crypto'; // Available in both Node and React Native

export function generateHash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
```

## Troubleshooting

If you encounter a platform isolation error:

1. **Check the error message** - It will tell you which file and line has the violation
2. **Identify the issue** - Look at the import statement on that line
3. **Fix the import**:
   - If the code should be universal, remove the platform suffix from the imported file
   - If the code must be platform-specific, create separate implementations for each platform
   - Use factory patterns to abstract platform-specific instantiation

## Benefits

- ✅ Prevents runtime errors from platform-incompatible code
- ✅ Catches issues at build time, not in production
- ✅ Makes platform boundaries explicit and maintainable
- ✅ Ensures each bundle only includes relevant code
- ✅ Works independently of linting tools (ESLint, Biome, etc.)

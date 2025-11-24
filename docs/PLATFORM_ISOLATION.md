# Platform Isolation

## Overview

This project supports multiple runtime platforms (Browser, Node.js, React Native, and Universal), with separate entry points for each. To ensure the build artifacts work correctly, platform-specific code must not be mixed.

## Naming Convention

Platform-specific files use a suffix pattern:
- `.browser.ts` - Browser-specific implementation
- `.node.ts` - Node.js-specific implementation
- `.react_native.ts` - React Native-specific implementation
- `.ts` (no suffix) - Universal code (works across all platforms)

## Import Rules

Each platform-specific file can **only** import from:

1. **Universal files** (no platform suffix)
2. **Same-platform files** (matching platform suffix)
3. **External packages** (node_modules)

### Examples

✅ **Valid Imports**

```typescript
// In lib/index.browser.ts
import { Config } from './shared_types';  // ✅ Universal file
import { BrowserRequestHandler } from './utils/http_request_handler/request_handler.browser'; // ✅ Same platform
import { uuid } from 'uuid'; // ✅ External package
```

```typescript
// In lib/index.node.ts
import { Config } from './shared_types';  // ✅ Universal file
import { NodeRequestHandler } from './utils/http_request_handler/request_handler.node'; // ✅ Same platform
```

❌ **Invalid Imports**

```typescript
// In lib/index.browser.ts
import { NodeRequestHandler } from './utils/http_request_handler/request_handler.node'; // ❌ Different platform
```

```typescript
// In lib/index.node.ts
import { BrowserRequestHandler } from './utils/http_request_handler/request_handler.browser'; // ❌ Different platform
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

1. Name the file with the appropriate platform suffix (e.g., `my-feature.browser.ts`)
2. Only import from universal or same-platform files
3. Create a universal factory or interface if multiple platforms need different implementations

### Example: Creating a Platform-Specific Feature

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

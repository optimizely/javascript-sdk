# Local ESLint Rules

This directory contains custom ESLint rules specific to this project.

## Rules

### `require-platform-declaration`

**Purpose:** **Enforces that every configured source file exports `__platforms`** to declare which platforms it supports.

**Why:** This is a mandatory requirement for platform isolation. The rule catches missing declarations at lint time.

**Requirement:** Every configured source file MUST export `__platforms` array with valid platform values.

**Valid Examples:**

```typescript
// Universal file (all platforms)
export const __platforms: Platform[] = ['__universal__'];

// Platform-specific file
export const __platforms: Platform[] = ['browser', 'node'];

// Single platform
export const __platforms: Platform[] = ['react_native'];
```

**Invalid:**

```typescript
// Missing __platforms export
// ESLint Error: File must export __platforms to declare which platforms it supports. Example: export const __platforms = ['__universal__'];

// Not an array
export const __platforms: Platform[] = 'browser';
// ESLint Error: __platforms must be an array literal. Example: export const __platforms = ['browser', 'node'];

// Empty array
export const __platforms: Platform[] = [];
// ESLint Error: __platforms array cannot be empty. Specify at least one platform or use ['__universal__'].

// Using variables or computed values
const myPlatform = 'browser';
export const __platforms: Platform[] = [myPlatform];
// ESLint Error: __platforms must only contain string literals. Do NOT use variables, computed values, or spread operators.

// Invalid platform value
export const __platforms: Platform[] = ['desktop'];
// ESLint Error: Invalid platform value "desktop". Valid platforms are: 'browser', 'node', 'react_native', '__universal__'
```

## Configuration

The rules are loaded via `eslint-plugin-local-rules` and configured in `.eslintrc.js`:

## Adding New Rules

1. Create a new rule file in this directory (e.g., `my-rule.js`)
2. Export the rule following ESLint's rule format
3. Add it to `index.js`:
   ```javascript
   module.exports = {
     'require-platform-declaration': require('./require-platform-declaration'),
     'my-rule': require('./my-rule'),  // Add here
   };
   ```
4. Enable it in `.eslintrc.js`

## Testing Rules

Run ESLint on specific files to test:

```bash
# Test on a specific file
npx eslint lib/service.ts

# Test on all lib files
npx eslint lib/**/*.ts --quiet
```

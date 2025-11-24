# Local ESLint Rules

This directory contains custom ESLint rules specific to this project.

## Rules

### `require-platform-declaration`

**Purpose:** Ensures all source files (except tests) export `__supportedPlatforms` to declare which platforms they support.

**Why:** This enforces platform isolation at the linting level, catching missing declarations before build time.

**Enforcement:**
- ✅ Enabled for all `.ts` files in `lib/` directory
- ❌ Disabled for test files (`.spec.ts`, `.test.ts`, etc.)
- ❌ Disabled for `__mocks__` and `tests` directories

**Valid Examples:**

```typescript
// Universal file (all platforms)
export const __supportedPlatforms = ['__universal__'] as const;

// Platform-specific file
export const __supportedPlatforms = ['browser', 'node'] as const;

// With type annotation
export const __supportedPlatforms: Platform[] = ['react_native'] as const;
```

**Invalid:**

```typescript
// Missing __supportedPlatforms export
// ESLint Error: File must export __supportedPlatforms to declare which platforms it supports
```

## Configuration

The rules are loaded via `eslint-plugin-local-rules` and configured in `.eslintrc.js`:

```javascript
{
  plugins: ['local-rules'],
  overrides: [{
    files: ['*.ts', '!*.spec.ts', '!*.test.ts'],
    rules: {
      'local-rules/require-platform-declaration': 'error'
    }
  }]
}
```

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

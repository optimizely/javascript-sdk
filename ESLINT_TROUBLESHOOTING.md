# ESLint Rule Troubleshooting

## The Rule is Working!

The `require-platform-declaration` rule **is** working correctly from the command line:

```bash
$ npx eslint lib/core/custom_attribute_condition_evaluator/index.ts

lib/core/custom_attribute_condition_evaluator/index.ts
  16:1  error  File must export __supportedPlatforms to declare which platforms 
                it supports. Example: export const __supportedPlatforms = ['__universal__'] as const;
```

## VSCode Not Showing Errors?

If VSCode isn't showing the ESLint errors, try these steps:

### 1. Restart ESLint Server
- Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- Type: `ESLint: Restart ESLint Server`
- Press Enter

### 2. Check ESLint Extension is Installed
- Open Extensions panel: `Cmd+Shift+X` (Mac) or `Ctrl+Shift+X` (Windows/Linux)
- Search for "ESLint" by Microsoft
- Make sure it's installed and enabled

### 3. Check ESLint Output
- Open Output panel: `Cmd+Shift+U` (Mac) or `Ctrl+Shift+U` (Windows/Linux)  
- Select "ESLint" from the dropdown
- Look for any error messages

### 4. Reload VSCode Window
- Open Command Palette: `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
- Type: `Developer: Reload Window`
- Press Enter

### 5. Check File is Being Linted
The rule only applies to:
- ✅ Files in `lib/` or `src/` directory
- ✅ TypeScript files (`.ts`)
- ❌ Test files (`.spec.ts`, `.test.ts`, etc.)
- ❌ Declaration files (`.d.ts`)

### 6. Verify ESLint Configuration
Check that `.eslintrc.js` has the parser set:
```javascript
parser: '@typescript-eslint/parser',
```

And that the rule is in the overrides:
```javascript
overrides: [{
  files: ['*.ts', '!*.spec.ts', '!*.test.ts', '!*.tests.ts', '!*.test-d.ts'],
  rules: {
    'local-rules/require-platform-declaration': 'error',
  }
}]
```

## Manual Verification

You can always verify the rule works by running:

```bash
# Check a specific file
npx eslint lib/service.ts

# Check all lib files (shows only errors)
npx eslint lib/**/*.ts --quiet
```

## Adding __supportedPlatforms

To fix the error, add this export to your file (after imports):

```typescript
// Universal file (all platforms)
export const __supportedPlatforms = ['__universal__'] as const;

// OR platform-specific file
export const __supportedPlatforms = ['browser', 'node'] as const;
```

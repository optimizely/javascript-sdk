# Scripts

This directory contains build and validation scripts for the JavaScript SDK.

## validate-platform-isolation.js

The main platform isolation validator that ensures platform-specific code is properly isolated to prevent runtime errors when building for different platforms (Browser, Node.js, React Native).

**Configuration:** File patterns to include/exclude are configured in `.platform-isolation.config.js` at the workspace root.

### Usage

```bash
# Run manually
node scripts/validate-platform-isolation.js

# Run via npm script
npm run validate-platform-isolation

# Runs automatically during build
npm run build
```

### How It Works

The script:
1. Scans all TypeScript/JavaScript files configured in the in the `.platform-isolation.config.js` config file.
2. **Requires every file to export `__platforms` array** declaring supported platforms
3. **Validates platform values** by reading the Platform type definition from `platform_support.ts`
4. Parses import statements (ES6 imports, require(), dynamic imports) using TypeScript AST
5. **Validates import compatibility**: For each import, ensures the imported file supports ALL platforms that the importing file runs on
6. Fails with exit code 1 if any violations are found, if `__platforms` export is missing, or if invalid platform values are used

**Import Rule**: When file A imports file B, file B must support ALL platforms that file A runs on.
- Example: A universal file can only import from universal files.
- Example: A browser file can import from universal files or any file that supports browser

**Note:** The validator can be updated to support file naming conventions (`.browser.ts`, etc.) in addition to `__platforms` exports, but currently enforces only the `__platforms` export. File naming is not validated and is used for convenience.


## add-platform-exports.js

Auto-fix script that adds or updates `__platforms` exports in files. This script helps maintain platform isolation by automatically adding the required `__platforms` export to files that are missing it or have invalid exports.

### Usage

```bash
# Run via npm script
npm run add-platform-exports

# Or run directly
node scripts/add-platform-exports.js
```

### How It Works

The script:
1. Scans all TypeScript/JavaScript files configured in `.platform-isolation.config.js`
2. For each file, checks if it has a valid `__platforms` export
3. **Determines platform from filename**: Files with platform-specific naming (`.browser.ts`, `.node.ts`, `.react_native.ts`) get their specific platform(s)
4. **Defaults to universal**: Files without platform-specific naming get `['__universal__']`
5. **Adds Platform type import**: Calculates correct relative path and ensures `import type { Platform } from '../path/to/platform_support'` exists
6. **Moves export to end**: Places `__platforms` export at the end of the file for consistency
7. Preserves existing platform values for files that already have valid `__platforms` exports

### Actions

- **Fixed**: File had missing, invalid, or incorrectly formatted `__platforms` export - now corrected
- **Moved**: File had valid `__platforms` export but not at the end - moved to end
- **Skipped**: File already has valid `__platforms` export at the end

### Platform Detection

- `file.browser.ts` → `['browser']`
- `file.node.ts` → `['node']`
- `file.react_native.ts` → `['react_native']`
- `file.browser.node.ts` → `['browser', 'node']`
- `file.ts` → `['__universal__']`

## test-validator.js

Comprehensive test suite for the platform isolation rules. Documents and validates all compatibility rules.

### Usage

```bash
# Run via npm script
npm run test-isolation-rules

# Or run directly
node scripts/test-validator.js
```

Tests cover:
- Universal imports (always compatible)
- Single platform file imports
- Single platform importing from multi-platform files
- Multi-platform file imports (strictest rules)
- `__platforms` extraction

---

See [../docs/PLATFORM_ISOLATION.md](../docs/PLATFORM_ISOLATION.md) for detailed documentation on platform isolation rules.

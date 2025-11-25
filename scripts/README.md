# Scripts

This directory contains build and validation scripts for the JavaScript SDK.

## validate-platform-isolation.js

Validates that platform-specific code is properly isolated to prevent runtime errors when building for different platforms (Browser, Node.js, React Native).

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
1. Scans all TypeScript/JavaScript files in the `lib/` directory
2. **Requires every non-test file to export `__platforms` array** declaring supported platforms
3. **Validates platform values** by reading the Platform type definition from `platform_support.ts`
4. Parses import statements (ES6 imports, require(), dynamic imports) using TypeScript AST
5. **Validates import compatibility**: For each import, ensures the imported file supports ALL platforms that the importing file runs on
6. Fails with exit code 1 if any violations are found, if `__platforms` export is missing, or if invalid platform values are used

**Import Rule**: When file A imports file B, file B must support ALL platforms that file A runs on.
- Example: A universal file can only import from universal files (or files supporting all platforms)
- Example: A browser file can import from universal files or any file that supports browser

**Note:** The validator can theoretically support file naming conventions (`.browser.ts`, etc.) in addition to `__platforms` exports, but currently enforces only the `__platforms` export. File naming is not validated and is considered redundant.

### Exit Codes

- `0`: All platform-specific files are properly isolated
- `1`: Violations found or script error

## test-validator.js

Comprehensive test suite for the platform isolation validator. Documents and validates all compatibility rules.

### Usage

```bash
# Run via npm script
npm run test-platform-isolation

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

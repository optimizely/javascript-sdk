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
3. Parses import statements (ES6 imports, require(), dynamic imports) using TypeScript AST
4. Validates that each import is compatible with the file's declared platforms
5. Fails with exit code 1 if any violations are found or if `__platforms` export is missing

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

#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * Platform Isolation Validator
 * 
 * This script ensures that platform-specific entry points only import
 * from universal or compatible platform files.
 * 
 * Platform Detection:
 * - ALL source files (except tests) MUST export __platforms array
 * - Universal files use: export const __platforms = ['__universal__'];
 * - Platform-specific files use: export const __platforms = ['browser', 'node'];
 * - Valid platform values are dynamically read from Platform type in platform_support.ts
 * 
 * Rules:
 * - Platform-specific files can only import from:
 *   - Universal files (containing '__universal__' or all concrete platform values)
 *   - Files supporting the same platforms
 *   - External packages (node_modules)
 * 
 * Usage: node scripts/validate-platform-isolation-ts.js
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { minimatch } = require('minimatch');
const { getValidPlatforms, extractPlatformsFromAST } = require('./platform-utils');

const WORKSPACE_ROOT = path.join(__dirname, '..');

// Load configuration
const configPath = path.join(WORKSPACE_ROOT, '.platform-isolation.config.js');
const config = fs.existsSync(configPath) 
  ? require(configPath)
  : {
      include: ['lib/**/*.ts', 'lib/**/*.js'],
      exclude: [
        '**/*.spec.ts', '**/*.test.ts', '**/*.tests.ts',
        '**/*.test.js', '**/*.spec.js', '**/*.tests.js',
        '**/*.umdtests.js', '**/*.test-d.ts', '**/*.gen.ts',
        '**/*.d.ts', '**/__mocks__/**', '**/tests/**'
      ]
    };

// Cache for __platforms exports
const platformCache = new Map();

// Valid platforms (loaded dynamically)
let VALID_PLATFORMS = null;
let ALL_CONCRETE_PLATFORMS = null;

/**
 * Get valid platforms from source
 */
function getValidPlatformsFromSource() {
  if (VALID_PLATFORMS !== null) {
    return VALID_PLATFORMS;
  }

  VALID_PLATFORMS = getValidPlatforms(WORKSPACE_ROOT);
  ALL_CONCRETE_PLATFORMS = VALID_PLATFORMS.filter(p => p !== '__universal__');
  return VALID_PLATFORMS;
}

/**
 * Gets a human-readable platform name
 */
function getPlatformFromFilename(filename) {
  const validPlatforms = getValidPlatformsFromSource();
  const concretePlatforms = validPlatforms.filter(p => p !== '__universal__');
  
  for (const platform of concretePlatforms) {
    if (filename.includes(`.${platform}.`)) {
      return platform;
    }
  }
  return null;
}

// Track files missing __platforms export
const filesWithoutExport = [];

// Track files with invalid platform values
const filesWithInvalidPlatforms = [];

// Track files with non-const declaration
const filesWithNonConst = [];

// Track files with non-literal values
const filesWithNonLiterals = [];

/**
 * Validates that platform values are valid according to Platform type
 */
function validatePlatformValues(platforms, filePath) {
  if (!platforms || platforms.length === 0) {
    return { valid: false, invalidValues: [] };
  }

  const validPlatforms = getValidPlatformsFromSource();
  const invalidValues = [];

  for (const platform of platforms) {
    if (!validPlatforms.includes(platform)) {
      invalidValues.push(platform);
    }
  }

  if (invalidValues.length > 0) {
    filesWithInvalidPlatforms.push({
      filePath,
      platforms,
      invalidValues
    });
    return { valid: false, invalidValues };
  }

  return { valid: true, invalidValues: [] };
}

/**
 * Gets the supported platforms for a file (with caching)
 * Returns: 
 *   - string[] (platforms from __platforms)
 *   - 'MISSING' (file is missing __platforms export)
 * 
 * Note: ALL files must have __platforms export
 */
function getSupportedPlatforms(filePath) {
  // Check cache first
  if (platformCache.has(filePath)) {
    return platformCache.get(filePath);
  }
  
  let result;
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Parse with TypeScript
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    
    // Extract platforms from AST
    const supportedPlatforms = extractPlatformsFromAST(sourceFile);
    
    if (supportedPlatforms === 'NOT_CONST') {
      filesWithNonConst.push(filePath);
      result = 'NOT_CONST';
      platformCache.set(filePath, result);
      return result;
    }
    
    if (supportedPlatforms === 'NOT_LITERALS') {
      filesWithNonLiterals.push(filePath);
      result = 'NOT_LITERALS';
      platformCache.set(filePath, result);
      return result;
    }
    
    if (supportedPlatforms && supportedPlatforms.length > 0) {
      // Validate platform values
      const validation = validatePlatformValues(supportedPlatforms, filePath);
      if (!validation.valid) {
        // Still cache it but it will be reported as error
        result = supportedPlatforms;
        platformCache.set(filePath, result);
        return result;
      }
      
      result = supportedPlatforms;
      platformCache.set(filePath, result);
      return result;
    }
    
    // File exists but missing __platforms export
    result = 'MISSING';
    platformCache.set(filePath, result);
    filesWithoutExport.push(filePath);
    return result;
    
  } catch (error) {
    // If file doesn't exist or can't be read, return MISSING
    result = 'MISSING';
    platformCache.set(filePath, result);
    return result;
  }
}

/**
 * Gets a human-readable platform name
 */
function getPlatformName(platform) {
  const names = {
    'browser': 'Browser',
    'node': 'Node.js',
    'react_native': 'React Native'
  };
  return names[platform] || platform;
}

/**
 * Formats platform info for display
 */
function formatPlatforms(platforms) {
  if (platforms === 'MISSING') return 'MISSING __platforms';
  if (!platforms || platforms.length === 0) return 'Unknown';
  if (Array.isArray(platforms) && platforms.length === 1 && platforms[0] === '__universal__') return 'Universal (all platforms)';
  if (typeof platforms === 'string') return getPlatformName(platforms);
  return platforms.map(p => getPlatformName(p)).join(' + ');
}

/**
 * Checks if platforms represent universal (all platforms)
 * 
 * A file is universal if and only if:
 * 1. It contains '__universal__' in its platforms array
 * 
 * Note: If array contains '__universal__' plus other values (e.g., ['__universal__', 'browser']),
 * it's still considered universal because __universal__ makes it available everywhere.
 * 
 * Files that list all concrete platforms (e.g., ['browser', 'node', 'react_native']) are NOT
 * considered universal - they must explicitly declare '__universal__' to be universal.
 */
function isUniversal(platforms) {
  if (!Array.isArray(platforms) || platforms.length === 0) {
    return false;
  }
  
  // ONLY if it explicitly declares __universal__, it's universal
  return platforms.includes('__universal__');
}

/**
 * Checks if a platform is compatible with target platforms
 * 
 * Rules:
 * - If either file is MISSING __platforms, not compatible
 * - Import must support ALL platforms that the importing file runs on
 * - Universal imports can be used by any file (they support all platforms)
 * - Platform-specific files can only import from universal or files supporting all their platforms
 */
function isPlatformCompatible(filePlatforms, importPlatforms) {
  // If either has any error state, not compatible
  if (filePlatforms === 'MISSING' || importPlatforms === 'MISSING' ||
      filePlatforms === 'NOT_CONST' || importPlatforms === 'NOT_CONST' ||
      filePlatforms === 'NOT_LITERALS' || importPlatforms === 'NOT_LITERALS') {
    return false;
  }
  
  // If import is universal, always compatible (universal supports all platforms)
  if (isUniversal(importPlatforms)) {
    return true;
  }
  
  // If file is universal but import is not, NOT compatible
  // (universal file runs everywhere, so imports must also run everywhere)
  if (isUniversal(filePlatforms)) {
    return false;
  }
  
  // Otherwise, import must support ALL platforms that the file runs on
  // For each platform the file runs on, check if the import also supports it
  for (const platform of filePlatforms) {
    if (!importPlatforms.includes(platform)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Extract imports using TypeScript AST
 */
function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = [];
  
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  
  function visit(node) {
    // Import declarations: import ... from '...'
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        imports.push({
          type: 'import',
          path: moduleSpecifier.text,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
        });
      }
    }
    
    // Export declarations: export ... from '...'
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (ts.isStringLiteral(node.moduleSpecifier)) {
        imports.push({
          type: 'export',
          path: node.moduleSpecifier.text,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
        });
      }
    }
    
    // Call expressions: require('...') or import('...')
    if (ts.isCallExpression(node)) {
      const expression = node.expression;
      
      // require('...')
      if (ts.isIdentifier(expression) && expression.text === 'require') {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          imports.push({
            type: 'require',
            path: arg.text,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          });
        }
      }
      
      // import('...')
      if (expression.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0];
        if (arg && ts.isStringLiteral(arg)) {
          imports.push({
            type: 'dynamic-import',
            path: arg.text,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          });
        }
      }
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return imports;
}

/**
 * Resolve import path relative to current file
 */
function resolveImportPath(importPath, currentFilePath) {
  // External imports (node_modules) - return as-is
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return { isExternal: true, resolved: importPath };
  }
  
  const currentDir = path.dirname(currentFilePath);
  let resolved = path.resolve(currentDir, importPath);
  
  // Check if it's a directory - if so, look for index file
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    const extensions = ['.ts', '.js', '.tsx', '.jsx'];
    for (const ext of extensions) {
      const indexFile = path.join(resolved, `index${ext}`);
      if (fs.existsSync(indexFile)) {
        return { isExternal: false, resolved: indexFile };
      }
    }
    // Directory exists but no index file found
    return { isExternal: false, resolved };
  }
  
  // Check if file exists as-is (with extension already)
  if (fs.existsSync(resolved)) {
    return { isExternal: false, resolved };
  }
  
  // Try different extensions
  const extensions = ['.ts', '.js', '.tsx', '.jsx'];
  for (const ext of extensions) {
    const withExt = resolved + ext;
    if (fs.existsSync(withExt)) {
      return { isExternal: false, resolved: withExt };
    }
  }
  
  // Try index files (for cases where the directory doesn't exist yet)
  for (const ext of extensions) {
    const indexFile = path.join(resolved, `index${ext}`);
    if (fs.existsSync(indexFile)) {
      return { isExternal: false, resolved: indexFile };
    }
  }
  
  // Return the resolved path even if it doesn't exist
  // (getSupportedPlatforms will handle it)
  return { isExternal: false, resolved };
}

/**
 * Validate a single file
 */
function validateFile(filePath) {
  const filePlatforms = getSupportedPlatforms(filePath);
  
  // If file is missing __platforms, that's a validation error handled separately
  if (filePlatforms === 'MISSING') {
    return { valid: true, errors: [] }; // Reported separately
  }
  
  const imports = extractImports(filePath);
  const errors = [];
  
  for (const importInfo of imports) {
    const { isExternal, resolved } = resolveImportPath(importInfo.path, filePath);
    
    // External imports are always allowed
    if (isExternal) {
      continue;
    }
    
    const importPlatforms = getSupportedPlatforms(resolved);
    
    // Check compatibility
    if (!isPlatformCompatible(filePlatforms, importPlatforms)) {
      const message = importPlatforms === 'MISSING' 
        ? `Import is missing __platforms export: "${importInfo.path}"`
        : `${formatPlatforms(filePlatforms)} file cannot import from ${formatPlatforms(importPlatforms)}-only file: "${importInfo.path}"`;
      
      errors.push({
        line: importInfo.line,
        importPath: importInfo.path,
        filePlatforms,
        importPlatforms,
        message
      });
    }
  }
  
  return { valid: errors.length === 0, errors };
}

/**
 * Check if file matches any pattern using minimatch
 */
function matchesPattern(filePath, patterns) {
  const relativePath = path.relative(WORKSPACE_ROOT, filePath).replace(/\\/g, '/');
  
  return patterns.some(pattern => minimatch(relativePath, pattern, { dot: true }));
}

/**
 * Recursively find all files matching include patterns and not matching exclude patterns
 */
function findSourceFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip hidden directories, node_modules, dist, and coverage
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && 
          entry.name !== 'node_modules' && 
          entry.name !== 'dist' && 
          entry.name !== 'coverage') {
        findSourceFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
      // Check if file matches include patterns
      if (matchesPattern(fullPath, config.include)) {
        // Check if file is NOT excluded
        if (!matchesPattern(fullPath, config.exclude)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  return files;
}

/**
 * Main validation function
 */
function main() {
  console.log('🔍 Validating platform isolation (using TypeScript parser)...\n');
  console.log(`📋 Configuration: ${path.relative(WORKSPACE_ROOT, configPath) || '.platform-isolation.config.js'}\n`);
  
  const files = findSourceFiles(WORKSPACE_ROOT);
  
  // Load valid platforms first
  const validPlatforms = getValidPlatformsFromSource();
  console.log(`Valid platforms: ${validPlatforms.join(', ')}\n`);
  
  // First pass: check for __platforms export
  console.log(`Found ${files.length} source files\n`);
  console.log('Checking for __platforms exports...\n');
  
  files.forEach(f => getSupportedPlatforms(f)); // Populate cache and filesWithoutExport
  
  // Report files missing __platforms
  if (filesWithoutExport.length > 0) {
    console.error(`❌ Found ${filesWithoutExport.length} file(s) missing __platforms export:\n`);
    
    for (const file of filesWithoutExport) {
      const relativePath = path.relative(process.cwd(), file);
      console.error(`  📄 ${relativePath}`);
    }
    
    console.error('\n');
    console.error('REQUIRED: Every source file must export __platforms array');
    console.error('');
    console.error('Examples:');
    console.error('  // Platform-specific file');
    console.error('  export const __platforms = [\'browser\', \'react_native\'];');
    console.error('');
    console.error('  // Universal file (all platforms)');
    console.error('  export const __platforms = [\'__universal__\'];');
    console.error('');
    console.error('See lib/platform_support.ts for type definitions.\n');
    
    process.exit(1);
  }
  
  console.log('✅ All files have __platforms export\n');
  
  // Report files with non-const declaration
  if (filesWithNonConst.length > 0) {
    console.error(`❌ Found ${filesWithNonConst.length} file(s) with __platforms not declared as const:\n`);
    
    for (const file of filesWithNonConst) {
      const relativePath = path.relative(process.cwd(), file);
      console.error(`  📄 ${relativePath}`);
    }
    
    console.error('\n');
    console.error('REQUIRED: __platforms must be declared as const');
    console.error('Use: export const __platforms: Platform[] = [...]\n');
    
    process.exit(1);
  }
  
  // Report files with non-literal values
  if (filesWithNonLiterals.length > 0) {
    console.error(`❌ Found ${filesWithNonLiterals.length} file(s) with __platforms containing non-literal values:\n`);
    
    for (const file of filesWithNonLiterals) {
      const relativePath = path.relative(process.cwd(), file);
      console.error(`  📄 ${relativePath}`);
    }
    
    console.error('\n');
    console.error('REQUIRED: __platforms array must contain only string literals');
    console.error('Use: export const __platforms: Platform[] = [\'browser\', \'node\']');
    console.error('Do NOT use variables, computed values, or spread operators\n');
    
    process.exit(1);
  }
  
  console.log('✅ All __platforms declarations are const with string literals\n');
  
  // Report files with invalid platform values
  if (filesWithInvalidPlatforms.length > 0) {
    console.error(`❌ Found ${filesWithInvalidPlatforms.length} file(s) with invalid platform values:\n`);
    
    for (const { filePath, platforms, invalidValues } of filesWithInvalidPlatforms) {
      const relativePath = path.relative(process.cwd(), filePath);
      console.error(`  📄 ${relativePath}`);
      console.error(`     Declared: [${platforms.map(p => `'${p}'`).join(', ')}]`);
      console.error(`     Invalid values: [${invalidValues.map(p => `'${p}'`).join(', ')}]`);
    }
    
    console.error('\n');
    console.error(`Valid platform values: ${validPlatforms.map(p => `'${p}'`).join(', ')}`);
    console.error('See lib/platform_support.ts for Platform type definition.\n');
    
    process.exit(1);
  }
  
  console.log('✅ All __platforms arrays have valid values\n');
  
  // Second pass: validate platform isolation
  console.log('Validating platform compatibility...\n');
  
  let totalErrors = 0;
  const filesWithErrors = [];
  
  for (const file of files) {
    const result = validateFile(file);
    
    if (!result.valid) {
      totalErrors += result.errors.length;
      filesWithErrors.push({ file, errors: result.errors });
    }
  }
  
  if (totalErrors === 0) {
    console.log('✅ All files are properly isolated!\n');
    process.exit(0);
  } else {
    console.error(`❌ Found ${totalErrors} platform isolation violation(s) in ${filesWithErrors.length} file(s):\n`);
    
    for (const { file, errors } of filesWithErrors) {
      const relativePath = path.relative(process.cwd(), file);
      const filePlatforms = getSupportedPlatforms(file);
      console.error(`\n📄 ${relativePath} [${formatPlatforms(filePlatforms)}]`);
      
      for (const error of errors) {
        console.error(`  Line ${error.line}: ${error.message}`);
      }
    }
    
    console.error('\n');
    console.error('Platform isolation rules:');
    console.error('  - Files can only import from files supporting ALL their platforms');
    console.error('  - Universal files ([\'__universal__\']) can be imported by any file');
    console.error('  - All files must have __platforms export\n');
    
    process.exit(1);
  }
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isPlatformCompatible,
    extractPlatformsFromAST,
    getSupportedPlatforms,
    extractImports,
  };
}

// Run the validator
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('❌ Validation failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

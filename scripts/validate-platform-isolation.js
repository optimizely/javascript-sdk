#!/usr/bin/env node

/**
 * Copyright 2025, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Platform Isolation Validator
 * 
 * This script ensures that platform-specific modules only import
 * from universal or compatible platform modules.
 * 
 * Platform Detection:
 * - ALL source files (except tests) MUST export __platforms array
 * - Universal files use: export const __platforms = ['__universal__'];
 * - Platform-specific files use platform names, e.g: export const __platforms = ['browser', 'node'];
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

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { minimatch } = require('minimatch');
const { getValidPlatforms, extractPlatformsFromFile, findSourceFiles, loadConfig } = require('./platform-utils');

const WORKSPACE_ROOT = path.join(__dirname, '..');

// Load tsconfig to get module resolution settings
const tsconfigPath = path.join(WORKSPACE_ROOT, 'tsconfig.json');
const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
const tsconfig = ts.parseConfigFileTextToJson(tsconfigPath, tsconfigContent).config;
const compilerOptions = ts.convertCompilerOptionsFromJson(
  tsconfig.compilerOptions,
  WORKSPACE_ROOT
).options;

// Load configuration
const config = loadConfig();
const configPath = path.join(WORKSPACE_ROOT, '.platform-isolation.config.js');

// Track files with errors in __platforms export
const fileErrors = new Map();

/**
 * Gets the supported platforms for a file
 * Returns: 
 *   - string[] (platforms from __platforms)
 *   - null (file has errors)
 * 
 * Note: ALL files must have __platforms export
 */
function getSupportedPlatforms(filePath) {
  // Extract platforms from file with detailed error reporting (uses cache internally)
  const result = extractPlatformsFromFile(filePath);
  
  if (result.success) {
    return result.platforms;
  } else {
    // Store error for this file
    fileErrors.set(filePath, result.error);
    return null;
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
 * 
 * Note: Assumes platforms is a valid array (after first validation pass)
 */
function formatPlatforms(platforms) {
  if (isUniversal(platforms)) return 'Universal (all platforms)';
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
 * - Import must support ALL platforms that the importing file runs on
 * - Universal imports can be used by any file (they support all platforms)
 * - Platform-specific files can only import from universal or files supporting all their platforms
 * 
 * Note: This function assumes both parameters are valid platform arrays (non-null)
 */
function isPlatformCompatible(filePlatforms, importPlatforms) {
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
 * Resolve import path relative to current file using TypeScript's module resolution
 */
function resolveImportPath(importPath, currentFilePath) {
  // External imports (node_modules) - return as-is
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return { isExternal: true, resolved: importPath };
  }
  
  // Use TypeScript's module resolution with settings from tsconfig
  const result = ts.resolveModuleName(
    importPath,
    currentFilePath,
    compilerOptions,
    ts.sys
  );
  
  if (result.resolvedModule) {
    return { isExternal: false, resolved: result.resolvedModule.resolvedFileName };
  }
  
  // If TypeScript can't resolve, throw an error
  throw new Error(`Cannot resolve import "${importPath}" from ${path.relative(WORKSPACE_ROOT, currentFilePath)}`);
}

/**
 * Validate a single file
 */
function validateFile(filePath) {
  const filePlatforms = getSupportedPlatforms(filePath);
  const imports = extractImports(filePath);
  const errors = [];
  
  for (const importInfo of imports) {
    const { isExternal, resolved } = resolveImportPath(importInfo.path, filePath);
    
    // External imports are always allowed
    if (isExternal) {
      continue;
    }
    
    // Skip excluded files (e.g., platform_support.ts)
    if (matchesPattern(resolved, config.exclude)) {
      continue;
    }
    
    const importPlatforms = getSupportedPlatforms(resolved);
    
    // Check compatibility
    if (!isPlatformCompatible(filePlatforms, importPlatforms)) {
      const message = `${formatPlatforms(filePlatforms)} file cannot import from ${formatPlatforms(importPlatforms)}-only file: "${importInfo.path}"`;
      
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
function matchesPattern(filePath, patterns, options = {}) {
  const relativePath = path.relative(WORKSPACE_ROOT, filePath).replace(/\\/g, '/');
  
  return patterns.some(pattern => minimatch(relativePath, pattern, options));
}

/**
 * Report platform export errors by type
 */
function reportPlatformErrors(errorsByType, validPlatforms) {
  let hasErrors = false;
  
  const errorConfig = {
    MISSING: {
      message: (count) => `❌ Found ${count} file(s) missing __platforms export:\n`
    },
    NOT_ARRAY: {
      message: (count) => `❌ Found ${count} file(s) with __platforms not declared as an array:\n`
    },
    EMPTY_ARRAY: {
      message: (count) => `❌ Found ${count} file(s) with empty __platforms array:\n`
    },
    NOT_LITERALS: {
      message: (count) => `❌ Found ${count} file(s) with __platforms containing non-literal values:\n`
    },
    INVALID_VALUES: {
      message: (count) => `❌ Found ${count} file(s) with invalid platform values:\n`,
      customHandler: (error) => {
        const invalidValuesStr = error.invalidValues ? error.invalidValues.map(v => `${v}`).join(', ') : '';
        console.error(`     Invalid values: ${invalidValuesStr}`);
        console.error(`     Valid platforms: ${validPlatforms.join(', ')}`);
      }
    },
    READ_ERROR: {
      message: (count) => `❌ Found ${count} file(s) with read errors:\n`,
      customHandler: (error) => {
        console.error(`     ${error.message}`);
      }
    }
  };
  
  for (const [errorType, config] of Object.entries(errorConfig)) {
    const errors = errorsByType[errorType];
    if (errors.length === 0) continue;
    
    hasErrors = true;
    console.error(config.message(errors.length));
    
    for (const { filePath, error } of errors) {
      console.error(`  📄 ${path.relative(WORKSPACE_ROOT, filePath)}`);
      if (config.customHandler) {
        config.customHandler(error);
      }
    }
    console.error('\n');
  }
  
  return hasErrors;
}



/**
 * Main validation function
 */
function main() {
  console.log('🔍 Validating platform isolation...\n');
  console.log(`📋 Configuration: ${path.relative(WORKSPACE_ROOT, configPath) || '.platform-isolation.config.js'}\n`);
  
  const files = findSourceFiles();
  
  // Load valid platforms first
  const validPlatforms = getValidPlatforms();
  console.log(`Valid platforms: ${validPlatforms.join(', ')}\n`);
  
  // First pass: check for __platforms export
  console.log(`Found ${files.length} source files\n`);
  console.log('Checking for __platforms exports...\n');
  
  files.forEach(f => getSupportedPlatforms(f)); // Populate cache and fileErrors
  
  // Group errors by type
  const errorsByType = {
    MISSING: [],
    NOT_ARRAY: [],
    EMPTY_ARRAY: [],
    NOT_LITERALS: [],
    INVALID_VALUES: [],
    READ_ERROR: []
  };
  
  for (const [filePath, error] of fileErrors) {
    if (errorsByType[error.type]) {
      errorsByType[error.type].push({ filePath, error });
    }
  }
  
  // Report errors by type
  const hasErrors = reportPlatformErrors(errorsByType, validPlatforms);
  
  if (hasErrors) {
    process.exit(1);
  }
  
  console.log('✅ All files have valid __platforms exports\n');
  
  // Second pass: validate platform isolation
  // At this point, all files are guaranteed to have valid __platforms exports
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
      const relativePath = path.relative(WORKSPACE_ROOT, file);
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

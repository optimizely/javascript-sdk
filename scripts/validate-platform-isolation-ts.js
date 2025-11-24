#!/usr/bin/env node

/**
 * Platform Isolation Validator (using TypeScript parser)
 * 
 * This script ensures that platform-specific entry points only import
 * from universal or compatible platform files.
 * 
 * Uses TypeScript compiler API for robust parsing instead of regex.
 * 
 * Platform Detection:
 * - ALL source files (except tests) MUST export __supportedPlatforms array
 * - Universal files use: export const __supportedPlatforms = ['__universal__'];
 * - Platform-specific files use: export const __supportedPlatforms = ['browser', 'node'];
 * 
 * Rules:
 * - Platform-specific files can only import from:
 *   - Universal files (marked with '__universal__')
 *   - Files supporting the same platforms
 *   - External packages (node_modules)
 * 
 * Usage: node scripts/validate-platform-isolation-ts.js
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const PLATFORMS = ['browser', 'node', 'react_native'];
const LIB_DIR = path.join(__dirname, '..', 'lib');

// Cache for __supportedPlatforms exports
const platformCache = new Map();

// Track files missing __supportedPlatforms export
const filesWithoutExport = [];

/**
 * Extracts the platform from a filename using naming convention
 */
function getPlatformFromFilename(filename) {
  for (const platform of PLATFORMS) {
    if (filename.includes(`.${platform}.`)) {
      return platform;
    }
  }
  return null;
}

/**
 * Extracts __supportedPlatforms array from AST
 */
function extractSupportedPlatformsFromAST(sourceFile) {
  let platforms = null;

  function visit(node) {
    // Look for: export const __supportedPlatforms = [...]
    if (ts.isVariableStatement(node)) {
      // Check if it has export modifier
      const hasExport = node.modifiers?.some(
        mod => mod.kind === ts.SyntaxKind.ExportKeyword
      );

      if (hasExport) {
        for (const declaration of node.declarationList.declarations) {
          if (ts.isVariableDeclaration(declaration) &&
              ts.isIdentifier(declaration.name) &&
              declaration.name.text === '__supportedPlatforms') {
            
            let initializer = declaration.initializer;
            
            // Handle "as const" assertion: [...] as const
            if (initializer && ts.isAsExpression(initializer)) {
              initializer = initializer.expression;
            }
            
            // Handle type assertion: <const>[...]
            if (initializer && ts.isTypeAssertionExpression(initializer)) {
              initializer = initializer.expression;
            }
            
            // Extract array elements
            if (initializer && ts.isArrayLiteralExpression(initializer)) {
              platforms = [];
              for (const element of initializer.elements) {
                if (ts.isStringLiteral(element)) {
                  platforms.push(element.text);
                }
              }
              return; // Found it, stop visiting
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return platforms;
}

/**
 * Gets the supported platforms for a file (with caching)
 * Returns: 
 *   - string[] (platforms from __supportedPlatforms)
 *   - 'MISSING' (file is missing __supportedPlatforms export)
 * 
 * Note: ALL files must have __supportedPlatforms export
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
    const supportedPlatforms = extractSupportedPlatformsFromAST(sourceFile);
    
    if (supportedPlatforms && supportedPlatforms.length > 0) {
      result = supportedPlatforms;
      platformCache.set(filePath, result);
      return result;
    }
    
    // File exists but missing __supportedPlatforms export
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
  if (platforms === 'MISSING') return 'MISSING __supportedPlatforms';
  if (!platforms || platforms.length === 0) return 'Unknown';
  if (Array.isArray(platforms) && platforms.length === 1 && platforms[0] === '__universal__') return 'Universal (all platforms)';
  if (typeof platforms === 'string') return getPlatformName(platforms);
  return platforms.map(p => getPlatformName(p)).join(' + ');
}

/**
 * Checks if platforms represent universal (all platforms)
 */
function isUniversal(platforms) {
  return Array.isArray(platforms) && 
         platforms.length === 1 &&
         platforms[0] === '__universal__';
}

/**
 * Checks if a platform is compatible with target platforms
 * 
 * Rules:
 * - If either file is MISSING __supportedPlatforms, not compatible
 * - Universal files are compatible with any file
 * - The import must support ALL platforms that the file supports
 */
function isPlatformCompatible(filePlatforms, importPlatforms) {
  // If either is missing platforms, not compatible
  if (filePlatforms === 'MISSING' || importPlatforms === 'MISSING') {
    return false;
  }
  
  // If import is universal, always compatible
  if (isUniversal(importPlatforms)) {
    return true;
  }
  
  // If file is universal, import must be universal too
  if (isUniversal(filePlatforms)) {
    return isUniversal(importPlatforms);
  }
  
  // Otherwise, import must support ALL platforms that the file supports
  // filePlatforms is an array of platforms the file needs
  // importPlatforms is an array of platforms the import provides
  
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
  
  // If file is missing __supportedPlatforms, that's a validation error handled separately
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
        ? `Import is missing __supportedPlatforms export: "${importInfo.path}"`
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
 * Recursively find all TypeScript/JavaScript files in a directory
 */
function findSourceFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip test directories and node_modules
      if (!entry.name.startsWith('.') && 
          entry.name !== 'node_modules' && 
          entry.name !== 'dist' && 
          entry.name !== 'coverage' &&
          entry.name !== 'tests') {
        findSourceFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
      // Only include TypeScript and JavaScript files, skip test files
      if ((entry.name.endsWith('.ts') || entry.name.endsWith('.js')) &&
          !entry.name.endsWith('.spec.ts') &&
          !entry.name.endsWith('.test.ts') &&
          !entry.name.endsWith('.tests.ts') &&
          !entry.name.endsWith('.tests.js') &&
          !entry.name.endsWith('.umdtests.js') &&
          !entry.name.endsWith('.test-d.ts') &&
          !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
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
  
  const files = findSourceFiles(LIB_DIR);
  
  // First pass: check for __supportedPlatforms export
  console.log(`Found ${files.length} source files\n`);
  console.log('Checking for __supportedPlatforms exports...\n');
  
  files.forEach(f => getSupportedPlatforms(f)); // Populate cache and filesWithoutExport
  
  // Report files missing __supportedPlatforms
  if (filesWithoutExport.length > 0) {
    console.error(`❌ Found ${filesWithoutExport.length} file(s) missing __supportedPlatforms export:\n`);
    
    for (const file of filesWithoutExport) {
      const relativePath = path.relative(process.cwd(), file);
      console.error(`  📄 ${relativePath}`);
    }
    
    console.error('\n');
    console.error('REQUIRED: Every source file must export __supportedPlatforms array');
    console.error('');
    console.error('Examples:');
    console.error('  // Platform-specific file');
    console.error('  export const __supportedPlatforms = [\'browser\', \'react_native\'];');
    console.error('');
    console.error('  // Universal file (all platforms)');
    console.error('  export const __supportedPlatforms = [\'__universal__\'];');
    console.error('');
    console.error('See lib/platform_support.ts for type definitions.\n');
    
    process.exit(1);
  }
  
  console.log('✅ All files have __supportedPlatforms export\n');
  
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
    console.error('  - All files must have __supportedPlatforms export\n');
    
    process.exit(1);
  }
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isPlatformCompatible,
    extractSupportedPlatformsFromAST,
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

#!/usr/bin/env node

/**
 * Platform Isolation Validator
 * 
 * This script ensures that platform-specific entry points only import
 * from universal or same-platform files.
 * 
 * Rules:
 * - Files ending with .browser.ts can only import from:
 *   - Universal files (no platform suffix)
 *   - Other .browser.ts files
 *   - External packages (node_modules)
 * - Files ending with .node.ts can only import from:
 *   - Universal files (no platform suffix)
 *   - Other .node.ts files
 *   - External packages (node_modules)
 * - Files ending with .react_native.ts can only import from:
 *   - Universal files (no platform suffix)
 *   - Other .react_native.ts files
 *   - External packages (node_modules)
 * 
 * Usage: node scripts/validate-platform-isolation.js
 */

const fs = require('fs');
const path = require('path');

const PLATFORMS = ['browser', 'node', 'react_native'];
const LIB_DIR = path.join(__dirname, '..', 'lib');

/**
 * Extracts the platform from a filename
 */
function getPlatform(filename) {
  for (const platform of PLATFORMS) {
    if (filename.includes(`.${platform}.`)) {
      return platform;
    }
  }
  return null;
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
 * Extract import statements from a TypeScript/JavaScript file
 */
function extractImports(content) {
  const imports = [];
  
  // Match: import ... from '...'
  const importRegex = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push({ type: 'import', path: match[1], line: content.substring(0, match.index).split('\n').length });
  }
  
  // Match: require('...')
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    imports.push({ type: 'require', path: match[1], line: content.substring(0, match.index).split('\n').length });
  }
  
  // Match: import('...') - dynamic imports
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) {
    imports.push({ type: 'dynamic-import', path: match[1], line: content.substring(0, match.index).split('\n').length });
  }
  
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
  
  // Try different extensions if no extension provided
  if (!path.extname(resolved)) {
    const extensions = ['.ts', '.js', '.tsx', '.jsx'];
    for (const ext of extensions) {
      const withExt = resolved + ext;
      if (fs.existsSync(withExt)) {
        resolved = withExt;
        break;
      }
    }
    
    // Try index files
    if (!fs.existsSync(resolved)) {
      for (const ext of extensions) {
        const indexFile = path.join(resolved, `index${ext}`);
        if (fs.existsSync(indexFile)) {
          resolved = indexFile;
          break;
        }
      }
    }
  }
  
  return { isExternal: false, resolved };
}

/**
 * Validate a single file
 */
function validateFile(filePath) {
  const filePlatform = getPlatform(filePath);
  
  // Skip if not a platform-specific file
  if (!filePlatform) {
    return { valid: true, errors: [] };
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const imports = extractImports(content);
  const errors = [];
  
  for (const importInfo of imports) {
    const { isExternal, resolved } = resolveImportPath(importInfo.path, filePath);
    
    // External imports are always allowed
    if (isExternal) {
      continue;
    }
    
    const importPlatform = getPlatform(resolved);
    
    // Universal files are always allowed
    if (!importPlatform) {
      continue;
    }
    
    // Same platform is allowed
    if (importPlatform === filePlatform) {
      continue;
    }
    
    // Different platform - ERROR
    errors.push({
      line: importInfo.line,
      importPath: importInfo.path,
      filePlatform,
      importPlatform,
      message: `${getPlatformName(filePlatform)} file cannot import from ${getPlatformName(importPlatform)} file: "${importInfo.path}"`
    });
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
  console.log('🔍 Validating platform isolation...\n');
  
  const files = findSourceFiles(LIB_DIR);
  const platformFiles = files.filter(f => getPlatform(f) !== null);
  
  console.log(`Found ${files.length} source files (${platformFiles.length} platform-specific)\n`);
  
  let totalErrors = 0;
  const filesWithErrors = [];
  
  for (const file of platformFiles) {
    const result = validateFile(file);
    
    if (!result.valid) {
      totalErrors += result.errors.length;
      filesWithErrors.push({ file, errors: result.errors });
    }
  }
  
  if (totalErrors === 0) {
    console.log('✅ All platform-specific files are properly isolated!\n');
    process.exit(0);
  } else {
    console.error(`❌ Found ${totalErrors} platform isolation violation(s) in ${filesWithErrors.length} file(s):\n`);
    
    for (const { file, errors } of filesWithErrors) {
      const relativePath = path.relative(process.cwd(), file);
      console.error(`\n📄 ${relativePath}`);
      
      for (const error of errors) {
        console.error(`  Line ${error.line}: ${error.message}`);
      }
    }
    
    console.error('\n');
    console.error('Platform isolation rules:');
    console.error('  - Browser files (.browser.ts) can only import from universal or other browser files');
    console.error('  - Node.js files (.node.ts) can only import from universal or other Node.js files');
    console.error('  - React Native files (.react_native.ts) can only import from universal or other React Native files');
    console.error('  - Universal files (no platform suffix) can be imported by any platform\n');
    
    process.exit(1);
  }
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

module.exports = { validateFile, getPlatform, extractImports };

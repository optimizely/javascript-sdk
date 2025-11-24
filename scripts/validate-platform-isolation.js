#!/usr/bin/env node

/**
 * Platform Isolation Validator
 * 
 * This script ensures that platform-specific entry points only import
 * from universal or compatible platform files.
 * 
 * Platform Detection:
 * 1. Files with naming convention: .browser.ts, .node.ts, .react_native.ts
 * 2. Files exporting __supportedPlatforms array (for multi-platform support)
 * 
 * Rules:
 * - Platform-specific files can only import from:
 *   - Universal files (no platform restrictions)
 *   - Files supporting the same platform
 *   - External packages (node_modules)
 * 
 * Usage: node scripts/validate-platform-isolation.js
 */

const fs = require('fs');
const path = require('path');

const PLATFORMS = ['browser', 'node', 'react_native'];
const LIB_DIR = path.join(__dirname, '..', 'lib');

// Cache for __supportedPlatforms exports
const platformCache = new Map();

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
 * Extracts __supportedPlatforms array from file content
 */
function extractSupportedPlatforms(content) {
  // Match: export const __supportedPlatforms = ['browser', 'react_native'];
  // or: export const __supportedPlatforms: string[] = ['browser', 'react_native'];
  const regex = /export\s+(?:const|let|var)\s+__supportedPlatforms\s*(?::\s*[^=]+)?\s*=\s*\[([^\]]+)\]/;
  const match = content.match(regex);
  
  if (!match) {
    return null;
  }
  
  // Extract platform names from the array
  const platformsStr = match[1];
  const platforms = [];
  
  for (const platform of PLATFORMS) {
    if (platformsStr.includes(`'${platform}'`) || platformsStr.includes(`"${platform}"`)) {
      platforms.push(platform);
    }
  }
  
  return platforms.length > 0 ? platforms : null;
}

/**
 * Gets the supported platforms for a file (with caching)
 * Returns: 
 *   - string (single platform from filename)
 *   - string[] (multiple platforms from __supportedPlatforms)
 *   - null (universal, no restrictions)
 */
function getSupportedPlatforms(filePath) {
  // Check cache first
  if (platformCache.has(filePath)) {
    return platformCache.get(filePath);
  }
  
  let result;
  
  // Check for __supportedPlatforms export first (takes priority)
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const supportedPlatforms = extractSupportedPlatforms(content);
    
    if (supportedPlatforms) {
      result = supportedPlatforms;
      platformCache.set(filePath, result);
      return result;
    }
  } catch (error) {
    // If file doesn't exist or can't be read, try filename convention
  }
  
  // Check filename convention
  const platformFromFilename = getPlatformFromFilename(filePath);
  if (platformFromFilename) {
    result = platformFromFilename;
    platformCache.set(filePath, result);
    return result;
  }
  
  // Universal file
  result = null;
  platformCache.set(filePath, result);
  return result;
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
  if (!platforms) return 'Universal';
  if (typeof platforms === 'string') return getPlatformName(platforms);
  return platforms.map(p => getPlatformName(p)).join(' + ');
}

/**
 * Checks if a platform is compatible with target platforms
 * 
 * Rules:
 * - Universal imports (no platform restrictions) are always compatible
 * - If the file has multiple platforms, the import must support ALL of them
 * - If the file has a single platform, the import must support at least that one
 */
function isPlatformCompatible(filePlatforms, importPlatforms) {
  // Universal imports are always compatible
  if (!importPlatforms) {
    return true;
  }
  
  // Convert to arrays for consistent handling
  const fileArray = Array.isArray(filePlatforms) ? filePlatforms : [filePlatforms];
  const importArray = Array.isArray(importPlatforms) ? importPlatforms : [importPlatforms];
  
  // The import must support ALL platforms that the file supports
  // Check if every platform in fileArray is present in importArray
  return fileArray.every(fp => importArray.includes(fp));
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
  
  // Check if file exists as-is
  if (fs.existsSync(resolved)) {
    return { isExternal: false, resolved };
  }
  
  // Try different extensions
  const extensions = ['.ts', '.js', '.tsx', '.jsx'];
  for (const ext of extensions) {
    const withExt = resolved + ext;
    if (fs.existsSync(withExt)) {
      resolved = withExt;
      return { isExternal: false, resolved };
    }
  }
  
  // Try index files
  for (const ext of extensions) {
    const indexFile = path.join(resolved, `index${ext}`);
    if (fs.existsSync(indexFile)) {
      resolved = indexFile;
      return { isExternal: false, resolved };
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
  
  // Skip if universal file
  if (!filePlatforms) {
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
    
    const importPlatforms = getSupportedPlatforms(resolved);
    
    // Check compatibility
    if (!isPlatformCompatible(filePlatforms, importPlatforms)) {
      errors.push({
        line: importInfo.line,
        importPath: importInfo.path,
        filePlatforms,
        importPlatforms,
        message: `${formatPlatforms(filePlatforms)} file cannot import from ${formatPlatforms(importPlatforms)}-only file: "${importInfo.path}"`
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
  const platformFiles = files.filter(f => getSupportedPlatforms(f) !== null);
  
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
      const filePlatforms = getSupportedPlatforms(file);
      console.error(`\n📄 ${relativePath} [${formatPlatforms(filePlatforms)}]`);
      
      for (const error of errors) {
        console.error(`  Line ${error.line}: ${error.message}`);
      }
    }
    
    console.error('\n');
    console.error('Platform isolation rules:');
    console.error('  - Platform-specific files can only import from universal or compatible platform files');
    console.error('  - Specify platforms using:');
    console.error('    1. Naming convention: .browser.ts, .node.ts, .react_native.ts');
    console.error('    2. Export __supportedPlatforms array: export const __supportedPlatforms = [\'browser\', \'react_native\'];');
    console.error('  - Universal files (no platform restrictions) can be imported by any platform\n');
    
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

module.exports = { 
  validateFile, 
  getSupportedPlatforms, 
  extractImports,
  extractSupportedPlatforms,
  isPlatformCompatible
};

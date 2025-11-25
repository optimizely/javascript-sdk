#!/usr/bin/env node

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
 * - Legacy naming convention (.browser.ts, etc.) is deprecated
 * 
 * Rules:
 * - Platform-specific files can only import from:
 *   - Universal files (marked with '__universal__')
 *   - Files supporting the same platforms
 *   - External packages (node_modules)
 * 
 * Usage: node scripts/validate-platform-isolation.js
 */

const fs = require('fs');
const path = require('path');

const PLATFORMS = ['browser', 'node', 'react_native'];
const LIB_DIR = path.join(__dirname, '..', 'lib');

// Cache for __platforms exports
const platformCache = new Map();

// Track files missing __platforms export
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
 * Extracts __platforms array from file content
 */
function extractSupportedPlatforms(content) {
  // Match: export const __platforms = ['browser', 'react_native'];
  // or: export const __platforms: Platform[] = ['browser', 'react_native'];
  // or with satisfies: export const __platforms = ['browser'] satisfies Platform[];
  // or universal: export const __platforms = ['__universal__'];
  const regex = /export\s+(?:const|let|var)\s+__platforms\s*(?::\s*[^=]+)?\s*=\s*\[([^\]]+)\](?:\s+satisfies\s+[^;]+)?/;
  const match = content.match(regex);
  
  if (!match) {
    return null;
  }
  
  // Extract platform names from the array
  const platformsStr = match[1];
  
  // Check for __universal__ marker
  if (platformsStr.includes(`'__universal__'`) || platformsStr.includes(`"__universal__"`)) {
    return ['__universal__'];
  }
  
  const platforms = [];
  
  for (const platform of PLATFORMS) {
    if (platformsStr.includes(`'${platform}'`) || platformsStr.includes(`"${platform}"`)) {
      platforms.push(platform);
    }
  }
  
  return platforms.length > 0 ? platforms : null;
}

/**
 * Check if file content has __platforms export
 */
function hasSupportedPlatformsExport(content) {
  return /export\s+(?:const|let|var)\s+__platforms/.test(content);
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
    
    // Check for __platforms export
    const supportedPlatforms = extractSupportedPlatforms(content);
    
    if (supportedPlatforms) {
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
 * - If either file is MISSING __platforms, not compatible
 * - Universal files (all 3 platforms) are compatible with any file
 * - The import must support ALL platforms that the file supports
 */
function isPlatformCompatible(filePlatforms, importPlatforms) {
  // If either is missing __platforms, not compatible
  if (filePlatforms === 'MISSING' || importPlatforms === 'MISSING') {
    return false;
  }
  
  // Universal imports are always compatible
  if (isUniversal(importPlatforms)) {
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
 * Skips commented imports
 */
function extractImports(content) {
  const imports = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip lines that are comments
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      continue;
    }
    
    // Match: import ... from '...'
    const importMatch = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/.exec(line);
    if (importMatch) {
      imports.push({ type: 'import', path: importMatch[1], line: i + 1 });
      continue;
    }
    
    // Match: require('...')
    const requireMatch = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/.exec(line);
    if (requireMatch) {
      imports.push({ type: 'require', path: requireMatch[1], line: i + 1 });
      continue;
    }
    
    // Match: import('...') - dynamic imports
    const dynamicImportMatch = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/.exec(line);
    if (dynamicImportMatch) {
      imports.push({ type: 'dynamic-import', path: dynamicImportMatch[1], line: i + 1 });
    }
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
  console.log('🔍 Validating platform isolation...\n');
  
  const files = findSourceFiles(LIB_DIR);
  
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
    console.error('  export const __platforms = [\'browser\', \'node\', \'react_native\'];');
    console.error('');
    console.error('See lib/platform_support.ts for type definitions.\n');
    
    process.exit(1);
  }
  
  console.log('✅ All files have __platforms export\n');
  
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
    console.error('  - Universal files ([browser, node, react_native]) can be imported by any file');
    console.error('  - All files must have __platforms export\n');
    
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
  isPlatformCompatible,
  isUniversal,
  hasSupportedPlatformsExport
};

#!/usr/bin/env node

/**
 * Auto-add __supportedPlatforms to files
 * 
 * This script automatically adds __supportedPlatforms export to files that don't have it.
 * 
 * Strategy:
 * 1. Files with platform-specific naming (.browser.ts, .node.ts, .react_native.ts) get their specific platform(s)
 * 2. All other files are assumed to be universal and get ['__universal__']
 */

const fs = require('fs');
const path = require('path');

const PLATFORMS = ['browser', 'node', 'react_native'];
const LIB_DIR = path.join(__dirname, '..', 'lib');

function getPlatformFromFilename(filename) {
  const platforms = [];
  for (const platform of PLATFORMS) {
    if (filename.includes(`.${platform}.`)) {
      platforms.push(platform);
    }
  }
  return platforms.length > 0 ? platforms : null;
}

function hasSupportedPlatformsExport(content) {
  return /export\s+(?:const|let|var)\s+__supportedPlatforms/.test(content);
}

function findSourceFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && 
          entry.name !== 'node_modules' && 
          entry.name !== 'dist' && 
          entry.name !== 'coverage' &&
          entry.name !== 'tests') {
        findSourceFiles(fullPath, files);
      }
    } else if (entry.isFile()) {
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

function addSupportedPlatforms(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip if already has __supportedPlatforms
  if (hasSupportedPlatformsExport(content)) {
    return { skipped: true, reason: 'already has export' };
  }
  
  // Determine platforms
  const platformsFromFilename = getPlatformFromFilename(filePath);
  const platforms = platformsFromFilename || ['__universal__'];
  
  // Format the export statement
  const platformsStr = platforms.map(p => `'${p}'`).join(', ');
  const exportStatement = `export const __supportedPlatforms = [${platformsStr}] as const;\n`;
  
  // Find where to insert (after imports, before first export or code)
  const lines = content.split('\n');
  let insertIndex = 0;
  let inComment = false;
  let foundImports = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Track multi-line comments
    if (line.startsWith('/*')) inComment = true;
    if (line.endsWith('*/')) inComment = false;
    
    // Skip empty lines and comments at the start
    if (inComment || line.startsWith('//') || line.startsWith('*') || line === '') {
      insertIndex = i + 1;
      continue;
    }
    
    // Track imports
    if (line.startsWith('import ') || line.includes(' import ')) {
      foundImports = true;
      insertIndex = i + 1;
      continue;
    }
    
    // If we've seen imports and now see something else, insert before it
    if (foundImports && !line.startsWith('import')) {
      // Add a blank line after imports if not already there
      if (lines[i - 1].trim() !== '') {
        lines.splice(i, 0, '');
        i++;
      }
      break;
    }
    
    // If no imports found, insert after copyright/header
    if (!foundImports && (line.startsWith('export ') || line.startsWith('const ') || 
        line.startsWith('function ') || line.startsWith('class '))) {
      break;
    }
  }
  
  // Insert the export statement
  lines.splice(insertIndex, 0, exportStatement);
  
  // Write back to file
  fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
  
  return { skipped: false, platforms };
}

function main() {
  console.log('🔧 Adding __supportedPlatforms to files...\n');
  
  const files = findSourceFiles(LIB_DIR);
  let added = 0;
  let skipped = 0;
  
  for (const file of files) {
    const result = addSupportedPlatforms(file);
    const relativePath = path.relative(process.cwd(), file);
    
    if (result.skipped) {
      skipped++;
    } else {
      added++;
      console.log(`✅ ${relativePath} → [${result.platforms.join(', ')}]`);
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Added: ${added} files`);
  console.log(`  Skipped: ${skipped} files (already had export)`);
  console.log(`  Total: ${files.length} files\n`);
  
  console.log('✅ Done! Run npm run validate-platform-isolation to verify.\n');
}

if (require.main === module) {
  main();
}

module.exports = { addSupportedPlatforms };

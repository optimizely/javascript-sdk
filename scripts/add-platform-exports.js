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
 * Auto-add __platforms to files
 * 
 * This script automatically adds __platforms export to files that don't have it.
 * Uses TypeScript parser to analyze files and add proper type annotations.
 * 
 * Strategy:
 * 1. Files with platform-specific naming (.browser.ts, .node.ts, .react_native.ts) get their specific platform(s)
 * 2. All other files are assumed to be universal and get ['__universal__']
 * 3. Adds Platform type import and type annotation
 * 4. Inserts __platforms export at the end of the file
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const { extractPlatformsFromFile, findSourceFiles } = require('./platform-utils');

const WORKSPACE_ROOT = path.join(__dirname, '..');
const PLATFORMS = ['browser', 'node', 'react_native'];

function getPlatformFromFilename(filename) {
  const platforms = [];
  const basename = path.basename(filename);
  
  // Extract all parts before the extension
  // e.g., "file.browser.node.ts" -> ["file", "browser", "node"]
  const parts = basename.split('.');
  
  // Skip the last part (extension)
  if (parts.length < 2) {
    return null;
  }
  
  // Check parts from right to left (excluding extension) for platform names
  for (let i = parts.length - 2; i >= 0; i--) {
    const part = parts[i];
    if (PLATFORMS.includes(part)) {
      platforms.unshift(part); // Add to beginning to maintain order
    } else {
      // Stop when we encounter a non-platform part
      break;
    }
  }
  
  return platforms.length > 0 ? platforms : null;
}

/**
 * Calculate relative import path for Platform type
 */
function getRelativeImportPath(filePath) {
  const platformSupportPath = path.join(WORKSPACE_ROOT, 'lib', 'platform_support.ts');
  const fileDir = path.dirname(filePath);
  let relativePath = path.relative(fileDir, platformSupportPath);
  
  // Normalize to forward slashes and remove .ts extension
  relativePath = relativePath.replace(/\\/g, '/').replace(/\.ts$/, '');
  
  // Ensure it starts with ./
  if (!relativePath.startsWith('.')) {
    relativePath = './' + relativePath;
  }
  
  return relativePath;
}

/**
 * Find or add Platform import in the file
 * Returns the updated content and whether import was added
 */
function ensurePlatformImport(content, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  
  // Check if Platform import already exists
  let hasPlatformImport = false;
  let lastImportEnd = 0;
  
  function visit(node) {
    if (!ts.isImportDeclaration(node)) return;
    
    lastImportEnd = node.end;
    
    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return;
    
    // Check if this import is from platform_support
    if (!moduleSpecifier.text.includes('platform_support')) return;
    
    // Check if it imports Platform type
    if (!node.importClause?.namedBindings) return;
    
    const namedBindings = node.importClause.namedBindings;
    if (!ts.isNamedImports(namedBindings)) return;
    
    for (const element of namedBindings.elements) {
      if (element.name.text === 'Platform') {
        hasPlatformImport = true;
        break;
      }
    }
  }
  
  ts.forEachChild(sourceFile, visit);
  
  if (hasPlatformImport) {
    return { content, added: false };
  }
  
  // Add Platform import
  const importPath = getRelativeImportPath(filePath);
  const importStatement = `import type { Platform } from '${importPath}';\n`;
  
  if (lastImportEnd > 0) {
    // Add after last import
    const lines = content.split('\n');
    let insertLine = 0;
    let currentPos = 0;
    
    for (let i = 0; i < lines.length; i++) {
      currentPos += lines[i].length + 1; // +1 for newline
      if (currentPos >= lastImportEnd) {
        insertLine = i + 1;
        break;
      }
    }
    
    lines.splice(insertLine, 0, importStatement.trim());
    return { content: lines.join('\n'), added: true };
  } else {
    // Add at the beginning (after shebang/comments if any)
    const lines = content.split('\n');
    let insertLine = 0;
    
    // Skip shebang and leading comments
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.startsWith('#!') || trimmed.startsWith('//') || 
          trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed === '') {
        insertLine = i + 1;
      } else {
        break;
      }
    }
    
    lines.splice(insertLine, 0, importStatement.trim(), '');
    return { content: lines.join('\n'), added: true };
  }
}

/**
 * Check if __platforms export is at the end of the file
 */
function isPlatformExportAtEnd(content, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  
  let platformExportEnd = -1;
  let lastStatementEnd = -1;
  
  function visit(node) {
    // Track the last statement
    if (ts.isStatement(node) && node.parent === sourceFile) {
      lastStatementEnd = Math.max(lastStatementEnd, node.end);
    }
    
    // Find __platforms export
    if (!ts.isVariableStatement(node)) return;
    
    const hasExport = node.modifiers?.some(
      mod => mod.kind === ts.SyntaxKind.ExportKeyword
    );
    
    if (!hasExport) return;
    
    for (const declaration of node.declarationList.declarations) {
      if (ts.isVariableDeclaration(declaration) &&
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === '__platforms') {
        platformExportEnd = node.end;
      }
    }
  }
  
  ts.forEachChild(sourceFile, visit);
  
  if (platformExportEnd === -1) {
    return false; // No export found
  }
  
  // Check if __platforms is the last statement (allowing for trailing whitespace/newlines)
  return platformExportEnd === lastStatementEnd;
}

/**
 * Extract the existing __platforms export statement as-is
 */
function extractExistingPlatformExport(content, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  
  const lines = content.split('\n');
  let exportStatement = null;
  const linesToRemove = new Set();
  
  function visit(node) {
    if (!ts.isVariableStatement(node)) return;
    
    const hasExport = node.modifiers?.some(
      mod => mod.kind === ts.SyntaxKind.ExportKeyword
    );
    
    if (!hasExport) return;

    for (const declaration of node.declarationList.declarations) {
      if (!ts.isVariableDeclaration(declaration) ||
          !ts.isIdentifier(declaration.name) ||
          declaration.name.text !== '__platforms') {
        continue;
      }
      
      // Extract the full statement
      const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line;
      const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line;
      
      const statementLines = [];
      for (let i = startLine; i <= endLine; i++) {
        linesToRemove.add(i);
        statementLines.push(lines[i]);
      }
      exportStatement = statementLines.join('\n');
    }
  }
  
  ts.forEachChild(sourceFile, visit);
  
  if (!exportStatement) {
    return { restContent: content, platformExportStatement: null };
  }
  
  const filteredLines = lines.filter((_, index) => !linesToRemove.has(index));
  return { restContent: filteredLines.join('\n'), platformExportStatement: exportStatement };
}

/**
 * Add __platforms export at the end of the file
 */
function addPlatformExportStatement(content, statement) {
  // Trim trailing whitespace and add the statement (with blank line before)
  return content.trimEnd() + '\n\n' + statement + '\n';
}

/**
 * Add __platforms export at the end of the file (when creating new)
 */
function addPlatformExport(content, platforms) {
  const platformsStr = platforms.map(p => `'${p}'`).join(', ');
  const exportStatement = `export const __platforms: Platform[] = [${platformsStr}];`;
  return addPlatformExportStatement(content, exportStatement);
}

/**
 * Process a single file
 */
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Use extractPlatformsFromFile which validates platform values
  const result = extractPlatformsFromFile(filePath);
  
  // Extract platforms and error info from result
  const existingPlatforms = result.success ? result.platforms : null;
  const needsFixing = result.error && ['MISSING', 'NOT_ARRAY', 'EMPTY_ARRAY', 'NOT_LITERALS', 'INVALID_VALUES'].includes(result.error.type);
  
  // Determine platforms for this file
  // If file already has valid platforms, use those (preserve existing values)
  // Otherwise, determine from filename or default to universal
  let platforms;
  if (needsFixing) {
    // No __platforms export or has errors, determine from filename
    const platformsFromFilename = getPlatformFromFilename(filePath);
    platforms = platformsFromFilename || ['__universal__'];
  } else {
    // Has valid __platforms, preserve the existing values
    platforms = existingPlatforms;
  }
  
  let modified = false;
  let action = 'skipped';
  
  if (needsFixing) {
    // Has issues (MISSING, NOT_ARRAY, NOT_LITERALS, INVALID_VALUES, etc.), fix them
    const extracted = extractExistingPlatformExport(content, filePath);
    content = extracted.restContent;

    action = 'fixed';
    modified = true;
    
    // Ensure Platform import exists
    const importResult = ensurePlatformImport(content, filePath);
    content = importResult.content;
    
    // Add __platforms export at the end
    content = addPlatformExport(content, platforms);
  } else if (existingPlatforms) {
    // Has valid __platforms structure - check if it's already at the end
    if (isPlatformExportAtEnd(content, filePath)) {
      return { skipped: true, reason: 'already has export at end' };
    }
    
    // Extract it and move to end without modification
    const extracted = extractExistingPlatformExport(content, filePath);
    content = extracted.restContent;
    
    // Add the original statement at the end
    content = addPlatformExportStatement(content, extracted.platformExportStatement);
    action = 'moved';
    modified = true;
  }
  
  if (modified) {
    // Write back to file
    fs.writeFileSync(filePath, content, 'utf-8');
    
    return { skipped: false, action, platforms };
  }
  
  return { skipped: true, reason: 'no changes needed' };
}

function main() {
  console.log('🔧 Processing __platforms exports...\n');
  
  const files = findSourceFiles();
  let added = 0;
  let moved = 0;
  let fixed = 0;
  let skipped = 0;
  
  for (const file of files) {
    const result = processFile(file);
    const relativePath = path.relative(process.cwd(), file);
    
    if (result.skipped) {
      skipped++;
    } else {
      switch (result.action) {
        case 'added':
          added++;
          console.log(`➕ ${relativePath} → [${result.platforms.join(', ')}]`);
          break;
        case 'moved':
          moved++;
          console.log(`📍 ${relativePath} → moved to end [${result.platforms.join(', ')}]`);
          break;
        case 'fixed':
          fixed++;
          console.log(`🔧 ${relativePath} → fixed [${result.platforms.join(', ')}]`);
          break;
      }
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Added: ${added} files`);
  console.log(`  Moved to end: ${moved} files`);
  console.log(`  Fixed: ${fixed} files`);
  console.log(`  Skipped: ${skipped} files`);
  console.log(`  Total: ${files.length} files\n`);
  
  console.log('✅ Done! Run npm run validate-platform-isolation to verify.\n');
}

if (require.main === module) {
  main();
}

module.exports = { processFile };

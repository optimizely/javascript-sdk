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
 * Platform Utilities
 * 
 * Shared utilities for platform isolation validation
 */


/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-inner-declarations */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Cache for valid platforms
let validPlatformsCache = null;

// Cache for file platforms
const filePlatformCache = new Map();

/**
 * Extract valid platform values from Platform type definition in platform_support.ts
 * Parses: type Platform = 'browser' | 'node' | 'react_native' | '__universal__';
 * 
 * @returns {string[]} Array of valid platform identifiers
 */
function getValidPlatforms() {
  if (validPlatformsCache) {
    return validPlatformsCache;
  }

  const workspaceRoot = path.join(__dirname, '..');
  const platformSupportPath = path.join(workspaceRoot, 'lib', 'platform_support.ts');
  
  if (!fs.existsSync(platformSupportPath)) {
    throw new Error(`platform_support.ts not found at ${platformSupportPath}`);
  }

  const content = fs.readFileSync(platformSupportPath, 'utf8');
  const sourceFile = ts.createSourceFile(
    platformSupportPath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  
  const platforms = [];
  
  // Visit only top-level statements since Platform type must be exported at top level
  for (const node of sourceFile.statements) {
    // Look for: export type Platform = 'browser' | 'node' | ...
    if (ts.isTypeAliasDeclaration(node) && 
        node.name.text === 'Platform' &&
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      
      // Parse the union type
      if (ts.isUnionTypeNode(node.type)) {
        for (const type of node.type.types) {
          if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
            platforms.push(type.literal.text);
          }
        }
      } else if (ts.isLiteralTypeNode(node.type) && ts.isStringLiteral(node.type.literal)) {
        // Handle single literal type: type Platform = 'browser';
        platforms.push(node.type.literal.text);
      }
      
      break; // Found it, stop searching
    }
  }
  
  if (platforms.length === 0) {
    throw new Error(`Could not extract Platform type from ${platformSupportPath}`);
  }
  
  validPlatformsCache = platforms;
  return validPlatformsCache;
}

/**
 * Extracts __platforms array from TypeScript AST with detailed error reporting
 * 
 * Returns an object with:
 * - success: boolean - whether extraction was successful
 * - platforms: string[] - array of platform values (if successful)
 * - error: object - detailed error information (if unsuccessful)
 *   - type: 'MISSING' | 'NOT_CONST' | 'NOT_ARRAY' | 'EMPTY_ARRAY' | 'NOT_LITERALS' | 'INVALID_VALUES'
 *   - message: string - human-readable error message
 *   - invalidValues: string[] - list of invalid platform values (for INVALID_VALUES type)
 * 
 * @param {ts.SourceFile} sourceFile - TypeScript source file AST
 * @param {string[]} validPlatforms - Array of valid platform values
 * @returns {Object}
 */
function extractPlatformsFromAST(sourceFile, validPlatforms) {
  let found = false;
  let isArray = false;
  let platforms = [];
  let hasNonStringLiteral = false;

  // Visit only top-level children since __platforms must be exported at top level
  for (const node of sourceFile.statements) {
    // Look for: export const __platforms = [...]
    if (!ts.isVariableStatement(node)) continue;
    
    // Check if it has export modifier
    const hasExport = node.modifiers?.some(
      mod => mod.kind === ts.SyntaxKind.ExportKeyword
    );
    if (!hasExport) continue;

    for (const declaration of node.declarationList.declarations) {
      if (!ts.isVariableDeclaration(declaration) ||
          !ts.isIdentifier(declaration.name) ||
          declaration.name.text !== '__platforms') {
        continue;
      }
      
      found = true;
      
      let initializer = declaration.initializer;
      
      // Handle "as const" assertion: [...] as const
      if (initializer && ts.isAsExpression(initializer)) {
        initializer = initializer.expression;
      }
      
      // Handle type assertion: <const>[...]
      if (initializer && ts.isTypeAssertionExpression(initializer)) {
        initializer = initializer.expression;
      }
      
      // Check if it's an array
      if (initializer && ts.isArrayLiteralExpression(initializer)) {
        isArray = true;
        
        // Extract array elements
        for (const element of initializer.elements) {
          if (ts.isStringLiteral(element)) {
            platforms.push(element.text);
          } else {
            // Non-string literal found (variable, computed value, etc.)
            hasNonStringLiteral = true;
          }
        }
      }
      
      break; // Found it, stop searching
    }
    
    if (found) break;
  }
  
  // Detailed error reporting
  if (!found) {
    return {
      success: false,
      error: {
        type: 'MISSING',
        message: `File does not export '__platforms' array`
      }
    };
  }
  
  if (!isArray) {
    return {
      success: false,
      error: {
        type: 'NOT_ARRAY',
        message: `'__platforms' must be an array literal, found ${platforms.length === 0 ? 'non-array value' : 'other type'}`
      }
    };
  }
  
  if (hasNonStringLiteral) {
    return {
      success: false,
      error: {
        type: 'NOT_LITERALS',
        message: `'__platforms' must only contain string literals, found non-literal values`
      }
    };
  }
  
  if (platforms.length === 0) {
    return {
      success: false,
      error: {
        type: 'EMPTY_ARRAY',
        message: `'__platforms' array is empty, must contain at least one platform`
      }
    };
  }
  
  // Validate platform values if validPlatforms provided
  if (validPlatforms) {
    const invalidPlatforms = platforms.filter(p => !validPlatforms.includes(p));
    if (invalidPlatforms.length > 0) {
      return {
        success: false,
        error: {
          type: 'INVALID_VALUES',
          message: `Invalid platform values found`,
          invalidValues: invalidPlatforms
        }
      };
    }
  }
  
  return {
    success: true,
    platforms: platforms
  };
}

/**
 * Extract platforms from a file path with detailed error reporting
 * Uses caching to avoid re-parsing the same file multiple times.
 * 
 * @param {string} absolutePath - Absolute path to the file
 * @returns {Object} Result object with success, platforms, and error information
 */
function extractPlatformsFromFile(absolutePath) {
  // Check cache first
  if (filePlatformCache.has(absolutePath)) {
    return filePlatformCache.get(absolutePath);
  }
  
  let result;
  try {
    const validPlatforms = getValidPlatforms();
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      absolutePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    result = extractPlatformsFromAST(sourceFile, validPlatforms);
  } catch (error) {
    result = {
      success: false,
      error: {
        type: 'READ_ERROR',
        message: `Failed to read or parse file: ${error.message}`
      }
    };
  }
  
  filePlatformCache.set(absolutePath, result);
  return result;
}

module.exports = {
  getValidPlatforms,
  extractPlatformsFromAST,
  extractPlatformsFromFile,
};

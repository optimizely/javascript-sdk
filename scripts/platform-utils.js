/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-inner-declarations */
/**
 * Platform Utilities
 * 
 * Shared utilities for platform isolation validation used by both
 * the validation script and ESLint rule.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Cache for valid platforms
let validPlatformsCache = null;

/**
 * Extract valid platform values from Platform type definition in platform_support.ts
 * Parses: type Platform = 'browser' | 'node' | 'react_native' | '__universal__';
 * 
 * @param {string} workspaceRoot - The root directory of the workspace
 * @returns {string[]} Array of valid platform identifiers
 */
function getValidPlatforms(workspaceRoot) {
  if (validPlatformsCache) {
    return validPlatformsCache;
  }

  try {
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
    
    // Visit all nodes in the AST
    function visit(node) {
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
      }
      
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    
    if (platforms.length > 0) {
      validPlatformsCache = platforms;
      return validPlatformsCache;
    }
  } catch (error) {
    console.warn('Could not parse platform_support.ts, using fallback values:', error.message);
  }
  
  // Fallback to default platforms
  validPlatformsCache = ['browser', 'node', 'react_native', '__universal__'];
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
 * @param {string} filePath - File path for context in error messages
 * @param {string[]} validPlatforms - Array of valid platform values
 * @returns {Object}
 */
function extractPlatformsFromAST(sourceFile, filePath, validPlatforms) {
  let found = false;
  let isConst = false;
  let isArray = false;
  let platforms = [];
  let hasNonStringLiteral = false;

  function visit(node) {
    // Look for: export const __platforms = [...]
    if (ts.isVariableStatement(node)) {
      // Check if it has export modifier
      const hasExport = node.modifiers?.some(
        mod => mod.kind === ts.SyntaxKind.ExportKeyword
      );

      if (hasExport) {
        const isConstDecl = (node.declarationList.flags & ts.NodeFlags.Const) !== 0;
        
        for (const declaration of node.declarationList.declarations) {
          if (ts.isVariableDeclaration(declaration) &&
              ts.isIdentifier(declaration.name) &&
              declaration.name.text === '__platforms') {
            
            found = true;
            isConst = isConstDecl;
            
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
            
            return; // Found it, stop visiting
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  
  // Detailed error reporting
  if (!found) {
    return {
      success: false,
      error: {
        type: 'MISSING',
        message: `File does not export '__platforms' constant`
      }
    };
  }
  
  if (!isConst) {
    return {
      success: false,
      error: {
        type: 'NOT_CONST',
        message: `'__platforms' must be declared with 'const', found non-const declaration`
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
 * 
 * @param {string} filePath - Absolute path to the file
 * @param {string} workspaceRoot - Workspace root for resolving valid platforms
 * @returns {Object} Result object with success, platforms, and error information
 */
function extractPlatformsFromFile(filePath, workspaceRoot) {
  try {
    const validPlatforms = workspaceRoot ? getValidPlatforms(workspaceRoot) : null;
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    return extractPlatformsFromAST(sourceFile, filePath, validPlatforms);
  } catch (error) {
    return {
      success: false,
      error: {
        type: 'READ_ERROR',
        message: `Failed to read or parse file: ${error.message}`
      }
    };
  }
}

module.exports = {
  getValidPlatforms,
  extractPlatformsFromAST,
  extractPlatformsFromFile,
};

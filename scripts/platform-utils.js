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
 * Extracts __platforms array from TypeScript AST
 * 
 * Returns:
 * - string[] if valid platforms array found
 * - 'NOT_CONST' if __platforms is not declared as const
 * - 'NOT_LITERALS' if array contains non-literal values
 * - null if __platforms export not found
 * 
 * @param {ts.SourceFile} sourceFile - TypeScript source file AST
 * @returns {string[] | 'NOT_CONST' | 'NOT_LITERALS' | null}
 */
function extractPlatformsFromAST(sourceFile) {
  let platforms = null;
  let hasNonStringLiteral = false;
  let isNotConst = false;

  function visit(node) {
    // Look for: export const __platforms = [...]
    if (ts.isVariableStatement(node)) {
      // Check if it has export modifier
      const hasExport = node.modifiers?.some(
        mod => mod.kind === ts.SyntaxKind.ExportKeyword
      );

      if (hasExport) {
        // Check if declaration is const
        const isConst = (node.declarationList.flags & ts.NodeFlags.Const) !== 0;
        
        for (const declaration of node.declarationList.declarations) {
          if (ts.isVariableDeclaration(declaration) &&
              ts.isIdentifier(declaration.name) &&
              declaration.name.text === '__platforms') {
            
            if (!isConst) {
              isNotConst = true;
            }
            
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
                } else {
                  // Non-string literal found (variable, computed value, etc.)
                  hasNonStringLiteral = true;
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
  
  if (platforms !== null) {
    if (isNotConst) {
      return 'NOT_CONST';
    }
    if (hasNonStringLiteral) {
      return 'NOT_LITERALS';
    }
  }
  
  return platforms;
}

/**
 * Extract platforms from a file path
 * 
 * @param {string} filePath - Absolute path to the file
 * @returns {string[] | 'NOT_CONST' | 'NOT_LITERALS' | null}
 */
function extractPlatformsFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );
    return extractPlatformsFromAST(sourceFile);
  } catch (error) {
    return null;
  }
}

module.exports = {
  getValidPlatforms,
  extractPlatformsFromAST,
  extractPlatformsFromFile,
};

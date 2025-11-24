/**
 * ESLint Rule: require-platform-declaration
 * 
 * Ensures that all non-test source files export __supportedPlatforms with valid platform values
 * 
 * Valid:
 *   export const __supportedPlatforms = ['browser'];
 *   export const __supportedPlatforms = ['__universal__'];
 *   export const __supportedPlatforms = ['browser', 'node'];
 * 
 * Invalid:
 *   // Missing __supportedPlatforms export
 *   // Invalid platform values (must match Platform type definition in platform_support.ts)
 *   // Not exported as const array
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Cache for valid platforms
let validPlatformsCache = null;

function getValidPlatforms(context) {
  if (validPlatformsCache) {
    return validPlatformsCache;
  }

  try {
    const filename = context.getFilename();
    const workspaceRoot = filename.split('/lib/')[0];
    const platformSupportPath = path.join(workspaceRoot, 'lib', 'platform_support.ts');
    
    if (fs.existsSync(platformSupportPath)) {
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
    }
  } catch (error) {
    // Fallback to hardcoded values if parsing fails
    console.warn('Could not parse platform_support.ts, using fallback values:', error.message);
  }
  
  // Fallback to default platforms
  validPlatformsCache = ['browser', 'node', 'react_native', '__universal__'];
  return validPlatformsCache;
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require __supportedPlatforms export with valid platform values in all source files',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      missingPlatformDeclaration: 'File must export __supportedPlatforms to declare which platforms it supports. Example: export const __supportedPlatforms = [\'__universal__\'];',
      invalidPlatformDeclaration: '__supportedPlatforms must be exported as a const array. Example: export const __supportedPlatforms = [\'browser\', \'node\'];',
      invalidPlatformValue: '__supportedPlatforms contains invalid platform value "{{value}}". Valid platforms are: {{validPlatforms}}',
      emptyPlatformArray: '__supportedPlatforms array cannot be empty. Specify at least one platform or use [\'__universal__\']',
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename();
    
    // Skip test files
    if (filename.endsWith('.spec.ts') || 
        filename.endsWith('.test.ts') || 
        filename.endsWith('.tests.ts') ||
        filename.endsWith('.test.js') ||
        filename.endsWith('.spec.js') ||
        filename.endsWith('.tests.js') ||
        filename.endsWith('.test-d.ts') ||
        filename.endsWith('.d.ts') ||
        filename.includes('/__mocks__/') ||
        filename.includes('/tests/')) {
      return {};
    }

    // Skip non-source files
    if (!filename.includes('/lib/') && !filename.includes('/src/')) {
      return {};
    }

    const VALID_PLATFORMS = getValidPlatforms(context);
    let hasPlatformExport = false;

    return {
      ExportNamedDeclaration(node) {
        // Check for: export const __supportedPlatforms = [...]
        if (node.declaration && 
            node.declaration.type === 'VariableDeclaration') {
          
          for (const declarator of node.declaration.declarations) {
            if (declarator.id.type === 'Identifier' &&
                declarator.id.name === '__supportedPlatforms') {
              
              hasPlatformExport = true;
              
              // Validate it's a const
              if (node.declaration.kind !== 'const') {
                context.report({
                  node: declarator,
                  messageId: 'invalidPlatformDeclaration',
                });
                return;
              }
              
              // Validate it's an array expression
              let init = declarator.init;
              
              // Handle TSAsExpression: [...] as const
              if (init && init.type === 'TSAsExpression') {
                init = init.expression;
              }
              
              // Handle TSTypeAssertion: <const>[...]
              if (init && init.type === 'TSTypeAssertion') {
                init = init.expression;
              }
              
              if (!init || init.type !== 'ArrayExpression') {
                context.report({
                  node: declarator,
                  messageId: 'invalidPlatformDeclaration',
                });
                return;
              }
              
              // Check if array is empty
              if (init.elements.length === 0) {
                context.report({
                  node: init,
                  messageId: 'emptyPlatformArray',
                });
                return;
              }
              
              // Validate each array element is a valid platform string
              for (const element of init.elements) {
                if (element && element.type === 'Literal' && typeof element.value === 'string') {
                  if (!VALID_PLATFORMS.includes(element.value)) {
                    context.report({
                      node: element,
                      messageId: 'invalidPlatformValue',
                      data: { 
                        value: element.value,
                        validPlatforms: VALID_PLATFORMS.map(p => `'${p}'`).join(', ')
                      }
                    });
                  }
                } else {
                  // Not a string literal
                  context.report({
                    node: element || init,
                    messageId: 'invalidPlatformDeclaration',
                  });
                }
              }
            }
          }
        }
      },

      'Program:exit'(node) {
        // At the end of the file, check if __supportedPlatforms was exported
        if (!hasPlatformExport) {
          context.report({
            node,
            messageId: 'missingPlatformDeclaration',
          });
        }
      },
    };
  },
};

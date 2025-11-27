/**
 * ESLint Rule: require-platform-declaration
 * 
 * Ensures that all source files export __platforms with valid platform values.
 * 
 * File exclusions (test files, generated files, etc.) should be configured
 * in .eslintrc.js using the 'excludedFiles' option.
 * 
 * Valid:
 *   export const __platforms = ['browser'];
 *   export const __platforms = ['__universal__'];
 *   export const __platforms = ['browser', 'node'];
 * 
 * Invalid:
 *   // Missing __platforms export
 *   // Invalid platform values (must match Platform type definition in platform_support.ts)
 *   // Not exported as const array
 */

const { getValidPlatforms } = require('../scripts/platform-utils');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require __platforms export with valid platform values in all source files',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      missingPlatformDeclaration: 'File must export __platforms to declare which platforms it supports. Example: export const __platforms = [\'__universal__\'];',
      notArray: '__platforms must be an array literal. Example: export const __platforms = [\'browser\', \'node\'];',
      emptyArray: '__platforms array cannot be empty. Specify at least one platform or use [\'__universal__\'].',
      notLiterals: '__platforms must only contain string literals. Do NOT use variables, computed values, or spread operators.',
      invalidValues: 'Invalid platform value "{{value}}". Valid platforms are: {{validPlatforms}}',
    },
    schema: [],
  },

  create(context) {
    const VALID_PLATFORMS = getValidPlatforms();
    let hasPlatformExport = false;

    return {
      ExportNamedDeclaration(node) {
        // Check for: export const __platforms = [...]
        if (node.declaration && 
            node.declaration.type === 'VariableDeclaration') {
          
          for (const declarator of node.declaration.declarations) {
            if (declarator.id.type === 'Identifier' &&
                declarator.id.name === '__platforms') {
              
              hasPlatformExport = true;
              
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
                  messageId: 'notArray',
                });
                return;
              }
              
              // Check if array is empty
              if (init.elements.length === 0) {
                context.report({
                  node: init,
                  messageId: 'emptyArray',
                });
                return;
              }
              
              // Validate each array element is a valid platform string
              for (const element of init.elements) {
                if (element && element.type === 'Literal' && typeof element.value === 'string') {
                  if (!VALID_PLATFORMS.includes(element.value)) {
                    context.report({
                      node: element,
                      messageId: 'invalidValues',
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
                    messageId: 'notLiterals',
                  });
                }
              }
            }
          }
        }
      },

      'Program:exit'(node) {
        // At the end of the file, check if __platforms was exported
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

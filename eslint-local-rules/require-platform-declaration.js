/**
 * ESLint Rule: require-platform-declaration
 * 
 * Ensures that all non-test source files export __supportedPlatforms
 * 
 * Valid:
 *   export const __supportedPlatforms = ['browser'] as const;
 *   export const __supportedPlatforms = ['__universal__'] as const;
 *   export const __supportedPlatforms: Platform[] = ['browser', 'node'];
 * 
 * Invalid:
 *   // Missing __supportedPlatforms export
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require __supportedPlatforms export in all source files',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      missingPlatformDeclaration: 'File must export __supportedPlatforms to declare which platforms it supports. Example: export const __supportedPlatforms = [\'__universal__\'] as const;',
      invalidPlatformDeclaration: '__supportedPlatforms must be exported as a const array. Example: export const __supportedPlatforms = [\'browser\', \'node\'] as const;',
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

    let hasPlatformExport = false;
    let isValidExport = false;

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
              
              // Validate it's an array
              let init = declarator.init;
              
              // Handle TSAsExpression: [...] as const
              if (init && init.type === 'TSAsExpression') {
                init = init.expression;
              }
              
              // Handle TSTypeAssertion: <const>[...]
              if (init && init.type === 'TSTypeAssertion') {
                init = init.expression;
              }
              
              if (init && init.type === 'ArrayExpression') {
                isValidExport = true;
              } else {
                context.report({
                  node: declarator,
                  messageId: 'invalidPlatformDeclaration',
                });
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

/**
 * Platform Isolation Configuration
 * 
 * Configures which files should be validated by the platform isolation validator.
 */

module.exports = {
  // Base directories to scan for source files
  include: [
    'lib/**/*.ts',
    'lib/**/*.js'
  ],

  // Files and patterns to exclude from validation
  exclude: [
    // Platform definition file (this file defines Platform type, doesn't need __platforms)
    '**/platform_support.ts',

    '**/common_exports.ts',
    '**/export_types.ts',
    
    // Test files
    '**/*.spec.ts',
    '**/*.test.ts',
    '**/*.tests.ts',
    '**/*.test.js',
    '**/*.spec.js',
    '**/*.tests.js',
    '**/*.umdtests.js',
    '**/*.test-d.ts',
    
    // Generated files
    '**/*.gen.ts',
    
    // Type declaration files
    '**/*.d.ts',
    
    // Test directories and mocks
    '**/__mocks__/**',
    '**/tests/**'
  ]
};

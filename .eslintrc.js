module.exports = {
  env: {
    browser: true,
    commonjs: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'local-rules'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    Promise: 'readonly',
  },
  parserOptions: {
    // Note: The TS compiler determines what syntax is accepted. We're using TS version 4.0.3.
    // This seems to correspond to "2020" for this setting.
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  overrides: [
    {
      'files': ['*.ts'],
      'rules': {
        '@typescript-eslint/explicit-module-boundary-types': ['error']
      }
    },
    {
      'files': ['lib/**/*.ts', 'src/**/*.ts'],
      'excludedFiles': [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.tests.ts',
        '**/*.test-d.ts',
        '**/*.gen.ts',
        '**/*.d.ts',
        '**/__mocks__/**',
        '**/tests/**'
      ],
      'rules': {
        'local-rules/require-platform-declaration': 'error',
      }
    }
  ],
  rules: {
    'no-prototype-builtins': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
  },
};

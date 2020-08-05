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
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    Promise: 'readonly',
  },
  parserOptions: {
    // Note: The TS compiler determines what syntax is accepted. We're using TS version 3.3.3333.
    // This seems to roughly correspond to "2018" for this setting.
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  overrides: [
    {
      'files': ['*.ts'],
      'rules': {
        '@typescript-eslint/explicit-module-boundary-types': ['error']
      }
    }
  ],
  rules: {
    'no-prototype-builtins': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    'no-shadow': 'error',
  },
};

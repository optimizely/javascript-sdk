module.exports = {
  env: {
    browser: true,
    commonjs: true,
    node: true,
  },
  extends: 'eslint:recommended',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
    Promise: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 5,
  },
  rules: {
    'no-prototype-builtins': 'off',
  },
};

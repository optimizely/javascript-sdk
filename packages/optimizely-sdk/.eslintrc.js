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
  ignorePatterns: ["rollup.config.js"],
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
  },
  rules: {
    'no-prototype-builtins': 'off',
  },
};

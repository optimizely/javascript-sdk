module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true,
        "node": true,
    },
    "extends": "eslint:recommended",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parserOptions": {
        "ecmaVersion": 5
    },
    "rules": {
      "no-prototype-builtins": "off"
    },
    "overrides": [
      {
        "files": ["*.tests.js"],
        "env": {
          "mocha": true
        }
      }
    ]
};

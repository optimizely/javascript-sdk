module.exports = {
  "transform": {
    "^.+\\.(ts|tsx|js|jsx)$": "ts-jest",
  },
  "testRegex": "(/tests/.*|(\\.|/)(test|spec))\\.tsx?$",
  moduleNameMapper: {
    // Force module uuid to resolve with the CJS entry point, because Jest does not support package.json.exports. See https://github.com/uuidjs/uuid/issues/451
    "uuid": require.resolve('uuid'),
  },
  "testPathIgnorePatterns" : [
    "tests/testUtils.ts" 
  ],
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node"
  ],
  "resetMocks": false,
  "setupFiles": [
    "jest-localstorage-mock",
  ],
  testEnvironment: "jsdom"
}

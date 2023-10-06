// // module.exports = {
// //   "transform": {
// //     "^.+\\.tsx?$": "ts-jest"
// //   },
// //   "testRegex": "(/tests/.*|(\\.|/)(test|spec))\\.tsx?$",
// //   "moduleFileExtensions": [
// //     "ts",
// //     "tsx",
// //     "js",
// //     "jsx",
// //     "json",
// //     "node"
// //   ],
// // }

// module.exports = {
//   transform: {
//     "^.+\\.tsx?$": "ts-jest"
//   },
//   testRegex: '(/tests/.*|(\\.|/)(test|spec))\\.tsx?$',
//   "moduleFileExtensions": [
//     "ts",
//     // "tsx",
//     "js",
//     // "jsx",
//     // "json",
//     // "node"
//   ],
//   // preset: 'ts-jest',
//   // testMatch: null,
// }

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
    "tests/testUtils.ts",
    "dist"
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
  testEnvironment: "jsdom"
}

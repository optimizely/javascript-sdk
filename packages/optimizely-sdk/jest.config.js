module.exports = {
  // "roots": [
  //   "./src"
  // ],
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "testRegex": "(/tests/.*|(\\.|/)(test|spec))\\.tsx?$",
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json",
    "node"
  ],
  "setupFiles": ["jest-localstorage-mock"],
  "moduleNameMapper": {
    "@utils/(.*)": "<rootDir>/lib/utils/$1"
}
}

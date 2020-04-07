# Javascript SDK Datafile Manager

This package provides datafile manager implementations for Node.js, browsers, and React Native.

## Installation

```sh
npm i @optimizely/js-sdk-datafile-manager
```


## Requirements

This package requires an ES5-compatible environment, in addition to these platform-specific requirements:

### Browsers
For browsers, the globals listed below are required:

- `fetch`
- `AbortController`

### React Native

For React Native, installation of peer dependency `@react-native-community/async-storage` is required:
```sh
npm i @react-native-community/async-storage
```

### All Environments
In all environments, the globals listed below are required:
- `Promise`

To use this package in environments where required globals aren't available, such as older browsers or Node.js versions, they must be polyfilled.

## Usage

```js
const { HttpPollingDatafileManager } = require('@optimizely/js-sdk-datafile-manager')

const manager = new HttpPollingDatafileManager({
  sdkKey: '9LCprAQyd1bs1BBXZ3nVji',
  autoUpdate: true,
  updateInterval: 5000,
})
manager.start()
manager.onReady().then(() => {
  const datafile = manager.get()
  console.log('Manager is ready with datafile: ')
  console.log(datafile)
})
manager.on('update', ({ datafile }) => {
  console.log('New datafile available: ')
  console.log(datafile)
})
```

## Development
For development, installation of peer dependency `@react-native-community/async-storage` is also required:
```sh
npm i --no-save @react-native-community/async-storage
```

- The `lint` package.json script runs ESLint and Prettier. This applies formatting and lint fixes to all `.ts` files in the `src/` directory.
- The `test` package.json script runs our Jest-based test suite.
- The `tsc` package.json script runs the TypeScript compiler to build the final scripts for publishing (into the `lib/` directory).

# Javascript SDK Datafile Manager

This package provides datafile manager implementations for Node.js, browsers, and React Native.

## Installation

```sh
npm i @optimizely/js-sdk-datafile-manager
```

For React Native, installation of peer dependency `@react-native-community/async-storage` is also required:
```sh
npm i @react-native-community/async-storage
```

## Requirements
js-sdk-datafile-manager relies on the globals listed below:

- `Promise`
- `fetch` (browser only)
- `AbortController` (browser only)

To use js-sdk-datafile in environments where these globals aren't available, they must be polyfilled.


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

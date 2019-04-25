# Javascript SDK Datafile Manager

This package provides a datafile manager implementations for Node.js and the browser.

## Installation

```sh
npm install @optimizely/js-sdk-datafile-manager
```

## Usage

```js
const { DatafileManager } = require('@optimizely/js-sdk-datafile-manager')

const manager = new DatafileManager({
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
